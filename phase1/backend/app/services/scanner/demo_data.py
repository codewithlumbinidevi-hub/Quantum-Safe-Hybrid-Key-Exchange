"""
Q-SHIELD Demo Mode — Synthetic Sample Repository Generator.

Creates a clearly-labelled synthetic repository with documented cryptographic
patterns that demonstrate scanner detection capabilities.

All sample files are fictional and serve demonstration purposes only.
They do NOT represent real application code and must not be executed.
"""
from __future__ import annotations
import tempfile
from pathlib import Path


DEMO_FILES = {
    "auth/rsa_auth.py": '''\
"""
Demo: RSA-based authentication module.
SYNTHETIC SAMPLE — Do not use in production.
"""
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization

def generate_rsa_keypair(key_size=2048):
    """Generate RSA key pair for authentication."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=key_size,
    )
    return private_key, private_key.public_key()

def sign_payload(private_key, payload: bytes) -> bytes:
    """Sign payload with RSA-PSS."""
    signature = private_key.sign(
        payload,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH,
        ),
        hashes.SHA256(),
    )
    return signature

def verify_signature(public_key, payload: bytes, signature: bytes) -> bool:
    """Verify RSA-PSS signature."""
    try:
        public_key.verify(
            signature,
            payload,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH,
            ),
            hashes.SHA256(),
        )
        return True
    except Exception:
        return False
''',

    "exchange/ecdh_exchange.py": '''\
"""
Demo: ECDH key exchange module.
SYNTHETIC SAMPLE — Do not use in production.
"""
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.ec import ECDH
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

def ecdh_key_exchange():
    """Perform ECDH key exchange on P-256 (secp256r1)."""
    # Alice generates key pair
    alice_private = ec.generate_private_key(ec.SECP256R1())
    alice_public = alice_private.public_key()

    # Bob generates key pair
    bob_private = ec.generate_private_key(ec.SECP256R1())
    bob_public = bob_private.public_key()

    # Alice computes shared secret
    alice_shared = alice_private.exchange(ECDH(), bob_public)

    # Bob computes shared secret
    bob_shared = bob_private.exchange(ECDH(), alice_public)

    assert alice_shared == bob_shared, "Shared secrets must match"

    # Derive symmetric key
    derived_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"ecdh-demo",
    ).derive(alice_shared)

    return derived_key
''',

    "exchange/ecdsa_signer.py": '''\
"""
Demo: ECDSA digital signature module.
SYNTHETIC SAMPLE — Do not use in production.
"""
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes

CURVE = ec.SECP384R1()

def generate_ecdsa_key():
    return ec.generate_private_key(CURVE)

def sign_message(private_key, message: bytes) -> bytes:
    """Sign a message with ECDSA."""
    return private_key.sign(message, ec.ECDSA(hashes.SHA256()))

def verify_message(public_key, message: bytes, signature: bytes) -> bool:
    """Verify ECDSA signature."""
    try:
        public_key.verify(signature, message, ec.ECDSA(hashes.SHA256()))
        return True
    except Exception:
        return False
''',

    "keystore/dsa_legacy.py": '''\
"""
Demo: Legacy DSA key management (retained for backward compatibility).
SYNTHETIC SAMPLE — Do not use in production.
"""
from cryptography.hazmat.primitives.asymmetric import dsa
from cryptography.hazmat.primitives import hashes

def generate_dsa_key(key_size=2048):
    """Generate a DSA private key."""
    return dsa.generate_private_key(key_size=key_size)

def dsa_sign(private_key, data: bytes) -> bytes:
    return private_key.sign(data, hashes.SHA256())
''',

    "tls/dh_params.py": '''\
"""
Demo: Diffie-Hellman parameter generation for TLS.
SYNTHETIC SAMPLE — Do not use in production.
"""
from cryptography.hazmat.primitives.asymmetric import dh

def generate_dh_parameters(key_size=2048):
    """Generate Diffie-Hellman parameters."""
    parameters = dh.generate_parameters(generator=2, key_size=key_size)
    return parameters

def dh_key_exchange(parameters):
    """Perform a DH key exchange."""
    private_key = parameters.generate_private_key()
    public_key = private_key.public_key()
    return private_key, public_key
''',

    "config/crypto_config.py": '''\
"""
Demo: Cryptographic configuration constants.
SYNTHETIC SAMPLE — Do not use in production.
"""

# RSA configuration
RSA_KEY_SIZE = 2048
RSA_PUBLIC_EXPONENT = 65537

# ECDSA curve selection
ECDSA_CURVE = "P-256"

# TLS configuration
TLS_PREFERRED_CIPHERS = [
    "ECDHE-RSA-AES256-GCM-SHA384",
    "ECDHE-ECDSA-AES256-GCM-SHA384",
]

# Legacy symmetric cipher
LEGACY_CIPHER = "AES-128-CBC"
''',

    "utils/crypto_utils.py": '''\
"""
Demo: Shared cryptographic utility functions.
SYNTHETIC SAMPLE — Do not use in production.
"""
import ssl
from cryptography.hazmat.primitives.asymmetric import rsa, ec

def load_certificate(cert_path: str):
    """Load an X.509 certificate."""
    import OpenSSL.crypto
    with open(cert_path, "rb") as f:
        return OpenSSL.crypto.load_certificate(OpenSSL.crypto.FILETYPE_PEM, f.read())

def create_self_signed_rsa():
    """Create a self-signed RSA certificate."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=4096)
    return key

def create_ec_key():
    """Create an EC key on P-521."""
    return ec.generate_private_key(ec.SECP521R1())

# TLS context with default settings
ssl_context = ssl.create_default_context()
''',

    "tests/test_crypto.py": '''\
"""
Demo: Unit tests for cryptographic modules.
SYNTHETIC SAMPLE — Do not use in production.
"""
import pytest
from auth.rsa_auth import generate_rsa_keypair, sign_payload, verify_signature
from exchange.ecdh_exchange import ecdh_key_exchange

def test_rsa_sign_verify():
    priv, pub = generate_rsa_keypair(key_size=2048)
    payload = b"test data"
    sig = sign_payload(priv, payload)
    assert verify_signature(pub, payload, sig)

def test_ecdh_produces_shared_key():
    key = ecdh_key_exchange()
    assert len(key) == 32
''',
}

