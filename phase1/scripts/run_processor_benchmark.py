"""
CLI runner for Q-SHIELD-PQC Processor A/B Architecture Benchmark.
"""
import sys
import argparse
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from processors.benchmark import ProcessorBenchmarkRunner
from processors.visualization import generate_processor_comparison_figure


def main():
    parser = argparse.ArgumentParser(description="Q-SHIELD-PQC Processor Architecture Benchmark CLI")
    parser.add_argument("--circuit", type=str, default="qft_5", help="Circuit ID: qft_5, ghz_5, or cross_conn_5")
    parser.add_argument("--shots", type=int, default=4096, help="Simulation shots (default: 4096)")
    parser.add_argument("--opt", type=int, default=1, help="Transpiler optimization level (default: 1)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    args = parser.parse_args()

    print(f"[*] Executing Processor A/B Benchmark (Circuit: {args.circuit}, Shots: {args.shots}, Opt: {args.opt}, Seed: {args.seed})...")
    res = ProcessorBenchmarkRunner.run_ab_benchmark(
        circuit_id=args.circuit,
        shots=args.shots,
        optimization_level=args.opt,
        seed=args.seed,
        save_csv=True,
    )

    fig_path = generate_processor_comparison_figure(res)
    ma = res["processor_a"]["metrics"]
    mb = res["processor_b"]["metrics"]

    print("\n=======================================================")
    print(f" [PASS] Architecture Benchmark Completed: {res['circuit']['name']}")
    print("=======================================================")
    print(f" Processor A (5Q Linear):    Depth={ma['transpiled_depth']} | CX={ma['transpiled_cx_count']} | SWAPs={ma['swap_gate_estimate']} | Fidelity={res['processor_a']['hellinger_fidelity']}")
    print(f" Processor B (9Q Heavy-Hex): Depth={mb['transpiled_depth']} | CX={mb['transpiled_cx_count']} | SWAPs={mb['swap_gate_estimate']} | Fidelity={res['processor_b']['hellinger_fidelity']}")
    print(f" Topological Advantage on B: Saved ~{res['comparison_summary']['swap_overhead_diff']} SWAP gates ({res['comparison_summary']['cx_reduction_b_vs_a_percent']}% CX reduction)")
    print(f" Results CSV:                {res['csv_file']}")
    print(f" Comparison Figure (PNG):    {fig_path}")
    print("=======================================================\n")


if __name__ == "__main__":
    main()
