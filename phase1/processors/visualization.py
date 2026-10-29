"""
Visualization service for Processor A/B architectural comparison.
Renders comparison plots for Transpiled Depth, CX Overhead, SWAP gate counts,
and Noisy Execution Fidelity, saving to results/figures/processor_ab_comparison.png.
"""
from pathlib import Path
from typing import Dict, Any, Optional
import matplotlib
matplotlib.use("Agg")  # Non-interactive headless backend
import matplotlib.pyplot as plt
import numpy as np


def generate_processor_comparison_figure(
    benchmark_result: Dict[str, Any],
    output_path: Optional[Path] = None
) -> str:
    """
    Generate side-by-side architectural comparison bar charts.
    
    Args:
        benchmark_result: Output dictionary from ProcessorBenchmarkRunner.run_ab_benchmark.
        output_path: Target PNG file path.
        
    Returns:
        Absolute string path to generated PNG.
    """
    if output_path is None:
        base_dir = Path(__file__).resolve().parent.parent
        output_path = base_dir / "results" / "figures" / "processor_ab_comparison.png"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    metrics_a = benchmark_result["processor_a"]["metrics"]
    metrics_b = benchmark_result["processor_b"]["metrics"]
    fid_a = benchmark_result["processor_a"]["hellinger_fidelity"]
    fid_b = benchmark_result["processor_b"]["hellinger_fidelity"]
    circuit_name = benchmark_result["circuit"]["name"]

    # Data for plotting
    categories = ["Transpiled Depth", "Transpiled CX", "Routing SWAPs"]
    vals_a = [metrics_a["transpiled_depth"], metrics_a["transpiled_cx_count"], int(metrics_a["swap_gate_estimate"])]
    vals_b = [metrics_b["transpiled_depth"], metrics_b["transpiled_cx_count"], int(metrics_b["swap_gate_estimate"])]

    # Dark-themed publication style
    plt.style.use("dark_background")
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6), gridspec_kw={"width_ratios": [2.2, 1]})
    fig.patch.set_facecolor("#0b0f19")
    ax1.set_facecolor("#111827")
    ax2.set_facecolor("#111827")

    # Plot 1: Circuit Complexity & Routing Metrics
    x = np.arange(len(categories))
    width = 0.35

    rects1 = ax1.bar(x - width/2, vals_a, width, label="Processor A (5Q Linear)", color="#38bdf8", edgecolor="#0284c7")
    rects2 = ax1.bar(x + width/2, vals_b, width, label="Processor B (9Q Heavy-Hex)", color="#a855f7", edgecolor="#7e22ce")

    ax1.set_ylabel("Count / Depth", fontsize=12, fontweight="bold", color="#e2e8f0")
    ax1.set_title(f"Compilation Overhead: {circuit_name}", fontsize=13, fontweight="bold", color="#f8fafc", pad=12)
    ax1.set_xticks(x)
    ax1.set_xticklabels(categories, fontsize=11, fontweight="bold", color="#cbd5e1")
    ax1.legend(loc="upper right", framealpha=0.8, facecolor="#1e293b", edgecolor="#475569")
    ax1.grid(axis="y", linestyle="--", alpha=0.25)

    # Bar value labels
    for rect in rects1:
        h = rect.get_height()
        ax1.annotate(f"{h}", xy=(rect.get_x() + rect.get_width() / 2, h),
                     xytext=(0, 3), textcoords="offset points",
                     ha="center", va="bottom", fontsize=10, fontweight="bold", color="#38bdf8")
    for rect in rects2:
        h = rect.get_height()
        ax1.annotate(f"{h}", xy=(rect.get_x() + rect.get_width() / 2, h),
                     xytext=(0, 3), textcoords="offset points",
                     ha="center", va="bottom", fontsize=10, fontweight="bold", color="#c084fc")

    # Plot 2: Noisy Execution Fidelity
    fid_categories = ["Proc A (Linear)", "Proc B (Heavy-Hex)"]
    fidelities = [fid_a, fid_b]
    colors = ["#38bdf8", "#a855f7"]
    rects_fid = ax2.bar(fid_categories, fidelities, width=0.45, color=colors, edgecolor="#475569")

    ax2.set_ylabel("Hellinger Fidelity (Ideal vs Noisy)", fontsize=11, fontweight="bold", color="#e2e8f0")
    ax2.set_title("Noisy Execution Fidelity", fontsize=13, fontweight="bold", color="#f8fafc", pad=12)
    ax2.set_ylim(0, 1.1)
    ax2.grid(axis="y", linestyle="--", alpha=0.25)

    for rect in rects_fid:
        h = rect.get_height()
        ax2.annotate(f"{h:.4f}", xy=(rect.get_x() + rect.get_width() / 2, h),
                     xytext=(0, 3), textcoords="offset points",
                     ha="center", va="bottom", fontsize=10, fontweight="bold", color="#f8fafc")

    plt.suptitle("Q-SHIELD-PQC: Qiskit Architecture Benchmark (Phase 1)", fontsize=15, fontweight="bold", color="#38bdf8", y=0.98)
    plt.tight_layout()
    plt.subplots_adjust(top=0.88)
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close(fig)

    return str(output_path)
