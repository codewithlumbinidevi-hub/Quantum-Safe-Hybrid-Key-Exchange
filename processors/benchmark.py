"""
Processor A/B Comparative Architectural Benchmark.
Transpiles identical logical test circuits onto Processor A (5 qubits, linear)
and Processor B (9 qubits, heavy-hex-inspired) and simulates ideal vs noisy execution in Qiskit Aer.
Exports benchmark results to CSV.
"""
from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd
from datetime import datetime

from qiskit_aer import AerSimulator

from processors.coupling_maps import load_processors, ProcessorTopology
from processors.circuits import get_circuit_by_id, CIRCUIT_REGISTRY, get_exact_distribution
from processors.noise_models import create_reference_noise_model, get_noise_model_metadata
from processors.transpilation import transpile_to_processor
from processors.metrics import compute_hellinger_fidelity, compute_tvd


class ProcessorBenchmarkRunner:
    """Orchestrates comparative A/B architectural evaluation."""

    _latest_result: Optional[Dict[str, Any]] = None

    @classmethod
    def get_latest_result(cls) -> Optional[Dict[str, Any]]:
        return cls._latest_result

    @classmethod
    def run_ab_benchmark(
        cls,
        circuit_id: str = "qft_5",
        shots: int = 4096,
        optimization_level: int = 1,
        seed: int = 42,
        save_csv: bool = True
    ) -> Dict[str, Any]:
        """
        Run side-by-side transpilation and noisy execution benchmark for Processor A and B.
        
        Args:
            circuit_id: Identifier of benchmark circuit ('qft_5', 'ghz_5', 'cross_conn_5').
            shots: Measurement shot count (default 4096).
            optimization_level: Qiskit transpiler level (default 1).
            seed: Deterministic random seed (default 42).
            save_csv: Whether to save results to results/processors/processor_ab_results.csv.
        """
        proc_a, proc_b = load_processors()
        circuit = get_circuit_by_id(circuit_id)
        circuit_meta = CIRCUIT_REGISTRY.get(circuit_id, {})

        # Transpile on both architectures
        transpiled_a, metrics_a = transpile_to_processor(
            circuit, proc_a, optimization_level=optimization_level, seed_transpiler=seed
        )
        transpiled_b, metrics_b = transpile_to_processor(
            circuit, proc_b, optimization_level=optimization_level, seed_transpiler=seed
        )

        # Graph theoretical metrics
        graph_a = proc_a.get_graph_metrics()
        graph_b = proc_b.get_graph_metrics()

        # Build simulators
        sim_ideal = AerSimulator()
        noise_model = create_reference_noise_model()
        sim_noisy = AerSimulator(noise_model=noise_model)

        # Theoretical exact distribution
        exact_dist = get_exact_distribution(circuit_id, shots)

        # -------------------------------------------------------------
        # Simulate Processor A
        # -------------------------------------------------------------
        # Ideal execution
        job_a_ideal = sim_ideal.run(transpiled_a, shots=shots, seed_simulator=seed)
        counts_a_ideal = job_a_ideal.result().get_counts()

        # Noisy execution
        job_a_noisy = sim_noisy.run(transpiled_a, shots=shots, seed_simulator=seed)
        counts_a_noisy = job_a_noisy.result().get_counts()

        # Fidelity metrics A (evaluated against exact theoretical baseline)
        fidelity_a = compute_hellinger_fidelity(counts_a_noisy, exact_dist)
        tvd_a = compute_tvd(counts_a_noisy, exact_dist)

        # -------------------------------------------------------------
        # Simulate Processor B
        # -------------------------------------------------------------
        # Ideal execution
        job_b_ideal = sim_ideal.run(transpiled_b, shots=shots, seed_simulator=seed)
        counts_b_ideal = job_b_ideal.result().get_counts()

        # Noisy execution
        job_b_noisy = sim_noisy.run(transpiled_b, shots=shots, seed_simulator=seed)
        counts_b_noisy = job_b_noisy.result().get_counts()

        # Fidelity metrics B (evaluated against exact theoretical baseline)
        fidelity_b = compute_hellinger_fidelity(counts_b_noisy, exact_dist)
        tvd_b = compute_tvd(counts_b_noisy, exact_dist)

        # Shot-noise floor calculation (sampled ideal vs theoretical exact baseline)
        shot_noise_fidelity_floor = compute_hellinger_fidelity(counts_a_ideal, exact_dist)
        shot_noise_tvd_floor = compute_tvd(counts_a_ideal, exact_dist)

        # Top 5 states for visualization
        top_states_a = dict(sorted(counts_a_noisy.items(), key=lambda item: item[1], reverse=True)[:5])
        top_states_b = dict(sorted(counts_b_noisy.items(), key=lambda item: item[1], reverse=True)[:5])

        timestamp_str = datetime.utcnow().isoformat() + "Z"

        result = {
            "timestamp": timestamp_str,
            "circuit": {
                "id": circuit_id,
                "name": circuit_meta.get("name", circuit_id),
                "description": circuit_meta.get("description", ""),
                "qubit_count": 5,
                "logical_depth": circuit.depth(),
                "logical_basis_depth": metrics_a.get("logical_basis_depth", circuit.depth()),
                "logical_cx_count": metrics_a["logical_cx_count"],
                "logical_basis_cx_count": metrics_a.get("logical_basis_cx_count", metrics_a["logical_cx_count"]),
            },
            "transpiler_settings": {
                "optimization_level": optimization_level,
                "seed": seed,
                "shots": shots,
            },
            "noise_settings": get_noise_model_metadata(),
            "shot_noise_floor": {
                "shots": shots,
                "hellinger_fidelity_floor": shot_noise_fidelity_floor,
                "tvd_floor": shot_noise_tvd_floor,
                "note": "Computed between sampled ideal simulation and exact theoretical distribution with identical shot count to establish the statistical sampling floor."
            },
            "processor_a": {
                "topology": graph_a,
                "metrics": metrics_a,
                "hellinger_fidelity": fidelity_a,
                "tvd": tvd_a,
                "top_measured_states": top_states_a,
            },
            "processor_b": {
                "topology": graph_b,
                "metrics": metrics_b,
                "hellinger_fidelity": fidelity_b,
                "tvd": tvd_b,
                "top_measured_states": top_states_b,
            },
            "comparison_summary": {
                "depth_reduction_b_vs_a_percent": round(
                    ((metrics_a["transpiled_depth"] - metrics_b["transpiled_depth"]) / max(1, metrics_a["transpiled_depth"])) * 100, 2
                ),
                "cx_reduction_b_vs_a_percent": round(
                    ((metrics_a["transpiled_cx_count"] - metrics_b["transpiled_cx_count"]) / max(1, metrics_a["transpiled_cx_count"])) * 100, 2
                ),
                "swap_overhead_diff": round(metrics_a["swap_gate_estimate"] - metrics_b["swap_gate_estimate"], 2),
                "fidelity_difference": round(fidelity_b - fidelity_a, 4),
                "within_shot_noise_floor": bool(abs(fidelity_b - fidelity_a) <= (1.0 - shot_noise_fidelity_floor) * 1.5),
            },
            "scientific_disclaimer": (
                "IMPORTANT SCIENTIFIC DISTINCTION: Classical ECDH and Post-Quantum ML-KEM-768 "
                "execute purely on classical CPU platforms. This Qiskit module simulates quantum circuit "
                "transpilation and noisy execution under the Qiskit Fall Fest 2026 Phase 1 guide. "
                "Noisy circuit fidelity does not represent cryptographic security."
            )
        }

        # -------------------------------------------------------------
        # Export to CSV
        # -------------------------------------------------------------
        if save_csv:
            csv_dir = Path(__file__).resolve().parent.parent / "results" / "processors"
            csv_dir.mkdir(parents=True, exist_ok=True)
            csv_path = csv_dir / "processor_ab_results.csv"

            row_a = {
                "processor": "Processor A",
                "topology": "Linear Chain (5Q)",
                "circuit_id": circuit_id,
                "logical_depth": circuit.depth(),
                "logical_basis_cx": metrics_a.get("logical_basis_cx_count", metrics_a["logical_cx_count"]),
                "transpiled_depth": metrics_a["transpiled_depth"],
                "logical_cx": metrics_a["logical_cx_count"],
                "transpiled_cx": metrics_a["transpiled_cx_count"],
                "cx_overhead": metrics_a["cx_overhead"],
                "routing_swaps": metrics_a.get("routing_swaps", 0),
                "swap_estimate": metrics_a["swap_gate_estimate"],
                "hellinger_fidelity": fidelity_a,
                "tvd": tvd_a,
                "shot_noise_fidelity_floor": shot_noise_fidelity_floor,
                "shot_noise_tvd_floor": shot_noise_tvd_floor,
                "shots": shots,
                "edges_count": graph_a["undirected_edges_count"],
                "timestamp": timestamp_str,
            }
            row_b = {
                "processor": "Processor B",
                "topology": "Sparse Heavy-Hex (9Q)",
                "circuit_id": circuit_id,
                "logical_depth": circuit.depth(),
                "logical_basis_cx": metrics_b.get("logical_basis_cx_count", metrics_b["logical_cx_count"]),
                "transpiled_depth": metrics_b["transpiled_depth"],
                "logical_cx": metrics_b["logical_cx_count"],
                "transpiled_cx": metrics_b["transpiled_cx_count"],
                "cx_overhead": metrics_b["cx_overhead"],
                "routing_swaps": metrics_b.get("routing_swaps", 0),
                "swap_estimate": metrics_b["swap_gate_estimate"],
                "hellinger_fidelity": fidelity_b,
                "tvd": tvd_b,
                "shot_noise_fidelity_floor": shot_noise_fidelity_floor,
                "shot_noise_tvd_floor": shot_noise_tvd_floor,
                "shots": shots,
                "edges_count": graph_b["undirected_edges_count"],
                "timestamp": timestamp_str,
            }

            df = pd.DataFrame([row_a, row_b])
            df.to_csv(csv_path, index=False)

            # Also save to mandated results/tables/ and root results/
            tables_dir = Path(__file__).resolve().parent.parent / "results" / "tables"
            tables_dir.mkdir(parents=True, exist_ok=True)
            df.to_csv(tables_dir / "processor_ab_results.csv", index=False)

            root_results_dir = Path(__file__).resolve().parent.parent / "results"
            df.to_csv(root_results_dir / "processor_ab_results.csv", index=False)

            data_proc_dir = Path(__file__).resolve().parent.parent / "data" / "processed"
            data_proc_dir.mkdir(parents=True, exist_ok=True)
            df.to_csv(data_proc_dir / "processor_ab_results.csv", index=False)

            result["csv_file"] = str(csv_path)

        cls._latest_result = result
        return result

    @classmethod
    def run_all_circuits_benchmark(
        cls,
        shots: int = 4096,
        optimization_level: int = 1,
        seed: int = 42,
        save_csv: bool = True
    ) -> Dict[str, Any]:
        """
        Execute side-by-side benchmark across ALL standard circuits (QFT-5, GHZ-5, Cross-Conn-5)
        and export comprehensive comparative CSV.
        """
        all_rows = []
        circuit_results = {}
        for c_id in ["qft_5", "ghz_5", "cross_conn_5"]:
            res = cls.run_ab_benchmark(
                circuit_id=c_id,
                shots=shots,
                optimization_level=optimization_level,
                seed=seed,
                save_csv=False
            )
            circuit_results[c_id] = res
            
            # Read metrics
            ma = res["processor_a"]["metrics"]
            mb = res["processor_b"]["metrics"]
            ga = res["processor_a"]["topology"]
            gb = res["processor_b"]["topology"]
            sn = res["shot_noise_floor"]
            ts = res["timestamp"]
            
            discriminates = "Yes (Alternative routing paths)" if c_id == "cross_conn_5" else ("Yes (Routing depth/CX)" if c_id == "qft_5" else "No (Linear nearest-neighbor)")
            
            all_rows.append({
                "processor": "Processor A",
                "topology": "Linear Chain (5Q)",
                "circuit_id": c_id,
                "logical_depth": res["circuit"]["logical_depth"],
                "logical_basis_cx": ma.get("logical_basis_cx_count", ma["logical_cx_count"]),
                "transpiled_depth": ma["transpiled_depth"],
                "transpiled_cx": ma["transpiled_cx_count"],
                "cx_overhead": ma["cx_overhead"],
                "routing_swaps": ma.get("routing_swaps", 0),
                "swap_estimate": ma["swap_gate_estimate"],
                "hellinger_fidelity": res["processor_a"]["hellinger_fidelity"],
                "tvd": res["processor_a"]["tvd"],
                "shot_noise_fidelity_floor": sn["hellinger_fidelity_floor"],
                "shot_noise_tvd_floor": sn["tvd_floor"],
                "discriminates_topology": discriminates,
                "shots": shots,
                "edges_count": ga["undirected_edges_count"],
                "timestamp": ts,
            })
            all_rows.append({
                "processor": "Processor B",
                "topology": "Sparse Heavy-Hex (9Q)",
                "circuit_id": c_id,
                "logical_depth": res["circuit"]["logical_depth"],
                "logical_basis_cx": mb.get("logical_basis_cx_count", mb["logical_cx_count"]),
                "transpiled_depth": mb["transpiled_depth"],
                "transpiled_cx": mb["transpiled_cx_count"],
                "cx_overhead": mb["cx_overhead"],
                "routing_swaps": mb.get("routing_swaps", 0),
                "swap_estimate": mb["swap_gate_estimate"],
                "hellinger_fidelity": res["processor_b"]["hellinger_fidelity"],
                "tvd": res["processor_b"]["tvd"],
                "shot_noise_fidelity_floor": sn["hellinger_fidelity_floor"],
                "shot_noise_tvd_floor": sn["tvd_floor"],
                "discriminates_topology": discriminates,
                "shots": shots,
                "edges_count": gb["undirected_edges_count"],
                "timestamp": ts,
            })

        if save_csv:
            df = pd.DataFrame(all_rows)
            for target_dir in [
                Path(__file__).resolve().parent.parent / "results" / "processors",
                Path(__file__).resolve().parent.parent / "results" / "tables",
                Path(__file__).resolve().parent.parent / "results",
                Path(__file__).resolve().parent.parent / "data" / "processed",
            ]:
                target_dir.mkdir(parents=True, exist_ok=True)
                df.to_csv(target_dir / "processor_ab_results.csv", index=False)

        cls._latest_result = circuit_results["qft_5"]
        return {"circuits": circuit_results, "summary_df": all_rows}
