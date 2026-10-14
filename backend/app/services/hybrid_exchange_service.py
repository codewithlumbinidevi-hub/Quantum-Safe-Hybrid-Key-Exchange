"""
Hybrid Key Exchange Orchestration Service.
Simulates a full 2-party (Alice & Bob) post-quantum hybrid key exchange combining
NIST P-256 ECDH and NIST FIPS 203 ML-KEM-768.
"""
import time
from typing import Dict, Any, Optional

from backend.app.services.ecdh_service import ECDHService
from backend.app.services.mlkem_service import MLKEMService
from backend.app.services.hybrid_kdf import HybridKDFService
from backend.app.utils.aes_gcm import encrypt_aes_gcm, decrypt_aes_gcm


class HybridExchangeService:
    """Orchestrates an end-to-end Alice <-> Bob hybrid key exchange handshake."""

    @classmethod
    def execute_handshake(cls, demo_message: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute full step-by-step hybrid key agreement:
        1. Alice generates ephemeral ECDH P-256 key pair.
        2. Bob generates ephemeral ECDH P-256 key pair.
        3. Bob generates ML-KEM-768 key pair.
        4. Alice and Bob independently derive identical ECDH shared secrets.
        5. Alice encapsulates to Bob's ML-KEM-768 public key.
        6. Bob decapsulates the ML-KEM-768 ciphertext.
        7. Both independently compute the public transcript hash.
        8. Both independently derive the hybrid master key via HKDF-SHA256.
        9. Check that derived keys match without exposing secrets.
        10. Optional: Demonstrate AES-256-GCM authenticated message encryption.
        
        Returns:
            Dictionary with safe non-secret diagnostics, sizes, timings, and verification booleans.
        """
        start_total = time.perf_counter_ns()
        timings: Dict[str, float] = {}

        # -------------------------------------------------------------
        # Step 1: Alice generates ECDH P-256 key pair
        # -------------------------------------------------------------
        t0 = time.perf_counter_ns()
        alice_ecdh_sk, alice_ecdh_pk_bytes = ECDHService.generate_key_pair()
        timings["alice_ecdh_keygen_ms"] = (time.perf_counter_ns() - t0) / 1_000_000

        # -------------------------------------------------------------
        # Step 2: Bob generates ECDH P-256 key pair
        # -------------------------------------------------------------
        t0 = time.perf_counter_ns()
        bob_ecdh_sk, bob_ecdh_pk_bytes = ECDHService.generate_key_pair()
        timings["bob_ecdh_keygen_ms"] = (time.perf_counter_ns() - t0) / 1_000_000

        # -------------------------------------------------------------
        # Step 3: Bob generates ML-KEM-768 key pair
        # -------------------------------------------------------------
        t0 = time.perf_counter_ns()
        bob_mlkem_sk, bob_mlkem_pk_bytes = MLKEMService.generate_key_pair()
        timings["bob_mlkem_keygen_ms"] = (time.perf_counter_ns() - t0) / 1_000_000

        # -------------------------------------------------------------
        # Step 4: Alice & Bob derive ECDH shared secret
        # -------------------------------------------------------------
        t0 = time.perf_counter_ns()
        bob_ecdh_pk_loaded = ECDHService.load_public_key(bob_ecdh_pk_bytes)
        alice_ecdh_ss = ECDHService.derive_shared_secret(alice_ecdh_sk, bob_ecdh_pk_loaded)
        timings["alice_ecdh_derivation_ms"] = (time.perf_counter_ns() - t0) / 1_000_000

        t0 = time.perf_counter_ns()
        alice_ecdh_pk_loaded = ECDHService.load_public_key(alice_ecdh_pk_bytes)
        bob_ecdh_ss = ECDHService.derive_shared_secret(bob_ecdh_sk, alice_ecdh_pk_loaded)
        timings["bob_ecdh_derivation_ms"] = (time.perf_counter_ns() - t0) / 1_000_000

        import hmac

        ecdh_secret_match = hmac.compare_digest(alice_ecdh_ss, bob_ecdh_ss)

        # -------------------------------------------------------------
        # Step 5: Alice encapsulates to Bob's ML-KEM-768 public key
        # -------------------------------------------------------------
        t0 = time.perf_counter_ns()
        bob_mlkem_pk_loaded = MLKEMService.load_public_key(bob_mlkem_pk_bytes)
        alice_mlkem_ss, mlkem_ciphertext = MLKEMService.encapsulate(bob_mlkem_pk_loaded)
        timings["alice_mlkem_encapsulation_ms"] = (time.perf_counter_ns() - t0) / 1_000_000

        # -------------------------------------------------------------
        # Step 6: Bob decapsulates ML-KEM-768 ciphertext
        # -------------------------------------------------------------
        t0 = time.perf_counter_ns()
        bob_mlkem_ss = MLKEMService.decapsulate(bob_mlkem_sk, mlkem_ciphertext)
        timings["bob_mlkem_decapsulation_ms"] = (time.perf_counter_ns() - t0) / 1_000_000

        mlkem_secret_match = hmac.compare_digest(alice_mlkem_ss, bob_mlkem_ss)

        # -------------------------------------------------------------
        # Step 7: Public Transcript Binding & Hybrid Key Derivation
        # -------------------------------------------------------------
        t0 = time.perf_counter_ns()
        transcript_hash = HybridKDFService.compute_transcript_hash(
            alice_ecdh_pk=alice_ecdh_pk_bytes,
            bob_ecdh_pk=bob_ecdh_pk_bytes,
            bob_mlkem_pk=bob_mlkem_pk_bytes,
            mlkem_ciphertext=mlkem_ciphertext,
        )

        alice_hybrid_key = HybridKDFService.derive_hybrid_key(
            ecdh_secret=alice_ecdh_ss,
            mlkem_secret=alice_mlkem_ss,
            transcript_hash=transcript_hash,
        )
        timings["alice_hybrid_kdf_ms"] = (time.perf_counter_ns() - t0) / 1_000_000

        t0 = time.perf_counter_ns()
        bob_hybrid_key = HybridKDFService.derive_hybrid_key(
            ecdh_secret=bob_ecdh_ss,
            mlkem_secret=bob_mlkem_ss,
            transcript_hash=transcript_hash,
        )
        timings["bob_hybrid_kdf_ms"] = (time.perf_counter_ns() - t0) / 1_000_000

        hybrid_keys_match = hmac.compare_digest(alice_hybrid_key, bob_hybrid_key)

        # Total latency
        total_latency_ms = (time.perf_counter_ns() - start_total) / 1_000_000
        timings["total_handshake_ms"] = round(total_latency_ms, 3)

        # Round timings for readability
        for k in timings:
            timings[k] = round(timings[k], 4)

        # Compute safe key fingerprints
        alice_key_fingerprint = HybridKDFService.compute_key_fingerprint(alice_hybrid_key)
        bob_key_fingerprint = HybridKDFService.compute_key_fingerprint(bob_hybrid_key)

        # Optional AES-GCM communication test using the established symmetric key
        aes_gcm_demo = None
        if demo_message is not None and hybrid_keys_match:
            msg_bytes = demo_message.encode("utf-8")
            enc_result = encrypt_aes_gcm(alice_hybrid_key, msg_bytes, associated_data=b"Q-SHIELD-SESSION-1")
            
            # Bob decrypts with his derived key
            combined = bytes.fromhex(enc_result["combined_hex"])
            nonce = bytes.fromhex(enc_result["nonce_hex"])
            dec_success, dec_bytes, dec_error = decrypt_aes_gcm(
                bob_hybrid_key, nonce, combined, associated_data=b"Q-SHIELD-SESSION-1"
            )
            
            aes_gcm_demo = {
                "plaintext_input": demo_message,
                "ciphertext_hex": enc_result["ciphertext_hex"],
                "nonce_hex": enc_result["nonce_hex"],
                "tag_hex": enc_result["tag_hex"],
                "decryption_success": dec_success,
                "decrypted_plaintext": dec_bytes.decode("utf-8", errors="replace") if dec_success else None,
                "error_message": dec_error if not dec_success else None,
            }

        # Payload sizes
        payload_sizes = {
            "alice_ecdh_public_key_bytes": len(alice_ecdh_pk_bytes),
            "bob_ecdh_public_key_bytes": len(bob_ecdh_pk_bytes),
            "bob_mlkem_public_key_bytes": len(bob_mlkem_pk_bytes),
            "mlkem_ciphertext_bytes": len(mlkem_ciphertext),
            "total_exchange_payload_bytes": (
                len(alice_ecdh_pk_bytes) +
                len(bob_ecdh_pk_bytes) +
                len(bob_mlkem_pk_bytes) +
                len(mlkem_ciphertext)
            ),
        }

        success = bool(ecdh_secret_match and mlkem_secret_match and hybrid_keys_match)

        return {
            "success": success,
            "verification": {
                "ecdh_secrets_match": ecdh_secret_match,
                "mlkem_secrets_match": mlkem_secret_match,
                "hybrid_keys_match": hybrid_keys_match,
                "alice_key_fingerprint_sha256": alice_key_fingerprint,
                "bob_key_fingerprint_sha256": bob_key_fingerprint,
            },
            "timings_ms": timings,
            "payload_sizes": payload_sizes,
            "public_transcript": {
                "alice_ecdh_pk_preview": alice_ecdh_pk_bytes.hex()[:32] + "...",
                "bob_ecdh_pk_preview": bob_ecdh_pk_bytes.hex()[:32] + "...",
                "bob_mlkem_pk_preview": bob_mlkem_pk_bytes.hex()[:32] + "...",
                "mlkem_ciphertext_preview": mlkem_ciphertext.hex()[:32] + "...",
                "transcript_hash_sha256": transcript_hash.hex(),
            },
            "aes_gcm_demo": aes_gcm_demo,
            "security_notice": (
                "No private keys or raw shared secrets are persisted, logged, or returned in this response. "
                "Only public keys, ciphertexts, hashes, sizes, and execution durations are included."
            ),
        }
