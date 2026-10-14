"""
Architectural and Quantum Execution Metrics.
Computes logical vs transpiled gate overhead, estimated SWAP gates,
and statistical fidelity (Hellinger fidelity and Total Variation Distance) between ideal and noisy execution.
"""
import math
from typing import Dict, Any


def compute_hellinger_fidelity(counts_ideal: Dict[str, int], counts_noisy: Dict[str, int]) -> float:
    """
    Compute classical Hellinger fidelity between ideal and noisy measurement distributions.
    F_H = (sum_x sqrt(P(x) * Q(x)))^2
    Returns a value in [0.0, 1.0], where 1.0 indicates identical distributions.
    """
    total_ideal = sum(counts_ideal.values())
    total_noisy = sum(counts_noisy.values())
    if total_ideal == 0 or total_noisy == 0:
        return 0.0

    all_keys = set(counts_ideal.keys()).union(set(counts_noisy.keys()))
    bc_sum = 0.0  # Bhattacharyya coefficient
    for k in all_keys:
        p = counts_ideal.get(k, 0) / total_ideal
        q = counts_noisy.get(k, 0) / total_noisy
        bc_sum += math.sqrt(p * q)

    fidelity = float(bc_sum ** 2)
    return round(min(1.0, max(0.0, fidelity)), 4)


def compute_tvd(counts_ideal: Dict[str, int], counts_noisy: Dict[str, int]) -> float:
    """
    Compute Total Variation Distance (TVD) between ideal and noisy distributions.
    TVD = 0.5 * sum_x |P(x) - Q(x)|
    Returns a value in [0.0, 1.0], where 0.0 indicates identical distributions.
    """
    total_ideal = sum(counts_ideal.values())
    total_noisy = sum(counts_noisy.values())
    if total_ideal == 0 or total_noisy == 0:
        return 1.0

    all_keys = set(counts_ideal.keys()).union(set(counts_noisy.keys()))
    diff_sum = 0.0
    for k in all_keys:
        p = counts_ideal.get(k, 0) / total_ideal
        q = counts_noisy.get(k, 0) / total_noisy
        diff_sum += abs(p - q)

    tvd = float(0.5 * diff_sum)
    return round(min(1.0, max(0.0, tvd)), 4)


def calculate_routing_overhead(logical_cx: int, transpiled_cx: int) -> Dict[str, Any]:
    """
    Calculate CX routing overhead and estimated SWAP gates.
    In standard basis gate sets (rz, sx, x, cx), each SWAP gate is decomposed into 3 CX gates.
    
    Returns:
        Dict with cx_overhead, swap_estimate, and overhead_ratio.
    """
    cx_overhead = max(0, transpiled_cx - logical_cx)
    swap_estimate = round(cx_overhead / 3.0, 2)
    ratio = round(transpiled_cx / max(1, logical_cx), 2)
    
    return {
        "cx_overhead": cx_overhead,
        "swap_gate_estimate": swap_estimate,
        "cx_overhead_ratio": ratio,
        "note": "SWAP gate estimate assumes standard 3-CX decomposition per non-native routing SWAP."
    }
