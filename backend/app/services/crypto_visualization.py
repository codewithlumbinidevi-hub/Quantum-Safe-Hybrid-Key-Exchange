"""
Cryptographic Benchmark Visualization Service.
Generates publication-quality charts for:
1. Latency breakdown (Mean, Median, p95) across cryptographic primitives.
2. Protocol payload size comparison (ECDH vs ML-KEM vs Hybrid).
Saves figures to results/figures/ without requiring an interactive display.
"""
from pathlib import Path
from typing import Dict, Any, Optional
import matplotlib
matplotlib.use("Agg")  # Headless backend
import matplotlib.pyplot as plt
import numpy as np


def generate_crypto_figures(
    benchmark_result: Dict[str, Any],
    output_dir: Optional[Path] = None
) -> Dict[str, str]:
    """
    Generate and save cryptographic benchmark figures.
    
    Args:
        benchmark_result: Dictionary returned by CryptoBenchmarkService.run_benchmark.
        output_dir: Target directory (defaults to results/figures/).
        
    Returns:
        Dict mapping figure name to file path string.
    """
    if output_dir is None:
        base_dir = Path(__file__).resolve().parent.parent.parent
        output_dir = base_dir / "results" / "figures"
    output_dir.mkdir(parents=True, exist_ok=True)

    generated: Dict[str, str] = {}
    stats = benchmark_result.get("statistics", {})
    payload_sizes = benchmark_result.get("payload_sizes", {})
    platform = benchmark_result.get("platform_profile", "platform_a")
    iterations = benchmark_result.get("iterations", 100)

    # -----------------------------------------------------------------
    # Figure 1: Latency Breakdown (Mean, Median, p95)
    # -----------------------------------------------------------------
    operations = []
    means = []
    medians = []
    p95s = []

    op_mapping = [
        ("ecdh_keygen", "ECDH KeyGen"),
        ("ecdh_derivation", "ECDH Deriv"),
        ("mlkem_keygen", "ML-KEM KeyGen"),
        ("mlkem_encapsulation", "ML-KEM Encap"),
        ("mlkem_decapsulation", "ML-KEM Decap"),
        ("hybrid_kdf", "Hybrid KDF"),
        ("total_handshake", "Total Handshake"),
    ]

    for key, label in op_mapping:
        if key in stats and isinstance(stats[key], dict):
            s = stats[key]
            operations.append(label)
            means.append(s.get("mean_ms", 0.0))
            medians.append(s.get("median_ms", 0.0))
            p95s.append(s.get("p95_ms", 0.0))

    if operations:
        fig, ax = plt.subplots(figsize=(10, 5.5), dpi=300)
        fig.patch.set_facecolor("#FBFAF7")
        ax.set_facecolor("#FFFFFF")

        x = np.arange(len(operations))
        width = 0.26

        rects1 = ax.bar(x - width, means, width, label="Mean (ms)", color="#963B43", edgecolor="#7F3038")
        rects2 = ax.bar(x, medians, width, label="Median (ms)", color="#2D5A88", edgecolor="#1E3E5F")
        rects3 = ax.bar(x + width, p95s, width, label="p95 Tail (ms)", color="#C58B3A", edgecolor="#9E6E28")

        ax.set_ylabel("Execution Time (milliseconds)", fontsize=11, fontweight="bold", color="#292824")
        ax.set_title(
            f"Cryptographic Operation Latency ({platform.upper()}, N={iterations} trials)",
            fontsize=13, fontweight="bold", color="#292824", pad=12
        )
        ax.set_xticks(x)
        ax.set_xticklabels(operations, fontsize=9.5, fontweight="semibold", color="#292824", rotation=15, ha="right")
        ax.legend(framealpha=0.9, facecolor="#F8F6F1", edgecolor="#D5CCC2", fontsize=9.5)
        ax.grid(axis="y", linestyle="--", alpha=0.35, color="#D5CCC2")

        # Add data value labels on bars
        for rect in rects1:
            h = rect.get_height()
            if h > 0:
                ax.annotate(f"{h:.2f}", xy=(rect.get_x() + rect.get_width() / 2, h),
                            xytext=(0, 2), textcoords="offset points",
                            ha="center", va="bottom", fontsize=7.5, color="#7F3038", rotation=45)

        for spine in ax.spines.values():
            spine.set_color("#D5CCC2")

        plt.tight_layout()
        latency_fig_path = output_dir / "crypto_latency_breakdown.png"
        plt.savefig(latency_fig_path, dpi=300, bbox_inches="tight")
        plt.close(fig)
        generated["latency_breakdown"] = str(latency_fig_path)

    # -----------------------------------------------------------------
    # Figure 2: Protocol Payload Size Breakdown
    # -----------------------------------------------------------------
    payload_items = [
        ("Alice ECDH PK\n(NIST P-256)", payload_sizes.get("ecdh_public_key_bytes", 65)),
        ("Bob ECDH PK\n(NIST P-256)", payload_sizes.get("ecdh_public_key_bytes", 65)),
        ("Bob ML-KEM PK\n(FIPS 203)", payload_sizes.get("mlkem_public_key_bytes", 1184)),
        ("ML-KEM Ciphertext\n(FIPS 203)", payload_sizes.get("mlkem_ciphertext_bytes", 1088)),
        ("Total Hybrid\nPayload", payload_sizes.get("total_handshake_payload_bytes", 2402)),
    ]

    fig, ax = plt.subplots(figsize=(8.5, 5), dpi=300)
    fig.patch.set_facecolor("#FBFAF7")
    ax.set_facecolor("#FFFFFF")

    labels = [item[0] for item in payload_items]
    sizes = [item[1] for item in payload_items]
    colors = ["#2D5A88", "#2D5A88", "#963B43", "#C58B3A", "#3E9B70"]
    edgecolors = ["#1E3E5F", "#1E3E5F", "#7F3038", "#9E6E28", "#2E7554"]

    bars = ax.bar(labels, sizes, width=0.5, color=colors, edgecolor=edgecolors)
    ax.set_ylabel("Message Payload Size (Bytes)", fontsize=11, fontweight="bold", color="#292824")
    ax.set_title("NIST Standardized Handshake Payload Sizes", fontsize=13, fontweight="bold", color="#292824", pad=12)
    ax.grid(axis="y", linestyle="--", alpha=0.35, color="#D5CCC2")

    for bar in bars:
        h = bar.get_height()
        ax.annotate(f"{h:,} B", xy=(bar.get_x() + bar.get_width() / 2, h),
                    xytext=(0, 4), textcoords="offset points",
                    ha="center", va="bottom", fontsize=9, fontweight="bold", color="#292824")

    for spine in ax.spines.values():
        spine.set_color("#D5CCC2")

    plt.tight_layout()
    sizes_fig_path = output_dir / "crypto_message_sizes.png"
    plt.savefig(sizes_fig_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    generated["message_sizes"] = str(sizes_fig_path)

    return generated
