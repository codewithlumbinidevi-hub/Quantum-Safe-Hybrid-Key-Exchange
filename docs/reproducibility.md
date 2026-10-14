# Q-SHIELD-PQC: Reproducibility & Benchmarking Guide

---

## 1. Quick Verification Command

To execute the automated unit and regression test suite across both cryptographic and architectural benchmark modules:

```bash
# From workspace root
python -m pytest backend/tests -v
```

This validates:
- Key pair generation and derivation for NIST P-256 ECDH.
- Encapsulation, decapsulation, and public-key loading for NIST FIPS 203 ML-KEM-768.
- Transcript-bound HKDF-SHA256 hybrid key agreement.
- Authenticated AES-256-GCM encryption/decryption.
- Fresh ephemeral session randomness and zero secret leakage.
- Benchmark mode execution (`hybrid`, `ecdh_only`, `mlkem_only`).
- Deterministic static-analysis rule suite and deduplication logic.

---

## 2. Running Automated Benchmarks via CLI

### 2.1 Smoke Benchmark (10 Iterations)
```bash
python -c "from backend.app.services.crypto_benchmark_service import CryptoBenchmarkService; res = CryptoBenchmarkService.run_benchmark(iterations=10, platform_profile='platform_a'); print('Smoke benchmark completed:', res['verification']['status'])"
```

### 2.2 Standard Benchmark (100 Iterations)
```bash
python -c "from backend.app.services.crypto_benchmark_service import CryptoBenchmarkService; res = CryptoBenchmarkService.run_benchmark(iterations=100, platform_profile='platform_a'); print('Mean handshake latency:', res['statistics']['total_handshake']['mean_ms'], 'ms')"
```

### 2.3 Constrained Benchmark (Platform B, 100 Iterations)
```bash
python -c "from backend.app.services.crypto_benchmark_service import CryptoBenchmarkService; res = CryptoBenchmarkService.run_benchmark(iterations=100, platform_profile='platform_b'); print('Platform B Mean latency:', res['statistics']['total_handshake']['mean_ms'], 'ms')"
```

---

## 3. Generated Artifacts & Integrity Verification

Each benchmark execution writes the following immutable artifacts under `results/`:
- `results/raw/run_<RUN_ID>.csv`: Raw per-trial measurements.
- `results/crypto/crypto_benchmark_trials.csv`: Most recent trial records.
- `results/crypto/crypto_benchmark_summary.csv`: Aggregated statistical metrics.
- `results/manifest.json`: Execution metadata, hardware specs, and configuration.
- `results/benchmark_results.json`: Full structured JSON export.
- `results/SHA256SUMS.txt`: SHA-256 cryptographic hashes for all generated files.

Verify checksums on Linux/macOS:
```bash
cd results && sha256sum -c SHA256SUMS.txt
```
On Windows PowerShell:
```powershell
Get-FileHash -Algorithm SHA256 results/crypto/crypto_benchmark_summary.csv
```