# Ground-truth annotation for the demo repository.
# Format: (relative_file_path, rule_id, line_number)
DEMO_GROUND_TRUTH = [
    ("auth/rsa_auth.py",     "CRYPTO-RSA-001", 11),
    ("auth/rsa_auth.py",     "CRYPTO-RSA-003", 17),
    ("auth/rsa_auth.py",     "CRYPTO-RSA-003", 27),
    ("exchange/ecdh_exchange.py", "CRYPTO-ECC-001", 12),
    ("exchange/ecdh_exchange.py", "CRYPTO-ECC-001", 15),
    ("exchange/ecdh_exchange.py", "CRYPTO-ECC-002", 19),
    ("exchange/ecdh_exchange.py", "CRYPTO-ECC-002", 22),
    ("exchange/ecdsa_signer.py", "CRYPTO-ECC-001", 13),
    ("exchange/ecdsa_signer.py", "CRYPTO-ECC-003", 19),
    ("keystore/dsa_legacy.py", "CRYPTO-DSA-001", 11),
    ("tls/dh_params.py",     "CRYPTO-DH-001", 11),
    ("utils/crypto_utils.py", "CRYPTO-LIB-001", 5),  # import ssl
    ("utils/crypto_utils.py", "CRYPTO-RSA-001", 20),
    ("utils/crypto_utils.py", "CRYPTO-ECC-001", 25),
    ("config/crypto_config.py", "CRYPTO-INFO-001", 5),
]


def create_demo_repository() -> Path:
    """
    Write synthetic demo files to a fresh temporary directory and return the path.
    The caller is responsible for cleanup.
    """
    tmp = Path(tempfile.mkdtemp(prefix="qshield_demo_"))
    for rel_path, content in DEMO_FILES.items():
        target = tmp / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    return tmp
