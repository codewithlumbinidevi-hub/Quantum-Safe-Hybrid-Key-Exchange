"""
Handshake State Machines, Transports, and Protocol Coordinator.

Drives the 3-flight mutual authentication handshake for Alice (Initiator) and Bob (Responder)
over in-process loopback or real TCP socket transports.
"""
from __future__ import annotations

import os
import queue
import socket
import struct
import time
from typing import NamedTuple, Optional, Set, Tuple

from P1_secure_channel.channel.exceptions import (
    DowngradeError,
    HandshakeError,
    SignatureError,
    UntrustedIdentityError,
)
from P1_secure_channel.channel.record import RecordLayer
from P1_secure_channel.channel.suite import (
    SUITE_CLASSICAL,
    SUITE_PQC,
    SUPPORTED_SUITES,
    CipherSuite,
)
from P1_secure_channel.channel.transcript import TranscriptAccumulator
from P1_secure_channel.channel.trust import IdentityKeyPair, TrustAnchorStore
from P1_secure_channel.channel.wire import (
    FRAME_HEADER_SIZE,
    FRAME_MAGIC,
    MSG_CLIENT_AUTH,
    MSG_CLIENT_HELLO,
    MSG_SERVER_HELLO,
    PROTOCOL_VERSION,
    ClientAuth,
    ClientHello,
    ServerHello,
    pack_frame,
    unpack_frame,
)


# --- Abstract Transports ------------------------------------------------------

class Transport:
    """Base transport interface for exchanging framed wire bytes."""

    def send(self, data: bytes) -> None:
        raise NotImplementedError

    def recv_frame(self, timeout: float = 5.0) -> Tuple[int, bytes, bytes]:
        """
        Receive and unpack next frame from transport.

        Returns:
            (msg_type, body, raw_wire_frame)
        """
        raise NotImplementedError


class LoopbackTransport(Transport):
    """In-process thread-safe dual-queue transport for fast, honest local benchmarking."""

    def __init__(self, tx_queue: queue.Queue, rx_queue: queue.Queue):
        self.tx_queue = tx_queue
        self.rx_queue = rx_queue

    @classmethod
    def create_pair(cls) -> Tuple[LoopbackTransport, LoopbackTransport]:
        q1: queue.Queue = queue.Queue()
        q2: queue.Queue = queue.Queue()
        return cls(tx_queue=q1, rx_queue=q2), cls(tx_queue=q2, rx_queue=q1)

    def send(self, data: bytes) -> None:
        self.tx_queue.put(bytes(data))

    def recv_frame(self, timeout: float = 5.0) -> Tuple[int, bytes, bytes]:
        try:
            raw = self.rx_queue.get(timeout=timeout)
        except queue.Empty as e:
            raise HandshakeError("Transport timeout waiting for frame") from e
        msg_type, body, remaining = unpack_frame(raw)
        if remaining:
            raise HandshakeError("Unexpected trailing bytes in frame stream")
        return msg_type, body, raw


class SocketTransport(Transport):
    """Real TCP socket transport for honest network / loopback socket measurements."""

    def __init__(self, sock: socket.socket):
        self.sock = sock
        self._buf = bytearray()

    def send(self, data: bytes) -> None:
        self.sock.sendall(data)

    def _recv_exact(self, n: int, timeout: float = 5.0) -> bytes:
        self.sock.settimeout(timeout)
        while len(self._buf) < n:
            chunk = self.sock.recv(max(4096, n - len(self._buf)))
            if not chunk:
                raise HandshakeError("Connection closed by peer")
            self._buf.extend(chunk)
        res = bytes(self._buf[:n])
        del self._buf[:n]
        return res

    def recv_frame(self, timeout: float = 5.0) -> Tuple[int, bytes, bytes]:
        header_bytes = self._recv_exact(FRAME_HEADER_SIZE, timeout=timeout)
        if header_bytes[:4] != FRAME_MAGIC:
            raise HandshakeError(f"Bad magic on wire: {header_bytes[:4]!r}")
        msg_type, length = struct.unpack(">BI", header_bytes[4:9])
        body_bytes = self._recv_exact(length, timeout=timeout)
        raw_wire = header_bytes + body_bytes
        return msg_type, body_bytes, raw_wire


