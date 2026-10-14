"""
Unit tests for ML-KEM-768 Service (NIST FIPS 203).
"""
import pytest
from backend.app.services.mlkem_service import MLKEMService


def test_mlkem_keygen_and_sizes():
    sk, pk_bytes = MLKEMService.generate_key_pair()
    assert len(pk_bytes) == MLKEMService.PUBLIC_KEY_SIZE  # 1184 bytes


def test_mlkem_encapsulate_decapsulate():
    sk, pk_bytes = MLKEMService.generate_key_pair()
    pk = MLKEMService.load_public_key(pk_bytes)

    shared_secret_sender, ciphertext = MLKEMService.encapsulate(pk)
    assert len(ciphertext) == MLKEMService.CIPHERTEXT_SIZE  # 1088 bytes
    assert len(shared_secret_sender) == MLKEMService.SHARED_SECRET_SIZE  # 32 bytes

    shared_secret_receiver = MLKEMService.decapsulate(sk, ciphertext)
    assert len(shared_secret_receiver) == MLKEMService.SHARED_SECRET_SIZE
    assert shared_secret_sender == shared_secret_receiver


def test_mlkem_invalid_ciphertext_length():
    sk, _ = MLKEMService.generate_key_pair()
    with pytest.raises(ValueError):
        MLKEMService.decapsulate(sk, b"\x00" * 500)


def test_mlkem_invalid_public_key_length():
    with pytest.raises(ValueError):
        MLKEMService.load_public_key(b"\x00" * 100)
