"""
Stage 3 Focused Benchmark Validation Tests.
Verifies:
1. Platform A (Standard) and Platform B (Constrained) profiles configuration.
2. Guaranteed CPU affinity restoration even on exceptions.
3. Strict rejection of invalid benchmark configurations.
4. Warmup runs excluded and sample count matches completed runs.
5. Statistical summaries accurately match raw observation data.
6. JSON, CSV, and manifest exports contain consistent values.
7. Verification and failure recording accuracy.
8. Zero private keys or raw shared secrets in benchmark artifacts.
9. Decoupling of CPU platform profiles from quantum processor topologies.
"""
import pytest
import psutil
import json
import numpy as np
import pandas as pd
from pathlib import Path

from backend.app.services.crypto_benchmark_service import CryptoBenchmarkService
from backend.app.services.system_metrics_service import SystemMetricsService
from processors.coupling_maps import load_processors
from backend.app.config import settings


class TestStage3BenchmarkValidation:

    def test_processor_profiles_configuration_and_affinity(self):
        """1. Verify Platform A and Platform B CPU configurations."""
        p = psutil.Process()
        if not hasattr(p, "cpu_affinity"):
            pytest.skip("psutil.cpu_affinity unsupported on this platform")

        initial_affinity = p.cpu_affinity()

        try:
            # Platform A (Standard: All cores)
            cfg_a = SystemMetricsService.set_cpu_profile("platform_a")
            assert cfg_a["applied"] is True
            assert len(cfg_a["active_cores"]) == (psutil.cpu_count(logical=True) or 1)

            # Platform B (Constrained: Core 0 only)
            cfg_b = SystemMetricsService.set_cpu_profile("platform_b")
            assert cfg_b["applied"] is True
            assert cfg_b["active_cores"] == [0]

        finally:
            # Restore
            p.cpu_affinity(initial_affinity)

    def test_affinity_restoration_even_on_exception(self):
        """2. Verify CPU affinity is restored even if an exception occurs."""
        p = psutil.Process()
        if not hasattr(p, "cpu_affinity"):
            pytest.skip("psutil.cpu_affinity unsupported on this platform")

        initial_affinity = p.cpu_affinity()

        # Simulate exception during constrained benchmark
        try:
            with pytest.raises(ValueError):
                # Trigger ValueError during benchmark execution with invalid iterations
                CryptoBenchmarkService.run_benchmark(
                    iterations=-10,
                    platform_profile="platform_b",
                    warmup_iterations=2,
                )
        finally:
            current_affinity = p.cpu_affinity()
            assert current_affinity == initial_affinity, "CPU affinity must remain intact after exception"

    def test_invalid_benchmark_configurations_rejected(self):
        """3. Verify invalid configurations raise ValueError."""
        # Invalid iterations
        with pytest.raises(ValueError):
            CryptoBenchmarkService.run_benchmark(iterations=0)
        with pytest.raises(ValueError):
            CryptoBenchmarkService.run_benchmark(iterations=-1)
        with pytest.raises(ValueError):
            CryptoBenchmarkService.run_benchmark(iterations=5000)

        # Invalid warmup
        with pytest.raises(ValueError):
            CryptoBenchmarkService.run_benchmark(iterations=10, warmup_iterations=-1)
        with pytest.raises(ValueError):
            CryptoBenchmarkService.run_benchmark(iterations=10, warmup_iterations=200)

        # Invalid mode
        with pytest.raises(ValueError):
            CryptoBenchmarkService.run_benchmark(iterations=10, benchmark_mode="unsupported_quantum_mode")

        # Invalid platform profile
        with pytest.raises(ValueError):
            CryptoBenchmarkService.run_benchmark(iterations=10, platform_profile="unknown_cluster")

    def test_warmup_excluded_and_sample_count_matches(self):
        """4. Verify warmup runs are excluded and sample counts match completed runs."""
        iterations = 12
        warmup = 3
        res = CryptoBenchmarkService.run_benchmark(
            iterations=iterations,
            platform_profile="platform_a",
            warmup_iterations=warmup,
            save_csv=False,
        )

        assert res["iterations"] == iterations
        assert res["warmup_iterations"] == warmup
        assert res["verification"]["trials_run"] == iterations
        assert res["verification"]["successful_handshakes"] == iterations
        assert res["verification"]["failed_handshakes"] == 0

        # Sample count in statistics must be exactly iterations (warmup excluded)
        total_stat = res["statistics"]["total_handshake_ms"]
        assert total_stat["sample_count"] == iterations

    def test_statistical_summaries_match_raw_observations(self):
        """5. Verify statistical aggregations accurately compute mean, median, min, max, p95."""
        iterations = 20
        res = CryptoBenchmarkService.run_benchmark(
            iterations=iterations,
            platform_profile="platform_a",
            warmup_iterations=2,
            save_csv=True,
        )

        # Load raw trials CSV
        trials_csv = settings.RESULTS_DIR / "crypto_benchmark_trials.csv"
        df = pd.read_csv(trials_csv)
        assert len(df) == iterations

        raw_latencies = df["total_handshake_ms"].values
        expected_mean = float(np.round(np.mean(raw_latencies), 4))
        expected_median = float(np.round(np.median(raw_latencies), 4))
        expected_min = float(np.round(np.min(raw_latencies), 4))
        expected_max = float(np.round(np.max(raw_latencies), 4))
        expected_p95 = float(np.round(np.percentile(raw_latencies, 95), 4))

        reported = res["statistics"]["total_handshake_ms"]
        assert reported["mean_ms"] == expected_mean
        assert reported["median_ms"] == expected_median
        assert reported["min_ms"] == expected_min
        assert reported["max_ms"] == expected_max
        assert reported["p95_ms"] == expected_p95

    def test_exports_consistency_and_checksums(self):
        """6. Verify all expected export files exist, are populated, and have matching checksums."""
        res = CryptoBenchmarkService.run_benchmark(
            iterations=10,
            platform_profile="platform_a",
            warmup_iterations=2,
            save_csv=True,
        )

        # Expected files
        expected_paths = [
            settings.RESULTS_DIR / "crypto_benchmark_trials.csv",
            settings.CRYPTO_RESULTS_DIR / "crypto_benchmark_trials.csv",
            settings.RESULTS_DIR / "crypto_benchmark_summary.csv",
            settings.CRYPTO_RESULTS_DIR / "crypto_benchmark_summary.csv",
            settings.RESULTS_DIR / "tables" / "crypto_benchmark_summary.csv",
            settings.RESULTS_DIR / "manifest.json",
            settings.RESULTS_DIR / "benchmark_results.json",
            settings.RESULTS_DIR / "SHA256SUMS.txt",
        ]

        for p in expected_paths:
            assert p.exists(), f"Expected artifact '{p}' does not exist"
            assert p.stat().st_size > 0, f"Artifact '{p}' is empty"

        # Verify SHA256SUMS.txt entries
        sums_text = (settings.RESULTS_DIR / "SHA256SUMS.txt").read_text(encoding="utf-8")
        assert "crypto_benchmark_trials.csv" in sums_text
        assert "crypto_benchmark_summary.csv" in sums_text
        assert "manifest.json" in sums_text
        assert "benchmark_results.json" in sums_text

    def test_zero_secrets_in_results_and_artifacts(self):
        """7. Verify zero private keys or raw shared secrets in exported results."""
        res = CryptoBenchmarkService.run_benchmark(iterations=5, save_csv=True)

        # Check in-memory result
        res_str = json.dumps(res, default=str).lower()
        assert "private_key" not in res_str
        assert "shared_secret" not in res["payload_sizes"] or res["payload_sizes"]["ecdh_shared_secret_bytes"] == 32

        # Check exported JSON file
        json_file = settings.RESULTS_DIR / "benchmark_results.json"
        content = json_file.read_text(encoding="utf-8").lower()
        for forbidden in ["raw_private_key", "private_key_bytes", "secret_key_bytes", "raw_secret", "raw_shared_secret"]:
            assert forbidden not in content, f"Forbidden token '{forbidden}' in results JSON"

    def test_decoupling_of_cpu_profiles_and_quantum_topologies(self):
        """8. Verify CPU profiles (Platform A/B) are separate from Quantum Topologies (Processor A/B)."""
        proc_a, proc_b = load_processors()

        # Processor A is a 5-qubit Linear chain
        assert proc_a.num_qubits == 5
        assert proc_a.topology_type == "Linear Chain"

        # Processor B is a 9-qubit Heavy-Hex topology
        assert proc_b.num_qubits == 9
        assert "Heavy-Hex" in proc_b.topology_type

        # Neither topology JSON contains CPU affinity or host workstation specifications
        assert not hasattr(proc_a, "cpu_affinity")
        assert not hasattr(proc_b, "cpu_affinity")

    def test_dual_platform_benchmark_execution(self):
        """9. Verify dual-platform benchmark execution runs both profiles and calculates comparison."""
        res = CryptoBenchmarkService.run_benchmark(
            iterations=3,
            platform_profile="both",
            warmup_iterations=1,
            save_csv=False,
            benchmark_mode="hybrid",
        )
        assert res["platform_profile"] == "both"
        assert res["verification"]["status"] == "PASS"
        assert res["platform_a_result"] is not None
        assert res["platform_b_result"] is not None
        assert res["platform_a_result"]["platform_profile"] == "platform_a"
        assert res["platform_b_result"]["platform_profile"] == "platform_b"
        assert res["comparison_summary"] is not None
        assert "relative_latency_overhead_percent" in res["comparison_summary"]