# --- Handshake Sessions -------------------------------------------------------

class HandshakeMetrics(NamedTuple):
    handshake_time_ms: float
    c2s_bytes: int
    s2c_bytes: int
    total_bytes: int
    final_transcript_hash: bytes
    suite_name: str


class AliceSession:
    """Alice (Client / Initiator) Handshake State Machine."""

    def __init__(
        self,
        identity: str,
        id_keypair: IdentityKeyPair,
        peer_id: str,
        trust_store: TrustAnchorStore,
        suite_id: int = SUITE_PQC,
    ):
        self.identity = identity
        self.id_keypair = id_keypair
        self.peer_id = peer_id
        self.trust_store = trust_store
        self.suite_id = suite_id
        self.cipher_suite = CipherSuite(suite_id)

        # Ephemeral handshake state
        self.client_random: Optional[bytes] = None
        self._kem_sk: Optional[object] = None
        self.client_hello_wire: Optional[bytes] = None
        self.server_hello_wire: Optional[bytes] = None
        self.client_auth_wire: Optional[bytes] = None
        self.final_hash: Optional[bytes] = None

    def start_handshake(self) -> bytes:
        """
        Generate ClientHello frame.

        Returns:
            Wire bytes for ClientHello frame.
        """
        self.client_random = os.urandom(32)
        self._kem_sk, kem_pk_bytes = self.cipher_suite.generate_kem_keypair()

        msg = ClientHello(
            version=PROTOCOL_VERSION,
            suite_id=self.suite_id,
            sender_id=self.identity,
            target_id=self.peer_id,
            client_random=self.client_random,
            kem_public_key=kem_pk_bytes,
        )
        body = msg.serialize()
        self.client_hello_wire = pack_frame(MSG_CLIENT_HELLO, body)
        return self.client_hello_wire

    def process_server_hello(self, body: bytes, raw_wire: bytes) -> Tuple[bytes, RecordLayer]:
        """
        Process ServerHello frame, verify Bob's identity and signature, decapsulate secret,
        generate ClientAuth frame, and derive directional RecordLayer.

        Returns:
            (client_auth_wire_bytes, record_layer)
        """
        if self.client_hello_wire is None:
            raise HandshakeError("Handshake not initialized (ClientHello not sent)")

        self.server_hello_wire = raw_wire
        server_hello = ServerHello.deserialize(body)

        # 1. Validate version and suite
        if server_hello.version != PROTOCOL_VERSION:
            raise HandshakeError(f"Unsupported server protocol version: {server_hello.version}")
        if server_hello.suite_id != self.suite_id:
            raise DowngradeError(
                f"Cipher suite downgrade or mismatch: requested 0x{self.suite_id:04x}, received 0x{server_hello.suite_id:04x}"
            )
        if server_hello.sender_id != self.peer_id:
            raise UntrustedIdentityError(
                f"Server identity mismatch: expected '{self.peer_id}', got '{server_hello.sender_id}'"
            )

        # 2. Check Bob's identity key against pinned trust anchor
        bob_pk_bytes = self.trust_store.get_pinned_key(self.peer_id)

        # 3. Verify Bob's signature over transcript
        unsigned_wire = server_hello.serialize_unsigned()
        server_auth_payload = TranscriptAccumulator.get_server_signing_payload(
            self.client_hello_wire, unsigned_wire
        )
        self.cipher_suite.verify(bob_pk_bytes, server_hello.signature, server_auth_payload)

        # 4. Decapsulate shared secret
        shared_secret = self.cipher_suite.decapsulate(self._kem_sk, server_hello.kem_ciphertext)

        # 5. Build ClientAuth signature
        client_auth_payload = TranscriptAccumulator.get_client_signing_payload(
            self.client_hello_wire, self.server_hello_wire
        )
        client_sig = self.cipher_suite.sign(self.id_keypair.private_key, client_auth_payload)
        client_auth_msg = ClientAuth(signature=client_sig)
        client_auth_body = client_auth_msg.serialize()
        self.client_auth_wire = pack_frame(MSG_CLIENT_AUTH, client_auth_body)

        # 6. Final transcript binding & key schedule
        self.final_hash = TranscriptAccumulator.hash_final_transcript(
            self.client_hello_wire, self.server_hello_wire, self.client_auth_wire
        )
        derived = self.cipher_suite.derive_keys(
            shared_secret=shared_secret,
            client_random=self.client_random,
            server_random=server_hello.server_random,
            final_transcript_hash=self.final_hash,
        )

        record_layer = RecordLayer(
            write_key=derived.k_c2s,
            read_key=derived.k_s2c,
            write_iv_base=derived.iv_c2s,
            read_iv_base=derived.iv_s2c,
        )
        return self.client_auth_wire, record_layer


