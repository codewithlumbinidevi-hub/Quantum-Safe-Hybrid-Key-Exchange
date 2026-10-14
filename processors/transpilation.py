"""
Transpilation and Circuit Compilation Service.
Compiles high-level logical circuits to the target processor coupling maps and basis gates:
['rz', 'sx', 'x', 'cx'] with optimization_level=1 and deterministic seed=42.
Extracts depth, CX counts, and routing overhead.
"""
from typing import Dict, Any, Tuple
from qiskit import QuantumCircuit, transpile
from qiskit.transpiler import CouplingMap

from processors.coupling_maps import ProcessorTopology
from processors.metrics import calculate_routing_overhead


def transpile_to_processor(
    circuit: QuantumCircuit,
    processor: ProcessorTopology,
    optimization_level: int = 1,
    seed_transpiler: int = 42
) -> Tuple[QuantumCircuit, Dict[str, Any]]:
    """
    Transpile a logical quantum circuit onto the specified processor architecture.
    
    Args:
        circuit: Input logical QuantumCircuit.
        processor: Target ProcessorTopology instance.
        optimization_level: Transpiler optimization level (default 1).
        seed_transpiler: Deterministic seed for reproducible layout and routing (default 42).
        
    Returns:
        Tuple of (transpiled_circuit: QuantumCircuit, metrics: Dict[str, Any])
    """
    coupling_map = processor.get_qiskit_coupling_map()
    basis_gates = processor.basis_gates

    # Logical metrics
    logical_depth = circuit.depth()
    logical_ops = dict(circuit.count_ops())
    logical_cx = logical_ops.get("cx", 0)
    logical_total_gates = sum(logical_ops.values())

    # 1. Unconstrained logical basis metrics (decomposed to basis without coupling map)
    unconstrained_qc = transpile(
        circuit,
        basis_gates=basis_gates,
        optimization_level=optimization_level,
        seed_transpiler=seed_transpiler,
    )
    logical_basis_cx = unconstrained_qc.count_ops().get("cx", 0)
    logical_basis_depth = unconstrained_qc.depth()

    # 2. Count real routing-inserted SWAP operations
    basis_with_swap = list(basis_gates) + (["swap"] if "swap" not in basis_gates else [])
    unconstrained_with_swap = transpile(
        circuit,
        basis_gates=basis_with_swap,
        optimization_level=optimization_level,
        seed_transpiler=seed_transpiler,
    )
    logical_swaps = unconstrained_with_swap.count_ops().get("swap", 0)

    routed_with_swap = transpile(
        circuit,
        coupling_map=coupling_map,
        basis_gates=basis_with_swap,
        optimization_level=optimization_level,
        seed_transpiler=seed_transpiler,
    )
    total_swaps = routed_with_swap.count_ops().get("swap", 0)
    routing_swaps = max(0, total_swaps - logical_swaps)

    # 3. Transpile strictly to physical processor basis ['rz', 'sx', 'x', 'cx']
    transpiled_qc = transpile(
        circuit,
        coupling_map=coupling_map,
        basis_gates=basis_gates,
        optimization_level=optimization_level,
        seed_transpiler=seed_transpiler,
    )

    # Transpiled metrics
    transpiled_depth = transpiled_qc.depth()
    transpiled_ops = dict(transpiled_qc.count_ops())
    transpiled_cx = transpiled_ops.get("cx", 0)
    transpiled_total_gates = sum(transpiled_ops.values())

    # Routing overhead
    routing_metrics = calculate_routing_overhead(logical_basis_cx, transpiled_cx, routing_swaps)

    metrics = {
        "processor_name": processor.name,
        "processor_num_qubits": processor.num_qubits,
        "logical_depth": logical_depth,
        "logical_basis_depth": logical_basis_depth,
        "transpiled_depth": transpiled_depth,
        "depth_expansion_ratio": round(transpiled_depth / max(1, logical_basis_depth), 2),
        "logical_cx_count": logical_cx,
        "logical_basis_cx_count": logical_basis_cx,
        "transpiled_cx_count": transpiled_cx,
        "cx_overhead": routing_metrics["cx_overhead"],
        "routing_swaps": routing_swaps,
        "swap_gate_estimate": routing_swaps,  # Kept as integer for schema compatibility
        "cx_overhead_ratio": routing_metrics["cx_overhead_ratio"],
        "logical_total_gates": logical_total_gates,
        "transpiled_total_gates": transpiled_total_gates,
        "gate_breakdown": transpiled_ops,
        "basis_gates": basis_gates,
        "transpiler_settings": {
            "optimization_level": optimization_level,
            "seed_transpiler": seed_transpiler,
            "routing_target": processor.architecture_id,
        },
    }

    return transpiled_qc, metrics
