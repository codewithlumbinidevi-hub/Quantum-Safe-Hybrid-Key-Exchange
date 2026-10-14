"""
ECDH Service: NIST P-256 (secp256r1) Elliptic Curve Diffie-Hellman implementation.
Provides key generation, serialization, public key validation, and shared secret derivation.
"""
from typing import Tuple
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization


class ECDHService:
    """NIST P-256 (secp256r1) Elliptic Curve Diffie-Hellman Key Exchange Service."""

    CURVE = ec.SECP256R1()
    PUBLIC_KEY_SIZE_UNCOMPRESSED = 65  # 1 byte header (0x04) + 32 bytes X + 32 bytes Y
    SHARED_SECRET_SIZE = 32           # 256-bit x-coordinate

    @classmethod
    def generate_key_pair(cls) -> Tuple[ec.EllipticCurvePrivateKey, bytes]:
        """
        Generate a new ephemeral NIST P-256 key pair.
        
        Returns:
            Tuple of (private_key_object, serialized_uncompressed_public_key_bytes)
        """
        private_key = ec.generate_private_key(cls.CURVE)
        public_key = private_key.public_key()
        public_bytes = cls.serialize_public_key(public_key)
        return private_key, public_bytes

    @classmethod
    def serialize_public_key(cls, public_key: ec.EllipticCurvePublicKey) -> bytes:
        """
        Serialize public key in SEC1 uncompressed point format (65 bytes).
        Format: 0x04 || X (32 bytes) || Y (32 bytes).
        """
        return public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint
        )

    @classmethod
    def load_public_key(cls, public_bytes: bytes) -> ec.EllipticCurvePublicKey:
        """
        Load and validate a peer's NIST P-256 public key.
        Ensures the point is valid, resides on the SECP256R1 curve, and is not the point at infinity.
        
        Args:
            public_bytes: 65-byte uncompressed SEC1 encoded public key.
            
        Raises:
            ValueError: If public key length or point format is invalid.
        """
        if not isinstance(public_bytes, (bytes, bytearray)):
            raise TypeError("Public key bytes must be bytes or bytearray")
            
        if len(public_bytes) != cls.PUBLIC_KEY_SIZE_UNCOMPRESSED:
            raise ValueError(
                f"Invalid NIST P-256 uncompressed public key length: "
                f"expected {cls.PUBLIC_KEY_SIZE_UNCOMPRESSED} bytes, received {len(public_bytes)}"
            )

        if public_bytes[0] != 0x04:
            raise ValueError(
                f"Invalid SEC1 uncompressed point prefix: expected 0x04, received 0x{public_bytes[0]:02x}"
            )

        try:
            public_key = ec.EllipticCurvePublicKey.from_encoded_point(cls.CURVE, public_bytes)
            return public_key
        except Exception as e:
            raise ValueError(f"Failed to validate and load peer ECDH public key: {str(e)}") from e

    @classmethod
    def derive_shared_secret(
        cls,
        private_key: ec.EllipticCurvePrivateKey,
        peer_public_key: ec.EllipticCurvePublicKey
    ) -> bytes:
        """
        Derive the raw 32-byte ECDH shared secret using the peer's public key.
        
        Args:
            private_key: Local party's private key.
            peer_public_key: Peer party's validated public key.
            
        Returns:
            32-byte raw shared secret.
        """
        shared_secret = private_key.exchange(ec.ECDH(), peer_public_key)
        if len(shared_secret) != cls.SHARED_SECRET_SIZE:
            raise ValueError(
                f"Unexpected ECDH shared secret length: {len(shared_secret)} bytes, expected {cls.SHARED_SECRET_SIZE}"
            )
        return shared_secret
