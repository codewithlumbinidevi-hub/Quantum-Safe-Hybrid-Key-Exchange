"""
Stage 3 Classical Baseline Verification Script (X25519 + Ed25519).

Tests:
1. Long-term Ed25519 identity generation and trust anchor pinning.
2. Alice <-> Bob Classical handshake (X25519 + Ed25519 + HKDF-SHA256).
3. Directional AES-256-GCM record layer exchange.
4. Transmission of all three official payloads (1 KB, 100 KB, 10 MB) with SHA-256 byte-exact verification.
5. In-process loopback AND real TCP socket transport verification.
6. Cross-suite downgrade / mismatch detection.
"""
import hashlib
import os
import socket
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from P1_secure_channel.channel import (
    SUITE_CLASSICAL,
    SUITE_PQC,
    AliceSession,
    BobSession,
    DowngradeError,
    IdentityKeyPair,
    LoopbackTransport,
    SocketTransport,
    TrustAnchorStore,
    run_handshake,
)


def load_expected_hashes():
    hashes = {}
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "payload_sha256.txt"), "r") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) == 2:
                hashes[parts[1]] = parts[0]
    return hashes


def test_classical_channel_loopback():
    print("=" * 70)
    print("1. Testing Classical Channel Handshake over In-Process Loopback Transport")
    print("=" * 70)

    # 1. Setup Identities
    t0 = time.perf_counter()
    alice_keys = IdentityKeyPair.generate_ed25519("alice")
    bob_keys = IdentityKeyPair.generate_ed25519("bob")
    print(f"Generated Ed25519 identity keys in {(time.perf_counter() - t0)*1000:.2f} ms")
    print(f"  Alice ID PK size : {len(alice_keys.public_bytes)} B")
    print(f"  Bob   ID PK size : {len(bob_keys.public_bytes)} B")

    # 2. Pinned Trust Anchors (No TOFU)
    alice_store = TrustAnchorStore()
    alice_store.pin_identity("bob", bob_keys.public_bytes)

    bob_store = TrustAnchorStore()
    bob_store.pin_identity("alice", alice_keys.public_bytes)

    # 3. Create Sessions & Transports
    trans_a, trans_b = LoopbackTransport.create_pair()
    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=SUITE_CLASSICAL)
    bob = BobSession("bob", bob_keys, "alice", bob_store)

    # 4. Execute Handshake
    rec_a, rec_b, metrics = run_handshake(alice, bob, trans_a, trans_b)

    print("\nHandshake Completed Successfully:")
    print(f"  Suite                  : {metrics.suite_name}")
    print(f"  Handshake Time (ms)    : {metrics.handshake_time_ms:.3f} ms")
    print(f"  Client -> Server Bytes : {metrics.c2s_bytes} B (ClientHello + ClientAuth)")
    print(f"  Server -> Client Bytes : {metrics.s2c_bytes} B (ServerHello)")
    print(f"  Total Handshake Bytes  : {metrics.total_bytes} B")
    print(f"  Transcript Digest      : {metrics.final_transcript_hash.hex()[:32]}... (32 B)")

    # 5. Verify official payloads
    expected_hashes = load_expected_hashes()
    payload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "payloads")

    for name in ["payload_1KB.bin", "payload_100KB.bin", "payload_10MB.bin"]:
        path = os.path.join(payload_dir, name)
        with open(path, "rb") as f:
            data = f.read()

        t_enc_start = time.perf_counter()
        frames = rec_a.encrypt_payload(data, chunk_size=64 * 1024)
        t_enc = (time.perf_counter() - t_enc_start) * 1000

        # Send frames over transport
        for frame in frames:
            trans_a.send(frame)

        # Receive frames on Bob
        t_dec_start = time.perf_counter()
        received_frames_body = []
        for _ in range(len(frames)):
            _, body, _ = trans_b.recv_frame()
            received_frames_body.append(body)

        decrypted = rec_b.decrypt_payload_frames(received_frames_body)
        t_dec = (time.perf_counter() - t_dec_start) * 1000

        computed_sha = hashlib.sha256(decrypted).hexdigest()
        assert computed_sha == expected_hashes[name], f"SHA mismatch on {name}!"
        overhead = sum(len(f) for f in frames) - len(data)

        print(f"Payload '{name}': {len(data):>10,d} B | Chunks: {len(frames):>3} | "
              f"Enc: {t_enc:>6.2f} ms | Dec: {t_dec:>6.2f} ms | Overhead: {overhead} B | "
              f"SHA-256: MATCH [OK]")

    # 6. Verify reverse communication (Bob -> Alice)
    reply_msg = b"Acknowledgement from Bob (Classical): all payloads verified."
    reply_frame = rec_b.encrypt_record(reply_msg, is_final=True)
    trans_b.send(reply_frame)

    _, reply_body, _ = trans_a.recv_frame()
    decrypted_reply, _ = rec_a.decrypt_record(reply_body)
    assert decrypted_reply == reply_msg
    print(f"\nReverse message (Bob -> Alice) verified: {decrypted_reply.decode()}")
    print("[OK] Classical loopback transport test completely passed.\n")


