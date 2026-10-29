"""
Visualizations Generator for PS-P1 Performance Results.

Reads raw CSVs from results/ and generates publication-grade figures in results/figures/:
1. handshake_latency_comparison.png
2. wire_bytes_breakdown.png
3. primitive_microbenchmarks.png
4. payload_throughput.png
"""
import csv
import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
FIGS_DIR = os.path.join(RESULTS_DIR, "figures")
os.makedirs(FIGS_DIR, exist_ok=True)


def plot_handshake_latency():
    csv_path = os.path.join(RESULTS_DIR, "handshake_results.csv")
    df = pd.read_csv(csv_path)

    # Filter to in-process and TCP runs
    fig, ax = plt.subplots(figsize=(8, 5), dpi=300)

    labels = [
        f"PQC\n(In-Process)",
        f"Classical\n(In-Process)",
        f"PQC\n(TCP Loopback)",
        f"Classical\n(TCP Loopback)",
    ]
    medians = df["median_handshake_ms"].tolist()
    iqrs = df["iqr_ms"].tolist()

    x = np.arange(len(labels))
    colors = ["#1f77b4", "#2ca02c", "#aec7e8", "#98df8a"]

    bars = ax.bar(x, medians, yerr=iqrs, capsize=5, color=colors, edgecolor="black", alpha=0.9, width=0.55)

    for bar, med in zip(bars, medians):
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width() / 2.0, yval + 0.3, f"{med:.2f} ms", ha="center", va="bottom", fontweight="bold", fontsize=10)

    ax.set_ylabel("Handshake Completion Time (ms)", fontsize=11, fontweight="bold")
    ax.set_title("Handshake Latency: PQC vs Classical Baseline (Platform A, N=100 & N=20)", fontsize=12, fontweight="bold", pad=12)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=10)
    ax.grid(axis="y", linestyle="--", alpha=0.5)

    plt.tight_layout()
    out_path = os.path.join(FIGS_DIR, "handshake_latency_comparison.png")
    plt.savefig(out_path)
    plt.close()
    print(f"Generated: {out_path}")


def plot_wire_bytes():
    fig, ax = plt.subplots(figsize=(8, 5), dpi=300)

    categories = ["ClientHello", "ServerHello", "ClientAuth", "Total"]
    # PQC wire bytes: ClientHello=1242, ServerHello=4452, ClientAuth=3322, Total=9016
    pqc_bytes = [1242, 4452, 3322, 9016]
    # Classical wire bytes: ClientHello=90, ServerHello=151, ClientAuth=77, Total=318
    cls_bytes = [90, 151, 77, 318]

    x = np.arange(len(categories))
    width = 0.35

    rects1 = ax.bar(x - width/2, pqc_bytes, width, label="PQC (ML-KEM-768 + ML-DSA-65)", color="#1f77b4", edgecolor="black")
    rects2 = ax.bar(x + width/2, cls_bytes, width, label="Classical (X25519 + Ed25519)", color="#2ca02c", edgecolor="black")

    ax.set_yscale("log")
    ax.set_ylabel("Serialized Wire Bytes (Log Scale)", fontsize=11, fontweight="bold")
    ax.set_title("Serialized Handshake Wire Bytes per Message Flight", fontsize=12, fontweight="bold", pad=12)
    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=10, fontweight="bold")
    ax.legend(fontsize=10)
    ax.grid(axis="y", linestyle="--", alpha=0.5)

    # Label heights
    for rect, val in zip(rects1, pqc_bytes):
        ax.annotate(f"{val} B", xy=(rect.get_x() + rect.get_width() / 2, val),
                    xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=8, fontweight="bold")

    for rect, val in zip(rects2, cls_bytes):
        ax.annotate(f"{val} B", xy=(rect.get_x() + rect.get_width() / 2, val),
                    xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=8, fontweight="bold")

    plt.tight_layout()
    out_path = os.path.join(FIGS_DIR, "wire_bytes_breakdown.png")
    plt.savefig(out_path)
    plt.close()
    print(f"Generated: {out_path}")


