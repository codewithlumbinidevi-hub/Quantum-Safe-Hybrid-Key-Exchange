"""
API integration tests using FastAPI TestClient.
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["project"] == "Q-SHIELD-PQC"


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "environment" in data
    assert "cryptography_version" in data["environment"]
    assert "qiskit_version" in data["environment"]


def test_hybrid_exchange_api():
    payload = {"demo_message": "FastAPI integration test message"}
    response = client.post("/api/hybrid-exchange/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["verification"]["hybrid_keys_match"] is True
    assert data["aes_gcm_demo"]["decryption_success"] is True


def test_crypto_benchmark_api():
    # Run short 3 iterations for fast API verification
    payload = {
        "iterations": 3,
        "platform_profile": "platform_a",
        "warmup_iterations": 1,
        "save_csv": False,
    }
    response = client.post("/api/benchmarks/crypto/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["iterations"] == 3
    assert data["verification"]["status"] == "PASS"
    assert "statistics" in data
    assert "total_handshake" in data["statistics"]


def test_processor_benchmark_api():
    # Run short 100 shots on GHZ circuit for fast API verification
    payload = {
        "circuit_id": "ghz_5",
        "shots": 100,
        "optimization_level": 1,
        "seed": 42,
        "save_csv": False,
    }
    response = client.post("/api/benchmarks/processors/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["circuit"]["id"] == "ghz_5"
    assert "processor_a" in data
    assert "processor_b" in data
    assert data["processor_a"]["hellinger_fidelity"] >= 0.0


def test_results_summary_api():
    response = client.get("/api/results/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "Q-SHIELD-PQC"
    assert "reproducibility_environment" in data
