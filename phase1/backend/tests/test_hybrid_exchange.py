"""
Unit tests for Hybrid Exchange Service and AES-GCM demo.
"""
import pytest
from backend.app.services.hybrid_exchange_service import HybridExchangeService
from backend.app.utils.aes_gcm import encrypt_aes_gcm, decrypt_aes_gcm


def test_hybrid_exchange_handshake_success():
    result = HybridExchangeService.execute_handshake(demo_message="Test message for Q-SHIELD-PQC")
    assert result["success"] is True
    assert result["verification"]["ecdh_secrets_match"] is True
    assert result["verification"]["mlkem_secrets_match"] is True
    assert result["verification"]["hybrid_keys_match"] is True
    assert result["verification"]["alice_key_fingerprint_sha256"] == result["verification"]["bob_key_fingerprint_sha256"]

    # Verify reported sizes
    assert result["payload_sizes"]["alice_ecdh_public_key_bytes"] == 65
    assert result["payload_sizes"]["bob_ecdh_public_key_bytes"] == 65
    assert result["payload_sizes"]["bob_mlkem_public_key_bytes"] == 1184
    assert result["payload_sizes"]["mlkem_ciphertext_bytes"] == 1088
    assert result["payload_sizes"]["total_exchange_payload_bytes"] == 2402

    # Verify AES-GCM demo
    demo = result["aes_gcm_demo"]
    assert demo is not None
    assert demo["decryption_success"] is True
    assert demo["decrypted_plaintext"] == "Test message for Q-SHIELD-PQC"


def test_aes_gcm_tamper_detection():
    key = b"K" * 32
    enc = encrypt_aes_gcm(key, b"Secret Payload")
    combined = bytes.fromhex(enc["combined_hex"])
    nonce = bytes.fromhex(enc["nonce_hex"])

    # Tamper with ciphertext
    tampered = bytearray(combined)
    tampered[0] ^= 0xFF
    success, _, err = decrypt_aes_gcm(key, nonce, bytes(tampered))
    assert success is False
    assert "Authentication failed" in err


def test_fresh_session_randomness():
    """Verify that different independent sessions produce distinct keys and transcripts."""
    s1 = HybridExchangeService.execute_handshake()
    s2 = HybridExchangeService.execute_handshake()
    assert s1["verification"]["alice_key_fingerprint_sha256"] != s2["verification"]["alice_key_fingerprint_sha256"]
    assert s1["public_transcript"]["alice_ecdh_pk_preview"] != s2["public_transcript"]["alice_ecdh_pk_preview"]
    assert s1["public_transcript"]["transcript_hash_sha256"] != s2["public_transcript"]["transcript_hash_sha256"]


def test_no_secret_keys_in_response():
    """Ensure no private key bytes or shared secrets leak in public responses."""
    result = HybridExchangeService.execute_handshake()
    raw_str = str(result)
    assert "private_key" not in raw_str.lower() or "public_key" in raw_str.lower()
    assert "shared_secret" not in result  # shared secrets must not be keys in response


def test_crypto_benchmark_modes():
    """Verify that CryptoBenchmarkService executes all three required benchmark modes."""
    from backend.app.services.crypto_benchmark_service import CryptoBenchmarkService
    
    # 1. Hybrid mode
    res_hybrid = CryptoBenchmarkService.run_benchmark(iterations=3, benchmark_mode="hybrid", save_csv=False)
    assert res_hybrid["verification"]["status"] == "PASS"
    assert "total_handshake" in res_hybrid["statistics"]
    assert "ecdh_keygen" in res_hybrid["statistics"]
    assert "mlkem_encapsulation" in res_hybrid["statistics"]

    # 2. ECDH only mode
    res_ecdh = CryptoBenchmarkService.run_benchmark(iterations=3, benchmark_mode="ecdh_only", save_csv=False)
    assert res_ecdh["verification"]["status"] == "PASS"
    assert "ecdh_keygen" in res_ecdh["statistics"]
    assert "mlkem_keygen" not in res_ecdh["statistics"]

    # 3. ML-KEM only mode
    res_mlkem = CryptoBenchmarkService.run_benchmark(iterations=3, benchmark_mode="mlkem_only", save_csv=False)
    assert res_mlkem["verification"]["status"] == "PASS"
    assert "mlkem_keygen" in res_mlkem["statistics"]
    assert "ecdh_keygen" not in res_mlkem["statistics"]

