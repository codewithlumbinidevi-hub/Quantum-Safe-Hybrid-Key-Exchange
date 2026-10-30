"""
Comprehensive Performance Evaluation Harness for PS-P1.

Measures:
1. Handshake completion time (>=100 trials, median, IQR, p95, min, max, mean, stdev) for both PQC and Classical.
2. Actual serialized wire bytes per message flight and in total.
3. Micro-benchmark breakdown for cryptographic primitives (keygen, encap, decap, sign, verify, HKDF).
4. Payload encryption/decryption timing, throughput, and overhead across the three official payloads (1 KB, 100 KB, 10 MB).
5. Labeling: "local (in-process)" and "local (TCP loopback)".
6. Outputs raw per-trial CSVs and summary CSVs matching official templates.
"""
from __future__ import annotations

import csv
import gc
import hashlib
import json
import os
import socket
import sys
import threading
import time
from typing import Dict, List

# Ensure repository root is on sys.path
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT_DIR)

from common.measure import summarize, time_op
from channel import (
    SUITE_CLASSICAL,
    SUITE_PQC,
    AliceSession,
    BobSession,
    IdentityKeyPair,
    LoopbackTransport,
    SocketTransport,
    TrustAnchorStore,
    run_handshake,
)
from channel.wire import unpack_frame

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
PAYLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "payloads")


def load_expected_hashes() -> Dict[str, str]:
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "payload_sha256.txt")
    hashes = {}
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) == 2:
                hashes[parts[1]] = parts[0]
    return hashes


def setup_identities(suite_id: int):
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


# --- Handshake Benchmark ------------------------------------------------------

def run_handshake_benchmark(suite_id: int, trials: int = 100, warmup: int = 10, mode_label: str = "local (in-process)"):
    suite_name = "PQC" if suite_id == SUITE_PQC else "classical-baseline"
    kem_name = "ML-KEM-768" if suite_id == SUITE_PQC else "X25519"
    sig_name = "ML-DSA-65" if suite_id == SUITE_PQC else "Ed25519"

    print(f"\n[{suite_name}] Running {warmup} warmups + {trials} timed handshakes ({mode_label})...")
    alice_keys, bob_keys, a_store, b_store = setup_identities(suite_id)

    # Warmups
    for _ in range(warmup):
        trans_a, trans_b = LoopbackTransport.create_pair()
        alice = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)
        bob = BobSession("bob", bob_keys, "alice", b_store)
        run_handshake(alice, bob, trans_a, trans_b)

    samples_ns = []
    trial_records = []
    success_count = 0
    failure_count = 0

    c2s_bytes_sample = 0
    s2c_bytes_sample = 0
    total_bytes_sample = 0

    was_gc = gc.isenabled()
    gc.disable()
    try:
        for trial_idx in range(1, trials + 1):
            trans_a, trans_b = LoopbackTransport.create_pair()
            alice = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)
            bob = BobSession("bob", bob_keys, "alice", b_store)

            try:
                t0 = time.perf_counter_ns()
                ra, rb, metrics = run_handshake(alice, bob, trans_a, trans_b)
                t1 = time.perf_counter_ns()
                duration_ns = t1 - t0
                samples_ns.append(duration_ns)
                success_count += 1

                c2s_bytes_sample = metrics.c2s_bytes
                s2c_bytes_sample = metrics.s2c_bytes
                total_bytes_sample = metrics.total_bytes

                trial_records.append({
                    "trial": trial_idx,
                    "suite": suite_name,
                    "handshake_time_ms": duration_ns / 1e6,
                    "c2s_bytes": metrics.c2s_bytes,
                    "s2c_bytes": metrics.s2c_bytes,
                    "total_bytes": metrics.total_bytes,
                    "success": 1,
                })
            except Exception as e:
                failure_count += 1
                trial_records.append({
                    "trial": trial_idx,
                    "suite": suite_name,
                    "handshake_time_ms": 0.0,
                    "c2s_bytes": 0,
                    "s2c_bytes": 0,
                    "total_bytes": 0,
                    "success": 0,
                    "error": str(e),
                })
    finally:
        if was_gc:
            gc.enable()

    stats = summarize(samples_ns)

    summary = {
        "platform": "A",
        "mode": suite_name,
        "kem": kem_name,
        "signature": sig_name,
        "trials": trials,
        "median_handshake_ms": round(stats["median_ms"], 4),
        "iqr_ms": round(stats["iqr_ms"], 4),
        "p95_ms": round(stats["p95_ms"], 4),
        "mean_ms": round(stats["mean_ms"], 4),
        "min_ms": round(stats["min_ms"], 4),
        "max_ms": round(stats["max_ms"], 4),
        "stdev_ms": round(stats["stdev_ms"], 4),
        "client_to_server_bytes": c2s_bytes_sample,
        "server_to_client_bytes": s2c_bytes_sample,
        "total_handshake_bytes": total_bytes_sample,
        "success_count": success_count,
        "failure_count": failure_count,
        "local_or_network": mode_label,
    }

    return summary, trial_records


