"""
Canonical binary wire format, framing, and strict serialization for the Secure Channel.

Guarantees unambiguous, length-prefixed encoding for every handshake and record message.
"""
from __future__ import annotations

import struct
from typing import Tuple

from P1_secure_channel.channel.exceptions import HandshakeError, RecordError

FRAME_MAGIC = b"QSC1"
FRAME_HEADER_SIZE = 9  # 4B magic + 1B msg_type + 4B length

MSG_CLIENT_HELLO = 0x01
MSG_SERVER_HELLO = 0x02
MSG_CLIENT_AUTH = 0x03
MSG_APP_RECORD = 0x04
MSG_ALERT = 0x05

PROTOCOL_VERSION = 0x01


# --- Framing ------------------------------------------------------------------

def pack_frame(msg_type: int, body: bytes) -> bytes:
    """Wrap a payload body in a standard QSC1 binary frame."""
    if not (0 <= msg_type <= 255):
        raise ValueError("Invalid msg_type")
    length = len(body)
    if length > 0xFFFFFFFF:
        raise ValueError("Message body exceeds 4GB limit")
    header = FRAME_MAGIC + struct.pack(">BI", msg_type, length)
    return header + body


def unpack_frame(buf: bytes) -> Tuple[int, bytes, bytes]:
    """
    Unpack a single frame from the buffer.

    Returns:
        (msg_type, body, remaining_buf)
    Raises:
        HandshakeError / RecordError if framing is invalid.
    """
    if len(buf) < FRAME_HEADER_SIZE:
        raise HandshakeError("Incomplete frame header")
    magic = buf[:4]
    if magic != FRAME_MAGIC:
        raise HandshakeError(f"Invalid frame magic: {magic!r}")
    msg_type, length = struct.unpack(">BI", buf[4:9])
    total_len = FRAME_HEADER_SIZE + length
    if len(buf) < total_len:
        raise HandshakeError(f"Incomplete frame body: expected {length} bytes, have {len(buf) - FRAME_HEADER_SIZE}")
    body = buf[FRAME_HEADER_SIZE:total_len]
    remaining = buf[total_len:]
    return msg_type, body, remaining


# --- Canonical Field Serialization --------------------------------------------

def pack_bytes16(data: bytes) -> bytes:
    """Serialize byte array prefixed with 2-byte length."""
    if len(data) > 0xFFFF:
        raise ValueError("Byte array too large for 16-bit prefix")
    return struct.pack(">H", len(data)) + data


def unpack_bytes16(buf: bytes, offset: int) -> Tuple[bytes, int]:
    """Deserialize byte array prefixed with 2-byte length."""
    if offset + 2 > len(buf):
        raise HandshakeError("Unexpected end of buffer reading 16-bit length")
    (length,) = struct.unpack(">H", buf[offset : offset + 2])
    data_start = offset + 2
    data_end = data_start + length
    if data_end > len(buf):
        raise HandshakeError(f"Buffer underflow reading byte field of length {length}")
    return buf[data_start:data_end], data_end


def pack_bytes32(data: bytes) -> bytes:
    """Serialize byte array prefixed with 4-byte length."""
    if len(data) > 0xFFFFFFFF:
        raise ValueError("Byte array too large for 32-bit prefix")
    return struct.pack(">I", len(data)) + data


def unpack_bytes32(buf: bytes, offset: int) -> Tuple[bytes, int]:
    """Deserialize byte array prefixed with 4-byte length."""
    if offset + 4 > len(buf):
        raise HandshakeError("Unexpected end of buffer reading 32-bit length")
    (length,) = struct.unpack(">I", buf[offset : offset + 4])
    data_start = offset + 4
    data_end = data_start + length
    if data_end > len(buf):
        raise HandshakeError(f"Buffer underflow reading byte field of length {length}")
    return buf[data_start:data_end], data_end


def pack_str(s: str) -> bytes:
    """Serialize string as UTF-8 bytes prefixed with 2-byte length."""
    return pack_bytes16(s.encode("utf-8"))


def unpack_str(buf: bytes, offset: int) -> Tuple[str, int]:
    """Deserialize string prefixed with 2-byte length."""
    raw_bytes, next_offset = unpack_bytes16(buf, offset)
    try:
        s = raw_bytes.decode("utf-8")
    except UnicodeDecodeError as e:
        raise HandshakeError(f"Malformed UTF-8 string: {e}") from e
    return s, next_offset


# --- Handshake Message Structures ---------------------------------------------

