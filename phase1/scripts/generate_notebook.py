"""
Script to generate the official reproducible main.ipynb at the repository root.
"""
import nbformat as nbf
from pathlib import Path

def create_main_notebook():
    nb = nbf.v4.new_notebook()
    nb.metadata = {
        'kernelspec': {
            'display_name': 'Python 3',
            'language': 'python',
            'name': 'python3'
        },
        'language_info': {
            'name': 'python',
            'version': '3.10.11'
        }
    }

    cells = []

    # Title & Context Cell
    cells.append(nbf.v4.new_markdown_cell("""# Q-SHIELD-PQC: Quantum-Safe Hybrid Key Exchange & Universal Processor A/B Benchmarking
**Qiskit Fall Fest 2026 (SRM University-AP) — Track 5: Post-Quantum Cryptography**
**Problem Statement PS-P1 (Primary Submission Statement)**

This notebook executes an end-to-end, fully reproducible empirical evaluation of:
1. **PS-P1 Hybrid Key Exchange**: Classical ECDH (NIST P-256) combined with NIST FIPS 203 ML-KEM-768 via transcript-bound HKDF-SHA256.
2. **Platform A vs Platform B Evaluation**: Benchmarking handshake latency, wire sizes, and memory overhead across unconstrained multi-core and constrained (single-core affinity core 0) CPU environments.
3. **Universal Processor A/B Framework**: Qiskit Aer circuit transpilation, routing overhead (depth, CX, estimated SWAP), and noisy execution fidelity comparing 5-qubit linear chain (Processor A) vs 9-qubit sparse heavy-hex (Processor B).
4. **Mandated Results Generation**: Generates comparison tables in `results/tables/` and publication figures in `results/figures/`.
"""))

    # Cell 1: Import Mandated src Modules
    cells.append(nbf.v4.new_code_cell("""import sys
from pathlib import Path

# Ensure project root is on sys.path
root_dir = Path.cwd()
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import src
import src.problem as problem
import src.processors as processors
import src.routing as routing
import src.metrics as metrics
import src.visualization as visualization
import pandas as pd
from IPython.display import display, Image

print(f"Q-SHIELD-PQC src modules successfully loaded.")
print(f"Track: {src.__track__}")
print(f"Selected Problem Statement: {src.__problem_statement__}")
"""))

    # Cell 2: Section 1 - Single Hybrid Key Exchange
    cells.append(nbf.v4.new_markdown_cell("""## 1. Single-Session Ephemeral Hybrid Key Exchange
We execute an end-to-end Alice (Initiator) <-> Bob (Responder) handshake. Both parties exchange ephemeral public keys, encapsulate/decapsulate, and derive a 256-bit symmetric master key bound to the full SHA-256 transcript hash.
"""))

    cells.append(nbf.v4.new_code_cell("""exchange_result = problem.run_hybrid_handshake("Reproducible Jupyter execution message.")

print("=== HYBRID HANDSHAKE VERIFICATION ===")
print("Success:", exchange_result["success"])
print("ECDH Secrets Match:", exchange_result["verification"]["ecdh_secrets_match"])
print("ML-KEM Secrets Match:", exchange_result["verification"]["mlkem_secrets_match"])
print("Hybrid Derived Keys Match:", exchange_result["verification"]["hybrid_keys_match"])
print("Alice Key Fingerprint (SHA-256):", exchange_result["verification"]["alice_key_fingerprint_sha256"])
print("Bob Key Fingerprint (SHA-256):  ", exchange_result["verification"]["bob_key_fingerprint_sha256"])
print(f"Total Handshake Latency: {exchange_result['timings_ms']['total_handshake_ms']:.3f} ms")
print(f"Total Wire Payload: {exchange_result['payload_sizes']['total_exchange_payload_bytes']} bytes")
"""))

    # Cell 3: Section 2 - Platform A vs Platform B Benchmark
    cells.append(nbf.v4.new_markdown_cell("""## 2. Platform A vs Platform B Empirical Benchmark
We run 200 measured trials (+5 warmup) across both CPU execution profiles:
- **Platform A**: Standard multi-core workstation CPU with dynamic OS scheduling.
- **Platform B**: Single-core CPU affinity (Process locked to Core 0) with serialized execution.
"""))

    cells.append(nbf.v4.new_code_cell("""print("Executing dual-platform benchmark (200 trials per profile)...")
crypto_results = problem.run_crypto_benchmark(
    iterations=200,
    platform_profile="both",
    warmup_iterations=5,
    benchmark_mode="hybrid",
    save_csv=True
)

res_a = crypto_results["platform_a_result"]
res_b = crypto_results["platform_b_result"]

mean_a = res_a["statistics"]["total_handshake_ms"]["mean_ms"]
p95_a = res_a["statistics"]["total_handshake_ms"]["p95_ms"]
ci_a = res_a["statistics"]["total_handshake_ms"].get("ci95_margin_ms", 0.0)

mean_b = res_b["statistics"]["total_handshake_ms"]["mean_ms"]
p95_b = res_b["statistics"]["total_handshake_ms"]["p95_ms"]
ci_b = res_b["statistics"]["total_handshake_ms"].get("ci95_margin_ms", 0.0)

print(f"Platform A Mean Handshake: {mean_a:.3f} +/- {ci_a:.3f} ms (p95: {p95_a:.3f} ms)")
print(f"Platform B Mean Handshake: {mean_b:.3f} +/- {ci_b:.3f} ms (p95: {p95_b:.3f} ms)")
overhead_pct = crypto_results["comparison_summary"]["relative_latency_overhead_percent"]
print(f"Platform B Observed Latency Overhead: {overhead_pct:.1f}%")
"""))

    # Cell 4: Section 3 - Universal Processor A vs B Quantum Benchmark
    cells.append(nbf.v4.new_markdown_cell("""## 3. Universal Processor A/B Quantum Architecture Simulation
We evaluate circuit transpilation overhead, routing constraints, and noisy simulation fidelity in Qiskit Aer between:
- **Processor A**: 5 qubits, baseline linear chain `[(0,1),(1,2),(2,3),(3,4)]` (4 edges)
- **Processor B**: 9 qubits, reference sparse heavy-hex `[(0,1),(1,2),(1,6),(2,3),(2,6),(2,5),(3,4),(4,5),(5,6),(6,7),(6,8),(8,0)]` (12 edges)
Under identical synthetic noise (1q depol 0.001, 2q CX 0.005, readout error 0.01) across 3 benchmark circuits:
- **QFT-5**: All-to-all connectivity requirement. Maximum routing stress.
- **GHZ-5**: Linear nearest-neighbor entanglement chain.
- **CrossConn-5**: Non-adjacent interaction stress.
"""))

    cells.append(nbf.v4.new_code_cell("""proc_benchmark = routing.run_processor_ab_benchmark(
    circuit_id="qft_5",
    shots=4096,
    optimization_level=1,
    seed=42,
    save_csv=True
)

all_proc_benchmarks = routing.run_all_processor_benchmarks(
    shots=4096,
    optimization_level=1,
    seed=42,
    save_csv=True
)

depth_a = proc_benchmark["processor_a"]["metrics"]["transpiled_depth"]
cx_a = proc_benchmark["processor_a"]["metrics"]["transpiled_cx_count"]
swap_a = int(proc_benchmark["processor_a"]["metrics"]["swap_gate_estimate"])
fid_a = proc_benchmark["processor_a"]["hellinger_fidelity"]

depth_b = proc_benchmark["processor_b"]["metrics"]["transpiled_depth"]
cx_b = proc_benchmark["processor_b"]["metrics"]["transpiled_cx_count"]
swap_b = int(proc_benchmark["processor_b"]["metrics"]["swap_gate_estimate"])
fid_b = proc_benchmark["processor_b"]["hellinger_fidelity"]
sn_fid = proc_benchmark["shot_noise_floor"]["hellinger_fidelity_floor"]

print("=== QUANTUM ARCHITECTURAL BENCHMARK RESULTS (QFT-5) ===")
print("Logical Depth:", proc_benchmark["circuit"]["logical_depth"], "| Logical Basis CX:", proc_benchmark["circuit"]["logical_basis_cx_count"])
print(f"Processor A (5Q Linear)    Depth: {depth_a} | CX: {cx_a} | Routing SWAPs: {swap_a} | Fidelity: {fid_a}")
print(f"Processor B (9Q Heavy-Hex) Depth: {depth_b} | CX: {cx_b} | Routing SWAPs: {swap_b} | Fidelity: {fid_b}")
print(f"Shot-Noise Fidelity Threshold (Ideal vs Ideal): {sn_fid}")
print(f"CX Reduction on Processor B: {proc_benchmark['comparison_summary']['cx_reduction_b_vs_a_percent']}%")
print(f"Depth Reduction on Processor B: {proc_benchmark['comparison_summary']['depth_reduction_b_vs_a_percent']}%")
"""))

    # Cell 5: Section 4 - Generate Mandated Figures & Tables
    cells.append(nbf.v4.new_markdown_cell("""## 4. Mandated Results Figures & Tables Generation
Generating publication figures into `results/figures/` and summary tables into `results/tables/`.
"""))

    cells.append(nbf.v4.new_code_cell("""fig_latency = visualization.plot_handshake_latency(res_a["statistics"], res_b["statistics"])
fig_sizes = visualization.plot_message_sizes()
fig_mem = visualization.plot_memory_overhead(res_a["memory_overhead"], res_b["memory_overhead"])
fig_proc = visualization.plot_processor_comparison(proc_benchmark)
fig_topos = visualization.plot_coupling_topologies()

print("Figures successfully generated:")
print("1.", fig_latency)
print("2.", fig_sizes)
print("3.", fig_mem)
print("4.", fig_proc)
print("5.", fig_topos)
"""))

    # Cell 6: Section 5 - Display Figures in Notebook
    cells.append(nbf.v4.new_markdown_cell("""### Figure 1: Handshake Latency Comparison (Platform A vs B)"""))
    cells.append(nbf.v4.new_code_cell("""display(Image(filename=fig_latency))"""))

    cells.append(nbf.v4.new_markdown_cell("""### Figure 2: Cryptographic Wire Payload Breakdown"""))
    cells.append(nbf.v4.new_code_cell("""display(Image(filename=fig_sizes))"""))

    cells.append(nbf.v4.new_markdown_cell("""### Figure 3: Memory Overhead (Python Heap vs OS Process RSS)"""))
    cells.append(nbf.v4.new_code_cell("""display(Image(filename=fig_mem))"""))

    cells.append(nbf.v4.new_markdown_cell("""### Figure 4: Processor A vs B Routing & Compilation Comparison"""))
    cells.append(nbf.v4.new_code_cell("""display(Image(filename=fig_proc))"""))

    cells.append(nbf.v4.new_markdown_cell("""### Figure 5: Universal Reference Topologies (Linear 5Q vs Heavy-Hex 9Q)"""))
    cells.append(nbf.v4.new_code_cell("""display(Image(filename=fig_topos))"""))

    # Cell 7: Section 6 - Tabular Summary
    cells.append(nbf.v4.new_markdown_cell("""## 5. Summary Tables Audit"""))
    cells.append(nbf.v4.new_code_cell("""summary_csv = Path("results/tables/crypto_benchmark_summary.csv")
if summary_csv.exists():
    df_summary = pd.read_csv(summary_csv)
    display(df_summary)

proc_csv = Path("results/tables/processor_ab_results.csv")
if proc_csv.exists():
    df_proc = pd.read_csv(proc_csv)
    display(df_proc)
"""))

    nb["cells"] = cells

    with open("main.ipynb", "w", encoding="utf-8") as f:
        nbf.write(nb, f)

    print("main.ipynb successfully generated at project root!")

if __name__ == "__main__":
    create_main_notebook()
