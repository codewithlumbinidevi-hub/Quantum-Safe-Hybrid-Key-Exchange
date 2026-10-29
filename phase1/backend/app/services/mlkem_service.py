"""
ML-KEM Service: NIST FIPS 203 Standardized ML-KEM-768 (Post-Quantum Key Encapsulation Mechanism).
Implements key generation, public key serialization, encapsulation, decapsulation, and validation.
"""
from typing import Tuple
from cryptography.hazmat.primitives.asymmetric import mlkem


class MLKEMService:
    """
    NIST Standardized FIPS 203 ML-KEM-768 Service.
    Security Category: Category 3 (equivalent to AES-192 / classical RSA-3072+ against quantum attacks).
    """

    PUBLIC_KEY_SIZE = 1184   # NIST FIPS 203 specified public key size for ML-KEM-768
    CIPHERTEXT_SIZE = 1088   # NIST FIPS 203 specified ciphertext size for ML-KEM-768
    SHARED_SECRET_SIZE = 32  # 256-bit shared key derived from encapsulation

    @classmethod
    def generate_key_pair(cls) -> Tuple[mlkem.MLKEM768PrivateKey, bytes]:
        """
        Generate a fresh ML-KEM-768 private key and serialized public key.
        
        Returns:
            Tuple of (private_key_object, serialized_public_key_raw_bytes)
        """
        private_key = mlkem.MLKEM768PrivateKey.generate()
        public_key = private_key.public_key()
        public_bytes = cls.serialize_public_key(public_key)
        return private_key, public_bytes

    @classmethod
    def serialize_public_key(cls, public_key: mlkem.MLKEM768PublicKey) -> bytes:
        """
        Serialize ML-KEM-768 public key to raw bytes (1184 bytes).
        """
        raw = public_key.public_bytes_raw()
        if len(raw) != cls.PUBLIC_KEY_SIZE:
            raise ValueError(
                f"Unexpected ML-KEM-768 public key length: {len(raw)} bytes, expected {cls.PUBLIC_KEY_SIZE}"
            )
        return raw

    @classmethod
    def load_public_key(cls, public_bytes: bytes) -> mlkem.MLKEM768PublicKey:
        """
        Load and validate an ML-KEM-768 public key from raw bytes.
        
        Args:
            public_bytes: 1184 raw bytes.
            
        Raises:
            ValueError: If input length or format is invalid.
        """
        if not isinstance(public_bytes, (bytes, bytearray)):
            raise TypeError("Public key bytes must be bytes or bytearray")

        if len(public_bytes) != cls.PUBLIC_KEY_SIZE:
            raise ValueError(
                f"Invalid ML-KEM-768 public key length: expected {cls.PUBLIC_KEY_SIZE} bytes, "
                f"received {len(public_bytes)} bytes"
            )

        try:
            public_key = mlkem.MLKEM768PublicKey.from_public_bytes(public_bytes)
            return public_key
        except Exception as e:
            raise ValueError(f"Failed to load ML-KEM-768 public key: {str(e)}") from e

    @classmethod
    def encapsulate(cls, peer_public_key: mlkem.MLKEM768PublicKey) -> Tuple[bytes, bytes]:
        """
        Encapsulate a random shared secret to peer's ML-KEM-768 public key.
        
        Args:
            peer_public_key: Validated ML-KEM-768 public key.
            
        Returns:
            Tuple of (shared_secret: 32 bytes, ciphertext: 1088 bytes)
        """
        # Note: in cryptography's MLKEM implementation, encapsulate() returns (shared_secret, ciphertext)
        shared_secret, ciphertext = peer_public_key.encapsulate()

        if len(ciphertext) != cls.CIPHERTEXT_SIZE:
            raise ValueError(
                f"Unexpected ML-KEM-768 ciphertext length: {len(ciphertext)}, expected {cls.CIPHERTEXT_SIZE}"
            )
        if len(shared_secret) != cls.SHARED_SECRET_SIZE:
            raise ValueError(
                f"Unexpected ML-KEM-768 shared secret length: {len(shared_secret)}, expected {cls.SHARED_SECRET_SIZE}"
            )

        return shared_secret, ciphertext

    @classmethod
    def decapsulate(cls, private_key: mlkem.MLKEM768PrivateKey, ciphertext: bytes) -> bytes:
        """
        Decapsulate an ML-KEM-768 ciphertext to recover the 32-byte shared secret.
        
        Args:
            private_key: Local party's ML-KEM-768 private key.
            ciphertext: 1088-byte encapsulated ciphertext.
            
        Returns:
            32-byte shared secret.
            
        Raises:
            ValueError: If ciphertext length is invalid or decapsulation fails.
        """
        if not isinstance(ciphertext, (bytes, bytearray)):
            raise TypeError("Ciphertext must be bytes or bytearray")

        if len(ciphertext) != cls.CIPHERTEXT_SIZE:
            raise ValueError(
                f"Invalid ML-KEM-768 ciphertext length: expected {cls.CIPHERTEXT_SIZE} bytes, "
                f"received {len(ciphertext)} bytes"
            )

        try:
            shared_secret = private_key.decapsulate(ciphertext)
            if len(shared_secret) != cls.SHARED_SECRET_SIZE:
                raise ValueError(
                    f"Unexpected decapsulated shared secret length: {len(shared_secret)} bytes, "
                    f"expected {cls.SHARED_SECRET_SIZE}"
                )
            return shared_secret
        except Exception as e:
            raise ValueError(f"ML-KEM-768 decapsulation failed: {str(e)}") from e
