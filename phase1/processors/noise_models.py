"""
Synthetic Noise Models for Architectural Benchmarking.
Implements the Qiskit Fall Fest 2026 Phase 1 reference noise parameters:
- 1-qubit depolarizing error: p = 0.001
- 2-qubit CX depolarizing error: p = 0.005
- Readout error: p = 0.01
Identical rates are applied to Processor A and Processor B so coupling topology remains the isolated variable.
"""
from typing import Dict, Any, Optional
from qiskit_aer.noise import NoiseModel, depolarizing_error, ReadoutError


def create_reference_noise_model(
    p_1q: float = 0.001,
    p_2q: float = 0.005,
    p_ro: float = 0.01
) -> NoiseModel:
    """
    Build synthetic Qiskit Aer NoiseModel with the guide's standard error parameters.
    
    Args:
        p_1q: Single-qubit depolarizing error probability (default 0.001).
        p_2q: Two-qubit CX depolarizing error probability (default 0.005).
        p_ro: Readout assignment error probability (default 0.01).
        
    Returns:
        Configured Qiskit Aer NoiseModel.
    """
    noise_model = NoiseModel()

    # 1-qubit gate error on rz, sx, x
    error_1q = depolarizing_error(p_1q, 1)
    noise_model.add_all_qubit_quantum_error(error_1q, ["rz", "sx", "x"])

    # 2-qubit gate error on cx
    error_2q = depolarizing_error(p_2q, 2)
    noise_model.add_all_qubit_quantum_error(error_2q, ["cx"])

    # Readout error
    p_0_to_1 = p_ro
    p_1_to_0 = p_ro
    ro_matrix = [
        [1.0 - p_0_to_1, p_0_to_1],
        [p_1_to_0, 1.0 - p_1_to_0]
    ]
    readout_err = ReadoutError(ro_matrix)
    noise_model.add_all_qubit_readout_error(readout_err)

    return noise_model


def get_noise_model_metadata(
    p_1q: float = 0.001,
    p_2q: float = 0.005,
    p_ro: float = 0.01
) -> Dict[str, Any]:
    """Return noise model settings as a serializable dictionary."""
    return {
        "single_qubit_depolarizing_rate": p_1q,
        "two_qubit_cx_depolarizing_rate": p_2q,
        "readout_error_rate": p_ro,
        "basis_gates_covered": ["rz", "sx", "x", "cx", "measure"],
        "applied_symmetrically": True,
        "scientific_note": "Identical synthetic noise applied to both Processor A and B to isolate topological impact."
    }
