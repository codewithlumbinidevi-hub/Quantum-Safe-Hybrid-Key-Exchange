"""
Reproducible script analyzing TVD and Hellinger Fidelity for QFT-5 and Cross-Conn-5.
Prints:
(a) ideal-sampled vs exact-uniform TVD
(b) noisy-sampled vs exact-uniform TVD
(c) noisy-sampled vs ideal-sampled TVD (both same seed and independent seed)
across 10 seeds with mean +/- std.
"""
import sys
import os
sys.path.insert(0, os.path.abspath("."))

import numpy as np
from qiskit_aer import AerSimulator
from processors.coupling_maps import load_processors
from processors.circuits import get_circuit_by_id
from processors.noise_models import create_reference_noise_model
from processors.transpilation import transpile_to_processor
from processors.metrics import compute_hellinger_fidelity, compute_tvd

def run_investigation():
    proc_a, proc_b = load_processors()
    sim_ideal = AerSimulator()
    noise_model = create_reference_noise_model()
    sim_noisy = AerSimulator(noise_model=noise_model)
    shots = 4096
    seeds = [42, 101, 202, 303, 404, 505, 606, 707, 808, 909]

    # Exact uniform distribution for 5 qubits (32 states, each P = 1/32)
    exact_uniform = {format(i, '05b'): shots / 32.0 for i in range(32)}

    for circuit_id in ["qft_5", "cross_conn_5"]:
        print(f"\n=======================================================")
        print(f"CIRCUIT: {circuit_id} (shots={shots}, 10 seeds)")
        print(f"=======================================================")
        
        circuit = get_circuit_by_id(circuit_id)
        trans_a, _ = transpile_to_processor(circuit, proc_a, optimization_level=1, seed_transpiler=42)
        trans_b, _ = transpile_to_processor(circuit, proc_b, optimization_level=1, seed_transpiler=42)

        for name, trans in [("Processor A", trans_a), ("Processor B", trans_b)]:
            tvd_ideal_vs_exact = []
            tvd_noisy_vs_exact = []
            tvd_noisy_vs_ideal_same_seed = []
            tvd_noisy_vs_ideal_diff_seed = []
            fid_noisy_vs_ideal_same_seed = []
            fid_noisy_vs_ideal_diff_seed = []

            for s in seeds:
                # 1. Ideal run
                counts_ideal = sim_ideal.run(trans, shots=shots, seed_simulator=s).result().get_counts()
                # 2. Noisy run with same seed
                counts_noisy_same = sim_noisy.run(trans, shots=shots, seed_simulator=s).result().get_counts()
                # 3. Noisy run with independent seed
                counts_noisy_diff = sim_noisy.run(trans, shots=shots, seed_simulator=s + 7777).result().get_counts()

                # Comparisons
                if circuit_id == "qft_5":
                    # Exact uniform is only the theoretical output for QFT-5 on |00000>
                    tvd_ideal_vs_exact.append(compute_tvd(counts_ideal, exact_uniform))
                    tvd_noisy_vs_exact.append(compute_tvd(counts_noisy_same, exact_uniform))

                tvd_noisy_vs_ideal_same_seed.append(compute_tvd(counts_ideal, counts_noisy_same))
                tvd_noisy_vs_ideal_diff_seed.append(compute_tvd(counts_ideal, counts_noisy_diff))
                fid_noisy_vs_ideal_same_seed.append(compute_hellinger_fidelity(counts_ideal, counts_noisy_same))
                fid_noisy_vs_ideal_diff_seed.append(compute_hellinger_fidelity(counts_ideal, counts_noisy_diff))

            print(f"\n--- {name} ---")
            if circuit_id == "qft_5":
                print(f"(a) Ideal-sampled vs exact-uniform TVD:        {np.mean(tvd_ideal_vs_exact):.4f} +/- {np.std(tvd_ideal_vs_exact):.4f}")
                print(f"(b) Noisy-sampled vs exact-uniform TVD:        {np.mean(tvd_noisy_vs_exact):.4f} +/- {np.std(tvd_noisy_vs_exact):.4f}")
            print(f"(c) Noisy-sampled vs Ideal-sampled (SAME seed): {np.mean(tvd_noisy_vs_ideal_same_seed):.4f} +/- {np.std(tvd_noisy_vs_ideal_same_seed):.4f}  (Fidelity: {np.mean(fid_noisy_vs_ideal_same_seed):.4f})")
            print(f"(d) Noisy-sampled vs Ideal-sampled (DIFF seed): {np.mean(tvd_noisy_vs_ideal_diff_seed):.4f} +/- {np.std(tvd_noisy_vs_ideal_diff_seed):.4f}  (Fidelity: {np.mean(fid_noisy_vs_ideal_diff_seed):.4f})")

if __name__ == "__main__":
    run_investigation()
