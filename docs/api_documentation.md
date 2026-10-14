# Q-SHIELD-PQC REST API Documentation

The Q-SHIELD-PQC backend provides a typed FastAPI REST interface with interactive OpenAPI documentation at `/docs` and ReDoc at `/redoc`.

Base URL: `http://localhost:8000`

---

## Endpoints

### 1. System Health
- **`GET /api/health`**
  - **Description**: Returns backend status, host environment metadata (OS, architecture, CPU logical cores), Python version, cryptography version, Qiskit version, and process memory metrics.
  - **Response 200**:
    ```json
    {
      "status": "healthy",
      "service": "Q-SHIELD-PQC",
      "version": "1.0.0",
      "environment": {
        "os": "Windows",
        "architecture": "AMD64",
        "cpu_cores_logical": 12,
        "python_version": "3.10.11",
        "cryptography_version": "50.0.2",
        "qiskit_version": "2.2.3",
        "affinity_constraint_supported": true
      },
      "system_memory": {
        "process_rss_mb": 94.5,
        "python_traced_current_kb": 120.4
      }
    }
    ```

---

### 2. Hybrid Key Exchange
- **`POST /api/hybrid-exchange/run`**
  - **Description**: Executes a full Alice <-> Bob hybrid key establishment combining ephemeral NIST P-256 ECDH and NIST FIPS 203 ML-KEM-768. Includes safe transcript binding, key verification, and optional AES-256-GCM demonstration.
  - **Request Body**:
    ```json
    {
      "demo_message": "Post-quantum secure message transmission using Q-SHIELD-PQC."
    }
    ```
  - **Response 200**:
    ```json
    {
      "success": true,
      "verification": {
        "ecdh_secrets_match": true,
        "mlkem_secrets_match": true,
        "hybrid_keys_match": true,
        "alice_key_fingerprint_sha256": "3a7b...",
        "bob_key_fingerprint_sha256": "3a7b..."
      },
      "timings_ms": {
        "alice_ecdh_keygen_ms": 0.08,
        "bob_mlkem_keygen_ms": 0.45,
        "alice_mlkem_encapsulation_ms": 0.18,
        "bob_mlkem_decapsulation_ms": 0.14,
        "total_handshake_ms": 1.45
      },
      "payload_sizes": {
        "alice_ecdh_public_key_bytes": 65,
        "bob_ecdh_public_key_bytes": 65,
        "bob_mlkem_public_key_bytes": 1184,
        "mlkem_ciphertext_bytes": 1088,
        "total_exchange_payload_bytes": 2402
      },
      "aes_gcm_demo": {
        "decryption_success": true,
        "decrypted_plaintext": "Post-quantum secure message transmission using Q-SHIELD-PQC."
      }
    }
    ```

---

### 3. Cryptographic Benchmarking
- **`POST /api/benchmarks/crypto/run`**
  - **Description**: Runs repeated key exchange trials (1 to 1000 iterations), collecting statistics, timing distributions, and memory overhead.
  - **Request Body**:
    ```json
    {
      "iterations": 100,
      "platform_profile": "platform_a",
      "warmup_iterations": 5,
      "save_csv": true
    }
    ```
- **`GET /api/benchmarks/crypto/latest`**
  - **Description**: Returns the most recent benchmark run in the current session.
- **`GET /api/benchmarks/crypto/export?target=summary|trials`**
  - **Description**: Downloads either the summary statistics CSV or the raw trial measurements CSV.

---

### 4. Quantum Processor A/B Benchmarking
- **`POST /api/benchmarks/processors/run`**
  - **Description**: Transpiles and simulates the specified benchmark circuit (`qft_5`, `ghz_5`, `cross_conn_5`) on Processor A (5Q linear) and Processor B (9Q heavy-hex-inspired) in Qiskit Aer.
  - **Request Body**:
    ```json
    {
      "circuit_id": "qft_5",
      "shots": 4096,
      "optimization_level": 1,
      "seed": 42
    }
    ```
- **`GET /api/benchmarks/processors/latest`**
  - **Description**: Returns latest processor benchmark data.
- **`GET /api/benchmarks/processors/export`**
  - **Description**: Downloads `processor_ab_results.csv`.
- **`GET /api/benchmarks/processors/chart`**
  - **Description**: Serves the generated high-resolution comparison figure (`processor_ab_comparison.png`).

---

### 5. Consolidated Results & Reports
- **`GET /api/results/summary`**
  - **Description**: Returns hardware reproducibility metadata, status of both benchmark modules, and scientific integrity flags.