# --- Payload Benchmark --------------------------------------------------------

def run_payload_benchmark(suite_id: int):
    suite_name = "PQC" if suite_id == SUITE_PQC else "classical-baseline"
    alice_keys, bob_keys, a_store, b_store = setup_identities(suite_id)
    expected_hashes = load_expected_hashes()

    payload_specs = [
        ("payload_1KB.bin", 1024, 100),
        ("payload_100KB.bin", 100 * 1024, 100),
        ("payload_10MB.bin", 10 * 1024 * 1024, 20),
    ]

    summaries = []
    raw_trials = []

    print(f"\n[{suite_name}] Measuring Payload Encryption/Decryption Across 3 Payloads...")

    for fname, size_bytes, n_trials in payload_specs:
        fpath = os.path.join(PAYLOADS_DIR, fname)
        with open(fpath, "rb") as f:
            data = f.read()

        trans_a, trans_b = LoopbackTransport.create_pair()
        alice = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)
        bob = BobSession("bob", bob_keys, "alice", b_store)
        rec_a, rec_b, _ = run_handshake(alice, bob, trans_a, trans_b)

        # Warmup (3 trials)
        for _ in range(3):
            frames = rec_a.encrypt_payload(data, chunk_size=64 * 1024)
            bodies = [f[9:] for f in frames]
            rec_b.decrypt_payload_frames(bodies)

        enc_samples_ns = []
        dec_samples_ns = []
        ciphertext_bytes = 0
        overhead_bytes = 0

        for trial in range(1, n_trials + 1):
            # Timed encryption
            t0 = time.perf_counter_ns()
            frames = rec_a.encrypt_payload(data, chunk_size=64 * 1024)
            t1 = time.perf_counter_ns()
            enc_ns = t1 - t0
            enc_samples_ns.append(enc_ns)

            ciphertext_bytes = sum(len(f) for f in frames)
            overhead_bytes = ciphertext_bytes - size_bytes

            # Extract record bodies (simulate receiving)
            bodies = [f[9:] for f in frames]

            # Timed decryption
            t2 = time.perf_counter_ns()
            decrypted = rec_b.decrypt_payload_frames(bodies)
            t3 = time.perf_counter_ns()
            dec_ns = t3 - t2
            dec_samples_ns.append(dec_ns)

            raw_trials.append({
                "suite": suite_name,
                "payload": fname,
                "trial": trial,
                "encrypt_ms": enc_ns / 1e6,
                "decrypt_ms": dec_ns / 1e6,
                "plaintext_bytes": size_bytes,
                "ciphertext_bytes": ciphertext_bytes,
                "overhead_bytes": overhead_bytes,
            })

        h_calc = hashlib.sha256(decrypted).hexdigest()
        sha_match = "MATCH" if h_calc == expected_hashes[fname] else "MISMATCH"

        enc_stats = summarize(enc_samples_ns)
        dec_stats = summarize(dec_samples_ns)

        enc_mb_s = (size_bytes / (1024 * 1024)) / (enc_stats["median_ms"] / 1000.0)
        dec_mb_s = (size_bytes / (1024 * 1024)) / (dec_stats["median_ms"] / 1000.0)

        print(f"  {fname:<18s} ({size_bytes:>10,d} B) | Enc: {enc_stats['median_ms']:>6.3f} ms ({enc_mb_s:>6.1f} MB/s) | "
              f"Dec: {dec_stats['median_ms']:>6.3f} ms ({dec_mb_s:>6.1f} MB/s) | SHA-256: {sha_match}")

        summaries.append({
            "platform": "A",
            "mode": suite_name,
            "payload": fname,
            "plaintext_bytes": size_bytes,
            "ciphertext_bytes": ciphertext_bytes,
            "overhead_bytes": overhead_bytes,
            "trials": n_trials,
            "median_encrypt_ms": round(enc_stats["median_ms"], 4),
            "median_decrypt_ms": round(dec_stats["median_ms"], 4),
            "sha256_match": sha_match,
            "encrypt_throughput_mb_s": round(enc_mb_s, 2),
            "decrypt_throughput_mb_s": round(dec_mb_s, 2),
        })

    return summaries, raw_trials


