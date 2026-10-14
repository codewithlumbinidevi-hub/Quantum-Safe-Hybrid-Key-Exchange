"""
Routing and Transpilation Service for Quantum Topologies.
Compiles high-level logical benchmark circuits onto physical processor graphs
under basis gates ['rz', 'sx', 'x', 'cx'] with optimization_level=1 and deterministic seed=42.
"""
from typing import Dict, Any, Tuple
from qiskit import QuantumCircuit

from processors.transpilation import transpile_to_processor
from processors.circuits import (
    get_circuit_by_id,
    create_qft_5_circuit,
    create_ghz_5_circuit,
    create_cross_connectivity_circuit,
    CIRCUIT_REGISTRY
)
from processors.benchmark import ProcessorBenchmarkRunner
from processors.coupling_maps import ProcessorTopology


def transpile_circuit(
    circuit: QuantumCircuit,
    processor: ProcessorTopology,
    optimization_level: int = 1,
    seed_transpiler: int = 42
) -> Tuple[QuantumCircuit, Dict[str, Any]]:
    """
    Transpile a logical quantum circuit onto the specified processor coupling map.
    
    Returns:
        (transpiled_circuit, metrics_dictionary)
    """
    return transpile_to_processor(
        circuit=circuit,
        processor=processor,
        optimization_level=optimization_level,
        seed_transpiler=seed_transpiler
    )


def run_processor_ab_benchmark(
    circuit_id: str = "qft_5",
    shots: int = 4096,
    optimization_level: int = 1,
    seed: int = 42,
    save_csv: bool = True
) -> Dict[str, Any]:
    """
    Execute side-by-side transpilation and noisy Aer simulation between Processor A and B.
    """
    return ProcessorBenchmarkRunner.run_ab_benchmark(
        circuit_id=circuit_id,
        shots=shots,
        optimization_level=optimization_level,
        seed=seed,
        save_csv=save_csv
    )
