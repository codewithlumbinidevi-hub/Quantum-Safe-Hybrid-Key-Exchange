"""
Custom cryptographic and protocol exceptions for the Quantum-Safe Secure Communication Channel.
Plaintext is NEVER returned or leaked when an exception is raised.
"""


class ChannelError(Exception):
    """Base exception for all secure channel errors."""
    pass


class HandshakeError(ChannelError):
    """Raised when handshake processing, validation, or state transition fails."""
    pass


class UntrustedIdentityError(HandshakeError):
    """Raised when a peer's identity key does not match the pinned trust anchor."""
    pass


class SignatureError(HandshakeError):
    """Raised when digital signature verification fails."""
    pass


class TranscriptMismatchError(HandshakeError):
    """Raised when the session transcript hash does not match expected values."""
    pass


class DowngradeError(HandshakeError):
    """Raised when an algorithm suite downgrade or unapproved suite is detected."""
    pass


class RecordError(ChannelError):
    """Base exception for record layer failures."""
    pass


class InvalidTagError(RecordError):
    """Raised when AES-GCM ciphertext, authentication tag, or AAD header is tampered."""
    pass


class SequenceNumberError(RecordError):
    """Raised when an out-of-order, duplicate, or replayed sequence number is received."""
    pass


class ReplayError(ChannelError):
    """Raised when an old handshake or record replay is detected."""
    pass

