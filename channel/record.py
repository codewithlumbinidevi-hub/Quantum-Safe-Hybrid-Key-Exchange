"""
Authenticated Encryption Record Layer (AES-256-GCM).

Provides:
- Directional traffic keys and 4-byte IV bases
- Monotonic 64-bit sequence numbers (nonces strictly never repeat)
- 13-byte authenticated record headers bound as AAD
- Streaming chunked transmission for large payloads (up to 10+ MB)
- Tamper detection with zero plaintext leakage on InvalidTag
"""
from __future__ import annotations

import struct
from typing import List, Tuple

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .exceptions import InvalidTagError, SequenceNumberError
from .wire import (
    MSG_APP_RECORD,
    REC_TYPE_CHUNK,
    REC_TYPE_FINAL,
    RECORD_HEADER_SIZE,
    pack_frame,
    pack_record_header,
    unpack_frame,
    unpack_record_header,
)

DEFAULT_CHUNK_SIZE = 64 * 1024  # 64 KB per record


class RecordLayer:
    """Manages symmetric directional authenticated encryption and sequence numbers."""

    def __init__(
        self,
        write_key: bytes,
        read_key: bytes,
        write_iv_base: bytes,
        read_iv_base: bytes,
    ):
        if len(write_key) != 32 or len(read_key) != 32:
            raise ValueError("AES-256-GCM requires 32-byte keys")
        if len(write_iv_base) != 4 or len(read_iv_base) != 4:
            raise ValueError("IV base must be 4 bytes")

        self.write_key = write_key
        self.read_key = read_key
        self.write_iv_base = write_iv_base
        self.read_iv_base = read_iv_base

        self._aes_write = AESGCM(self.write_key)
        self._aes_read = AESGCM(self.read_key)

        self.write_seq = 0
        self.read_seq = 0

    def _build_nonce(self, iv_base: bytes, seq: int) -> bytes:
        """Construct 96-bit (12-byte) nonce: 4-byte base || 8-byte uint64 sequence number."""
        return iv_base + struct.pack(">Q", seq)

    def encrypt_record(self, plaintext: bytes, is_final: bool = True) -> bytes:
        """
        Encrypt a single record payload into a framed wire message.

        Wire format:
        Frame: [Magic(4) | MSG_APP_RECORD(1) | FrameLen(4)]
        Body : [AAD Header(13) | Ciphertext + Tag(len + 16)]
        """
        rec_type = REC_TYPE_FINAL if is_final else REC_TYPE_CHUNK
        seq = self.write_seq
        aad = pack_record_header(rec_type, seq, len(plaintext))
        nonce = self._build_nonce(self.write_iv_base, seq)

        # AESGCM.encrypt appends 16-byte authentication tag
        ciphertext_and_tag = self._aes_write.encrypt(nonce, plaintext, aad)
        self.write_seq += 1

        body = aad + ciphertext_and_tag
        return pack_frame(MSG_APP_RECORD, body)

    def decrypt_record(self, frame_body: bytes) -> Tuple[bytes, bool]:
        """
        Decrypt and authenticate an incoming record frame body.

        Raises:
            SequenceNumberError: If sequence number is replayed, skipped, or out of order.
            InvalidTagError: If ciphertext, tag, or AAD header is tampered. Plaintext is NEVER returned.

        Returns:
            (plaintext_bytes, is_final_chunk)
        """
        if len(frame_body) < RECORD_HEADER_SIZE + 16:  # AAD header + 16B GCM tag min
            raise InvalidTagError("Record too short to contain header and GCM tag")

        rec_type, seq, payload_len = unpack_record_header(frame_body)
        aad = frame_body[:RECORD_HEADER_SIZE]
        ciphertext_and_tag = frame_body[RECORD_HEADER_SIZE:]

        # Verify strict sequence number monotonicity (replay / reorder defense)
        if seq != self.read_seq:
            raise SequenceNumberError(
                f"Sequence number mismatch: expected {self.read_seq}, got {seq} (replay or reorder detected)"
            )

        if len(ciphertext_and_tag) != payload_len + 16:
            raise InvalidTagError(
                f"Payload length in header ({payload_len}) does not match body ({len(ciphertext_and_tag) - 16})"
            )

        nonce = self._build_nonce(self.read_iv_base, seq)

        try:
            plaintext = self._aes_read.decrypt(nonce, ciphertext_and_tag, aad)
        except InvalidTag as e:
            # Plaintext is guaranteed never released on InvalidTag
            raise InvalidTagError("AES-256-GCM authentication failed: invalid tag or corrupted ciphertext/AAD") from e

        self.read_seq += 1
        is_final = (rec_type == REC_TYPE_FINAL)
        return plaintext, is_final

    # --- High-Level Chunked Payload Streaming ---------------------------------

    def encrypt_payload(self, data: bytes, chunk_size: int = DEFAULT_CHUNK_SIZE) -> List[bytes]:
        """
        Chunk and encrypt a large payload into a sequence of authenticated record wire frames.
        """
        if not data:
            return [self.encrypt_record(b"", is_final=True)]

        frames = []
        total_len = len(data)
        offset = 0

        while offset < total_len:
            chunk = data[offset : offset + chunk_size]
            offset += len(chunk)
            is_final = (offset >= total_len)
            frames.append(self.encrypt_record(chunk, is_final=is_final))

        return frames

    def decrypt_payload_frames(self, frames_body: List[bytes]) -> bytes:
        """
        Sequentially decrypt a list of record frame bodies and reassemble plaintext.
        """
        chunks = []
        for body in frames_body:
            chunk, is_final = self.decrypt_record(body)
            chunks.append(chunk)
            if is_final:
                break
        return b"".join(chunks)