# --- Primitive Micro-Benchmarks ----------------------------------------------

def run_primitive_microbenchmarks():
    print("\nRunning Cryptographic Primitive Microbenchmarks (common.measure)...")
    from cryptography.hazmat.primitives.asymmetric import ed25519, mldsa, mlkem, x25519
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from channel.suite import CipherSuite

    results = []

    # 1. ML-KEM-768
    sk_kem = mlkem.MLKEM768PrivateKey.generate()
    pk_kem_bytes = sk_kem.public_key().public_bytes_raw()
    pk_kem = mlkem.MLKEM768PublicKey.from_public_bytes(pk_kem_bytes)
    ss_kem, ct_kem = pk_kem.encapsulate()

    res_kem_keygen = time_op(lambda: mlkem.MLKEM768PrivateKey.generate(), warmup=10, trials=100)
    res_kem_encap = time_op(lambda: pk_kem.encapsulate(), warmup=10, trials=100)
    res_kem_decap = time_op(lambda: sk_kem.decapsulate(ct_kem), warmup=10, trials=100)

    results.append({"suite": "PQC", "primitive": "ML-KEM-768 keygen", **res_kem_keygen})
    results.append({"suite": "PQC", "primitive": "ML-KEM-768 encaps", **res_kem_encap})
    results.append({"suite": "PQC", "primitive": "ML-KEM-768 decaps", **res_kem_decap})

    # 2. ML-DSA-65
    sk_dsa = mldsa.MLDSA65PrivateKey.generate()
    pk_dsa_bytes = sk_dsa.public_key().public_bytes_raw()
    pk_dsa = mldsa.MLDSA65PublicKey.from_public_bytes(pk_dsa_bytes)
    msg = b"benchmarking transcript hash 32 bytes"
    sig_dsa = sk_dsa.sign(msg, context=b"QFF-SECCHAN-v1")

    res_dsa_keygen = time_op(lambda: mldsa.MLDSA65PrivateKey.generate(), warmup=10, trials=100)
    res_dsa_sign = time_op(lambda: sk_dsa.sign(msg, context=b"QFF-SECCHAN-v1"), warmup=10, trials=100)
    res_dsa_verify = time_op(lambda: pk_dsa.verify(sig_dsa, msg, context=b"QFF-SECCHAN-v1"), warmup=10, trials=100)

    results.append({"suite": "PQC", "primitive": "ML-DSA-65 keygen", **res_dsa_keygen})
    results.append({"suite": "PQC", "primitive": "ML-DSA-65 sign", **res_dsa_sign})
    results.append({"suite": "PQC", "primitive": "ML-DSA-65 verify", **res_dsa_verify})

    # 3. X25519
    sk_x = x25519.X25519PrivateKey.generate()
    pk_x = sk_x.public_key()
    res_x_keygen = time_op(lambda: x25519.X25519PrivateKey.generate(), warmup=10, trials=100)
    res_x_exch = time_op(lambda: sk_x.exchange(pk_x), warmup=10, trials=100)

    results.append({"suite": "Classical", "primitive": "X25519 keygen", **res_x_keygen})
    results.append({"suite": "Classical", "primitive": "X25519 exchange", **res_x_exch})

    # 4. Ed25519
    sk_ed = ed25519.Ed25519PrivateKey.generate()
    pk_ed = sk_ed.public_key()
    sig_ed = sk_ed.sign(msg)

    res_ed_keygen = time_op(lambda: ed25519.Ed25519PrivateKey.generate(), warmup=10, trials=100)
    res_ed_sign = time_op(lambda: sk_ed.sign(msg), warmup=10, trials=100)
    res_ed_verify = time_op(lambda: pk_ed.verify(sig_ed, msg), warmup=10, trials=100)

    results.append({"suite": "Classical", "primitive": "Ed25519 keygen", **res_ed_keygen})
    results.append({"suite": "Classical", "primitive": "Ed25519 sign", **res_ed_sign})
    results.append({"suite": "Classical", "primitive": "Ed25519 verify", **res_ed_verify})

    # 5. HKDF-SHA256 Key Schedule
    th = hashlib.sha256(b"dummy final transcript").digest()
    res_hkdf = time_op(lambda: CipherSuite.derive_keys(ss_kem, os.urandom(32), os.urandom(32), th), warmup=10, trials=100)
    results.append({"suite": "Shared", "primitive": "HKDF-SHA256 key schedule", **res_hkdf})

    for r in results:
        print(f"  {r['primitive']:<28s} : median = {r['median_ms']:>6.3f} ms | IQR = {r['iqr_ms']:>6.3f} ms")

    return results


