"""
PS-P1 One-Command Security Test Runner.

Executes tests T1 through T9 across both Post-Quantum (ML-KEM-768 + ML-DSA-65)
and Classical Baseline (X25519 + Ed25519) suites.
Outputs results to P1_secure_channel/results/security_tests.csv following
the official kit template.
"""
from __future__ import annotations

import csv
import hashlib
import os
import sys
import time
from typing import List, Tuple

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from P1_secure_channel.channel import (
    SUITE_CLASSICAL,
    SUITE_PQC,
    AliceSession,
    BobSession,
    DowngradeError,
    HandshakeError,
    IdentityKeyPair,
    InvalidTagError,
    LoopbackTransport,
    SequenceNumberError,
    SignatureError,
    TrustAnchorStore,
    UntrustedIdentityError,
    run_handshake,
)
from P1_secure_channel.channel.wire import (
    FRAME_HEADER_SIZE,
    ClientHello,
    pack_frame,
    unpack_frame,
)


def load_expected_hashes():
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, "payload_sha256.txt")
    hashes = {}
    with open(path, "r") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) == 2:
                hashes[parts[1]] = parts[0]
    return hashes


def make_store_pair(suite_id: int):
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


class TestResult:
    def __init__(self, test_id: str, description: str, injected_fault: str, expected: str):
        self.test_id = test_id
        self.description = description
        self.injected_fault = injected_fault
        self.expected = expected
        self.observed = ""
        self.result = "FAIL"
        self.run_command = f"python P1_secure_channel/run_security_tests.py --test {test_id}"


def run_t1(suite_id: int) -> Tuple[bool, str]:
    """T1 Honest run: handshake completes, 3 payloads decrypt byte-exact."""
    alice_keys, bob_keys, a_store, b_store = make_store_pair(suite_id)
    trans_a, trans_b = LoopbackTransport.create_pair()

    alice = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", b_store)

    rec_a, rec_b, metrics = run_handshake(alice, bob, trans_a, trans_b)

    expected_hashes = load_expected_hashes()
    payload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "payloads")

    for name in ["payload_1KB.bin", "payload_100KB.bin", "payload_10MB.bin"]:
        with open(os.path.join(payload_dir, name), "rb") as f:
            data = f.read()
        frames = rec_a.encrypt_payload(data, chunk_size=64 * 1024)
        for frame in frames:
            trans_a.send(frame)

        received_bodies = []
        for _ in range(len(frames)):
            _, body, _ = trans_b.recv_frame()
            received_bodies.append(body)

        decrypted = rec_b.decrypt_payload_frames(received_bodies)
        h = hashlib.sha256(decrypted).hexdigest()
        if h != expected_hashes[name]:
            return False, f"Hash mismatch on {name}"

    return True, f"handshake ok ({metrics.handshake_time_ms:.2f} ms) + 3 payloads decrypted byte-exact"


def run_t2(suite_id: int) -> Tuple[bool, str]:
    """T2 Handshake tampering: bit flip in KEM ciphertext -> abort."""
    alice_keys, bob_keys, a_store, b_store = make_store_pair(suite_id)
    alice = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", b_store)

    ch_frame = alice.start_handshake()
    _, ch_body, ch_raw = unpack_frame(ch_frame)
    sh_frame = bob.process_client_hello(ch_body, ch_raw)

    # Flip bit in KEM ciphertext
    bad_sh = bytearray(sh_frame)
    bad_sh[FRAME_HEADER_SIZE + 40] ^= 0x01
    _, bad_body, bad_raw = unpack_frame(bytes(bad_sh))

    try:
        alice.process_server_hello(bad_body, bad_raw)
        return False, "tampered ServerHello accepted without error"
    except (SignatureError, HandshakeError) as e:
        return True, f"Handshake aborted cleanly: {type(e).__name__} ({e})"


def run_t3(suite_id: int) -> Tuple[bool, str]:
    """T3 Signature tampering: bit flip in signature -> rejected with SignatureError."""
    alice_keys, bob_keys, a_store, b_store = make_store_pair(suite_id)
    alice = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", b_store)

    ch_frame = alice.start_handshake()
    _, ch_body, ch_raw = unpack_frame(ch_frame)
    sh_frame = bob.process_client_hello(ch_body, ch_raw)

    bad_sh = bytearray(sh_frame)
    bad_sh[-1] ^= 0x01
    _, bad_body, bad_raw = unpack_frame(bytes(bad_sh))

    try:
        alice.process_server_hello(bad_body, bad_raw)
        return False, "tampered signature accepted"
    except SignatureError as e:
        return True, f"Rejected with SignatureError: {e}"


