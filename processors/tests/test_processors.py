"""
Unit tests for Qiskit Processors A/B module.
"""
import pytest
from processors.coupling_maps import load_processors
from processors.circuits import get_circuit_by_id
from processors.transpilation import transpile_to_processor
from processors.noise_models import create_reference_noise_model
from processors.metrics import compute_hellinger_fidelity, compute_tvd, calculate_routing_overhead


def test_processors_loading_and_validation():
    proc_a, proc_b = load_processors()
    assert proc_a.num_qubits == 5
    assert proc_b.num_qubits == 9

    valid_a, msg_a = proc_a.validate()
    valid_b, msg_b = proc_b.validate()
    assert valid_a is True, msg_a
    assert valid_b is True, msg_b


def test_circuits_generation():
    ghz = get_circuit_by_id("ghz_5")
    qft = get_circuit_by_id("qft_5")
    cross = get_circuit_by_id("cross_conn_5")

    assert ghz.num_qubits == 5
    assert qft.num_qubits == 5
    assert cross.num_qubits == 5


def test_circuit_transpilation():
    proc_a, proc_b = load_processors()
    circuit = get_circuit_by_id("ghz_5")

    transpiled_a, metrics_a = transpile_to_processor(circuit, proc_a, optimization_level=1, seed_transpiler=42)
    transpiled_b, metrics_b = transpile_to_processor(circuit, proc_b, optimization_level=1, seed_transpiler=42)

    assert metrics_a["transpiled_depth"] > 0
    assert metrics_b["transpiled_depth"] > 0
    assert metrics_a["transpiled_cx_count"] >= 4
    assert metrics_b["transpiled_cx_count"] >= 4


def test_noise_model():
    noise = create_reference_noise_model()
    assert noise is not None
    assert "cx" in noise.basis_gates


def test_fidelity_metrics():
    counts_1 = {"00000": 2048, "11111": 2048}
    counts_2 = {"00000": 2048, "11111": 2048}
    counts_noisy = {"00000": 1900, "11111": 1900, "00001": 148, "11110": 148}

    # Identical should give fidelity 1.0
    fid_identical = compute_hellinger_fidelity(counts_1, counts_2)
    assert fid_identical == 1.0

    tvd_identical = compute_tvd(counts_1, counts_2)
    assert tvd_identical == 0.0

    fid_noisy = compute_hellinger_fidelity(counts_1, counts_noisy)
    assert 0.0 < fid_noisy < 1.0


def test_routing_overhead_calculation():
    res = calculate_routing_overhead(logical_cx=4, transpiled_cx=10)
    assert res["cx_overhead"] == 6
    assert res["swap_gate_estimate"] == 2.0  # 6 / 3 = 2 SWAPs
