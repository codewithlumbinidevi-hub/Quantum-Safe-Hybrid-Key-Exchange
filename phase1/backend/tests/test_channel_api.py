"""
Unit and integration tests for Phase 2 Secure Channel API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_channel_status():
    res = client.get("/api/channel/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert "cryptography_version" in data
    assert "pqcrypto_version" in data
    assert len(data["supported_suites"]) == 2
    assert data["security_scope"] == "prototype, not production security"


def test_handshake_run_pqc():
    payload = {"suite": "pqc", "transport": "loopback", "payload": "none"}
    res = client.post("/api/channel/handshake/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "MLKEM768" in data["suite_name"]
    assert data["total_wire_bytes"] == 9016
    assert data["flight1_bytes"] > 0
    assert data["flight2_bytes"] > 0
    assert data["flight3_bytes"] > 0
    assert len(data["events"]) == 3
    assert len(data["final_transcript_hash"]) == 64
    assert len(data["alice_write_key_fingerprint"]) > 0
    assert len(data["bob_write_key_fingerprint"]) > 0


def test_handshake_run_classical():
    payload = {"suite": "classical", "transport": "loopback", "payload": "none"}
    res = client.post("/api/channel/handshake/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "X25519" in data["suite_name"]
    assert data["total_wire_bytes"] == 318
    assert data["flight1_bytes"] > 0
    assert data["flight2_bytes"] > 0
    assert data["flight3_bytes"] > 0


def test_handshake_run_tcp_with_payload():
    payload = {"suite": "pqc", "transport": "tcp", "payload": "1kb"}
    res = client.post("/api/channel/handshake/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["scope_label"] == "local (TCP loopback)"
    assert data["payload_result"] is not None
    assert data["payload_result"]["sha256_match"] is True
    assert data["payload_result"]["plaintext_bytes"] == 1024


def test_handshake_get_run():
    # First create a run
    res = client.post("/api/channel/handshake/run", json={"suite": "pqc"})
    run_id = res.json()["run_id"]

    # Retrieve it
    res_get = client.get(f"/api/channel/handshake/{run_id}")
    assert res_get.status_code == 200
    assert res_get.json()["run_id"] == run_id

    # Unknown run
    res_404 = client.get("/api/channel/handshake/non_existent_run_id")
    assert res_404.status_code == 404


def test_security_tests_latest():
    res = client.get("/api/channel/tests/latest")
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] == 9
    assert data["all_passed"] is True
    assert all(t["result"] == "PASS" for t in data["tests"])


def test_attack_simulation_rejection():
    # Test signature tampering
    res = client.post("/api/channel/attack/simulate", json={"scenario": "tamper_sig", "suite": "pqc"})
    assert res.status_code == 200
    data = res.json()
    assert data["rejected"] is True
    assert data["exception_type"] == "SignatureError"
    assert data["plaintext_released"] is False

    # Test ciphertext tampering
    res2 = client.post("/api/channel/attack/simulate", json={"scenario": "tamper_ciphertext", "suite": "pqc"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["rejected"] is True
    assert data2["exception_type"] == "InvalidTagError"
    assert data2["plaintext_released"] is False


def test_platform_info():
    res = client.get("/api/channel/platform/info")
    assert res.status_code == 200
    data = res.json()
    assert "platform_a" in data
    assert "platform_b" in data
    assert "platform_d" in data
    assert data["platform_a"]["platform_label"] == "A"
    assert data["platform_b"]["profile_label"] == "B"


def test_trust_info():
    res = client.get("/api/channel/trust/info")
    assert res.status_code == 200
    data = res.json()
    assert len(data["trust_anchors"]) == 2
    assert len(data["supported_suites"]) == 2
    assert "Explicitly Pinned" in data["identity_trust_model"]


def test_benchmark_endpoints():
    # Test GET benchmark/latest
    res_get = client.get("/api/channel/benchmark/latest")
    assert res_get.status_code == 200
    data = res_get.json()
    assert len(data["handshakes"]) > 0
    assert len(data["payloads"]) == 6
    assert len(data["primitives"]) >= 10
    assert len(data["figures"]) == 5

    # Test POST benchmark/run
    res_post = client.post("/api/channel/benchmark/run", json={"suite": "pqc", "trials": 5, "mode": "in_process"})
    assert res_post.status_code == 200
    assert "job_id" in res_post.json()


def test_submission_verify():
    res = client.get("/api/channel/submission/verify")
    assert res.status_code == 200
    data = res.json()
    assert data["total_files"] > 0
    assert data["all_verified"] is True
