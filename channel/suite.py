"""
Cryptographic Cipher Suites and Primitives.

Implements:
- Suite 0x0001: PQC-MLKEM768-MLDSA65-AES256GCM (FIPS 203, FIPS 204, RFC 5869, SP 800-38D)
- Suite 0x0002: CLASSICAL-X25519-ED25519-AES256GCM (RFC 7748, RFC 8032, RFC 5869, SP 800-38D)
"""
from __future__ import annotations

from typing import NamedTuple, Tuple

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ed25519, mldsa, mlkem, x25519
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from .exceptions import DowngradeError, HandshakeError, SignatureError

SUITE_PQC = 0x0001
SUITE_CLASSICAL = 0x0002

SUPPORTED_SUITES = {SUITE_PQC, SUITE_CLASSICAL}

SIGNING_CONTEXT = b"QFF-SECCHAN-v1"


class DerivedKeys(NamedTuple):
    k_c2s: bytes
    k_s2c: bytes
    iv_c2s: bytes
    iv_s2c: bytes


class CipherSuite:
    """Encapsulates cryptographic operations for a chosen cipher suite."""

    def __init__(self, suite_id: int):
        if suite_id not in SUPPORTED_SUITES:
            raise DowngradeError(f"Unsupported cipher suite ID: 0x{suite_id:04x}")
        self.suite_id = suite_id

    @property
    def name(self) -> str:
        return "PQC-MLKEM768-MLDSA65-AES256GCM" if self.suite_id == SUITE_PQC else "CLASSICAL-X25519-ED25519-AES256GCM"

    # --- Ephemeral Key Establishment (KEM / ECDH) ----------------------------

    def generate_kem_keypair(self) -> Tuple[object, bytes]:
        """
        Generate ephemeral private key and raw public key bytes.

        Returns:
            (ephemeral_private_key, raw_public_key_bytes)
        """
        if self.suite_id == SUITE_PQC:
            sk = mlkem.MLKEM768PrivateKey.generate()
            return sk, sk.public_key().public_bytes_raw()
        else:
            sk = x25519.X25519PrivateKey.generate()
            return sk, sk.public_key().public_bytes_raw()

    def encapsulate(self, peer_pk_bytes: bytes) -> Tuple[bytes, bytes]:
        """
        Encapsulate shared secret to peer's ephemeral public key.

        Returns:
            (shared_secret: 32 bytes, kem_ciphertext: bytes)
        """
        if self.suite_id == SUITE_PQC:
            if len(peer_pk_bytes) != 1184:
                raise HandshakeError(f"Invalid ML-KEM-768 public key length: {len(peer_pk_bytes)} B (expected 1184 B)")
            try:
                peer_pk = mlkem.MLKEM768PublicKey.from_public_bytes(peer_pk_bytes)
                shared_secret, kem_ct = peer_pk.encapsulate()
                return shared_secret, kem_ct
            except Exception as e:
                raise HandshakeError(f"ML-KEM-768 encapsulation failed: {e}") from e
        else:
            if len(peer_pk_bytes) != 32:
                raise HandshakeError(f"Invalid X25519 public key length: {len(peer_pk_bytes)} B (expected 32 B)")
            try:
                bob_ephemeral_sk = x25519.X25519PrivateKey.generate()
                bob_ephemeral_pk_bytes = bob_ephemeral_sk.public_key().public_bytes_raw()
                alice_pk = x25519.X25519PublicKey.from_public_bytes(peer_pk_bytes)
                shared_secret = bob_ephemeral_sk.exchange(alice_pk)
                return shared_secret, bob_ephemeral_pk_bytes
            except Exception as e:
                raise HandshakeError(f"X25519 key exchange failed: {e}") from e

    def decapsulate(self, my_sk: object, kem_ct_bytes: bytes) -> bytes:
        """
        Decapsulate shared secret using ephemeral private key and received ciphertext.

        Returns:
            shared_secret: 32 bytes
        """
        if self.suite_id == SUITE_PQC:
            assert isinstance(my_sk, mlkem.MLKEM768PrivateKey)
            if len(kem_ct_bytes) != 1088:
                raise HandshakeError(f"Invalid ML-KEM-768 ciphertext length: {len(kem_ct_bytes)} B (expected 1088 B)")
            try:
                return my_sk.decapsulate(kem_ct_bytes)
            except Exception as e:
                raise HandshakeError(f"ML-KEM-768 decapsulation failed: {e}") from e
        else:
            assert isinstance(my_sk, x25519.X25519PrivateKey)
            if len(kem_ct_bytes) != 32:
                raise HandshakeError(f"Invalid X25519 ciphertext length: {len(kem_ct_bytes)} B (expected 32 B)")
            try:
                bob_pk = x25519.X25519PublicKey.from_public_bytes(kem_ct_bytes)
                return my_sk.exchange(bob_pk)
            except Exception as e:
                raise HandshakeError(f"X25519 decapsulation failed: {e}") from e

    # --- Digital Signatures ---------------------------------------------------

    def sign(self, sk: object, message: bytes) -> bytes:
        """Sign a message using the identity private key."""
        if self.suite_id == SUITE_PQC:
            assert isinstance(sk, mldsa.MLDSA65PrivateKey)
            return sk.sign(message, context=SIGNING_CONTEXT)
        else:
            assert isinstance(sk, ed25519.Ed25519PrivateKey)
            return sk.sign(message)

    def verify(self, pk_bytes: bytes, signature: bytes, message: bytes) -> None:
        """
        Verify a digital signature against raw public key bytes.

        Raises:
            SignatureError: If signature verification fails.
        """
        try:
            if self.suite_id == SUITE_PQC:
                pk = mldsa.MLDSA65PublicKey.from_public_bytes(pk_bytes)
                pk.verify(signature, message, context=SIGNING_CONTEXT)
            else:
                pk = ed25519.Ed25519PublicKey.from_public_bytes(pk_bytes)
                pk.verify(signature, message)
        except InvalidSignature as e:
            raise SignatureError("Digital signature verification failed") from e
        except Exception as e:
            raise SignatureError(f"Signature error: {e}") from e

    # --- Key Schedule (HKDF-SHA256 RFC 5869) ----------------------------------

    @staticmethod
    def derive_keys(
        shared_secret: bytes,
        client_random: bytes,
        server_random: bytes,
        final_transcript_hash: bytes,
    ) -> DerivedKeys:
        """
        Derive directional AES-256 traffic keys and 32-bit IV bases.

        HKDF-Extract: PRK = HKDF-Extract(salt = client_random || server_random, IKM = shared_secret)
        HKDF-Expand:
            K_c2s  = HKDF-Expand(PRK, "QFF-SECCHAN-v1:c2s:key:" || H_final, 32)
            K_s2c  = HKDF-Expand(PRK, "QFF-SECCHAN-v1:s2c:key:" || H_final, 32)
            IV_c2s = HKDF-Expand(PRK, "QFF-SECCHAN-v1:c2s:iv:"  || H_final, 4)
            IV_s2c = HKDF-Expand(PRK, "QFF-SECCHAN-v1:s2c:iv:"  || H_final, 4)
        """
        salt = client_random + server_random
        prk = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            info=b"QFF-SECCHAN-v1:extract",
        ).derive(shared_secret)

        def expand(label: bytes, length: int) -> bytes:
            info = b"QFF-SECCHAN-v1:" + label + b":" + final_transcript_hash
            return HKDF(
                algorithm=hashes.SHA256(),
                length=length,
                salt=None,
                info=info,
            ).derive(prk)

        k_c2s = expand(b"c2s:key", 32)
        k_s2c = expand(b"s2c:key", 32)
        iv_c2s = expand(b"c2s:iv", 4)
        iv_s2c = expand(b"s2c:iv", 4)

        return DerivedKeys(k_c2s=k_c2s, k_s2c=k_s2c, iv_c2s=iv_c2s, iv_s2c=iv_s2c)