class BobSession:
    """Bob (Server / Responder) Handshake State Machine."""

    def __init__(
        self,
        identity: str,
        id_keypair: IdentityKeyPair,
        expected_client_id: str,
        trust_store: TrustAnchorStore,
        allowed_suites: Optional[Set[int]] = None,
    ):
        self.identity = identity
        self.id_keypair = id_keypair
        self.expected_client_id = expected_client_id
        self.trust_store = trust_store
        self.allowed_suites = allowed_suites or SUPPORTED_SUITES

        # Ephemeral handshake state
        self.cipher_suite: Optional[CipherSuite] = None
        self.server_random: Optional[bytes] = None
        self.client_hello_wire: Optional[bytes] = None
        self.server_hello_wire: Optional[bytes] = None
        self.client_auth_wire: Optional[bytes] = None
        self.shared_secret: Optional[bytes] = None
        self.final_hash: Optional[bytes] = None

    def process_client_hello(self, body: bytes, raw_wire: bytes) -> bytes:
        """
        Process ClientHello, encapsulate secret, sign server transcript, and return ServerHello frame.

        Returns:
            Wire bytes for ServerHello frame.
        """
        self.client_hello_wire = raw_wire
        client_hello = ClientHello.deserialize(body)

        # 1. Validate version, suite, and target
        if client_hello.version != PROTOCOL_VERSION:
            raise HandshakeError(f"Unsupported client protocol version: {client_hello.version}")
        if client_hello.suite_id not in self.allowed_suites:
            raise DowngradeError(f"Disallowed or unsupported cipher suite: 0x{client_hello.suite_id:04x}")
        if client_hello.target_id != self.identity:
            raise UntrustedIdentityError(
                f"Client target identity mismatch: intended for '{client_hello.target_id}', I am '{self.identity}'"
            )
        if client_hello.sender_id != self.expected_client_id:
            raise UntrustedIdentityError(
                f"Unexpected client identity: expected '{self.expected_client_id}', got '{client_hello.sender_id}'"
            )

        # Verify client identity key exists in trust anchor
        _ = self.trust_store.get_pinned_key(self.expected_client_id)

        self.cipher_suite = CipherSuite(client_hello.suite_id)
        self.server_random = os.urandom(32)

        # 2. Encapsulate shared secret
        self.shared_secret, kem_ciphertext = self.cipher_suite.encapsulate(client_hello.kem_public_key)

        # 3. Create unsigned ServerHello and sign server transcript
        unsigned_msg = ServerHello(
            version=PROTOCOL_VERSION,
            suite_id=client_hello.suite_id,
            sender_id=self.identity,
            server_random=self.server_random,
            kem_ciphertext=kem_ciphertext,
        )
        unsigned_wire = unsigned_msg.serialize_unsigned()
        server_auth_payload = TranscriptAccumulator.get_server_signing_payload(
            self.client_hello_wire, unsigned_wire
        )
        sig = self.cipher_suite.sign(self.id_keypair.private_key, server_auth_payload)

        # 4. Build full ServerHello
        full_msg = ServerHello(
            version=PROTOCOL_VERSION,
            suite_id=client_hello.suite_id,
            sender_id=self.identity,
            server_random=self.server_random,
            kem_ciphertext=kem_ciphertext,
            signature=sig,
        )
        full_body = full_msg.serialize()
        self.server_hello_wire = pack_frame(MSG_SERVER_HELLO, full_body)
        return self.server_hello_wire

    def process_client_auth(self, body: bytes, raw_wire: bytes) -> RecordLayer:
        """
        Process ClientAuth frame, verify Alice's signature, complete transcript binding,
        and derive directional RecordLayer.

        Returns:
            record_layer
        """
        if self.client_hello_wire is None or self.server_hello_wire is None:
            raise HandshakeError("Handshake out of sequence (ClientHello / ServerHello missing)")

        self.client_auth_wire = raw_wire
        client_auth = ClientAuth.deserialize(body)

        # 1. Verify Alice's signature over full transcript
        alice_pk_bytes = self.trust_store.get_pinned_key(self.expected_client_id)
        client_auth_payload = TranscriptAccumulator.get_client_signing_payload(
            self.client_hello_wire, self.server_hello_wire
        )
        self.cipher_suite.verify(alice_pk_bytes, client_auth.signature, client_auth_payload)

        # 2. Final transcript binding & key schedule
        self.final_hash = TranscriptAccumulator.hash_final_transcript(
            self.client_hello_wire, self.server_hello_wire, self.client_auth_wire
        )
        client_hello = ClientHello.deserialize(self.client_hello_wire[FRAME_HEADER_SIZE:])
        derived = self.cipher_suite.derive_keys(
            shared_secret=self.shared_secret,
            client_random=client_hello.client_random,
            server_random=self.server_random,
            final_transcript_hash=self.final_hash,
        )

        return RecordLayer(
            write_key=derived.k_s2c,
            read_key=derived.k_c2s,
            write_iv_base=derived.iv_s2c,
            read_iv_base=derived.iv_c2s,
        )