def plot_primitive_breakdown():
    csv_path = os.path.join(RESULTS_DIR, "primitive_breakdown.csv")
    df = pd.read_csv(csv_path)

    fig, ax = plt.subplots(figsize=(10, 5), dpi=300)

    prims = df["primitive"].tolist()
    medians = df["median_ms"].tolist()
    iqrs = df["iqr_ms"].tolist()
    suites = df["suite"].tolist()

    colors = ["#1f77b4" if s == "PQC" else ("#2ca02c" if s == "Classical" else "#ff7f0e") for s in suites]

    y_pos = np.arange(len(prims))
    ax.barh(y_pos, medians, xerr=iqrs, capsize=4, color=colors, edgecolor="black", alpha=0.85)

    ax.set_yticks(y_pos)
    ax.set_yticklabels(prims, fontsize=9)
    ax.invert_yaxis()  # top-down
    ax.set_xlabel("Time (ms) - Platform A, N=100 Trials (common.measure)", fontsize=11, fontweight="bold")
    ax.set_title("Cryptographic Primitive Microbenchmark Execution Times (Median + IQR)", fontsize=12, fontweight="bold", pad=12)
    ax.grid(axis="x", linestyle="--", alpha=0.5)

    # Custom legend
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor="#1f77b4", edgecolor="black", label="PQC Primitive"),
        Patch(facecolor="#2ca02c", edgecolor="black", label="Classical Primitive"),
        Patch(facecolor="#ff7f0e", edgecolor="black", label="Shared (HKDF-SHA256)"),
    ]
    ax.legend(handles=legend_elements, loc="lower right", fontsize=10)

    for i, v in enumerate(medians):
        ax.text(v + 0.05, i, f" {v:.3f} ms", va="center", fontsize=8, fontweight="bold")

    plt.tight_layout()
    out_path = os.path.join(FIGS_DIR, "primitive_microbenchmarks.png")
    plt.savefig(out_path)
    plt.close()
    print(f"Generated: {out_path}")


def plot_payload_performance():
    csv_path = os.path.join(RESULTS_DIR, "payload_results.csv")
    df = pd.read_csv(csv_path)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5), dpi=300)

    # 1. Latency across payloads
    pqc_df = df[df["mode"] == "PQC"]
    payload_names = ["1 KB", "100 KB", "10 MB"]
    enc_times = pqc_df["median_encrypt_ms"].tolist()
    dec_times = pqc_df["median_decrypt_ms"].tolist()

    x = np.arange(len(payload_names))
    width = 0.35

    ax1.bar(x - width/2, enc_times, width, label="AES-256-GCM Encrypt", color="#1f77b4", edgecolor="black")
    ax1.bar(x + width/2, dec_times, width, label="AES-256-GCM Decrypt", color="#ff7f0e", edgecolor="black")
    ax1.set_yscale("log")
    ax1.set_ylabel("Execution Time (ms, Log Scale)", fontsize=11, fontweight="bold")
    ax1.set_title("Official Payload Processing Latency", fontsize=12, fontweight="bold")
    ax1.set_xticks(x)
    ax1.set_xticklabels(payload_names, fontsize=10, fontweight="bold")
    ax1.legend(fontsize=10)
    ax1.grid(axis="y", linestyle="--", alpha=0.5)

    for i, (e, d) in enumerate(zip(enc_times, dec_times)):
        ax1.annotate(f"{e:.2f} ms", (x[i] - width/2, e), xytext=(0, 3), textcoords="offset points", ha="center", fontsize=8)
        ax1.annotate(f"{d:.2f} ms", (x[i] + width/2, d), xytext=(0, 3), textcoords="offset points", ha="center", fontsize=8)

    # 2. Throughput
    enc_thru = pqc_df["encrypt_throughput_mb_s"].tolist()
    dec_thru = pqc_df["decrypt_throughput_mb_s"].tolist()

    ax2.bar(x - width/2, enc_thru, width, label="Encrypt Throughput", color="#2ca02c", edgecolor="black")
    ax2.bar(x + width/2, dec_thru, width, label="Decrypt Throughput", color="#d62728", edgecolor="black")
    ax2.set_ylabel("Throughput (MB/s)", fontsize=11, fontweight="bold")
    ax2.set_title("AES-256-GCM Streaming Throughput", fontsize=12, fontweight="bold")
    ax2.set_xticks(x)
    ax2.set_xticklabels(payload_names, fontsize=10, fontweight="bold")
    ax2.legend(fontsize=10)
    ax2.grid(axis="y", linestyle="--", alpha=0.5)

    for i, (e, d) in enumerate(zip(enc_thru, dec_thru)):
        ax2.annotate(f"{e:.0f} MB/s", (x[i] - width/2, e), xytext=(0, 3), textcoords="offset points", ha="center", fontsize=8)
        ax2.annotate(f"{d:.0f} MB/s", (x[i] + width/2, d), xytext=(0, 3), textcoords="offset points", ha="center", fontsize=8)

    plt.tight_layout()
    out_path = os.path.join(FIGS_DIR, "payload_throughput.png")
    plt.savefig(out_path)
    plt.close()
    print(f"Generated: {out_path}")


def main():
    plot_handshake_latency()
    plot_wire_bytes()
    plot_primitive_breakdown()
    plot_payload_performance()
    print("All figures successfully created.")


if __name__ == "__main__":
    main()
