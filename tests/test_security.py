"""
PS-P1 Mandatory Security Test Suite (T1 - T9 + Robustness Extensions).

Tests both Suite 0x0001 (PQC: ML-KEM-768 + ML-DSA-65) and
Suite 0x0002 (Classical Baseline: X25519 + Ed25519).
"""
import hashlib
import os
import sys
import pytest

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from channel import (
    SUITE_CLASSICAL,
    SUITE_PQC,
    AliceSession,
    BobSession,
    DowngradeError,
    HandshakeError,
    IdentityKeyPair,
    InvalidTagError,
    LoopbackTransport,
    RecordError,
    SequenceNumberError,
    SignatureError,
    TrustAnchorStore,
    UntrustedIdentityError,
    run_handshake,
)
from channel.wire import (
    FRAME_HEADER_SIZE,
    MSG_CLIENT_HELLO,
    MSG_SERVER_HELLO,
    MSG_CLIENT_AUTH,
    ClientHello,
    ServerHello,
    pack_frame,
    pack_record_header,
    unpack_frame,
)


def load_expected_hashes():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(here, "payload_sha256.txt")
    hashes = {}
    with open(path, "r") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) == 2:
                hashes[parts[1]] = parts[0]
    return hashes


def make_keypairs(suite_id: int):
    if suite_id == SUITE_PQC:
        alice_keys = IdentityKeyPair.generate_mldsa("alice")
        bob_keys = IdentityKeyPair.generate_mldsa("bob")
    else:
        alice_keys = IdentityKeyPair.generate_ed25519("alice")
        bob_keys = IdentityKeyPair.generate_ed25519("bob")

    alice_store = TrustAnchorStore()
    alice_store.pin_identity("bob", bob_keys.public_bytes)

    bob_store = TrustAnchorStore()
    bob_store.pin_identity("alice", alice_keys.public_bytes)

    return alice_keys, bob_keys, alice_store, bob_store


# ==============================================================================
# T1: Honest Run
# ==============================================================================

@pytest.mark.parametrize("suite_id", [SUITE_PQC, SUITE_CLASSICAL])
def test_t1_honest_run(suite_id):
    """T1: Handshake completes, both sides derive matching keys, 3 payloads decrypt byte-exact."""
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(suite_id)
    trans_a, trans_b = LoopbackTransport.create_pair()

    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", bob_store)

    rec_a, rec_b, metrics = run_handshake(alice, bob, trans_a, trans_b)

    assert rec_a is not None and rec_b is not None
    assert metrics.total_bytes > 0
    assert len(metrics.final_transcript_hash) == 32

    expected_hashes = load_expected_hashes()
    payload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "payloads")

    for name in ["payload_1KB.bin", "payload_100KB.bin", "payload_10MB.bin"]:
        payload_path = os.path.join(payload_dir, name)
        with open(payload_path, "rb") as f:
            raw_data = f.read()

        # Alice encrypts and sends
        frames = rec_a.encrypt_payload(raw_data, chunk_size=64 * 1024)
        for f in frames:
            trans_a.send(f)

        # Bob receives and decrypts
        received_bodies = []
        for _ in range(len(frames)):
            _, body, _ = trans_b.recv_frame()
            received_bodies.append(body)

        decrypted = rec_b.decrypt_payload_frames(received_bodies)
        computed_sha = hashlib.sha256(decrypted).hexdigest()
        assert computed_sha == expected_hashes[name], f"Hash mismatch for {name}"
        assert decrypted == raw_data


# ==============================================================================
# T2: Handshake Tampering
# ==============================================================================

@pytest.mark.parametrize("suite_id", [SUITE_PQC, SUITE_CLASSICAL])
def test_t2_handshake_tampering_client_hello(suite_id):
    """T2: Flip one bit in ClientHello message -> handshake aborts."""
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(suite_id)
    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    ch_frame = alice.start_handshake()

    for flip_pos in [0, 5, FRAME_HEADER_SIZE + 1, len(ch_frame) - 5]:
        bad_frame = bytearray(ch_frame)
        bad_frame[flip_pos] ^= 0x01
        bob_fresh = BobSession("bob", bob_keys, "alice", bob_store)
        try:
            msg_type, body, _ = unpack_frame(bytes(bad_frame))
            sh = bob_fresh.process_client_hello(body, bytes(bad_frame))
            # If Bob didn't reject format, Alice verifies Bob's signature which must fail!
            _, sh_body, _ = unpack_frame(sh)
            alice_fresh = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
            alice_fresh.client_hello_wire = ch_frame
            with pytest.raises((SignatureError, HandshakeError)):
                alice_fresh.process_server_hello(sh_body, sh)
        except (HandshakeError, SignatureError, UntrustedIdentityError, DowngradeError):
            pass  # Aborted cleanly


