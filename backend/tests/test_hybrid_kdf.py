"""
Unit tests for Hybrid KDF Service (HKDF-SHA256).
"""
import pytest
from backend.app.services.hybrid_kdf import HybridKDFService


def test_hybrid_kdf_consistency():
    ss_ecdh = b"E" * 32
    ss_mlkem = b"M" * 32
    transcript = b"T" * 32

    key_alice = HybridKDFService.derive_hybrid_key(ss_ecdh, ss_mlkem, transcript)
    key_bob = HybridKDFService.derive_hybrid_key(ss_ecdh, ss_mlkem, transcript)

    assert len(key_alice) == 32
    assert key_alice == key_bob


def test_hybrid_kdf_transcript_binding():
    ss_ecdh = b"E" * 32
    ss_mlkem = b"M" * 32
    transcript_1 = b"1" * 32
    transcript_2 = b"2" * 32

    key_1 = HybridKDFService.derive_hybrid_key(ss_ecdh, ss_mlkem, transcript_1)
    key_2 = HybridKDFService.derive_hybrid_key(ss_ecdh, ss_mlkem, transcript_2)

    assert key_1 != key_2


def test_hybrid_kdf_secret_differentiation():
    ss_ecdh_1 = b"E" * 32
    ss_ecdh_2 = b"F" * 32
    ss_mlkem = b"M" * 32
    transcript = b"T" * 32

    key_1 = HybridKDFService.derive_hybrid_key(ss_ecdh_1, ss_mlkem, transcript)
    key_2 = HybridKDFService.derive_hybrid_key(ss_ecdh_2, ss_mlkem, transcript)

    assert key_1 != key_2
