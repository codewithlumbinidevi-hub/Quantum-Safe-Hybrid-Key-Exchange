"""
Quantum-Safe Secure Communication Channel (Q-SHIELD PS-P1).
"""
from .exceptions import (
    ChannelError,
    DowngradeError,
    HandshakeError,
    InvalidTagError,
    RecordError,
    ReplayError,
    SequenceNumberError,
    SignatureError,
    TranscriptMismatchError,
    UntrustedIdentityError,
)
from .handshake import (
    AliceSession,
    BobSession,
    HandshakeMetrics,
    LoopbackTransport,
    SocketTransport,
    Transport,
    run_handshake,
)
from .record import RecordLayer
from .suite import (
    SUITE_CLASSICAL,
    SUITE_PQC,
    CipherSuite,
)
from .trust import (
    IdentityKeyPair,
    TrustAnchorStore,
)
from .wire import (
    MSG_APP_RECORD,
    MSG_CLIENT_AUTH,
    MSG_CLIENT_HELLO,
    MSG_SERVER_HELLO,
    ClientAuth,
    ClientHello,
    ServerHello,
    pack_frame,
    unpack_frame,
)

__all__ = [
    "ChannelError",
    "HandshakeError",
    "UntrustedIdentityError",
    "SignatureError",
    "TranscriptMismatchError",
    "DowngradeError",
    "RecordError",
    "InvalidTagError",
    "SequenceNumberError",
    "ReplayError",
    "AliceSession",
    "BobSession",
    "HandshakeMetrics",
    "Transport",
    "LoopbackTransport",
    "SocketTransport",
    "run_handshake",
    "RecordLayer",
    "SUITE_PQC",
    "SUITE_CLASSICAL",
    "CipherSuite",
    "IdentityKeyPair",
    "TrustAnchorStore",
    "MSG_CLIENT_HELLO",
    "MSG_SERVER_HELLO",
    "MSG_CLIENT_AUTH",
    "MSG_APP_RECORD",
    "ClientHello",
    "ServerHello",
    "ClientAuth",
    "pack_frame",
    "unpack_frame",
]
