"""
Architectural and Quantum Execution Metrics.
Computes logical vs transpiled gate overhead, estimated SWAP gates,
and statistical fidelity (Hellinger fidelity and Total Variation Distance) between ideal and noisy execution.
"""
import math
from typing import Dict, Any, Optional


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


def calculate_routing_overhead(
    logical_basis_cx: Optional[int] = None,
    transpiled_cx: int = 0,
    routing_swaps: int = 0,
    logical_cx: Optional[int] = None
) -> Dict[str, Any]:
    """
    Calculate CX routing overhead and routing-inserted SWAP gates.
    Routing CX overhead = transpiled_cx - logical_basis_cx (where logical_basis_cx
    is the CX count of the logical circuit decomposed to ['rz', 'sx', 'x', 'cx']
    without coupling constraints).
    
    Returns:
        Dict with cx_overhead, routing_swaps, and overhead_ratio.
    """
    base_cx = logical_basis_cx if logical_basis_cx is not None else (logical_cx if logical_cx is not None else 0)
    cx_overhead = max(0, transpiled_cx - base_cx)
    inferred_swaps = cx_overhead // 3
    final_swaps = routing_swaps if routing_swaps > 0 else inferred_swaps
    ratio = round(transpiled_cx / max(1, base_cx), 2)
    
    return {
        "logical_basis_cx": base_cx,
        "cx_overhead": cx_overhead,
        "routing_swap_count": int(final_swaps),
        "swap_gate_estimate": float(final_swaps),  # Preserved as float for schema and test compatibility
        "cx_overhead_ratio": ratio,
        "note": f"Routing added {cx_overhead} CX gates ({final_swaps} routing SWAPs) beyond logical basis CX ({base_cx})."
    }
