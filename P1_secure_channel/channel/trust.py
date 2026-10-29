"""
Trust Anchor Store & Identity Key Management.

Strictly rejects Trust-On-First-Use (TOFU). Identity verification keys must be
explicitly pinned out-of-band before connection establishment.
"""
from __future__ import annotations

import hmac
import json
from typing import Dict, Tuple

from cryptography.hazmat.primitives.asymmetric import ed25519, mldsa

from P1_secure_channel.channel.exceptions import UntrustedIdentityError


class IdentityKeyPair:
    """Represents a long-term asymmetric signing keypair (ML-DSA-65 or Ed25519)."""

    def __init__(self, identity: str, suite_id: int, private_key, public_bytes: bytes):
        self.identity = identity
        self.suite_id = suite_id
        self._private_key = private_key
        self.public_bytes = public_bytes

    @property
    def private_key(self):
        return self._private_key

    @classmethod
    def generate_mldsa(cls, identity: str) -> IdentityKeyPair:
        """Generate long-term ML-DSA-65 (FIPS 204) identity keypair."""
        sk = mldsa.MLDSA65PrivateKey.generate()
        pk_bytes = sk.public_key().public_bytes_raw()
        return cls(identity=identity, suite_id=0x0001, private_key=sk, public_bytes=pk_bytes)

    @classmethod
    def generate_ed25519(cls, identity: str) -> IdentityKeyPair:
        """Generate long-term Ed25519 (RFC 8032) identity keypair."""
        sk = ed25519.Ed25519PrivateKey.generate()
        pk_bytes = sk.public_key().public_bytes_raw()
        return cls(identity=identity, suite_id=0x0002, private_key=sk, public_bytes=pk_bytes)


class TrustAnchorStore:
    """
    Pinned Trust Anchor repository mapping peer identity names to their exact
    authorized public verification keys.
    """

    def __init__(self):
        # identity -> public_key_raw_bytes
        self._anchors: Dict[str, bytes] = {}

    def pin_identity(self, identity: str, public_key_bytes: bytes) -> None:
        """Pin a trusted peer's public key."""
        if not identity or not isinstance(identity, str):
            raise ValueError("Identity must be a non-empty string")
        if not isinstance(public_key_bytes, (bytes, bytearray)) or len(public_key_bytes) == 0:
            raise ValueError("Public key must be non-empty bytes")
        self._anchors[identity] = bytes(public_key_bytes)

    def verify_identity(self, identity: str, presented_public_key: bytes) -> None:
        """
        Verify that the presented identity exists in the trust anchor store and
        matches the pinned public key byte-for-byte in constant time.

        Raises:
            UntrustedIdentityError: If identity is unknown or key mismatch occurs.
        """
        pinned_key = self._anchors.get(identity)
        if pinned_key is None:
            raise UntrustedIdentityError(
                f"Peer identity '{identity}' is not in the pinned trust anchor store"
            )

        if not hmac.compare_digest(pinned_key, bytes(presented_public_key)):
            raise UntrustedIdentityError(
                f"Public key presented for '{identity}' does not match the pinned trust anchor"
            )

    def get_pinned_key(self, identity: str) -> bytes:
        """Retrieve pinned public key for an identity."""
        if identity not in self._anchors:
            raise UntrustedIdentityError(f"No pinned key for identity '{identity}'")
        return self._anchors[identity]

    def has_identity(self, identity: str) -> bool:
        return identity in self._anchors

    def to_dict(self) -> Dict[str, str]:
        """Export store as hex mapping for diagnostics or configuration."""
        return {k: v.hex() for k, v in self._anchors.items()}

    @classmethod
    def from_dict(cls, data: Dict[str, str]) -> TrustAnchorStore:
        store = cls()
        for identity, hex_key in data.items():
            store.pin_identity(identity, bytes.fromhex(hex_key))
        return store

    def save_to_file(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def load_from_file(cls, path: str) -> TrustAnchorStore:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)
