"""
Cryptographic Benchmark Service.
Measures latency, memory overhead, and key sizes across repeated trials for
NIST P-256 ECDH + NIST FIPS 203 ML-KEM-768 hybrid key agreement.
Supports Platform A (standard CPU) and Platform B (constrained CPU affinity).
"""
import time
import tracemalloc
import psutil
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
import json
import hashlib
import hmac

from backend.app.services.ecdh_service import ECDHService
from backend.app.services.mlkem_service import MLKEMService
from backend.app.services.hybrid_kdf import HybridKDFService
from backend.app.services.system_metrics_service import SystemMetricsService
from backend.app.services.crypto_visualization import generate_crypto_figures
from backend.app.config import settings


class CryptoBenchmarkService:
    """Benchmark runner for hybrid post-quantum key agreement."""

    _latest_result: Optional[Dict[str, Any]] = None

    @classmethod
    def get_latest_result(cls) -> Optional[Dict[str, Any]]:
        if cls._latest_result is not None:
            return cls._latest_result
        json_path = settings.RESULTS_DIR / "benchmark_results.json"
        if json_path.exists():
            try:
                cls._latest_result = json.loads(json_path.read_text(encoding="utf-8"))
                return cls._latest_result
            except Exception:
                pass
        return None

    @classmethod
    def run_benchmark(
        cls,
        iterations: int = 100,
        platform_profile: str = "platform_a",
        warmup_iterations: int = 5,
        save_csv: bool = True,
        benchmark_mode: str = "hybrid",
    ) -> Dict[str, Any]:
        """
        Execute benchmark trials and compute statistical summaries.
        
        Args:
            iterations: Number of measured iterations (1..1000).
            platform_profile: 'platform_a' (standard) or 'platform_b' (constrained).
            warmup_iterations: Warmup cycles before recording metrics (0..100).
            save_csv: Whether to write trial and summary CSV files.
            benchmark_mode: 'hybrid' (primary), 'ecdh_only' (classical baseline), or 'mlkem_only' (PQC baseline).
            
        Raises:
            ValueError: If any benchmark configuration parameter is invalid.
        """
        # -------------------------------------------------------------
        # Input Validation (Section 7 Compliance)
        # -------------------------------------------------------------
        if not isinstance(iterations, int) or iterations < 1 or iterations > settings.MAX_CRYPTO_ITERATIONS:
            raise ValueError(
                f"Invalid iterations: {iterations}. Must be an integer between 1 and {settings.MAX_CRYPTO_ITERATIONS}."
            )

        if not isinstance(warmup_iterations, int) or warmup_iterations < 0 or warmup_iterations > 100:
            raise ValueError(
                f"Invalid warmup_iterations: {warmup_iterations}. Must be an integer between 0 and 100."
            )

        valid_modes = ("hybrid", "ecdh_only", "mlkem_only")
        if benchmark_mode not in valid_modes:
            raise ValueError(
                f"Invalid benchmark_mode: '{benchmark_mode}'. Must be one of: {', '.join(valid_modes)}."
            )

        valid_profiles = ("platform_a", "platform_b", "standard", "constrained", "both", "compare_both", "compare")
        norm_profile = platform_profile.lower()
        if norm_profile not in valid_profiles:
            raise ValueError(
                f"Invalid platform_profile: '{platform_profile}'. Must be one of: {', '.join(valid_profiles)}."
            )

        # -------------------------------------------------------------
        # Dual-Platform Execution (Compare Both)
        # -------------------------------------------------------------
        if norm_profile in ("both", "compare_both", "compare"):
            # 1. Execute Platform A (unconstrained baseline)
            res_a = cls.run_benchmark(
                iterations=iterations,
                platform_profile="platform_a",
                warmup_iterations=warmup_iterations,
                save_csv=save_csv,
                benchmark_mode=benchmark_mode,
            )

            # 2. Execute Platform B (single-core constrained)
            res_b = cls.run_benchmark(
                iterations=iterations,
                platform_profile="platform_b",
                warmup_iterations=warmup_iterations,
                save_csv=save_csv,
                benchmark_mode=benchmark_mode,
            )

            # 3. Calculate comparison metrics
            mean_a = res_a["statistics"]["total_handshake"]["mean_ms"]
            mean_b = res_b["statistics"]["total_handshake"]["mean_ms"]
            p95_a = res_a["statistics"]["total_handshake"]["p95_ms"]
            p95_b = res_b["statistics"]["total_handshake"]["p95_ms"]
            diff_pct = round(((mean_b - mean_a) / mean_a) * 100, 2) if mean_a > 0 else 0.0

            comparison_summary = {
                "platform_a": {
                    "profile_name": "Platform A (Standard)",
                    "mean_ms": mean_a,
                    "p95_ms": p95_a,
                    "python_heap_peak_kb": res_a["memory_overhead"]["python_heap_peak_kb"],
                    "rss_delta_mb": res_a["memory_overhead"]["rss_delta_mb"],
                },
                "platform_b": {
                    "profile_name": "Platform B (Constrained)",
                    "mean_ms": mean_b,
                    "p95_ms": p95_b,
                    "python_heap_peak_kb": res_b["memory_overhead"]["python_heap_peak_kb"],
                    "rss_delta_mb": res_b["memory_overhead"]["rss_delta_mb"],
                },
                "relative_latency_overhead_percent": diff_pct,
            }

            dual_run_id = f"DUAL-{res_a['run_id'].replace('RUN-', '')}-{res_b['run_id'].replace('RUN-', '')}"
            timestamp_str = datetime.utcnow().isoformat() + "Z"

            trials_preview = []
            for t in res_a["trials_preview"][:5]:
                t_c = dict(t)
                t_c["platform"] = "platform_a"
                trials_preview.append(t_c)
            for t in res_b["trials_preview"][:5]:
                t_c = dict(t)
                t_c["platform"] = "platform_b"
                trials_preview.append(t_c)

            total_trials = iterations * 2
            succ_total = res_a["verification"]["successful_handshakes"] + res_b["verification"]["successful_handshakes"]
            fail_total = res_a["verification"]["failed_handshakes"] + res_b["verification"]["failed_handshakes"]

            dual_result = {
                "run_id": dual_run_id,
                "timestamp": timestamp_str,
                "platform_profile": "both",
                "benchmark_mode": benchmark_mode,
                "cpu_configuration": {
                    "profile": "both (Platform A Standard + Platform B Constrained)",
                    "applied": True,
                    "active_cores": res_a["cpu_configuration"].get("active_cores", []),
                    "warning": None,
                    "note": "Dual-platform execution: Platform A executed unconstrained; Platform B executed with single-core affinity.",
                },
                "hardware_info": res_a["hardware_info"],
                "iterations": iterations,
                "warmup_iterations": warmup_iterations,
                "verification": {
                    "trials_run": total_trials,
                    "successful_handshakes": succ_total,
                    "failed_handshakes": fail_total,
                    "success_rate_percent": round((succ_total / total_trials) * 100, 2),
                    "all_ecdh_secrets_matched": res_a["verification"]["all_ecdh_secrets_matched"] and res_b["verification"]["all_ecdh_secrets_matched"],
                    "all_mlkem_secrets_matched": res_a["verification"]["all_mlkem_secrets_matched"] and res_b["verification"]["all_mlkem_secrets_matched"],
                    "all_hybrid_keys_matched": res_a["verification"]["all_hybrid_keys_matched"] and res_b["verification"]["all_hybrid_keys_matched"],
                    "status": "PASS" if res_a["verification"]["status"] == "PASS" and res_b["verification"]["status"] == "PASS" else "FAIL",
                },
                "statistics": res_a["statistics"],
                "payload_sizes": res_a["payload_sizes"],
                "memory_overhead": {
                    "initial_rss_mb": res_a["memory_overhead"]["initial_rss_mb"],
                    "final_rss_mb": res_b["memory_overhead"]["final_rss_mb"],
                    "rss_delta_mb": round(res_b["memory_overhead"]["final_rss_mb"] - res_a["memory_overhead"]["initial_rss_mb"], 2),
                    "python_heap_peak_kb": max(res_a["memory_overhead"]["python_heap_peak_kb"], res_b["memory_overhead"]["python_heap_peak_kb"]),
                    "python_heap_final_kb": res_b["memory_overhead"]["python_heap_final_kb"],
                    "platform_a_heap_peak_kb": res_a["memory_overhead"]["python_heap_peak_kb"],
                    "platform_b_heap_peak_kb": res_b["memory_overhead"]["python_heap_peak_kb"],
                    "methodology": res_a["memory_overhead"]["methodology"],
                    "limitations": res_a["memory_overhead"]["limitations"],
                },
                "trials_preview": trials_preview,
                "platform_a_result": res_a,
                "platform_b_result": res_b,
                "comparison_summary": comparison_summary,
            }

            if save_csv:
                manifest_path = settings.RESULTS_DIR / "manifest.json"
                manifest_data = {
                    "run_id": dual_run_id,
                    "timestamp": timestamp_str,
                    "platform_profile": "both",
                    "benchmark_mode": benchmark_mode,
                    "iterations": iterations,
                    "warmup_iterations": warmup_iterations,
                    "environment": res_a["hardware_info"],
                    "cpu_configuration": dual_result["cpu_configuration"],
                    "verification_status": dual_result["verification"]["status"],
                    "dual_run": {
                        "platform_a_run_id": res_a["run_id"],
                        "platform_b_run_id": res_b["run_id"],
                        "relative_latency_overhead_percent": diff_pct,
                    },
                }
                manifest_path.write_text(json.dumps(manifest_data, indent=2), encoding="utf-8")

                results_json_path = settings.RESULTS_DIR / "benchmark_results.json"
                results_json_path.write_text(json.dumps(dual_result, indent=2, default=str), encoding="utf-8")

                dual_result["csv_files"] = res_b.get("csv_files")
                dual_result["manifest_file"] = str(manifest_path)
                dual_result["generated_figures"] = res_b.get("generated_figures")

                checksum_files = [
                    settings.RESULTS_DIR / "crypto_benchmark_trials.csv",
                    settings.CRYPTO_RESULTS_DIR / "crypto_benchmark_trials.csv",
                    settings.RESULTS_DIR / "crypto_benchmark_summary.csv",
                    settings.CRYPTO_RESULTS_DIR / "crypto_benchmark_summary.csv",
                    settings.RESULTS_DIR / "raw" / f"run_{res_a['run_id']}.csv",
                    settings.RESULTS_DIR / "raw" / f"run_{res_b['run_id']}.csv",
                    manifest_path,
                    results_json_path,
                ]
                figures_dir = settings.RESULTS_DIR / "figures"
                for fig_name in ("crypto_latency_breakdown.png", "crypto_message_sizes.png"):
                    fig_p = figures_dir / fig_name
                    if fig_p.exists():
                        checksum_files.append(fig_p)

                checksum_lines = []
                for p in checksum_files:
                    if p.exists():
                        sha256 = hashlib.sha256(p.read_bytes()).hexdigest()
                        checksum_lines.append(f"{sha256}  {p.name}")
                checksum_path = settings.RESULTS_DIR / "SHA256SUMS.txt"
                checksum_path.write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")

            cls._latest_result = dual_result
            return dual_result

        run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"

        # Capture initial CPU affinity to guarantee restoration
        current_process = psutil.Process()
        initial_affinity = None
        if hasattr(current_process, "cpu_affinity"):
            try:
                initial_affinity = current_process.cpu_affinity()
            except Exception:
                initial_affinity = None

        # Hardware & Platform environment capture
        hardware_info = SystemMetricsService.get_hardware_info()

        # Start memory tracing
        tracemalloc.start()
        initial_rss = current_process.memory_info().rss
        tracemalloc.reset_peak()

        try:
            # Apply CPU profile
            cpu_config = SystemMetricsService.set_cpu_profile(platform_profile)

            # -------------------------------------------------------------
            # Warmup phase (not recorded in statistics)
            # -------------------------------------------------------------
            for _ in range(warmup_iterations):
                if benchmark_mode in ("hybrid", "ecdh_only"):
                    _sk_ec, pk_ec = ECDHService.generate_key_pair()
                    ss_ec = ECDHService.derive_shared_secret(_sk_ec, ECDHService.load_public_key(pk_ec))
                if benchmark_mode in ("hybrid", "mlkem_only"):
                    _sk_ml, pk_ml = MLKEMService.generate_key_pair()
                    ss_ml, ct = MLKEMService.encapsulate(MLKEMService.load_public_key(pk_ml))
                    _ = MLKEMService.decapsulate(_sk_ml, ct)
                if benchmark_mode == "hybrid":
                    th = HybridKDFService.compute_transcript_hash(pk_ec, pk_ec, pk_ml, ct)
                    _ = HybridKDFService.derive_hybrid_key(ss_ec, ss_ml, th)

            # -------------------------------------------------------------
            # Measured Trials
            # -------------------------------------------------------------
            trial_records: List[Dict[str, Any]] = []

            for i in range(1, iterations + 1):
                t_trial_start = time.perf_counter_ns()
                record: Dict[str, Any] = {"trial": i, "platform": platform_profile}

                ecdh_match = True
                mlkem_match = True
                hybrid_match = True

                if benchmark_mode in ("hybrid", "ecdh_only"):
                    # 1. Alice ECDH KeyGen
                    t0 = time.perf_counter_ns()
                    alice_ecdh_sk, alice_ecdh_pk = ECDHService.generate_key_pair()
                    record["ecdh_keygen_ms"] = (time.perf_counter_ns() - t0) / 1_000_000.0

                    # Bob ECDH KeyGen
                    bob_ecdh_sk, bob_ecdh_pk = ECDHService.generate_key_pair()

                    # 2. ECDH Shared Secret Derivation
                    t0 = time.perf_counter_ns()
                    bob_ecdh_pk_loaded = ECDHService.load_public_key(bob_ecdh_pk)
                    alice_ecdh_ss = ECDHService.derive_shared_secret(alice_ecdh_sk, bob_ecdh_pk_loaded)
                    record["ecdh_derivation_ms"] = (time.perf_counter_ns() - t0) / 1_000_000.0

                    alice_ecdh_pk_loaded = ECDHService.load_public_key(alice_ecdh_pk)
                    bob_ecdh_ss = ECDHService.derive_shared_secret(bob_ecdh_sk, alice_ecdh_pk_loaded)
                    ecdh_match = hmac.compare_digest(alice_ecdh_ss, bob_ecdh_ss)

                if benchmark_mode in ("hybrid", "mlkem_only"):
                    # 3. ML-KEM KeyGen
                    t0 = time.perf_counter_ns()
                    bob_mlkem_sk, bob_mlkem_pk = MLKEMService.generate_key_pair()
                    record["mlkem_keygen_ms"] = (time.perf_counter_ns() - t0) / 1_000_000.0

                    # 4. ML-KEM Encapsulation
                    t0 = time.perf_counter_ns()
                    bob_mlkem_pk_loaded = MLKEMService.load_public_key(bob_mlkem_pk)
                    alice_mlkem_ss, mlkem_ct = MLKEMService.encapsulate(bob_mlkem_pk_loaded)
                    record["mlkem_encap_ms"] = (time.perf_counter_ns() - t0) / 1_000_000.0

                    # 5. ML-KEM Decapsulation
                    t0 = time.perf_counter_ns()
                    bob_mlkem_ss = MLKEMService.decapsulate(bob_mlkem_sk, mlkem_ct)
                    record["mlkem_decap_ms"] = (time.perf_counter_ns() - t0) / 1_000_000.0

                    mlkem_match = hmac.compare_digest(alice_mlkem_ss, bob_mlkem_ss)

                if benchmark_mode == "hybrid":
                    # 6. Hybrid Key Derivation
                    t0 = time.perf_counter_ns()
                    th = HybridKDFService.compute_transcript_hash(
                        alice_ecdh_pk, bob_ecdh_pk, bob_mlkem_pk, mlkem_ct
                    )
                    alice_hybrid_key = HybridKDFService.derive_hybrid_key(alice_ecdh_ss, alice_mlkem_ss, th)
                    record["hybrid_kdf_ms"] = (time.perf_counter_ns() - t0) / 1_000_000.0

                    bob_hybrid_key = HybridKDFService.derive_hybrid_key(bob_ecdh_ss, bob_mlkem_ss, th)
                    hybrid_match = hmac.compare_digest(alice_hybrid_key, bob_hybrid_key)

                # End-to-end handshake latency (measured directly across trial boundaries)
                record["total_handshake_ms"] = (time.perf_counter_ns() - t_trial_start) / 1_000_000.0
                record["ecdh_match"] = ecdh_match
                record["mlkem_match"] = mlkem_match
                record["hybrid_match"] = hybrid_match
                record["handshake_success"] = bool(ecdh_match and mlkem_match and hybrid_match)

                trial_records.append(record)

        finally:
            # -------------------------------------------------------------
            # Guaranteed CPU Affinity Restoration (Section 2 & 7 Compliance)
            # -------------------------------------------------------------
            if initial_affinity is not None and hasattr(current_process, "cpu_affinity"):
                try:
                    current_process.cpu_affinity(initial_affinity)
                except Exception:
                    pass

        # Final memory reading
        final_rss = current_process.memory_info().rss
        current_heap, peak_heap = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        # -------------------------------------------------------------
        # Statistical Computations
        # -------------------------------------------------------------
        df = pd.DataFrame(trial_records)

        def calc_stats(series: pd.Series) -> Dict[str, Any]:
            vals = series.dropna().values
            if len(vals) == 0:
                return {
                    "mean_ms": 0.0,
                    "std_dev_ms": 0.0,
                    "median_ms": 0.0,
                    "min_ms": 0.0,
                    "max_ms": 0.0,
                    "p50_ms": 0.0,
                    "p95_ms": 0.0,
                    "p99_ms": 0.0,
                    "sample_count": 0,
                }
            return {
                "mean_ms": float(np.round(np.mean(vals), 4)),
                "std_dev_ms": float(np.round(np.std(vals), 4)),
                "median_ms": float(np.round(np.median(vals), 4)),
                "min_ms": float(np.round(np.min(vals), 4)),
                "max_ms": float(np.round(np.max(vals), 4)),
                "p50_ms": float(np.round(np.percentile(vals, 50), 4)),
                "p95_ms": float(np.round(np.percentile(vals, 95), 4)),
                "p99_ms": float(np.round(np.percentile(vals, 99), 4)),
                "sample_count": int(len(vals)),
            }

        stats_summary: Dict[str, Any] = {}
        if "ecdh_keygen_ms" in df:
            stats_summary["ecdh_keygen"] = calc_stats(df["ecdh_keygen_ms"])
            stats_summary["ecdh_keygen_ms"] = stats_summary["ecdh_keygen"]
        if "mlkem_keygen_ms" in df:
            stats_summary["mlkem_keygen"] = calc_stats(df["mlkem_keygen_ms"])
            stats_summary["mlkem_keygen_ms"] = stats_summary["mlkem_keygen"]
        if "ecdh_derivation_ms" in df:
            stats_summary["ecdh_derivation"] = calc_stats(df["ecdh_derivation_ms"])
            stats_summary["ecdh_derivation_ms"] = stats_summary["ecdh_derivation"]
        if "mlkem_encap_ms" in df:
            stats_summary["mlkem_encapsulation"] = calc_stats(df["mlkem_encap_ms"])
            stats_summary["mlkem_encap_ms"] = stats_summary["mlkem_encapsulation"]
        if "mlkem_decap_ms" in df:
            stats_summary["mlkem_decapsulation"] = calc_stats(df["mlkem_decap_ms"])
            stats_summary["mlkem_decap_ms"] = stats_summary["mlkem_decapsulation"]
        if "hybrid_kdf_ms" in df:
            stats_summary["hybrid_kdf"] = calc_stats(df["hybrid_kdf_ms"])
            stats_summary["hybrid_kdf_ms"] = stats_summary["hybrid_kdf"]
        stats_summary["total_handshake"] = calc_stats(df["total_handshake_ms"])
        stats_summary["total_handshake_ms"] = stats_summary["total_handshake"]

        all_ecdh_valid = bool(df["ecdh_match"].all())
        all_mlkem_valid = bool(df["mlkem_match"].all())
        all_hybrid_valid = bool(df["hybrid_match"].all())
        successful_trials = int(df["handshake_success"].sum())
        failed_trials = int(len(df) - successful_trials)

        payload_sizes = {
            "ecdh_public_key_bytes": ECDHService.PUBLIC_KEY_SIZE_UNCOMPRESSED if benchmark_mode != "mlkem_only" else 0,
            "mlkem_public_key_bytes": MLKEMService.PUBLIC_KEY_SIZE if benchmark_mode != "ecdh_only" else 0,
            "mlkem_ciphertext_bytes": MLKEMService.CIPHERTEXT_SIZE if benchmark_mode != "ecdh_only" else 0,
            "ecdh_shared_secret_bytes": ECDHService.SHARED_SECRET_SIZE if benchmark_mode != "mlkem_only" else 0,
            "mlkem_shared_secret_bytes": MLKEMService.SHARED_SECRET_SIZE if benchmark_mode != "ecdh_only" else 0,
            "final_hybrid_key_bytes": HybridKDFService.KEY_LENGTH_BYTES if benchmark_mode == "hybrid" else 32,
            "total_handshake_payload_bytes": (
                (2 * ECDHService.PUBLIC_KEY_SIZE_UNCOMPRESSED if benchmark_mode != "mlkem_only" else 0) +
                (MLKEMService.PUBLIC_KEY_SIZE if benchmark_mode != "ecdh_only" else 0) +
                (MLKEMService.CIPHERTEXT_SIZE if benchmark_mode != "ecdh_only" else 0)
            ),
        }

        memory_overhead = {
            "initial_rss_mb": round(initial_rss / (1024 * 1024), 2),
            "final_rss_mb": round(final_rss / (1024 * 1024), 2),
            "rss_delta_mb": round((final_rss - initial_rss) / (1024 * 1024), 2),
            "python_heap_peak_kb": round(peak_heap / 1024, 2),
            "python_heap_final_kb": round(current_heap / 1024, 2),
            "methodology": "Python heap allocations measured via tracemalloc. Process Resident Set Size (RSS) measured via psutil.",
            "limitations": (
                "tracemalloc captures only memory managed by the Python interpreter and does not trace internal C/Rust "
                "allocations inside cryptography (OpenSSL). Process RSS measures total physical memory mapped to the process, "
                "which includes shared libraries and OS page caching."
            ),
        }

        timestamp_str = datetime.utcnow().isoformat() + "Z"

        result = {
            "run_id": run_id,
            "timestamp": timestamp_str,
            "platform_profile": platform_profile,
            "benchmark_mode": benchmark_mode,
            "cpu_configuration": cpu_config,
            "hardware_info": hardware_info,
            "iterations": iterations,
            "warmup_iterations": warmup_iterations,
            "verification": {
                "trials_run": iterations,
                "successful_handshakes": successful_trials,
                "failed_handshakes": failed_trials,
                "success_rate_percent": round((successful_trials / iterations) * 100, 2),
                "all_ecdh_secrets_matched": all_ecdh_valid,
                "all_mlkem_secrets_matched": all_mlkem_valid,
                "all_hybrid_keys_matched": all_hybrid_valid,
                "status": "PASS" if (all_ecdh_valid and all_mlkem_valid and all_hybrid_valid and failed_trials == 0) else "FAIL",
            },
            "statistics": stats_summary,
            "payload_sizes": payload_sizes,
            "memory_overhead": memory_overhead,
            "trials_preview": trial_records[:10],
        }

        # -------------------------------------------------------------
        # Save to Artifact Directories (Section 6 Compliance)
        # -------------------------------------------------------------
        if save_csv:
            raw_dir = settings.RESULTS_DIR / "raw"
            tables_dir = settings.RESULTS_DIR / "tables"
            figures_dir = settings.RESULTS_DIR / "figures"
            raw_dir.mkdir(parents=True, exist_ok=True)
            tables_dir.mkdir(parents=True, exist_ok=True)
            figures_dir.mkdir(parents=True, exist_ok=True)

            # 1. Raw run records
            raw_run_path = raw_dir / f"run_{run_id}.csv"
            df.to_csv(raw_run_path, index=False)

            # 2. Trials CSV in both root results/ and results/crypto/
            trials_path_root = settings.RESULTS_DIR / "crypto_benchmark_trials.csv"
            trials_path_crypto = settings.CRYPTO_RESULTS_DIR / "crypto_benchmark_trials.csv"
            df.to_csv(trials_path_root, index=False)
            df.to_csv(trials_path_crypto, index=False)

            # 3. Summary CSV in root results/, results/crypto/, and results/tables/
            summary_rows = []
            for op, s in stats_summary.items():
                if isinstance(s, dict) and "mean_ms" in s:
                    row = {"operation": op}
                    row.update(s)
                    summary_rows.append(row)
            summary_df = pd.DataFrame(summary_rows)
            summary_path_root = settings.RESULTS_DIR / "crypto_benchmark_summary.csv"
            summary_path_crypto = settings.CRYPTO_RESULTS_DIR / "crypto_benchmark_summary.csv"
            summary_path_tables = tables_dir / "crypto_benchmark_summary.csv"
            summary_df.to_csv(summary_path_root, index=False)
            summary_df.to_csv(summary_path_crypto, index=False)
            summary_df.to_csv(summary_path_tables, index=False)

            # 4. Manifest JSON
            manifest_path = settings.RESULTS_DIR / "manifest.json"
            manifest_data = {
                "run_id": run_id,
                "timestamp": timestamp_str,
                "platform_profile": platform_profile,
                "benchmark_mode": benchmark_mode,
                "iterations": iterations,
                "warmup_iterations": warmup_iterations,
                "environment": hardware_info,
                "cpu_configuration": cpu_config,
                "verification_status": result["verification"]["status"],
            }
            manifest_path.write_text(json.dumps(manifest_data, indent=2), encoding="utf-8")

            # 5. Structured summary JSON
            results_json_path = settings.RESULTS_DIR / "benchmark_results.json"
            results_json_path.write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")

            # 6. Figures generation
            try:
                fig_paths = generate_crypto_figures(result, figures_dir)
                result["generated_figures"] = fig_paths
            except Exception as e:
                result["generated_figures"] = {"warning": f"Figure generation failed: {str(e)}"}

            # 7. Checksums calculation
            checksum_files = [
                trials_path_root,
                trials_path_crypto,
                summary_path_root,
                summary_path_crypto,
                raw_run_path,
                manifest_path,
                results_json_path,
            ]
            for fig_name in ("crypto_latency_breakdown.png", "crypto_message_sizes.png"):
                fig_p = figures_dir / fig_name
                if fig_p.exists():
                    checksum_files.append(fig_p)

            checksum_lines = []
            for p in checksum_files:
                if p.exists():
                    sha256 = hashlib.sha256(p.read_bytes()).hexdigest()
                    checksum_lines.append(f"{sha256}  {p.name}")
            checksum_path = settings.RESULTS_DIR / "SHA256SUMS.txt"
            checksum_path.write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")

            result["csv_files"] = {
                "trials_csv": str(trials_path_root),
                "summary_csv": str(summary_path_root),
                "raw_run_csv": str(raw_run_path),
            }
            result["manifest_file"] = str(manifest_path)

        cls._latest_result = result
        return result


if __name__ == "__main__":
    print("Executing Q-SHIELD-PQC Smoke Benchmark (10 trials)...")
    res = CryptoBenchmarkService.run_benchmark(iterations=10, platform_profile="platform_a", warmup_iterations=2)
    print("Smoke benchmark complete. Status:", res["verification"]["status"])