# --- Handshake Orchestration --------------------------------------------------

def run_handshake(
    alice: AliceSession,
    bob: BobSession,
    transport_alice: Transport,
    transport_bob: Transport,
) -> Tuple[RecordLayer, RecordLayer, HandshakeMetrics]:
    """
    Drive the complete 3-message handshake between Alice and Bob over the provided transports.

    Returns:
        (alice_record_layer, bob_record_layer, metrics)
    """
    t0 = time.perf_counter_ns()

    # 1. Flight 1: Alice -> Bob (ClientHello)
    ch_frame = alice.start_handshake()
    transport_alice.send(ch_frame)

    msg_type, body, raw = transport_bob.recv_frame()
    if msg_type != MSG_CLIENT_HELLO:
        raise HandshakeError(f"Expected ClientHello, got frame type {msg_type}")
    sh_frame = bob.process_client_hello(body, raw)

    # 2. Flight 2: Bob -> Alice (ServerHello)
    transport_bob.send(sh_frame)

    msg_type, body, raw = transport_alice.recv_frame()
    if msg_type != MSG_SERVER_HELLO:
        raise HandshakeError(f"Expected ServerHello, got frame type {msg_type}")
    ca_frame, alice_record = alice.process_server_hello(body, raw)

    # 3. Flight 3: Alice -> Bob (ClientAuth)
    transport_alice.send(ca_frame)

    msg_type, body, raw = transport_bob.recv_frame()
    if msg_type != MSG_CLIENT_AUTH:
        raise HandshakeError(f"Expected ClientAuth, got frame type {msg_type}")
    bob_record = bob.process_client_auth(body, raw)

    t1 = time.perf_counter_ns()
    elapsed_ms = (t1 - t0) / 1e6

    c2s_bytes = len(ch_frame) + len(ca_frame)
    s2c_bytes = len(sh_frame)
    total_bytes = c2s_bytes + s2c_bytes

    metrics = HandshakeMetrics(
        handshake_time_ms=elapsed_ms,
        c2s_bytes=c2s_bytes,
        s2c_bytes=s2c_bytes,
        total_bytes=total_bytes,
        final_transcript_hash=alice.final_hash,
        suite_name=alice.cipher_suite.name,
    )

    return alice_record, bob_record, metrics