# --- Real TCP Loopback Benchmark ----------------------------------------------

def run_tcp_benchmark(suite_id: int, trials: int = 20):
    suite_name = "PQC" if suite_id == SUITE_PQC else "classical-baseline"
    alice_keys, bob_keys, a_store, b_store = setup_identities(suite_id)

    samples_ns = []
    server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_sock.bind(("127.0.0.1", 0))
    server_sock.listen(trials)
    port = server_sock.getsockname()[1]

    stop_event = threading.Event()

    def server_loop():
        for _ in range(trials):
            if stop_event.is_set():
                break
            conn, _ = server_sock.accept()
            try:
                trans_b = SocketTransport(conn)
                bob = BobSession("bob", bob_keys, "alice", b_store)
                mtype, body, raw = trans_b.recv_frame()
                sh = bob.process_client_hello(body, raw)
                trans_b.send(sh)
                mtype, body, raw = trans_b.recv_frame()
                bob.process_client_auth(body, raw)
            finally:
                conn.close()

    t = threading.Thread(target=server_loop)
    t.start()

    for _ in range(trials):
        client_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client_sock.connect(("127.0.0.1", port))
        try:
            trans_a = SocketTransport(client_sock)
            alice = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)
            t0 = time.perf_counter_ns()
            ch = alice.start_handshake()
            trans_a.send(ch)
            mtype, body, raw = trans_a.recv_frame()
            ca, _ = alice.process_server_hello(body, raw)
            trans_a.send(ca)
            t1 = time.perf_counter_ns()
            samples_ns.append(t1 - t0)
        finally:
            client_sock.close()

    stop_event.set()
    server_sock.close()
    t.join()

    stats = summarize(samples_ns)
    print(f"[{suite_name}] Real TCP Loopback (N={trials}): median = {stats['median_ms']:.3f} ms | IQR = {stats['iqr_ms']:.3f} ms")
    return stats


# --- Main Orchestration & Output Generation -----------------------------------