def run_t4(suite_id: int) -> Tuple[bool, str]:
    """T4 Ciphertext tampering: bit flip in record ciphertext -> InvalidTag."""
    alice_keys, bob_keys, a_store, b_store = make_store_pair(suite_id)
    trans_a, trans_b = LoopbackTransport.create_pair()
    alice = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", b_store)
    rec_a, rec_b, _ = run_handshake(alice, bob, trans_a, trans_b)

    frame = rec_a.encrypt_record(b"confidential payload data", is_final=True)
    bad_frame = bytearray(frame)
    # Flip bit inside ciphertext portion
    bad_frame[FRAME_HEADER_SIZE + 13 + 3] ^= 0x01
    _, bad_body, _ = unpack_frame(bytes(bad_frame))

    try:
        rec_b.decrypt_record(bad_body)
        return False, "tampered ciphertext decrypted without error"
    except InvalidTagError as e:
        return True, f"InvalidTagError raised; plaintext withheld ({e})"


def run_t5(suite_id: int) -> Tuple[bool, str]:
    """T5 Tag / AAD tampering: modified tag or header -> InvalidTag."""
    alice_keys, bob_keys, a_store, b_store = make_store_pair(suite_id)
    trans_a, trans_b = LoopbackTransport.create_pair()
    alice = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", b_store)
    rec_a, rec_b, _ = run_handshake(alice, bob, trans_a, trans_b)

    frame = rec_a.encrypt_record(b"authenticated transactional record", is_final=True)

    # 1. Tamper tag
    bad_tag = bytearray(frame)
    bad_tag[-2] ^= 0x01
    _, body_tag, _ = unpack_frame(bytes(bad_tag))

    try:
        rec_b.decrypt_record(body_tag)
        return False, "corrupted tag accepted"
    except InvalidTagError:
        pass

    # 2. Tamper AAD header
    rec_b.read_seq = rec_a.write_seq
    f2 = rec_a.encrypt_record(b"record 2", is_final=True)
    bad_aad = bytearray(f2)
    bad_aad[FRAME_HEADER_SIZE] = 0x99  # mutate type
    _, body_aad, _ = unpack_frame(bytes(bad_aad))

    try:
        rec_b.decrypt_record(body_aad)
        return False, "corrupted AAD accepted"
    except InvalidTagError as e:
        return True, f"InvalidTagError raised on tag and AAD header tampering ({e})"


def run_t6(suite_id: int) -> Tuple[bool, str]:
    """T6 Untrusted identity: attacker key not matching trust anchor -> reject."""
    alice_keys, bob_keys, a_store, b_store = make_store_pair(suite_id)

    # Mallory keypair
    if suite_id == SUITE_PQC:
        mallory_keys = IdentityKeyPair.generate_mldsa("mallory")
    else:
        mallory_keys = IdentityKeyPair.generate_ed25519("mallory")

    bob = BobSession("bob", bob_keys, "alice", b_store)
    mallory_session = AliceSession("mallory", mallory_keys, "bob", a_store, suite_id=suite_id)

    ch_frame = mallory_session.start_handshake()
    _, ch_body, ch_raw = unpack_frame(ch_frame)

    try:
        bob.process_client_hello(ch_body, ch_raw)
        return False, "untrusted identity accepted"
    except UntrustedIdentityError as e:
        return True, f"Rejected against trust anchor: UntrustedIdentityError ({e})"


def run_t7(suite_id: int) -> Tuple[bool, str]:
    """T7 Identity swap: replayed signature in session naming other peer -> reject via transcript binding."""
    alice_keys, bob_keys, a_store, b_store = make_store_pair(suite_id)

    alice = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", b_store)

    ch_frame = alice.start_handshake()
    _, ch_body, ch_raw = unpack_frame(ch_frame)
    sh_frame = bob.process_client_hello(ch_body, ch_raw)

    # Charlie starts session
    if suite_id == SUITE_PQC:
        charlie_keys = IdentityKeyPair.generate_mldsa("charlie")
    else:
        charlie_keys = IdentityKeyPair.generate_ed25519("charlie")
    c_store = TrustAnchorStore()
    c_store.pin_identity("bob", bob_keys.public_bytes)

    charlie = AliceSession("charlie", charlie_keys, "bob", c_store, suite_id=suite_id)
    charlie.start_handshake()

    _, sh_body, sh_raw = unpack_frame(sh_frame)
    try:
        charlie.process_server_hello(sh_body, sh_raw)
        return False, "replayed ServerHello accepted under different peer session"
    except SignatureError as e:
        return True, f"Rejected through transcript binding: SignatureError ({e})"


