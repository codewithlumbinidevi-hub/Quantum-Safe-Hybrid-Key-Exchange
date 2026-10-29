"""
Unit tests for ECDH Service (NIST P-256).
"""
import pytest
from backend.app.services.ecdh_service import ECDHService


def test_ecdh_keygen_and_serialization():
    sk, pk_bytes = ECDHService.generate_key_pair()
    assert len(pk_bytes) == ECDHService.PUBLIC_KEY_SIZE_UNCOMPRESSED
    assert pk_bytes[0] == 0x04  # Uncompressed point prefix


def test_ecdh_shared_secret_derivation():
    alice_sk, alice_pk_bytes = ECDHService.generate_key_pair()
    bob_sk, bob_pk_bytes = ECDHService.generate_key_pair()

    alice_pk = ECDHService.load_public_key(alice_pk_bytes)
    bob_pk = ECDHService.load_public_key(bob_pk_bytes)

    alice_ss = ECDHService.derive_shared_secret(alice_sk, bob_pk)
    bob_ss = ECDHService.derive_shared_secret(bob_sk, alice_pk)

    assert len(alice_ss) == ECDHService.SHARED_SECRET_SIZE
    assert len(bob_ss) == ECDHService.SHARED_SECRET_SIZE
    assert alice_ss == bob_ss


def test_ecdh_invalid_public_key():
    with pytest.raises(ValueError):
        ECDHService.load_public_key(b"invalid_bytes")

    # Wrong prefix
    with pytest.raises(ValueError):
        ECDHService.load_public_key(b"\x02" + b"\x00" * 64)