def main():
    os.makedirs(RESULTS_DIR, exist_ok=True)

    print("=" * 80)
    print("PS-P1 Quantum-Safe Secure Communication Channel Benchmark")
    print("=" * 80)

    # 1. In-Process Handshake Benchmarks (100 trials each)
    pqc_hs, pqc_trials = run_handshake_benchmark(SUITE_PQC, trials=100, warmup=10, mode_label="local (in-process)")
    cls_hs, cls_trials = run_handshake_benchmark(SUITE_CLASSICAL, trials=100, warmup=10, mode_label="local (in-process)")

    # 2. TCP Loopback Handshake Benchmarks (20 trials each)
    pqc_tcp = run_tcp_benchmark(SUITE_PQC, trials=20)
    cls_tcp = run_tcp_benchmark(SUITE_CLASSICAL, trials=20)

    # 3. Payload Benchmarks
    pqc_payloads, pqc_pay_trials = run_payload_benchmark(SUITE_PQC)
    cls_payloads, cls_pay_trials = run_payload_benchmark(SUITE_CLASSICAL)

    # 4. Primitive Micro-benchmarks
    primitives = run_primitive_microbenchmarks()

    # --- Write Results CSVs ---------------------------------------------------

    # A. handshake_results.csv (matches official kit template)
    hs_csv = os.path.join(RESULTS_DIR, "handshake_results.csv")
    with open(hs_csv, "w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "run_id", "platform", "mode", "kem", "signature", "trials",
            "median_handshake_ms", "iqr_ms", "p95_ms",
            "client_to_server_bytes", "server_to_client_bytes", "total_handshake_bytes",
            "success_count", "failure_count", "local_or_network"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerow({
            "run_id": 1,
            **{k: pqc_hs[k] for k in fieldnames if k != "run_id"}
        })
        writer.writerow({
            "run_id": 2,
            **{k: cls_hs[k] for k in fieldnames if k != "run_id"}
        })
        # Add TCP loopback runs as additional rows
        writer.writerow({
            "run_id": 3,
            "platform": "A",
            "mode": "PQC",
            "kem": "ML-KEM-768",
            "signature": "ML-DSA-65",
            "trials": 20,
            "median_handshake_ms": round(pqc_tcp["median_ms"], 4),
            "iqr_ms": round(pqc_tcp["iqr_ms"], 4),
            "p95_ms": round(pqc_tcp["p95_ms"], 4),
            "client_to_server_bytes": pqc_hs["client_to_server_bytes"],
            "server_to_client_bytes": pqc_hs["server_to_client_bytes"],
            "total_handshake_bytes": pqc_hs["total_handshake_bytes"],
            "success_count": 20,
            "failure_count": 0,
            "local_or_network": "local (TCP loopback)",
        })
        writer.writerow({
            "run_id": 4,
            "platform": "A",
            "mode": "classical-baseline",
            "kem": "X25519",
            "signature": "Ed25519",
            "trials": 20,
            "median_handshake_ms": round(cls_tcp["median_ms"], 4),
            "iqr_ms": round(cls_tcp["iqr_ms"], 4),
            "p95_ms": round(cls_tcp["p95_ms"], 4),
            "client_to_server_bytes": cls_hs["client_to_server_bytes"],
            "server_to_client_bytes": cls_hs["server_to_client_bytes"],
            "total_handshake_bytes": cls_hs["total_handshake_bytes"],
            "success_count": 20,
            "failure_count": 0,
            "local_or_network": "local (TCP loopback)",
        })

    # B. payload_results.csv (matches official kit template)
    pay_csv = os.path.join(RESULTS_DIR, "payload_results.csv")
    with open(pay_csv, "w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "platform", "mode", "payload", "plaintext_bytes", "ciphertext_bytes",
            "overhead_bytes", "trials", "median_encrypt_ms", "median_decrypt_ms",
            "sha256_match", "encrypt_throughput_mb_s", "decrypt_throughput_mb_s"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in pqc_payloads + cls_payloads:
            writer.writerow(r)

    # C. Raw per-trial CSVs
    raw_hs_csv = os.path.join(RESULTS_DIR, "raw_handshake_trials.csv")
    with open(raw_hs_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["trial", "suite", "handshake_time_ms", "c2s_bytes", "s2c_bytes", "total_bytes", "success"])
        writer.writeheader()
        for r in pqc_trials + cls_trials:
            writer.writerow({k: r.get(k, "") for k in ["trial", "suite", "handshake_time_ms", "c2s_bytes", "s2c_bytes", "total_bytes", "success"]})

    raw_pay_csv = os.path.join(RESULTS_DIR, "raw_payload_trials.csv")
    with open(raw_pay_csv, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["suite", "payload", "trial", "encrypt_ms", "decrypt_ms", "plaintext_bytes", "ciphertext_bytes", "overhead_bytes"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in pqc_pay_trials + cls_pay_trials:
            writer.writerow(r)

    # D. Primitives breakdown CSV
    prim_csv = os.path.join(RESULTS_DIR, "primitive_breakdown.csv")
    with open(prim_csv, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["suite", "primitive", "n", "median_ms", "iqr_ms", "p95_ms", "min_ms", "max_ms", "mean_ms", "stdev_ms", "p25_ms", "p75_ms"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in primitives:
            writer.writerow(r)

    print("\n" + "=" * 80)
    print("SUMMARY COMPARISON (Platform A - Intel Core i5-1335U 16 Logical Cores):")
    print("=" * 80)
    lat_ratio = pqc_hs["median_handshake_ms"] / max(0.001, cls_hs["median_handshake_ms"])
    bytes_ratio = pqc_hs["total_handshake_bytes"] / max(1, cls_hs["total_handshake_bytes"])
    print(f"Handshake Latency (in-process) : PQC = {pqc_hs['median_handshake_ms']:.3f} ms | Classical = {cls_hs['median_handshake_ms']:.3f} ms | Ratio: {lat_ratio:.2f}x")
    print(f"Handshake Latency (TCP loopback): PQC = {pqc_tcp['median_ms']:.3f} ms | Classical = {cls_tcp['median_ms']:.3f} ms | Ratio: {pqc_tcp['median_ms']/max(0.001, cls_tcp['median_ms']):.2f}x")
    print(f"Total Wire Bytes               : PQC = {pqc_hs['total_handshake_bytes']} B | Classical = {cls_hs['total_handshake_bytes']} B | Ratio: {bytes_ratio:.2f}x")
    print(f"\nAll benchmark CSVs generated in: {RESULTS_DIR}")


if __name__ == "__main__":
    main()