@pytest.mark.parametrize("suite_id", [SUITE_PQC, SUITE_CLASSICAL])
def test_t2_handshake_tampering_server_hello(suite_id):
    """T2: Flip one bit in ServerHello (KEM ciphertext, random, signature) -> aborts."""
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(suite_id)
    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", bob_store)

    ch_frame = alice.start_handshake()
    _, ch_body, _ = unpack_frame(ch_frame)
    sh_frame = bob.process_client_hello(ch_body, ch_frame)

    bad_sh = bytearray(sh_frame)
    bad_sh[FRAME_HEADER_SIZE + 40] ^= 0x01
    _, bad_sh_body, _ = unpack_frame(bytes(bad_sh))

    with pytest.raises((SignatureError, HandshakeError)):
        alice.process_server_hello(bad_sh_body, bytes(bad_sh))


@pytest.mark.parametrize("suite_id", [SUITE_PQC, SUITE_CLASSICAL])
def test_t2_handshake_tampering_client_auth(suite_id):
    """T2: Flip one bit in ClientAuth signature -> aborts."""
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(suite_id)
    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", bob_store)

    ch_frame = alice.start_handshake()
    _, ch_body, _ = unpack_frame(ch_frame)
    sh_frame = bob.process_client_hello(ch_body, ch_frame)

    _, sh_body, _ = unpack_frame(sh_frame)
    ca_frame, _ = alice.process_server_hello(sh_body, sh_frame)

    bad_ca = bytearray(ca_frame)
    bad_ca[-2] ^= 0x01
    _, bad_ca_body, _ = unpack_frame(bytes(bad_ca))

    with pytest.raises(SignatureError):
        bob.process_client_auth(bad_ca_body, bytes(bad_ca))


# ==============================================================================
# T3: Signature Tampering
# ==============================================================================

@pytest.mark.parametrize("suite_id", [SUITE_PQC, SUITE_CLASSICAL])
def test_t3_signature_tampering(suite_id):
    """T3: Flip one bit in the digital signature -> rejected with signature failure."""
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(suite_id)
    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", bob_store)

    ch_frame = alice.start_handshake()
    _, ch_body, _ = unpack_frame(ch_frame)
    sh_frame = bob.process_client_hello(ch_body, ch_frame)

    # Corrupt last byte of Bob's signature
    corrupt_sh = bytearray(sh_frame)
    corrupt_sh[-1] ^= 0x80
    _, c_body, _ = unpack_frame(bytes(corrupt_sh))

    with pytest.raises(SignatureError) as exc_info:
        alice.process_server_hello(c_body, bytes(corrupt_sh))
    assert "signature" in str(exc_info.value).lower()


# ==============================================================================
# T4: Ciphertext Tampering
# ==============================================================================

@pytest.mark.parametrize("suite_id", [SUITE_PQC, SUITE_CLASSICAL])
def test_t4_ciphertext_tampering(suite_id):
    """T4: Flip one bit in application-record ciphertext -> InvalidTag, no plaintext released."""
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(suite_id)
    trans_a, trans_b = LoopbackTransport.create_pair()
    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", bob_store)

    rec_a, rec_b, _ = run_handshake(alice, bob, trans_a, trans_b)

    secret_message = b"Top secret post-quantum application data payload"
    frame = rec_a.encrypt_record(secret_message, is_final=True)

    # Flip bit inside ciphertext portion
    corrupt_frame = bytearray(frame)
    target_pos = FRAME_HEADER_SIZE + 13 + 5
    corrupt_frame[target_pos] ^= 0x01

    _, body, _ = unpack_frame(bytes(corrupt_frame))

    # Assert InvalidTagError is raised and plaintext is NEVER returned
    with pytest.raises(InvalidTagError) as exc_info:
        rec_b.decrypt_record(body)

    assert "invalid tag" in str(exc_info.value).lower() or "authentication failed" in str(exc_info.value).lower()


