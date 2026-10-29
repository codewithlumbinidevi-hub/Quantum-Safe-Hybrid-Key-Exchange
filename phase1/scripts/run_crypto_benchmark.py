"""
CLI runner for Q-SHIELD-PQC Cryptographic Benchmark.
Supports single-platform runs or automated dual-platform (Platform A vs Platform B) comparison.
"""
import sys
import argparse
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.services.crypto_benchmark_service import CryptoBenchmarkService


def run_single(iterations: int, profile: str, warmup: int, mode: str):
    print(f"\n[*] Executing Cryptographic Benchmark: Profile={profile.upper()}, Mode={mode.upper()}, N={iterations}, Warmup={warmup}...")
    res = CryptoBenchmarkService.run_benchmark(
        iterations=iterations,
        platform_profile=profile,
        warmup_iterations=warmup,
        save_csv=True,
        benchmark_mode=mode,
    )

    stats = res["statistics"]
    verif = res["verification"]
    mem = res["memory_overhead"]

    print("\n=========================================================================")
    print(f" [STATUS] {verif['status']} | Verified Handshakes: {verif['successful_handshakes']}/{verif['trials_run']} ({verif['success_rate_percent']}%)")
    print(f" [RUN ID] {res['run_id']} | Timestamp: {res['timestamp']}")
    print("=========================================================================")
    print(f" Total Handshake Mean:      {stats['total_handshake']['mean_ms']:.4f} ms (p95: {stats['total_handshake']['p95_ms']:.4f} ms)")
    if "mlkem_keygen" in stats:
        print(f" ML-KEM-768 KeyGen Mean:    {stats['mlkem_keygen']['mean_ms']:.4f} ms")
        print(f" ML-KEM-768 Encap Mean:     {stats['mlkem_encapsulation']['mean_ms']:.4f} ms")
        print(f" ML-KEM-768 Decap Mean:     {stats['mlkem_decapsulation']['mean_ms']:.4f} ms")
    if "ecdh_keygen" in stats:
        print(f" ECDH P-256 KeyGen Mean:    {stats['ecdh_keygen']['mean_ms']:.4f} ms")
        print(f" ECDH P-256 Deriv Mean:     {stats['ecdh_derivation']['mean_ms']:.4f} ms")
    if "hybrid_kdf" in stats:
        print(f" Hybrid HKDF-SHA256 Mean:   {stats['hybrid_kdf']['mean_ms']:.4f} ms")
    print(f" Python Heap Peak:          {mem['python_heap_peak_kb']} KB")
    print(f" Process Final RSS:         {mem['final_rss_mb']} MB (Delta: {mem['rss_delta_mb']} MB)")
    print(f" Artifacts Written:")
    print(f"   Summary CSV: {res['csv_files']['summary_csv']}")
    print(f"   Trials CSV:  {res['csv_files']['trials_csv']}")
    print(f"   Raw CSV:     {res['csv_files']['raw_run_csv']}")
    print(f"   Manifest:    {res['manifest_file']}")
    print("=========================================================================\n")
    return res


def main():
    parser = argparse.ArgumentParser(description="Q-SHIELD-PQC Cryptographic Benchmark CLI")
    parser.add_argument("--iterations", type=int, default=100, help="Number of trials (default: 100)")
    parser.add_argument("--profile", type=str, default="platform_a", help="Platform profile: platform_a, platform_b, or both")
    parser.add_argument("--warmup", type=int, default=5, help="Warmup cycles (default: 5)")
    parser.add_argument("--mode", type=str, default="hybrid", choices=["hybrid", "ecdh_only", "mlkem_only"], help="Cryptographic mode")
    args = parser.parse_args()

    if args.profile.lower() in ("both", "compare"):
        print("[*] Running Dual-Platform Comparative Benchmark...")
        res_a = run_single(args.iterations, "platform_a", args.warmup, args.mode)
        res_b = run_single(args.iterations, "platform_b", args.warmup, args.mode)

        mean_a = res_a["statistics"]["total_handshake"]["mean_ms"]
        mean_b = res_b["statistics"]["total_handshake"]["mean_ms"]
        diff_pct = ((mean_b - mean_a) / mean_a) * 100 if mean_a > 0 else 0

        print("\n=================== DUAL-PLATFORM COMPARISON SUMMARY ===================")
        print(f" Metric                     | Platform A (Standard) | Platform B (Constrained)")
        print(f" ---------------------------|-----------------------|-------------------------")
        print(f" Total Handshake Mean (ms)  | {mean_a:>21.4f} | {mean_b:>23.4f}")
        print(f" Total Handshake p95 (ms)   | {res_a['statistics']['total_handshake']['p95_ms']:>21.4f} | {res_b['statistics']['total_handshake']['p95_ms']:>23.4f}")
        print(f" Python Heap Peak (KB)      | {res_a['memory_overhead']['python_heap_peak_kb']:>21.1f} | {res_b['memory_overhead']['python_heap_peak_kb']:>23.1f}")
        print(f" Relative Latency Overhead: | {'Baseline (0.0%)':>21} | {f'{diff_pct:+.1f}%':>23}")
        print("========================================================================\n")
    else:
        run_single(args.iterations, args.profile, args.warmup, args.mode)


if __name__ == "__main__":
    main()
