"""
Visualization Service for Cryptographic and Quantum Architectural Results.
Generates publication-quality charts into results/figures/:
1. crypto_latency_breakdown.png: Handshake latency Platform A vs Platform B
2. crypto_message_sizes.png: Wire ciphertext & public key size breakdown
3. crypto_memory_overhead.png: Tracemalloc peak heap vs process RSS delta
4. processor_ab_comparison.png: Transpiled depth, CX counts, SWAP overhead, and noisy fidelity
5. processor_coupling_maps.png: Graph topologies for Processor A and Processor B
"""
from pathlib import Path
from typing import Dict, Any, Optional
import matplotlib
matplotlib.use("Agg")  # Non-interactive headless backend
import matplotlib.pyplot as plt
import numpy as np
import networkx as nx

from processors.visualization import generate_processor_comparison_figure

ROOT_DIR = Path(__file__).resolve().parent.parent
FIGURES_DIR = ROOT_DIR / "results" / "figures"


def ensure_figures_dir() -> Path:
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    return FIGURES_DIR


def plot_processor_comparison(benchmark_result: Dict[str, Any], output_path: Optional[Path] = None) -> str:
    """Generate comparative bar chart for Processor A vs Processor B."""
    ensure_figures_dir()
    target = output_path or (FIGURES_DIR / "processor_ab_comparison.png")
    return generate_processor_comparison_figure(benchmark_result, target)


def plot_handshake_latency(
    stats_a: Dict[str, Any],
    stats_b: Dict[str, Any],
    output_path: Optional[Path] = None
) -> str:
    """
    Generate comparative latency distribution bar chart comparing Platform A vs Platform B.
    """
    ensure_figures_dir()
    target = output_path or (FIGURES_DIR / "crypto_latency_breakdown.png")

    fig, ax = plt.subplots(figsize=(9, 5), dpi=300)
    fig.patch.set_facecolor("#FAF8F5")
    ax.set_facecolor("#FFFFFF")

    categories = ["Mean Latency", "Median (p50)", "95th Percentile (p95)"]
    
    total_a = stats_a.get("total_handshake_ms") or stats_a.get("total_handshake", {})
    total_b = stats_b.get("total_handshake_ms") or stats_b.get("total_handshake", {})

    vals_a = [
        total_a.get("mean_ms", 0.0),
        total_a.get("median_ms", 0.0),
        total_a.get("p95_ms", 0.0),
    ]
    vals_b = [
        total_b.get("mean_ms", 0.0),
        total_b.get("median_ms", 0.0),
        total_b.get("p95_ms", 0.0),
    ]

    x = np.arange(len(categories))
    width = 0.35

    rects1 = ax.bar(x - width/2, vals_a, width, label="Platform A (Standard CPU - All Cores)", color="#2A6B3D", edgecolor="#1E4D2B")
    rects2 = ax.bar(x + width/2, vals_b, width, label="Platform B (Constrained - Core 0 Pinning)", color="#963B43", edgecolor="#70262C")

    ax.set_ylabel("Handshake Latency (ms)", fontsize=11, fontweight="bold", color="#332F2D")
    ax.set_title("Hybrid Handshake Latency: Platform A vs Platform B (N=100 Trials)", fontsize=12, fontweight="bold", color="#332F2D", pad=12)
    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=10, color="#332F2D")
    ax.grid(axis="y", linestyle="--", alpha=0.3, color="#8E867D")
    ax.legend(frameon=True, facecolor="#FAF8F5", edgecolor="#E8E0D7", fontsize=9)

    for rect in rects1 + rects2:
        height = rect.get_height()
        ax.annotate(
            f"{height:.2f} ms",
            xy=(rect.get_x() + rect.get_width() / 2, height),
            xytext=(0, 3),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=8.5,
            fontweight="semibold",
            color="#332F2D"
        )

    plt.tight_layout()
    fig.savefig(target, dpi=300)
    plt.close(fig)
    return str(target)


def plot_message_sizes(output_path: Optional[Path] = None) -> str:
    """
    Generate horizontal bar chart of NIST FIPS 203 and SECP256R1 wire artifact sizes.
    """
    ensure_figures_dir()
    target = output_path or (FIGURES_DIR / "crypto_message_sizes.png")

    fig, ax = plt.subplots(figsize=(8, 4), dpi=300)
    fig.patch.set_facecolor("#FAF8F5")
    ax.set_facecolor("#FFFFFF")

    primitives = [
        "ECDH Alice PK\n(secp256r1)",
        "ECDH Bob PK\n(secp256r1)",
        "ML-KEM-768 PK\n(FIPS 203)",
        "ML-KEM-768 Ciphertext\n(FIPS 203)",
        "Total Hybrid Wire\n(Alice + Bob)",
    ]
    sizes = [65, 65, 1184, 1088, 2402]
    colors = ["#4A7C59", "#4A7C59", "#963B43", "#B3545C", "#2B2826"]

    bars = ax.barh(primitives, sizes, color=colors, edgecolor="#DDD6CC", height=0.55)
    ax.set_xlabel("Wire Payload Size (Bytes)", fontsize=10, fontweight="bold", color="#332F2D")
    ax.set_title("Cryptographic Wire Artifact Breakdown: FIPS 203 + SECP256R1", fontsize=11, fontweight="bold", color="#332F2D", pad=12)
    ax.grid(axis="x", linestyle="--", alpha=0.3, color="#8E867D")

    for bar in bars:
        width = bar.get_width()
        ax.annotate(
            f"{width:,} B",
            xy=(width, bar.get_y() + bar.get_height() / 2),
            xytext=(6, 0),
            textcoords="offset points",
            ha="left",
            va="center",
            fontsize=9,
            fontweight="bold",
            color="#332F2D"
        )

    ax.set_xlim(0, max(sizes) * 1.18)
    plt.tight_layout()
    fig.savefig(target, dpi=300)
    plt.close(fig)
    return str(target)


