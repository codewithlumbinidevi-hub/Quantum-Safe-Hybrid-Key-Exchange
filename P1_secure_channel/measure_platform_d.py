"""
Platform D Measurement Harness: Emulated High-Latency / Constrained WAN Link.

Constraint: 50 ms RTT (25 ms one-way delay) and 1 Mbps bandwidth cap (125,000 B/s).
Reveals the true impact of PQC message size expansion (9,016 B vs 318 B)
when network propagation and serialization delays dominate CPU execution.
"""
from __future__ import annotations

import csv
import os
import queue
import sys
import time
from typing import Dict, Tuple

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

from common.measure import summarize
from P1_secure_channel.channel import (
    SUITE_CLASSICAL,
    SUITE_PQC,
    AliceSession,
    BobSession,
    IdentityKeyPair,
    TrustAnchorStore,
    run_handshake,
)
from P1_secure_channel.channel.handshake import Transport
from P1_secure_channel.channel.wire import unpack_frame

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")


class EmulatedNetworkTransport(Transport):
    """
    Simulates a network link with configurable propagation delay (RTT/2)
    and transmission serialization delay (bandwidth cap).
    """

    def __init__(self, tx_queue: queue.Queue, rx_queue: queue.Queue, one_way_delay_ms: float = 25.0, bandwidth_bps: int = 1_000_000):
        self.tx_queue = tx_queue
        self.rx_queue = rx_queue
        self.one_way_delay_s = one_way_delay_ms / 1000.0
        self.bytes_per_sec = bandwidth_bps / 8.0

    @classmethod
    def create_pair(cls, one_way_delay_ms: float = 25.0, bandwidth_bps: int = 1_000_000) -> Tuple[EmulatedNetworkTransport, EmulatedNetworkTransport]:
        q1: queue.Queue = queue.Queue()
        q2: queue.Queue = queue.Queue()
        return (
            cls(tx_queue=q1, rx_queue=q2, one_way_delay_ms=one_way_delay_ms, bandwidth_bps=bandwidth_bps),
            cls(tx_queue=q2, rx_queue=q1, one_way_delay_ms=one_way_delay_ms, bandwidth_bps=bandwidth_bps),
        )

    def send(self, data: bytes) -> None:
        # Transmission delay = size / bandwidth + propagation delay
        tx_delay = len(data) / self.bytes_per_sec
        delivery_time = time.time() + self.one_way_delay_s + tx_delay
        self.tx_queue.put((delivery_time, bytes(data)))

    def recv_frame(self, timeout: float = 10.0) -> Tuple[int, bytes, bytes]:
        delivery_time, raw = self.rx_queue.get(timeout=timeout)
        now = time.time()
        if now < delivery_time:
            time.sleep(delivery_time - now)
        msg_type, body, remaining = unpack_frame(raw)
        return msg_type, body, raw


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


def benchmark_suite_under_platform_d(suite_id: int, trials: int = 20) -> Dict:
    suite_name = "PQC" if suite_id == SUITE_PQC else "classical-baseline"
    alice_keys, bob_keys, a_store, b_store = setup_identities(suite_id)

    print(f"\n[Platform D: Emulated WAN 50ms RTT / 1Mbps] Measuring {suite_name} (N={trials})...")
    samples_ns = []

    for trial in range(1, trials + 1):
        trans_a, trans_b = EmulatedNetworkTransport.create_pair(one_way_delay_ms=25.0, bandwidth_bps=1_000_000)
        alice = AliceSession("alice", alice_keys, "bob", a_store, suite_id=suite_id)
        bob = BobSession("bob", bob_keys, "alice", b_store)

        t0 = time.perf_counter_ns()
        ra, rb, metrics = run_handshake(alice, bob, trans_a, trans_b)
        t1 = time.perf_counter_ns()
        samples_ns.append(t1 - t0)

    stats = summarize(samples_ns)
    print(f"  {suite_name} Platform D Latency: Median = {stats['median_ms']:.2f} ms | IQR = {stats['iqr_ms']:.2f} ms | Total Bytes = {metrics.total_bytes} B")

    return {
        "platform": "D",
        "mode": suite_name,
        "emulation": "50ms RTT, 1Mbps WAN",
        "trials": trials,
        "median_ms": round(stats["median_ms"], 2),
        "iqr_ms": round(stats["iqr_ms"], 2),
        "p95_ms": round(stats["p95_ms"], 2),
        "total_handshake_bytes": metrics.total_bytes,
    }


def main():
    pqc_res = benchmark_suite_under_platform_d(SUITE_PQC, trials=20)
    cls_res = benchmark_suite_under_platform_d(SUITE_CLASSICAL, trials=20)

    out_csv = os.path.join(RESULTS_DIR, "platform_D_results.csv")
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["platform", "mode", "emulation", "trials", "median_ms", "iqr_ms", "p95_ms", "total_handshake_bytes"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerow(pqc_res)
        writer.writerow(cls_res)

    print(f"\nPlatform D results written to: {out_csv}")

    # Generate Chart
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(7, 4.5), dpi=300)
    labels = ["PQC (ML-KEM + ML-DSA)", "Classical (X25519 + Ed25519)"]
    medians = [pqc_res["median_ms"], cls_res["median_ms"]]
    iqrs = [pqc_res["iqr_ms"], cls_res["iqr_ms"]]

    colors = ["#1f77b4", "#2ca02c"]
    bars = ax.bar(labels, medians, yerr=iqrs, capsize=6, color=colors, edgecolor="black", width=0.45)

    for bar, med in zip(bars, medians):
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width() / 2.0, yval + 5, f"{med:.1f} ms", ha="center", va="bottom", fontweight="bold", fontsize=10)

    ax.set_ylabel("Handshake Completion Time (ms)", fontsize=11, fontweight="bold")
    ax.set_title("Platform D: Handshake Latency under 50ms RTT & 1 Mbps WAN", fontsize=11, fontweight="bold", pad=12)
    ax.grid(axis="y", linestyle="--", alpha=0.5)

    plt.tight_layout()
    chart_path = os.path.join(RESULTS_DIR, "figures", "platform_D_comparison.png")
    plt.savefig(chart_path)
    plt.close()
    print(f"Generated Platform D figure: {chart_path}")


if __name__ == "__main__":
    main()

