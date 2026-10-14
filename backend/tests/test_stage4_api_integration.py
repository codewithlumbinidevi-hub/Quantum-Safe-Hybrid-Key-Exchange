"""
Stage 4 API Integration & Live Verification Tests.
Validates:
1. All core API endpoints: health, exchange, crypto benchmarks, exports, results, manifest, checksums.
2. Input validation rejections (HTTP 422).
3. Export consistency and data integrity.
4. Zero-secret exposure in API responses.
5. CORS headers for localhost:5173 and localhost:3000.
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


class TestStage4ApiIntegration:

    def test_health_endpoint_response_structure(self):
        """1. Verify /api/health status, environment, and system metrics."""
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["service"] == "Q-SHIELD-PQC"
        assert "environment" in data
        assert "system_memory" in data
        assert data["environment"]["cryptography_version"] != "unknown"

    def test_hybrid_exchange_live_execution_and_integrity(self):
        """2. Verify /api/hybrid-exchange/run executes real handshake and returns verified agreement."""
        payload = {"demo_message": "Stage 4 Live API Verification Message"}
        res = client.post("/api/hybrid-exchange/run", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        verif = data["verification"]
        assert verif["ecdh_secrets_match"] is True
        assert verif["mlkem_secrets_match"] is True
        assert verif["hybrid_keys_match"] is True
        assert verif["alice_key_fingerprint_sha256"] == verif["bob_key_fingerprint_sha256"]
        assert len(verif["alice_key_fingerprint_sha256"]) == 64

        # Payload sizes verification
        sizes = data["payload_sizes"]
        assert sizes["alice_ecdh_public_key_bytes"] == 65
        assert sizes["bob_ecdh_public_key_bytes"] == 65
        assert sizes["bob_mlkem_public_key_bytes"] == 1184
        assert sizes["mlkem_ciphertext_bytes"] == 1088
        assert sizes["total_exchange_payload_bytes"] == 2402

        # AES-GCM demo verification
        demo = data["aes_gcm_demo"]
        assert demo is not None
        assert demo["decryption_success"] is True
        assert demo["decrypted_plaintext"] == "Stage 4 Live API Verification Message"

    def test_crypto_benchmark_execution_and_retrieval(self):
        """3. Verify /api/benchmarks/crypto/run and /latest."""
        req = {
            "iterations": 5,
            "platform_profile": "platform_a",
            "warmup_iterations": 1,
            "save_csv": True,
            "benchmark_mode": "hybrid",
        }
        res_run = client.post("/api/benchmarks/crypto/run", json=req)
        assert res_run.status_code == 200
        data_run = res_run.json()
        assert data_run["iterations"] == 5
        assert data_run["verification"]["status"] == "PASS"
        assert data_run["verification"]["successful_handshakes"] == 5
        assert data_run["verification"]["failed_handshakes"] == 0

        # Retrieve via /latest
        res_latest = client.get("/api/benchmarks/crypto/latest")
        assert res_latest.status_code == 200
        data_latest = res_latest.json()
        assert data_latest["run_id"] == data_run["run_id"]
        assert data_latest["iterations"] == 5

    def test_crypto_benchmark_platform_b(self):
        """3b. Verify /api/benchmarks/crypto/run with platform_b."""
        req = {
            "iterations": 3,
            "platform_profile": "platform_b",
            "warmup_iterations": 1,
            "save_csv": True,
            "benchmark_mode": "hybrid",
        }
        res_run = client.post("/api/benchmarks/crypto/run", json=req)
        assert res_run.status_code == 200
        data_run = res_run.json()
        assert data_run["platform_profile"] == "platform_b"
        assert data_run["verification"]["status"] == "PASS"
        assert data_run["verification"]["successful_handshakes"] == 3

    def test_crypto_benchmark_compare_both(self):
        """3c. Verify /api/benchmarks/crypto/run with both and compare_both dual profiles."""
        # Test 'both'
        req_both = {
            "iterations": 3,
            "platform_profile": "both",
            "warmup_iterations": 1,
            "save_csv": True,
            "benchmark_mode": "hybrid",
        }
        res_both = client.post("/api/benchmarks/crypto/run", json=req_both)
        assert res_both.status_code == 200
        data_both = res_both.json()
        assert data_both["platform_profile"] == "both"
        assert data_both["verification"]["status"] == "PASS"
        assert data_both["platform_a_result"] is not None
        assert data_both["platform_b_result"] is not None
        assert data_both["comparison_summary"] is not None
        assert "platform_a" in data_both["comparison_summary"]
        assert "platform_b" in data_both["comparison_summary"]
        assert "relative_latency_overhead_percent" in data_both["comparison_summary"]

        # Test 'compare_both' alias
        req_compare = {
            "iterations": 2,
            "platform_profile": "compare_both",
            "warmup_iterations": 1,
            "save_csv": False,
            "benchmark_mode": "hybrid",
        }
        res_compare = client.post("/api/benchmarks/crypto/run", json=req_compare)
        assert res_compare.status_code == 200
        data_compare = res_compare.json()
        assert data_compare["verification"]["status"] == "PASS"
        assert data_compare["platform_a_result"] is not None
        assert data_compare["platform_b_result"] is not None

    def test_export_endpoints_csv_json_and_checksums(self):
        """4. Verify /api/benchmarks/crypto/export, /manifest, /checksums, and /benchmark-data."""
        # Summary CSV
        res_summary = client.get("/api/benchmarks/crypto/export?target=summary")
        assert res_summary.status_code == 200
        assert "text/csv" in res_summary.headers["content-type"]
        assert len(res_summary.text) > 0
        assert "operation" in res_summary.text

        # Trials CSV
        res_trials = client.get("/api/benchmarks/crypto/export?target=trials")
        assert res_trials.status_code == 200
        assert "text/csv" in res_trials.headers["content-type"]
        assert len(res_trials.text) > 0
        assert "total_handshake_ms" in res_trials.text

        # Manifest JSON
        res_manifest = client.get("/api/results/manifest")
        assert res_manifest.status_code == 200
        assert "application/json" in res_manifest.headers["content-type"]
        manifest = res_manifest.json()
        assert "run_id" in manifest
        assert "environment" in manifest

        # Checksums
        res_sums = client.get("/api/results/checksums")
        assert res_sums.status_code == 200
        assert len(res_sums.text) > 0

        # Benchmark data JSON
        res_data = client.get("/api/results/benchmark-data")
        assert res_data.status_code == 200
        data = res_data.json()
        assert "statistics" in data

    def test_input_validation_rejections(self):
        """5. Verify HTTP 422 rejections for invalid inputs."""
        # Zero iterations
        res_zero = client.post("/api/benchmarks/crypto/run", json={"iterations": 0})
        assert res_zero.status_code == 422

        # Exceeding max iterations
        res_overflow = client.post("/api/benchmarks/crypto/run", json={"iterations": 10000})
        assert res_overflow.status_code == 422

        # Invalid export target
        res_inv_export = client.get("/api/benchmarks/crypto/export?target=invalid_target")
        assert res_inv_export.status_code == 422

    def test_zero_secret_leakage_in_api_responses(self):
        """6. Verify no private keys or raw shared secrets in any endpoint responses."""
        res_exchange = client.post("/api/hybrid-exchange/run", json={})
        text_exch = res_exchange.text.lower()
        for forbidden in ["raw_private_key", "private_key_bytes", "secret_key_bytes", "raw_secret"]:
            assert forbidden not in text_exch

        res_benchmark = client.get("/api/benchmarks/crypto/latest")
        text_bench = res_benchmark.text.lower()
        for forbidden in ["raw_private_key", "private_key_bytes", "secret_key_bytes", "raw_secret"]:
            assert forbidden not in text_bench

    def test_cors_preflight_headers(self):
        """7. Verify CORS preflight headers for configured frontend origins."""
        headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        }
        res = client.options("/api/hybrid-exchange/run", headers=headers)
        assert res.status_code == 200
        assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"

    def test_trial_platform_tagging_in_single_and_dual_runs(self):
        """8. Verify that each trial record explicitly includes the 'platform' field."""
        # Single run
        res = client.post("/api/benchmarks/crypto/run", json={"iterations": 2, "platform_profile": "platform_a"})
        assert res.status_code == 200
        data = res.json()
        assert len(data["trials_preview"]) > 0
        for t in data["trials_preview"]:
            assert t.get("platform") == "platform_a"

        # Dual run
        res_dual = client.post("/api/benchmarks/crypto/run", json={"iterations": 2, "platform_profile": "both"})
        assert res_dual.status_code == 200
        data_dual = res_dual.json()
        assert len(data_dual["trials_preview"]) > 0
        platforms = {t.get("platform") for t in data_dual["trials_preview"]}
        assert "platform_a" in platforms
        assert "platform_b" in platforms

    def test_processor_benchmark_run_and_exports(self):
        """9. Verify quantum processor simulation endpoint and exports."""
        res = client.post(
            "/api/benchmarks/processors/run",
            json={"circuit_id": "qft_5", "shots": 100, "optimization_level": 1, "seed": 42}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["circuit"]["id"] == "qft_5"
        assert "processor_a" in data
        assert "processor_b" in data
        assert data["processor_a"]["hellinger_fidelity"] is not None
        assert data["processor_b"]["hellinger_fidelity"] is not None

        # Processor CSV export
        res_csv = client.get("/api/benchmarks/processors/export")
        assert res_csv.status_code == 200
        assert "processor,topology,circuit_id" in res_csv.text

        # Processor chart PNG export
        res_chart = client.get("/api/benchmarks/processors/chart")
        assert res_chart.status_code == 200
        assert res_chart.headers["content-type"] == "image/png"