class ClientHello:
    def __init__(
        self,
        version: int,
        suite_id: int,
        sender_id: str,
        target_id: str,
        client_random: bytes,
        kem_public_key: bytes,
    ):
        self.version = version
        self.suite_id = suite_id
        self.sender_id = sender_id
        self.target_id = target_id
        self.client_random = client_random
        self.kem_public_key = kem_public_key

    def serialize(self) -> bytes:
        """Canonical binary serialization of ClientHello."""
        parts = [
            struct.pack(">BH", self.version, self.suite_id),
            pack_str(self.sender_id),
            pack_str(self.target_id),
            self.client_random,  # Exactly 32 bytes
            pack_bytes16(self.kem_public_key),
        ]
        return b"".join(parts)

    @classmethod
    def deserialize(cls, data: bytes) -> ClientHello:
        if len(data) < 3 + 32:  # version(1) + suite(2) + random(32) min
            raise HandshakeError("ClientHello body too short")
        version, suite_id = struct.unpack(">BH", data[:3])
        offset = 3
        sender_id, offset = unpack_str(data, offset)
        target_id, offset = unpack_str(data, offset)
        if offset + 32 > len(data):
            raise HandshakeError("ClientHello missing 32-byte client_random")
        client_random = data[offset : offset + 32]
        offset += 32
        kem_public_key, offset = unpack_bytes16(data, offset)
        if offset != len(data):
            raise HandshakeError("Trailing bytes in ClientHello body")
        return cls(version, suite_id, sender_id, target_id, client_random, kem_public_key)


class ServerHello:
    def __init__(
        self,
        version: int,
        suite_id: int,
        sender_id: str,
        server_random: bytes,
        kem_ciphertext: bytes,
        signature: bytes = b"",
    ):
        self.version = version
        self.suite_id = suite_id
        self.sender_id = sender_id
        self.server_random = server_random
        self.kem_ciphertext = kem_ciphertext
        self.signature = signature

    def serialize_unsigned(self) -> bytes:
        """Canonical serialization of ServerHello without signature (used for signing)."""
        parts = [
            struct.pack(">BH", self.version, self.suite_id),
            pack_str(self.sender_id),
            self.server_random,  # Exactly 32 bytes
            pack_bytes16(self.kem_ciphertext),
        ]
        return b"".join(parts)

    def serialize(self) -> bytes:
        """Full canonical serialization including signature."""
        unsigned = self.serialize_unsigned()
        return unsigned + pack_bytes32(self.signature)

    @classmethod
    def deserialize(cls, data: bytes) -> ServerHello:
        if len(data) < 3 + 32:
            raise HandshakeError("ServerHello body too short")
        version, suite_id = struct.unpack(">BH", data[:3])
        offset = 3
        sender_id, offset = unpack_str(data, offset)
        if offset + 32 > len(data):
            raise HandshakeError("ServerHello missing 32-byte server_random")
        server_random = data[offset : offset + 32]
        offset += 32
        kem_ciphertext, offset = unpack_bytes16(data, offset)
        signature, offset = unpack_bytes32(data, offset)
        if offset != len(data):
            raise HandshakeError("Trailing bytes in ServerHello body")
        return cls(version, suite_id, sender_id, server_random, kem_ciphertext, signature)


class ClientAuth:
    def __init__(self, signature: bytes):
        self.signature = signature

    def serialize(self) -> bytes:
        return pack_bytes32(self.signature)

    @classmethod
    def deserialize(cls, data: bytes) -> ClientAuth:
        signature, offset = unpack_bytes32(data, 0)
        if offset != len(data):
            raise HandshakeError("Trailing bytes in ClientAuth body")
        return cls(signature)


# --- Record Layer Header / AAD ------------------------------------------------

REC_TYPE_CHUNK = 0x01
REC_TYPE_FINAL = 0x02

RECORD_HEADER_FORMAT = ">BQI"  # rec_type(1B) + seq_num(8B) + payload_len(4B) = 13 bytes
RECORD_HEADER_SIZE = struct.calcsize(RECORD_HEADER_FORMAT)


def pack_record_header(rec_type: int, seq_num: int, payload_len: int) -> bytes:
    """Build the 13-byte authenticated record header (used as AES-GCM AAD)."""
    return struct.pack(RECORD_HEADER_FORMAT, rec_type, seq_num, payload_len)


def unpack_record_header(buf: bytes) -> Tuple[int, int, int]:
    """Parse the 13-byte authenticated record header."""
    if len(buf) < RECORD_HEADER_SIZE:
        raise RecordError("Record header truncated")
    rec_type, seq_num, payload_len = struct.unpack(RECORD_HEADER_FORMAT, buf[:RECORD_HEADER_SIZE])
    return rec_type, seq_num, payload_len