# ==============================================================================
# T5: Tag / AAD Tampering
# ==============================================================================

@pytest.mark.parametrize("suite_id", [SUITE_PQC, SUITE_CLASSICAL])
def test_t5_tag_and_aad_tampering(suite_id):
    """T5: Modify the GCM authentication tag or the authenticated header -> InvalidTag."""
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(suite_id)
    trans_a, trans_b = LoopbackTransport.create_pair()
    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", bob_store)

    rec_a, rec_b, _ = run_handshake(alice, bob, trans_a, trans_b)

    data = b"Sensitive transactional record"
    frame = rec_a.encrypt_record(data, is_final=True)

    # 1. Tamper tag
    bad_tag_frame = bytearray(frame)
    bad_tag_frame[-2] ^= 0x01
    _, body_bad_tag, _ = unpack_frame(bytes(bad_tag_frame))
    with pytest.raises(InvalidTagError):
        rec_b.decrypt_record(body_bad_tag)

    # 2. Tamper AAD header
    rec_b.read_seq = rec_a.write_seq
    fresh_frame = rec_a.encrypt_record(data, is_final=True)
    bad_aad_frame = bytearray(fresh_frame)
    bad_aad_frame[FRAME_HEADER_SIZE] = 0x99
    _, body_bad_aad, _ = unpack_frame(bytes(bad_aad_frame))
    with pytest.raises(InvalidTagError):
        rec_b.decrypt_record(body_bad_aad)


# ==============================================================================
# T6: Untrusted Identity (Trust Anchor Defense)
# ==============================================================================

@pytest.mark.parametrize("suite_id", [SUITE_PQC, SUITE_CLASSICAL])
def test_t6_untrusted_identity_rejected(suite_id):
    """T6: Attacker sends valid self-generated key & signature -> rejected vs trust anchor."""
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(suite_id)

    # Mallory keypair
    if suite_id == SUITE_PQC:
        mallory_keys = IdentityKeyPair.generate_mldsa("mallory")
    else:
        mallory_keys = IdentityKeyPair.generate_ed25519("mallory")

    # Case 1: Mallory sends ClientHello with sender_id="mallory"
    bob = BobSession("bob", bob_keys, "alice", bob_store)
    mallory_alice = AliceSession("mallory", mallory_keys, "bob", alice_store, suite_id=suite_id)
    ch_frame = mallory_alice.start_handshake()
    _, ch_body, _ = unpack_frame(ch_frame)

    with pytest.raises(UntrustedIdentityError):
        bob.process_client_hello(ch_body, ch_frame)

    # Case 2: Mallory sends sender_id="alice" but signs with mallory's private key
    bob2 = BobSession("bob", bob_keys, "alice", bob_store)
    mallory_imposter = AliceSession("alice", mallory_keys, "bob", alice_store, suite_id=suite_id)
    ch_imp = mallory_imposter.start_handshake()
    _, imp_body, _ = unpack_frame(ch_imp)
    sh_frame = bob2.process_client_hello(imp_body, ch_imp)

    _, sh_body, _ = unpack_frame(sh_frame)
    ca_frame, _ = mallory_imposter.process_server_hello(sh_body, sh_frame)
    _, ca_body, _ = unpack_frame(ca_frame)

    with pytest.raises(SignatureError):
        bob2.process_client_auth(ca_body, ca_frame)


# ==============================================================================
# T7: Identity Swap / Transcript Binding
# ==============================================================================