def plot_memory_overhead(
    mem_a: Dict[str, Any],
    mem_b: Dict[str, Any],
    output_path: Optional[Path] = None
) -> str:
    """
    Generate comparative memory overhead figure (Python tracemalloc heap vs OS Process RSS delta).
    """
    ensure_figures_dir()
    target = output_path or (FIGURES_DIR / "crypto_memory_overhead.png")

    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=300)
    fig.patch.set_facecolor("#FAF8F5")
    ax.set_facecolor("#FFFFFF")

    categories = ["Python Heap Peak (KB)", "OS Process RSS Delta (MB)"]
    vals_a = [mem_a.get("python_heap_peak_kb", 0.0), mem_a.get("rss_delta_mb", 0.0)]
    vals_b = [mem_b.get("python_heap_peak_kb", 0.0), mem_b.get("rss_delta_mb", 0.0)]

    x = np.arange(len(categories))
    width = 0.35

    rects1 = ax.bar(x - width/2, vals_a, width, label="Platform A (Standard)", color="#2A6B3D")
    rects2 = ax.bar(x + width/2, vals_b, width, label="Platform B (Constrained)", color="#963B43")

    ax.set_ylabel("Measured Overhead", fontsize=10, fontweight="bold", color="#332F2D")
    ax.set_title("Memory Overhead: Python Tracemalloc Heap vs OS Process RSS", fontsize=11, fontweight="bold", color="#332F2D", pad=12)
    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=9.5, color="#332F2D")
    ax.grid(axis="y", linestyle="--", alpha=0.3, color="#8E867D")
    ax.legend(frameon=True, facecolor="#FAF8F5", edgecolor="#E8E0D7", fontsize=9)

    for rect in rects1 + rects2:
        height = rect.get_height()
        ax.annotate(
            f"{height:.1f}",
            xy=(rect.get_x() + rect.get_width() / 2, height),
            xytext=(0, 3),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=8.5,
            fontweight="semibold",
            color="#332F2D"
        )

    plt.tight_layout()
    fig.savefig(target, dpi=300)
    plt.close(fig)
    return str(target)


def plot_coupling_topologies(output_path: Optional[Path] = None) -> str:
    """
    Generate graph diagram of Processor A (5Q linear) and Processor B (9Q heavy-hex).
    """
    ensure_figures_dir()
    target = output_path or (FIGURES_DIR / "processor_coupling_maps.png")

    from src.processors import get_processor_a, get_processor_b
    proc_a = get_processor_a()
    proc_b = get_processor_b()

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 5), dpi=300)
    fig.patch.set_facecolor("#FAF8F5")

    # Processor A layout: linear chain
    pos_a = {i: (i, 0) for i in range(5)}
    nx.draw_networkx(
        proc_a.nx_graph,
        pos=pos_a,
        ax=ax1,
        node_color="#2A6B3D",
        node_size=650,
        font_color="#FFFFFF",
        font_weight="bold",
        font_size=10,
        edge_color="#1E4D2B",
        width=2.5
    )
    ax1.set_title("Processor A: 5-Qubit Linear Chain\n(Diameter: 4 hops, 4 edges)", fontsize=10, fontweight="bold", color="#332F2D")
    ax1.set_axis_off()

    # Processor B layout: spring / planar layout
    pos_b = nx.spring_layout(proc_b.nx_graph, seed=42)
    nx.draw_networkx(
        proc_b.nx_graph,
        pos=pos_b,
        ax=ax2,
        node_color="#963B43",
        node_size=650,
        font_color="#FFFFFF",
        font_weight="bold",
        font_size=10,
        edge_color="#70262C",
        width=2.2
    )
    ax2.set_title("Processor B: 9-Qubit Sparse Heavy-Hex\n(Diameter: 3 hops, 12 edges)", fontsize=10, fontweight="bold", color="#332F2D")
    ax2.set_axis_off()

    plt.suptitle("Universal Reference Architectures (Qiskit Fall Fest 2026 Phase 1)", fontsize=12, fontweight="bold", color="#332F2D", y=0.98)
    plt.tight_layout()
    fig.savefig(target, dpi=300)
    plt.close(fig)
    return str(target)
