"""
Session Transcript Accumulator and Cryptographic Binding.

Binds all handshake messages, identities, algorithms, nonces, and keys into
canonical SHA-256 hashes for signing and key schedule input.
"""
from __future__ import annotations

import hashlib

TRANSCRIPT_PREFIX_SERVER = b"QSC-TRANSCRIPT-v1:SERVER:"
TRANSCRIPT_PREFIX_CLIENT = b"QSC-TRANSCRIPT-v1:CLIENT:"
TRANSCRIPT_PREFIX_FINAL = b"QSC-TRANSCRIPT-v1:FINAL:"

SIGN_PREFIX_SERVER = b"SERVER-AUTH:"
SIGN_PREFIX_CLIENT = b"CLIENT-AUTH:"


class TranscriptAccumulator:
    """Computes canonical transcript hashes for Bob's auth, Alice's auth, and final derivation."""

    @staticmethod
    def hash_server_transcript(client_hello_wire: bytes, server_hello_unsigned_wire: bytes) -> bytes:
        """
        Compute SHA-256 digest over ClientHello and unsigned ServerHello.
        """
        h = hashlib.sha256()
        h.update(TRANSCRIPT_PREFIX_SERVER)
        h.update(client_hello_wire)
        h.update(server_hello_unsigned_wire)
        return h.digest()

    @staticmethod
    def get_server_signing_payload(client_hello_wire: bytes, server_hello_unsigned_wire: bytes) -> bytes:
        """Data passed to Bob's signature function."""
        th = TranscriptAccumulator.hash_server_transcript(client_hello_wire, server_hello_unsigned_wire)
        return SIGN_PREFIX_SERVER + th

    @staticmethod
    def hash_client_transcript(client_hello_wire: bytes, server_hello_full_wire: bytes) -> bytes:
        """
        Compute SHA-256 digest over ClientHello and full ServerHello (including Bob's signature).
        """
        h = hashlib.sha256()
        h.update(TRANSCRIPT_PREFIX_CLIENT)
        h.update(client_hello_wire)
        h.update(server_hello_full_wire)
        return h.digest()

    @staticmethod
    def get_client_signing_payload(client_hello_wire: bytes, server_hello_full_wire: bytes) -> bytes:
        """Data passed to Alice's signature function."""
        th = TranscriptAccumulator.hash_client_transcript(client_hello_wire, server_hello_full_wire)
        return SIGN_PREFIX_CLIENT + th

    @staticmethod
    def hash_final_transcript(
        client_hello_wire: bytes,
        server_hello_full_wire: bytes,
        client_auth_wire: bytes,
    ) -> bytes:
        """
        Compute final 32-byte session transcript digest binding all 3 handshake flights.
        """
        h = hashlib.sha256()
        h.update(TRANSCRIPT_PREFIX_FINAL)
        h.update(client_hello_wire)
        h.update(server_hello_full_wire)
        h.update(client_auth_wire)
        return h.digest()