@pytest.mark.parametrize("suite_id", [SUITE_PQC, SUITE_CLASSICAL])
def test_t7_identity_swap_rejected(suite_id):
    """
    T7: Identity-only swap attack via transcript binding.
    Captures a legitimate Alice<->Bob handshake, then constructs a swapped ClientHello
    differing ONLY in the sender_id identity field ("carol" vs "alice") while preserving
    identical client_random and ephemeral KEM public key, and reusing Bob's genuine signature.
    Signature verification MUST fail with SignatureError due to transcript binding.
    """
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(suite_id)

    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", bob_store)

    ch_frame = alice.start_handshake()
    _, ch_body, ch_raw = unpack_frame(ch_frame)
    sh_frame = bob.process_client_hello(ch_body, ch_raw)

    # Carol identity keypair and trust anchor pinning Bob
    if suite_id == SUITE_PQC:
        carol_keys = IdentityKeyPair.generate_mldsa("carol")
    else:
        carol_keys = IdentityKeyPair.generate_ed25519("carol")

    carol_store = TrustAnchorStore()
    carol_store.pin_identity("bob", bob_keys.public_bytes)

    # Swapped ClientHello differs ONLY in sender_id; same randoms & KEM public key
    ch_orig = ClientHello.deserialize(ch_body)
    ch_swapped = ClientHello(
        version=ch_orig.version,
        suite_id=ch_orig.suite_id,
        sender_id="carol",  # ONLY identity field differs
        target_id=ch_orig.target_id,
        client_random=ch_orig.client_random,  # identical random
        kem_public_key=ch_orig.kem_public_key,  # identical KEM key
    )
    ch_swapped_frame = pack_frame(MSG_CLIENT_HELLO, ch_swapped.serialize())

    carol = AliceSession("carol", carol_keys, "bob", carol_store, suite_id=suite_id)
    carol.client_random = ch_orig.client_random
    carol._kem_sk = alice._kem_sk
    carol.client_hello_wire = ch_swapped_frame

    _, sh_body, sh_raw = unpack_frame(sh_frame)
    with pytest.raises(SignatureError) as exc_info:
        carol.process_server_hello(sh_body, sh_raw)
    assert "signature" in str(exc_info.value).lower()


# ==============================================================================
# T8: Replay Protection
# ==============================================================================

@pytest.mark.parametrize("suite_id", [SUITE_PQC, SUITE_CLASSICAL])
def test_t8_record_replay_rejected(suite_id):
    """
    T8 (a): Intra-session and cross-session record replay protection.
    - Intra-session: Replaying an earlier application record in the same session is rejected
      via sequence number monotonicity (SequenceNumberError).
    - Cross-session: Replaying a valid record captured in session 1 into a fresh session 2 with
      identical peer identities is rejected (InvalidTagError) because traffic keys and nonces
      are unique per session.
    """
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(suite_id)
    trans_a, trans_b = LoopbackTransport.create_pair()
    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", bob_store)

    rec_a, rec_b, _ = run_handshake(alice, bob, trans_a, trans_b)

    msg_0 = b"Financial transaction #0001: Transfer $100"
    msg_1 = b"Financial transaction #0002: Transfer $500"

    frame_0 = rec_a.encrypt_record(msg_0, is_final=True)
    frame_1 = rec_a.encrypt_record(msg_1, is_final=True)

    _, body_0, _ = unpack_frame(frame_0)
    plain_0, _ = rec_b.decrypt_record(body_0)
    assert plain_0 == msg_0

    _, body_1, _ = unpack_frame(frame_1)
    plain_1, _ = rec_b.decrypt_record(body_1)
    assert plain_1 == msg_1

    # 1. Attacker replays frame 0 in the same session -> SequenceNumberError
    with pytest.raises(SequenceNumberError) as exc_info:
        rec_b.decrypt_record(body_0)
    assert "sequence number mismatch" in str(exc_info.value).lower() or "replay" in str(exc_info.value).lower()

    # 2. Cross-session record replay: replay body_0 (seq=0) into fresh session 2 (expecting seq=0)
    trans_a2, trans_b2 = LoopbackTransport.create_pair()
    alice_2 = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob_2 = BobSession("bob", bob_keys, "alice", bob_store)
    rec_a2, rec_b2, _ = run_handshake(alice_2, bob_2, trans_a2, trans_b2)

    with pytest.raises(InvalidTagError):
        rec_b2.decrypt_record(body_0)