def run_t8(suite_id: int) -> Tuple[bool, str]:
    """T8 Replay: resent record -> SequenceNumberError; old handshake -> SignatureError."""
    alice_keys, bob_keys, a_store, b_store = make_store_pair(suite_id)
    trans_a, trans_b = LoopbackTransport.create_pair()
    alice = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)
    bob = BobSession("bob", bob_keys, "alice", b_store)
    rec_a, rec_b, _ = run_handshake(alice, bob, trans_a, trans_b)

    f0 = rec_a.encrypt_record(b"message 0", is_final=True)
    f1 = rec_a.encrypt_record(b"message 1", is_final=True)

    _, b0, _ = unpack_frame(f0)
    _, b1, _ = unpack_frame(f1)
    rec_b.decrypt_record(b0)
    rec_b.decrypt_record(b1)

    # Replay f0
    try:
        rec_b.decrypt_record(b0)
        return False, "replayed record accepted"
    except SequenceNumberError as e:
        record_res = f"Replayed record rejected with SequenceNumberError ({e})"

    # Handshake replay
    alice_2 = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)
    alice_2.start_handshake()
    # Replay old ServerHello from first session
    sh_old = alice.server_hello_wire
    _, sh_b, sh_r = unpack_frame(sh_old)
    try:
        alice_2.process_server_hello(sh_b, sh_r)
        return False, "old handshake replayed without error"
    except SignatureError:
        handshake_res = "Old handshake replay rejected via fresh random binding"

    return True, f"{record_res}; {handshake_res}"


def run_t9(suite_id: int) -> Tuple[bool, str]:
    """T9 Algorithm downgrade: changed algorithm IDs in transcript -> rejected."""
    alice_keys, bob_keys, a_store, b_store = make_store_pair(suite_id)
    bob = BobSession("bob", bob_keys, "alice", b_store, allowed_suites={SUITE_PQC, SUITE_CLASSICAL})
    alice = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)

    ch_frame = alice.start_handshake()

    # Rewrite suite_id byte to disallowed or incompatible suite
    bad_ch = bytearray(ch_frame)
    bad_ch[10] = 0x99
    bad_ch[11] = 0x99
    _, bad_b, bad_r = unpack_frame(bytes(bad_ch))

    try:
        bob.process_client_hello(bad_b, bad_r)
        return False, "unsupported suite accepted"
    except DowngradeError as e:
        return True, f"Rejected with DowngradeError: {e}"


def run_all_tests() -> List[TestResult]:
    tests = [
        TestResult("T1", "Honest run", "none", "handshake ok + payloads decrypt byte-exact"),
        TestResult("T2", "Handshake tampering", "bit flip in KEM ciphertext", "abort"),
        TestResult("T3", "Signature tampering", "bit flip in ML-DSA signature", "reject"),
        TestResult("T4", "Ciphertext tampering", "bit flip in record ciphertext", "InvalidTag"),
        TestResult("T5", "Tag/AAD tampering", "modified tag or header", "InvalidTag"),
        TestResult("T6", "Untrusted identity", "attacker key not matching trust anchor", "reject"),
        TestResult("T7", "Identity swap", "replayed signature in session naming other peer", "reject"),
        TestResult("T8", "Replay", "resent record / old handshake", "reject or documented limitation"),
        TestResult("T9", "Algorithm downgrade", "changed algorithm IDs", "reject"),
    ]

    dispatch = {
        "T1": run_t1,
        "T2": run_t2,
        "T3": run_t3,
        "T4": run_t4,
        "T5": run_t5,
        "T6": run_t6,
        "T7": run_t7,
        "T8": run_t8,
        "T9": run_t9,
    }

    print("=" * 80)
    print("PS-P1 Mandatory Security Test Suite (PQC + Classical Baseline)")
    print("=" * 80)

    for tr in tests:
        fn = dispatch[tr.test_id]
        # Run test on PQC suite
        ok_pqc, obs_pqc = fn(SUITE_PQC)
        # Run test on Classical baseline suite
        ok_cls, obs_cls = fn(SUITE_CLASSICAL)

        passed = ok_pqc and ok_cls
        tr.result = "PASS" if passed else "FAIL"
        tr.observed = f"[PQC]: {obs_pqc} | [Classical]: {obs_cls}"

        status_str = f"[\033[92mPASS\033[0m]" if passed else f"[\033[91mFAIL\033[0m]"
        print(f"{status_str} {tr.test_id}: {tr.description}")
        print(f"       Expected: {tr.expected}")
        print(f"       Observed: {tr.observed[:100]}...")

    # Write results CSV
    results_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
    os.makedirs(results_dir, exist_ok=True)
    out_csv = os.path.join(results_dir, "security_tests.csv")

    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["test_id", "description", "injected_fault", "expected", "observed", "result", "run_command"])
        for tr in tests:
            writer.writerow([tr.test_id, tr.description, tr.injected_fault, tr.expected, tr.observed, tr.result, tr.run_command])

    print(f"\nAll results saved to: {out_csv}")
    return tests


if __name__ == "__main__":
    results = run_all_tests()
    all_passed = all(r.result == "PASS" for r in results)
    sys.exit(0 if all_passed else 1)
