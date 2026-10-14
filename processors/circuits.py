"""
Benchmark Quantum Circuits.
Provides deterministic, parameterized test circuits fitting the 5-qubit baseline
to exercise routing, gate decomposition, and coupling map connectivity.
"""
import math
from typing import Dict, Any, List
from qiskit import QuantumCircuit


def create_qft_5_circuit() -> QuantumCircuit:
    """
    5-Qubit Quantum Fourier Transform (QFT) circuit.
    Exercises all-to-all two-qubit interactions across all 5 qubits.
    Because every qubit interacts with every other qubit, QFT is the gold standard
    benchmark for evaluating routing and SWAP overhead on constrained topologies.
    """
    n = 5
    qc = QuantumCircuit(n, n, name="QFT-5")
    
    for i in range(n):
        qc.h(i)
        for j in range(i + 1, n):
            angle = math.pi / (2 ** (j - i))
            qc.cp(angle, j, i)
        qc.barrier()
        
    # Swap symmetrical registers
    for i in range(n // 2):
        qc.swap(i, n - i - 1)
        
    qc.measure(range(n), range(n))
    return qc


def create_ghz_5_circuit() -> QuantumCircuit:
    """
    5-Qubit Greenberger-Horne-Zeilinger (GHZ) state circuit.
    Generates maximally entangled state (|00000> + |11111>) / sqrt(2).
    """
    qc = QuantumCircuit(5, 5, name="GHZ-5")
    qc.h(0)
    for i in range(4):
        qc.cx(i, i + 1)
    qc.barrier()
    qc.measure(range(5), range(5))
    return qc


def create_cross_connectivity_circuit() -> QuantumCircuit:
    """
    5-Qubit Cross-Connectivity Stress Circuit.
    Applies two-qubit operations deliberately between non-adjacent qubits:
    (0, 2), (0, 4), (1, 3), (1, 4), (2, 4) to stress non-nearest-neighbor routing.
    """
    qc = QuantumCircuit(5, 5, name="Cross-Connectivity-5")
    # Superposition
    for i in range(5):
        qc.h(i)
    qc.barrier()
    
    # Non-adjacent CX operations
    non_adjacent_pairs = [(0, 2), (1, 3), (0, 4), (1, 4), (2, 4), (0, 3)]
    for u, v in non_adjacent_pairs:
        qc.cx(u, v)
        qc.rz(0.5, v)
        qc.cx(u, v)
        
    qc.barrier()
    qc.measure(range(5), range(5))
    return qc


CIRCUIT_REGISTRY = {
    "qft_5": {
        "name": "5-Qubit Quantum Fourier Transform (QFT-5)",
        "id": "qft_5",
        "description": "All-to-all connectivity requirement. Maximum routing stress.",
        "factory": create_qft_5_circuit,
    },
    "ghz_5": {
        "name": "5-Qubit GHZ State Entanglement (GHZ-5)",
        "id": "ghz_5",
        "description": "Linear nearest-neighbor entanglement chain.",
        "factory": create_ghz_5_circuit,
    },
    "cross_conn_5": {
        "name": "5-Qubit Cross-Connectivity Stress",
        "id": "cross_conn_5",
        "description": "Non-nearest-neighbor two-qubit interactions.",
        "factory": create_cross_connectivity_circuit,
    },
}


def get_circuit_by_id(circuit_id: str = "qft_5") -> QuantumCircuit:
    """Retrieve an instantiated benchmark quantum circuit by identifier."""
    if circuit_id not in CIRCUIT_REGISTRY:
        circuit_id = "qft_5"
    return CIRCUIT_REGISTRY[circuit_id]["factory"]()