@pytest.mark.parametrize("suite_id", [SUITE_PQC, SUITE_CLASSICAL])
def test_t8_handshake_replay_rejected(suite_id):
    """
    T8 (b): Handshake replay protection.
    - Flight 2 replay: Replaying an old captured ServerHello against a fresh AliceSession is rejected
      because Alice's fresh client_random does not match the signed transcript.
    - Full handshake replay: Replaying a full captured handshake (old ClientHello + old ClientAuth)
      against a fresh BobSession is rejected with SignatureError because Bob's fresh server_random
      ensures the transcript signature in ClientAuth is invalid.
    """
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(suite_id)
    alice_1 = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob_1 = BobSession("bob", bob_keys, "alice", bob_store)

    ch_frame_old = alice_1.start_handshake()
    _, ch_body_old, ch_raw_old = unpack_frame(ch_frame_old)
    sh_frame_old = bob_1.process_client_hello(ch_body_old, ch_raw_old)

    _, sh_body_old, sh_raw_old = unpack_frame(sh_frame_old)
    ca_frame_old, _ = alice_1.process_server_hello(sh_body_old, sh_raw_old)
    _, ca_body_old, ca_raw_old = unpack_frame(ca_frame_old)

    # 1. Replay old ServerHello to fresh AliceSession
    alice_2 = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    alice_2.start_handshake()
    with pytest.raises(SignatureError):
        alice_2.process_server_hello(sh_body_old, sh_raw_old)

    # 2. Replay full captured handshake (old CH + old CA) against fresh BobSession
    bob_fresh = BobSession("bob", bob_keys, "alice", bob_store)
    sh_fresh = bob_fresh.process_client_hello(ch_body_old, ch_raw_old)
    with pytest.raises(SignatureError):
        bob_fresh.process_client_auth(ca_body_old, ca_raw_old)


# ==============================================================================
# T9: Algorithm Downgrade Protection
# ==============================================================================

def test_t9_algorithm_downgrade_rejected():
    """T9: Changing advertised algorithm ID in transcript -> rejected."""
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(SUITE_PQC)

    bob = BobSession("bob", bob_keys, "alice", bob_store, allowed_suites={SUITE_PQC, SUITE_CLASSICAL})
    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=SUITE_PQC)

    ch_frame = alice.start_handshake()

    tampered_ch = bytearray(ch_frame)
    tampered_ch[10] = 0x00
    tampered_ch[11] = 0x02  # Attempt downgrade to Classical

    _, ch_body, _ = unpack_frame(bytes(tampered_ch))

    with pytest.raises(HandshakeError):
        bob.process_client_hello(ch_body, bytes(tampered_ch))


# ==============================================================================
# Robustness Extensions: Framing, Ordering, Chunk Stream Integrity, and Directional Keys
# ==============================================================================

def test_truncated_frame():
    """Malformed framing / truncated frame header -> HandshakeError."""
    short_header = b"QSC1\x01\x00\x00"
    with pytest.raises(HandshakeError):
        unpack_frame(short_header)


def test_reordered_records():
    """Reordered application records -> SequenceNumberError."""
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(SUITE_PQC)
    trans_a, trans_b = LoopbackTransport.create_pair()
    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=SUITE_PQC)
    bob = BobSession("bob", bob_keys, "alice", bob_store)

    rec_a, rec_b, _ = run_handshake(alice, bob, trans_a, trans_b)

    f0 = rec_a.encrypt_record(b"chunk 0", is_final=False)
    f1 = rec_a.encrypt_record(b"chunk 1", is_final=True)

    # Deliver f1 BEFORE f0 (reordering)
    _, body_1, _ = unpack_frame(f1)
    with pytest.raises(SequenceNumberError):
        rec_b.decrypt_record(body_1)