def test_classical_channel_tcp():
    print("=" * 70)
    print("2. Testing Classical Channel Handshake over Real TCP Socket (127.0.0.1)")
    print("=" * 70)

    alice_keys = IdentityKeyPair.generate_ed25519("alice")
    bob_keys = IdentityKeyPair.generate_ed25519("bob")

    alice_store = TrustAnchorStore()
    alice_store.pin_identity("bob", bob_keys.public_bytes)

    bob_store = TrustAnchorStore()
    bob_store.pin_identity("alice", alice_keys.public_bytes)

    server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_sock.bind(("127.0.0.1", 0))
    server_sock.listen(1)
    port = server_sock.getsockname()[1]

    bob_results = {}

    def bob_worker():
        conn, _ = server_sock.accept()
        try:
            trans_b = SocketTransport(conn)
            bob = BobSession("bob", bob_keys, "alice", bob_store)

            msg_type, body, raw = trans_b.recv_frame()
            sh_frame = bob.process_client_hello(body, raw)

            trans_b.send(sh_frame)

            msg_type, body, raw = trans_b.recv_frame()
            rec_b = bob.process_client_auth(body, raw)

            payload_frames = []
            while True:
                msg_type, body, raw = trans_b.recv_frame()
                payload_frames.append(body)
                rec_type = body[0]
                if rec_type == 0x02:
                    break

            data = rec_b.decrypt_payload_frames(payload_frames)
            bob_results["data"] = data
            bob_results["sha256"] = hashlib.sha256(data).hexdigest()
        finally:
            conn.close()
            server_sock.close()

    t = threading.Thread(target=bob_worker)
    t.start()

    client_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client_sock.connect(("127.0.0.1", port))
    try:
        trans_a = SocketTransport(client_sock)
        alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=SUITE_CLASSICAL)

        t0 = time.perf_counter()
        ch_frame = alice.start_handshake()
        trans_a.send(ch_frame)

        msg_type, body, raw = trans_a.recv_frame()
        ca_frame, rec_a = alice.process_server_hello(body, raw)
        trans_a.send(ca_frame)
        tcp_handshake_ms = (time.perf_counter() - t0) * 1000

        print(f"TCP Handshake completed in {tcp_handshake_ms:.3f} ms")

        # Send official 100 KB payload over TCP
        payload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "payloads")
        with open(os.path.join(payload_dir, "payload_100KB.bin"), "rb") as f:
            test_data = f.read()

        frames = rec_a.encrypt_payload(test_data, chunk_size=32 * 1024)
        for f in frames:
            trans_a.send(f)

    finally:
        t.join()
        client_sock.close()

    expected_hashes = load_expected_hashes()
    assert bob_results["sha256"] == expected_hashes["payload_100KB.bin"]
    print(f"TCP payload received by Bob: {len(bob_results['data'])} B, SHA-256 MATCH [OK]")
    print("[OK] Real TCP socket test completely passed.\n")


def test_suite_mismatch_downgrade():
    print("=" * 70)
    print("3. Testing Cross-Suite Isolation & Downgrade Prevention")
    print("=" * 70)

    alice_keys = IdentityKeyPair.generate_mldsa("alice")
    bob_keys = IdentityKeyPair.generate_ed25519("bob")

    alice_store = TrustAnchorStore()
    alice_store.pin_identity("bob", bob_keys.public_bytes)

    bob_store = TrustAnchorStore()
    bob_store.pin_identity("alice", alice_keys.public_bytes)

    # Bob only allows classical; Alice tries to initiate with PQC
    bob = BobSession("bob", bob_keys, "alice", bob_store, allowed_suites={SUITE_CLASSICAL})
    alice = AliceSession("alice", alice_keys, "bob", alice_store, suite_id=SUITE_PQC)

    ch_frame = alice.start_handshake()
    try:
        bob.process_client_hello(ch_frame[9:], ch_frame)
        raise AssertionError("Bob accepted disallowed suite!")
    except DowngradeError as e:
        print(f"DowngradeError correctly raised by Bob: {e}")

    print("[OK] Suite mismatch and downgrade rejected cleanly.\n")


if __name__ == "__main__":
    test_classical_channel_loopback()
    test_classical_channel_tcp()
    test_suite_mismatch_downgrade()
    print("ALL STAGE 3 VERIFICATION CHECKS PASSED SUCCESSFULLY.")
