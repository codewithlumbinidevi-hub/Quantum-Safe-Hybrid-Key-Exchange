"""
Metrics Formulation and Statistical Computation Module.
Computes:
1. Quantum Topologies: Transpiled Depth, CX Overhead, Estimated SWAP gates (3-CX per SWAP),
   classical Hellinger Fidelity (ideal vs noisy Aer), and Total Variation Distance (TVD).
2. Classical Cryptography: Handshake latency distribution (mean, median, p50, p95, p99, std dev, min, max),
   wire payload sizes (FIPS 203 & SECP256R1), and dual memory overhead (tracemalloc heap vs process RSS delta).
"""
import math
from typing import Dict, Any, List, Union
import numpy as np
import pandas as pd

from processors.metrics import (
    compute_hellinger_fidelity,
    compute_tvd,
    calculate_routing_overhead
)


def calculate_latency_statistics(latencies_ms: Union[List[float], np.ndarray, pd.Series]) -> Dict[str, Any]:
    """
    Calculate full statistical distribution for empirical timing observations.
    
    Returns:
        mean_ms, std_dev_ms, median_ms, min_ms, max_ms, p50_ms, p95_ms, p99_ms, sample_count.
    """
    if isinstance(latencies_ms, (list, tuple)):
        vals = np.array([v for v in latencies_ms if v is not None and not np.isnan(v)])
    elif isinstance(latencies_ms, pd.Series):
        vals = latencies_ms.dropna().values
    else:
        vals = latencies_ms[~np.isnan(latencies_ms)]

    if len(vals) == 0:
        return {
            "mean_ms": 0.0,
            "std_dev_ms": 0.0,
            "median_ms": 0.0,
            "min_ms": 0.0,
            "max_ms": 0.0,
            "p50_ms": 0.0,
            "p95_ms": 0.0,
            "p99_ms": 0.0,
            "sample_count": 0,
        }

    return {
        "mean_ms": float(np.round(np.mean(vals), 4)),
        "std_dev_ms": float(np.round(np.std(vals), 4)),
        "median_ms": float(np.round(np.median(vals), 4)),
        "min_ms": float(np.round(np.min(vals), 4)),
        "max_ms": float(np.round(np.max(vals), 4)),
        "p50_ms": float(np.round(np.percentile(vals, 50), 4)),
        "p95_ms": float(np.round(np.percentile(vals, 95), 4)),
        "p99_ms": float(np.round(np.percentile(vals, 99), 4)),
        "ci95_margin_ms": float(np.round(1.96 * (np.std(vals, ddof=1) / np.sqrt(len(vals))), 4)) if len(vals) > 1 else 0.0,
        "ci95_low_ms": float(np.round(np.mean(vals) - (1.96 * (np.std(vals, ddof=1) / np.sqrt(len(vals)))), 4)) if len(vals) > 1 else float(np.round(np.mean(vals), 4)),
        "ci95_high_ms": float(np.round(np.mean(vals) + (1.96 * (np.std(vals, ddof=1) / np.sqrt(len(vals)))), 4)) if len(vals) > 1 else float(np.round(np.mean(vals), 4)),
        "sample_count": int(len(vals)),
    }


def get_fips203_payload_sizes(benchmark_mode: str = "hybrid") -> Dict[str, int]:
    """
    Return exact wire payload byte counts as standardized in NIST FIPS 203 and SECP256R1.
    """
    alice_ecdh = 65 if benchmark_mode in ("hybrid", "ecdh_only") else 0
    bob_ecdh = 65 if benchmark_mode in ("hybrid", "ecdh_only") else 0
    bob_mlkem = 1184 if benchmark_mode in ("hybrid", "mlkem_only") else 0
    mlkem_ct = 1088 if benchmark_mode in ("hybrid", "mlkem_only") else 0

    return {
        "alice_ecdh_public_key_bytes": alice_ecdh,
        "bob_ecdh_public_key_bytes": bob_ecdh,
        "bob_mlkem_public_key_bytes": bob_mlkem,
        "mlkem_ciphertext_bytes": mlkem_ct,
        "total_exchange_payload_bytes": alice_ecdh + bob_ecdh + bob_mlkem + mlkem_ct,
    }


def format_memory_overhead(
    initial_rss_bytes: int,
    final_rss_bytes: int,
    current_heap_bytes: int,
    peak_heap_bytes: int
) -> Dict[str, Any]:
    """
    Format memory metrics distinguishing OS Process RSS from Python tracemalloc heap.
    """
    return {
        "initial_rss_mb": round(initial_rss_bytes / (1024 * 1024), 2),
        "final_rss_mb": round(final_rss_bytes / (1024 * 1024), 2),
        "rss_delta_mb": round((final_rss_bytes - initial_rss_bytes) / (1024 * 1024), 2),
        "python_heap_peak_kb": round(peak_heap_bytes / 1024, 2),
        "python_heap_final_kb": round(current_heap_bytes / 1024, 2),
        "methodology": "Python heap allocations measured via tracemalloc. Process Resident Set Size (RSS) measured via psutil.",
        "limitations": (
            "tracemalloc captures only memory managed by the Python interpreter and does not trace internal C/Rust "
            "allocations inside cryptography (OpenSSL). Process RSS measures total physical memory mapped to the process, "
            "which includes shared libraries and OS page caching."
        ),
    }
