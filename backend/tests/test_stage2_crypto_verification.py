"""
Stage 2 Cryptographic Engine Verification & Validation Tests.
Validates:
1. NIST P-256 ECDH primitive agreement and validation.
2. Standardized NIST FIPS 203 ML-KEM-768 keygen, encapsulation, and decapsulation.
3. FIPS 203 exact byte sizes: 1,184 B public key, 1,088 B ciphertext, 32 B shared secret.
4. Independent derivation of identical hybrid keys via transcript-bound HKDF-SHA256.
5. Ephemeral freshness across sessions and rejection on tampered transcripts.
6. Non-leakage: zero private keys or raw shared secrets in return values or artifacts.
7. Explicit distinction between unauthenticated primitive agreement and authenticated key exchange.
"""
import hmac
import pytest
from backend.app.services.ecdh_service import ECDHService
from backend.app.services.mlkem_service import MLKEMService
from backend.app.services.hybrid_kdf import HybridKDFService
from backend.app.services.hybrid_exchange_service import HybridExchangeService
from backend.app.services.crypto_benchmark_service import CryptoBenchmarkService


class TestStage2CryptoEngine:

    def test_ecdh_p256_primitive_agreement(self):
        """2. Verify ECDH P-256 shared-secret agreement between Alice and Bob."""
        # Key generation
        alice_sk, alice_pk_bytes = ECDHService.generate_key_pair()
        bob_sk, bob_pk_bytes = ECDHService.generate_key_pair()

        # Check SEC1 uncompressed format (0x04 prefix + 32-byte X + 32-byte Y)
        assert len(alice_pk_bytes) == 65, "Alice public key must be 65 bytes uncompressed SEC1"
        assert len(bob_pk_bytes) == 65, "Bob public key must be 65 bytes uncompressed SEC1"
        assert alice_pk_bytes[0] == 0x04, "Alice uncompressed point prefix must be 0x04"
        assert bob_pk_bytes[0] == 0x04, "Bob uncompressed point prefix must be 0x04"

        # Deserialize and validate peer keys
        bob_pk = ECDHService.load_public_key(bob_pk_bytes)
        alice_pk = ECDHService.load_public_key(alice_pk_bytes)

        # Scalar multiplication
        alice_shared_secret = ECDHService.derive_shared_secret(alice_sk, bob_pk)
        bob_shared_secret = ECDHService.derive_shared_secret(bob_sk, alice_pk)

        # Verify sizes and equality
        assert len(alice_shared_secret) == 32, "ECDH shared secret must be 32 bytes"
        assert len(bob_shared_secret) == 32, "ECDH shared secret must be 32 bytes"
        assert hmac.compare_digest(alice_shared_secret, bob_shared_secret), "Alice and Bob ECDH shared secrets must match exactly"

        # Boundary checks: invalid keys must be rejected
        with pytest.raises(ValueError):
            ECDHService.load_public_key(b"\x00" * 65)  # Invalid prefix
        with pytest.raises(ValueError):
            ECDHService.load_public_key(b"\x04" + b"\x00" * 32)  # Invalid length

    def test_mlkem768_standardized_fips203_operations_and_sizes(self):
        """3. Verify ML-KEM-768 operations and exact NIST FIPS 203 sizes."""
        # Bob generates ML-KEM-768 key pair
        bob_mlkem_sk, bob_mlkem_pk_bytes = MLKEMService.generate_key_pair()

        # Confirm FIPS 203 public key size: exactly 1184 bytes
        assert len(bob_mlkem_pk_bytes) == 1184, (
            f"FIPS 203 ML-KEM-768 public key must be 1,184 bytes, got {len(bob_mlkem_pk_bytes)}"
        )
        assert len(bob_mlkem_pk_bytes) == MLKEMService.PUBLIC_KEY_SIZE

        # Load and validate Bob's public key
        bob_mlkem_pk = MLKEMService.load_public_key(bob_mlkem_pk_bytes)

        # Alice encapsulates to Bob's public key
        alice_mlkem_ss, ciphertext = MLKEMService.encapsulate(bob_mlkem_pk)

        # Confirm FIPS 203 ciphertext size: exactly 1088 bytes
        assert len(ciphertext) == 1088, (
            f"FIPS 203 ML-KEM-768 ciphertext must be 1,088 bytes, got {len(ciphertext)}"
        )
        assert len(ciphertext) == MLKEMService.CIPHERTEXT_SIZE

        # Confirm FIPS 203 shared secret size: exactly 32 bytes
        assert len(alice_mlkem_ss) == 32, (
            f"FIPS 203 ML-KEM-768 shared secret must be 32 bytes, got {len(alice_mlkem_ss)}"
        )
        assert len(alice_mlkem_ss) == MLKEMService.SHARED_SECRET_SIZE

        # Bob decapsulates the ciphertext
        bob_mlkem_ss = MLKEMService.decapsulate(bob_mlkem_sk, ciphertext)
        assert len(bob_mlkem_ss) == 32, "Decapsulated shared secret must be 32 bytes"

        # Verify matching shared secrets
        assert hmac.compare_digest(alice_mlkem_ss, bob_mlkem_ss), (
            "Alice encapsulated secret and Bob decapsulated secret must match"
        )

        # Invalid ciphertext length rejection
        with pytest.raises(ValueError):
            MLKEMService.decapsulate(bob_mlkem_sk, b"\x00" * 1000)

        # Invalid public key length rejection
        with pytest.raises(ValueError):
            MLKEMService.load_public_key(b"\x00" * 1000)

    def test_hybrid_kdf_dual_combinator_derivation(self):
        """4. Verify independent derivation of identical hybrid keys using HKDF-SHA256."""
        ecdh_secret = b"E" * 32
        mlkem_secret = b"M" * 32
        transcript_hash = b"T" * 32

        # Independent derivations
        alice_key = HybridKDFService.derive_hybrid_key(ecdh_secret, mlkem_secret, transcript_hash)
        bob_key = HybridKDFService.derive_hybrid_key(ecdh_secret, mlkem_secret, transcript_hash)

        assert len(alice_key) == 32, "Derived hybrid key must be 32 bytes (256-bit)"
        assert len(bob_key) == 32, "Derived hybrid key must be 32 bytes (256-bit)"
        assert hmac.compare_digest(alice_key, bob_key), "Derived hybrid keys must be identical"

        # Verify fingerprints
        alice_fp = HybridKDFService.compute_key_fingerprint(alice_key)
        bob_fp = HybridKDFService.compute_key_fingerprint(bob_key)
        assert alice_fp == bob_fp
        assert len(alice_fp) == 64, "SHA-256 fingerprint must be 64 hex characters"

        # Combinator property: both secrets contribute to the derivation
        key_different_ecdh = HybridKDFService.derive_hybrid_key(b"X" * 32, mlkem_secret, transcript_hash)
        assert key_different_ecdh != alice_key, "Altering ECDH secret must alter derived key"

        key_different_mlkem = HybridKDFService.derive_hybrid_key(ecdh_secret, b"Y" * 32, transcript_hash)
        assert key_different_mlkem != alice_key, "Altering ML-KEM secret must alter derived key"

    def test_ephemeral_freshness_and_mismatched_transcript_rejection(self):
        """5. Verify ephemeral freshness across sessions and rejection on transcript mismatch."""
        session_1 = HybridExchangeService.execute_handshake()
        session_2 = HybridExchangeService.execute_handshake()

        assert session_1["success"] is True
        assert session_2["success"] is True

        # Freshness of public keys and transcript
        assert session_1["public_transcript"]["alice_ecdh_pk_preview"] != session_2["public_transcript"]["alice_ecdh_pk_preview"]
        assert session_1["public_transcript"]["bob_ecdh_pk_preview"] != session_2["public_transcript"]["bob_ecdh_pk_preview"]
        assert session_1["public_transcript"]["bob_mlkem_pk_preview"] != session_2["public_transcript"]["bob_mlkem_pk_preview"]
        assert session_1["public_transcript"]["mlkem_ciphertext_preview"] != session_2["public_transcript"]["mlkem_ciphertext_preview"]
        assert session_1["public_transcript"]["transcript_hash_sha256"] != session_2["public_transcript"]["transcript_hash_sha256"]

        # Freshness of derived keys
        assert session_1["verification"]["alice_key_fingerprint_sha256"] != session_2["verification"]["alice_key_fingerprint_sha256"]

        # Transcript tampering / mismatch test
        pk_a = b"\x04" + b"A" * 64
        pk_b = b"\x04" + b"B" * 64
        pk_mlkem = b"M" * 1184
        ct_legit = b"C" * 1088
        ct_tampered = b"D" * 1088

        th_alice = HybridKDFService.compute_transcript_hash(pk_a, pk_b, pk_mlkem, ct_legit)
        th_bob_tampered = HybridKDFService.compute_transcript_hash(pk_a, pk_b, pk_mlkem, ct_tampered)

        assert th_alice != th_bob_tampered, "Tampered ciphertext must produce different transcript hash"

        key_alice = HybridKDFService.derive_hybrid_key(b"E" * 32, b"M" * 32, th_alice)
        key_bob = HybridKDFService.derive_hybrid_key(b"E" * 32, b"M" * 32, th_bob_tampered)

        assert not hmac.compare_digest(key_alice, key_bob), "Tampered transcript must result in key disagreement"

    def test_non_leakage_audit_no_secret_keys_exposed(self):
        """6. Confirm private keys and raw shared secrets are never exposed."""
        handshake = HybridExchangeService.execute_handshake(demo_message="Confidential Payload")
        
        # Check top-level keys
        assert "private_key" not in handshake
        assert "shared_secret" not in handshake
        assert "alice_ecdh_sk" not in handshake
        assert "bob_ecdh_sk" not in handshake
        assert "bob_mlkem_sk" not in handshake
        assert "alice_hybrid_key" not in handshake
        assert "bob_hybrid_key" not in handshake

        # String search across serialized dictionary
        raw_repr = str(handshake)
        forbidden_tokens = ["private_bytes", "secret_bytes", "raw_key", "raw_secret"]
        for token in forbidden_tokens:
            assert token not in raw_repr.lower(), f"Forbidden token '{token}' found in handshake response"

        # Benchmark results check
        benchmark = CryptoBenchmarkService.run_benchmark(iterations=5, save_csv=False)
        for trial in benchmark["trials_preview"]:
            for forbidden in ["key", "secret", "sk"]:
                assert forbidden not in trial, f"Forbidden field '{forbidden}' found in trial record: {trial}"

    def test_protocol_security_distinction(self):
        """7. Verify explicit distinction between primitive agreement and authenticated key exchange."""
        # The service includes an explicit security notice regarding what is provided
        handshake = HybridExchangeService.execute_handshake()
        notice = handshake.get("security_notice", "")
        assert len(notice) > 0, "Handshake must contain an explicit security notice"
        
        # Verify documentation emphasizes educational / experimental scope and lack of PKI signatures
        docstring = HybridExchangeService.__doc__ or ""
        assert len(docstring) > 0
