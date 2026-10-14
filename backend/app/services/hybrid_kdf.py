"""
Hybrid Key Derivation Function (KDF).
Combines classical ECDH (NIST P-256) and post-quantum ML-KEM-768 shared secrets
using HMAC-based Extract-and-Expand Key Derivation Function (HKDF) with SHA-256.

IMPORTANT CRYPTOGRAPHIC DESIGN NOTICE:
This is an educational hybrid construction inspired by NIST SP 800-56C Rev. 2,
IETF draft-ietf-tls-hybrid-design, and RFC 9180 (Hybrid Public Key Encryption).
It demonstrates the combinator principle: if either classical ECDH or post-quantum ML-KEM-768
remains unbroken, the combined derived key remains secure.
This construction requires formal cryptographic protocol review before production deployment.
"""
import hashlib
from typing import Dict, Any
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes


class HybridKDFService:
    """Cryptographically sound HKDF-SHA256 hybrid key derivation service."""

    PROTOCOL_CONTEXT = b"Q-SHIELD-PQC-v1:HYBRID-KDF:ECDH-P256:ML-KEM-768"
    KEY_LENGTH_BYTES = 32  # 256 bits for AES-256

    @classmethod
    def compute_transcript_hash(
        cls,
        alice_ecdh_pk: bytes,
        bob_ecdh_pk: bytes,
        bob_mlkem_pk: bytes,
        mlkem_ciphertext: bytes
    ) -> bytes:
        """
        Compute SHA-256 hash of the public handshake transcript.
        Binds all public parameters to prevent transcript manipulation and MITM attacks.
        """
        hasher = hashlib.sha256()
        hasher.update(b"TRANSCRIPT-START")
        hasher.update(len(alice_ecdh_pk).to_bytes(4, byteorder="big"))
        hasher.update(alice_ecdh_pk)
        hasher.update(len(bob_ecdh_pk).to_bytes(4, byteorder="big"))
        hasher.update(bob_ecdh_pk)
        hasher.update(len(bob_mlkem_pk).to_bytes(4, byteorder="big"))
        hasher.update(bob_mlkem_pk)
        hasher.update(len(mlkem_ciphertext).to_bytes(4, byteorder="big"))
        hasher.update(mlkem_ciphertext)
        hasher.update(b"TRANSCRIPT-END")
        return hasher.digest()

    @classmethod
    def derive_hybrid_key(
        cls,
        ecdh_secret: bytes,
        mlkem_secret: bytes,
        transcript_hash: bytes,
        key_length: int = 32
    ) -> bytes:
        """
        Derive final hybrid symmetric key from independent classical and quantum-safe secrets.
        
        Construction:
            1. IKM = ecdh_secret || mlkem_secret (64 bytes total input key material)
            2. Salt = SHA-256("Q-SHIELD-PQC-SALT")
            3. Info = PROTOCOL_CONTEXT || transcript_hash
            4. Derived Key = HKDF-SHA256(IKM, salt, info, length=32)
            
        Args:
            ecdh_secret: 32-byte shared secret from NIST P-256 ECDH.
            mlkem_secret: 32-byte shared secret from ML-KEM-768 encapsulation/decapsulation.
            transcript_hash: 32-byte hash of public handshake messages.
            key_length: Desired output key length in bytes (default 32 for AES-256).
            
        Returns:
            Derived key bytes (32 bytes).
        """
        if len(ecdh_secret) != 32:
            raise ValueError(f"ECDH shared secret must be 32 bytes, got {len(ecdh_secret)}")
        if len(mlkem_secret) != 32:
            raise ValueError(f"ML-KEM shared secret must be 32 bytes, got {len(mlkem_secret)}")
        if len(transcript_hash) != 32:
            raise ValueError(f"Transcript hash must be 32 bytes, got {len(transcript_hash)}")

        # Combined input keying material (IKM)
        ikm = ecdh_secret + mlkem_secret

        # Domain separation salt
        salt = hashlib.sha256(b"Q-SHIELD-PQC-SALT-v1").digest()

        # Context-binding info
        info = cls.PROTOCOL_CONTEXT + transcript_hash

        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=key_length,
            salt=salt,
            info=info,
        )

        derived_key = hkdf.derive(ikm)
        return derived_key

    @classmethod
    def compute_key_fingerprint(cls, key: bytes) -> str:
        """
        Compute safe public SHA-256 hex digest fingerprint of derived key
        to allow equality verification without exposing raw key material.
        """
        return hashlib.sha256(key).hexdigest()