@pytest.mark.parametrize("suite_id", [SUITE_PQC, SUITE_CLASSICAL])
def test_chunked_payload_stream_integrity(suite_id):
    """
    Message-stream integrity for chunked payloads:
    - Dropped FINAL record: receiver detects incomplete message stream (is_final == False).
    - Dropped middle chunk: raises SequenceNumberError (gap detected).
    - Duplicated middle chunk: raises SequenceNumberError (replay detected).
    - Reordered chunks: raises SequenceNumberError.
    - Tampered chunk: raises InvalidTagError; plaintext of tampered record is NEVER released.

    Plaintext release policy documentation:
    In this prototype, RecordLayer decrypts on a per-record basis. If an application streams records,
    chunks that successfully verify prior to a failure have passed AES-256-GCM authentication and are
    delivered per-record to the caller; however, the multi-chunk message remains incomplete and cannot
    be finalized without the authentic FINAL record.
    For any record where the tag, AAD, or ciphertext is tampered, AES-256-GCM authentication is all-or-nothing:
    InvalidTagError is raised and ZERO plaintext bytes are released.
    """
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(suite_id)
    trans_a, trans_b = LoopbackTransport.create_pair()
    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", bob_store)
    rec_a, rec_b, _ = run_handshake(alice, bob, trans_a, trans_b)

    # Payload spanning 3 chunks (chunk 0: CHUNK, chunk 1: CHUNK, chunk 2: FINAL)
    chunk_size = 64 * 1024
    payload_data = b"ChunkA:" * (chunk_size // 7) + b"ChunkB:" * (chunk_size // 7) + b"ChunkC:FinalEnd"
    frames = rec_a.encrypt_payload(payload_data, chunk_size=chunk_size)
    assert len(frames) == 3

    bodies = [unpack_frame(f)[1] for f in frames]

    # Scenario 1: Dropped FINAL record -> receiver reports incomplete message
    received_chunks = []
    is_message_complete = False
    for b in bodies[:2]:  # Only deliver chunks 0 and 1; chunk 2 (FINAL) is dropped
        plain, is_final = rec_b.decrypt_record(b)
        received_chunks.append(plain)
        if is_final:
            is_message_complete = True
    assert not is_message_complete, "Receiver must report incomplete message when FINAL record is dropped"
    assert len(received_chunks) == 2

    # Scenario 2: Dropped middle chunk (chunk 0 then chunk 2 directly)
    alice_s2 = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob_s2 = BobSession("bob", bob_keys, "alice", bob_store)
    rec_a2, rec_b2, _ = run_handshake(alice_s2, bob_s2, trans_a, trans_b)
    frames2 = rec_a2.encrypt_payload(payload_data, chunk_size=chunk_size)
    bodies2 = [unpack_frame(f)[1] for f in frames2]

    rec_b2.decrypt_record(bodies2[0])  # seq 0 ok
    with pytest.raises(SequenceNumberError) as exc_info:
        rec_b2.decrypt_record(bodies2[2])  # seq 2 delivered when seq 1 expected
    assert "expected 1, got 2" in str(exc_info.value)

    # Scenario 3: Duplicated middle chunk (chunk 0, chunk 1, chunk 1)
    alice_s3 = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob_s3 = BobSession("bob", bob_keys, "alice", bob_store)
    rec_a3, rec_b3, _ = run_handshake(alice_s3, bob_s3, trans_a, trans_b)
    frames3 = rec_a3.encrypt_payload(payload_data, chunk_size=chunk_size)
    bodies3 = [unpack_frame(f)[1] for f in frames3]

    rec_b3.decrypt_record(bodies3[0])
    rec_b3.decrypt_record(bodies3[1])
    with pytest.raises(SequenceNumberError) as exc_info:
        rec_b3.decrypt_record(bodies3[1])  # duplicated chunk 1
    assert "expected 2, got 1" in str(exc_info.value)

    # Scenario 4: Tampered middle chunk -> InvalidTagError; zero plaintext returned
    alice_s4 = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob_s4 = BobSession("bob", bob_keys, "alice", bob_store)
    rec_a4, rec_b4, _ = run_handshake(alice_s4, bob_s4, trans_a, trans_b)
    frames4 = rec_a4.encrypt_payload(payload_data, chunk_size=chunk_size)
    bodies4 = [unpack_frame(f)[1] for f in frames4]

    rec_b4.decrypt_record(bodies4[0])  # verified chunk 0 is delivered
    bad_chunk1 = bytearray(bodies4[1])
    bad_chunk1[-5] ^= 0x01  # mutate ciphertext/tag
    with pytest.raises(InvalidTagError):
        rec_b4.decrypt_record(bytes(bad_chunk1))


@pytest.mark.parametrize("suite_id", [SUITE_PQC, SUITE_CLASSICAL])
def test_wrong_direction_key_use(suite_id):
    """Attempting to decrypt Alice's record using Alice's own read key -> InvalidTag."""
    alice_keys, bob_keys, alice_store, bob_store = make_keypairs(suite_id)
    trans_a, trans_b = LoopbackTransport.create_pair()
    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", bob_store)

    rec_a, rec_b, _ = run_handshake(alice, bob, trans_a, trans_b)

    f0 = rec_a.encrypt_record(b"Alice to Bob message", is_final=True)
    _, body, _ = unpack_frame(f0)

    with pytest.raises(InvalidTagError):
        rec_a.decrypt_record(body)
