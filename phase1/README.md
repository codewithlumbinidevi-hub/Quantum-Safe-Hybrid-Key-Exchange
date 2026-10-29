# Q-SHIELD-PQC: Quantum-Safe Hybrid Key Exchange & Universal Processor A/B Benchmarking

> **Phase 1 Frozen Submission Snapshot**: Submitted for Qiskit Fall Fest 2026 (SRM University-AP) — Track 5 (PS-P1). This directory contains the complete, self-contained Phase 1 submission and is frozen. All commands are executed from `phase1/`.

[![Qiskit](https://img.shields.io/badge/Qiskit-2.2.3-6929C4.svg?style=flat&logo=qiskit)](https://qiskit.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![NIST Standards](https://img.shields.io/badge/NIST%20PQC-FIPS%20203%20ML--KEM--768-963b43.svg?style=flat)](https://csrc.nist.gov/projects/post-quantum-cryptography)
[![Tests](https://img.shields.io/badge/pytest-85%20passed-3e9b70.svg?style=flat&logo=pytest)](https://pytest.org)
[![Track 5](https://img.shields.io/badge/Track%205-Post--Quantum%20Cryptography-963b43.svg?style=flat)](https://github.com/qiskit-community/qiskit-fall-fest-2026)
[![Problem Statement](https://img.shields.io/badge/Problem%20Statement-PS--P1%20(Primary%20Submission)-963b43.svg?style=flat)](https://github.com/qiskit-community/qiskit-fall-fest-2026)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Q-SHIELD-PQC** is an enterprise-grade post-quantum cryptographic suite and hardware simulation testbed engineered for **Qiskit Fall Fest 2026 — Track 5 (Post-Quantum Cryptography / Quantum-Safe Systems) — Problem Statement PS-P1 (Primary Submission)** at SRM University-AP.

The platform implements an end-to-end hybrid key encapsulation mechanism combining classical **NIST P-256 ECDH** with NIST-standardized **FIPS 203 ML-KEM-768**, evaluates real-world performance overheads (execution latency, wire message footprint, and heap memory) across standard multi-core (**Platform A**) vs single-core CPU-affinity constrained (**Platform B**) host execution environments, and validates quantum transpilation overhead using Qiskit Aer across a baseline linear chain (**Processor A**) vs a sparse heavy-hex topology (**Processor B**).

> **Scientific Integrity & Anti-Mock Guarantee:**  
> All cryptographic operations execute live via the standardized Python `cryptography` library (FIPS 203 ML-KEM-768 and SECP256R1 ECDH). All benchmark latencies, memory allocations, wire sizes, and quantum transpilation metrics are empirical observations measured in real time. **Zero mock values, zero synthetic latencies, and zero hardcoded metrics.**

---

## 🏛️ Project Architecture & Scope Boundaries

### Primary Submission Scope: PS-P1 (Quantum-Safe Hybrid Key Exchange)
1. **Classical Asymmetric Primitive**: ECDH over NIST P-256 (`secp256r1`) with uncompressed SEC 1 v2.0 point encoding (65 bytes).
2. **Post-Quantum Primitive**: NIST FIPS 203 standardized **ML-KEM-768** (1,184-byte encapsulation key, 1,088-byte ciphertext, 32-byte shared secret).
3. **Hybrid Combiner (KDF)**: RFC 5869 HKDF-SHA256 dual-PRF combiner binding both raw secrets with the SHA-256 digest of the entire public handshake transcript.
4. **Symmetric Encryption Demonstration**: Authenticated transmission using AES-256-GCM with associated data bound to the transcript digest.
5. **Platform A vs Platform B Evaluation**:
   - **Platform A**: Standard host CPU with all available cores and dynamic OS thread scheduling.
   - **Platform B**: Single-core CPU affinity (process pinned to logical Core 0 via `psutil`) executing on the exact same host to evaluate constrained single-threaded compute overhead.
6. **Universal Processor A/B Framework**: Qiskit Aer transpilation and noisy simulation comparing:
   - **Processor A**: 5-qubit linear chain (`[(0,1),(1,2),(2,3),(3,4)]`, 4 coupling edges).
   - **Processor B**: 9-qubit sparse heavy-hex topology (12 coupling edges).

### Auxiliary Non-Graded Extension: PS-P2 (Cryptographic Scanner)
The repository includes an auxiliary deterministic static-analysis scanner for cataloging quantum-vulnerable cryptography (RSA, DSA, DH, ECC). While functional and integrated into the frontend switcher pill, **PS-P1 is the sole primary submission statement evaluated for Phase 1.**

---

## 📂 Mandated Repository Structure

```
phase1/
├── README.md                      # Primary project overview, setup, and submission guide
├── main.ipynb                     # Reproducible end-to-end Jupyter execution notebook
├── requirements.txt               # Pinned dependencies with exact working versions
├── report.md                      # Comprehensive empirical technical report
├── LICENSE                        # Open-source MIT license
│
├── processors/                    # Universal Processor A/B definitions & simulation
│   ├── processor_A.json           # Self-describing 5Q linear chain topology & settings
│   ├── processor_B.json           # Self-describing 9Q heavy-hex topology & settings
│   ├── coupling_maps.py           # Topology graph loader and NetworkX builder
│   ├── circuits.py                # Quantum benchmark circuits (QFT-5, GHZ-5, Cross-Connectivity)
│   ├── noise_models.py            # Synthetic noise model (1q depol, 2q CX depol, readout error)
│   ├── transpilation.py           # Qiskit basis transpilation (opt_level=1, seed=42)
│   ├── benchmark.py               # Side-by-side transpilation and noisy Aer simulator
│   ├── metrics.py                 # Depth, CX overhead, SWAP estimation, Hellinger fidelity, TVD
│   ├── visualization.py           # Matplotlib processor comparison charts
│   └── tests/                     # Unit tests for quantum processor simulation
│
├── src/                           # Mandated core execution and benchmark modules
│   ├── __init__.py                # Package metadata, track info, problem statement
│   ├── problem.py                 # PS-P1 protocol execution (run_hybrid_handshake, run_crypto_benchmark)
│   ├── processors.py              # Topology loaders and noise model builders
│   ├── routing.py                 # Circuit transpilation and A/B runner
│   ├── metrics.py                 # Routing overhead, fidelity, latency statistics, payload calculations
│   └── visualization.py           # Matplotlib publication chart generators
│
├── data/                          # Benchmark empirical datasets
│   ├── raw/                       # Raw per-trial observation CSVs from benchmark runs
│   └── processed/                 # Processed summary datasets (crypto & processor summaries)
│
├── results/                       # Generated evaluation tables and publication figures
│   ├── tables/
│   │   ├── crypto_benchmark_summary.csv
│   │   └── processor_ab_results.csv
│   └── figures/
│       ├── crypto_latency_breakdown.png
│       ├── crypto_message_sizes.png
│       ├── crypto_memory_overhead.png
│       ├── processor_ab_comparison.png
│       └── processor_coupling_maps.png
│
├── assets/                        # Static presentation assets and mirrored figures
│   ├── crypto_latency_breakdown.png
│   ├── crypto_message_sizes.png
│   ├── crypto_memory_overhead.png
│   ├── processor_ab_comparison.png
│   └── processor_coupling_maps.png
│
├── backend/                       # Production FastAPI backend application
│   ├── app/
│   │   ├── main.py                # FastAPI entry point, CORS, and route registration
│   │   ├── config.py              # Central application paths and configuration
│   │   ├── api/                   # REST endpoints (health, hybrid_exchange, benchmarks, export)
│   │   ├── schemas/               # Pydantic validation schemas
│   │   ├── services/              # Cryptographic engines (ECDH, ML-KEM, HKDF, benchmarks)
│   │   └── utils/                 # Authenticated AES-GCM encryption helpers
│   └── tests/                     # 85 automated pytest suites covering all services & routes
│
└── frontend/                      # React 18 + TypeScript + Vite Cyber Dashboard
    ├── src/
    │   ├── pages/pqc/             # PS-P1 Dedicated Research Dashboard pages (Warm Ivory & Maroon)
    │   ├── pages/scanner/         # PS-P2 Auxiliary Scanner pages
    │   ├── services/api.ts        # Axios API client connecting to FastAPI backend
    │   └── styles/index.css       # Unified design tokens, responsive typography, custom animations
    ├── vite.config.ts             # Reverse proxy configuration (/api -> http://127.0.0.1:8000)
    └── package.json               # Frontend dependencies and build scripts
```

---

## ⚡ Quickstart: Setup & Execution

### 1. Prerequisites
- **Python**: 3.10+ (Tested on Python 3.10.11 and 3.12)
- **Node.js**: v18+ (Tested on Node.js v24.14)
- **Git**

### 2. Environment Setup
```powershell
# Clone repository
git clone https://github.com/your-username/qff26.git
cd qff26/phase1

# Install pinned Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Run Automated Pytest Suite (85 Tests)
```powershell
python -m pytest backend/tests processors/tests -v
```
All **85 tests** pass with 100% success covering:
- ECDH P-256 key agreement and SEC1 serialization
- NIST FIPS 203 ML-KEM-768 keygen, encapsulation, decapsulation, and exact byte sizes
- HKDF-SHA256 dual-PRF derivation and transcript tamper detection
- Platform A vs Platform B CPU affinity pinning and restoration
- Zero secret leakage in API payloads and exports
- Processor A & B topology loading, Sabre routing, and noisy Aer execution

### 4. Execute Reproducible Jupyter Notebook
```powershell
# Execute notebook top-to-bottom and update in place
python -m nbconvert --to notebook --execute main.ipynb --inplace
```
The notebook executes end-to-end in ~15 seconds without mock data and embeds all generated comparison figures directly into the document.

### 5. Launch Full-Stack Application
```powershell
# Terminal 1: Launch FastAPI Backend (Port 8000)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

# Terminal 2: Launch Vite Frontend (Port 5173)
cd frontend
npm run dev
```
- **Web Dashboard**: `http://localhost:5173`
- **Swagger API Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/health`

---

## 📊 Empirical Evaluation & Key Results

### 1. Public Wire Footprint (FIPS 203 + SECP256R1)
| Artifact / Primitive | Public Wire Size | Classical Pure ECDH | NIST Pure ML-KEM-768 | Q-SHIELD Hybrid Protocol |
|---|:---:|:---:|:---:|:---:|
| Alice ECDH PK | 65 Bytes | 65 Bytes | 0 Bytes | **65 Bytes** |
| Bob ECDH PK | 65 Bytes | 65 Bytes | 0 Bytes | **65 Bytes** |
| Bob ML-KEM PK | 1,184 Bytes | 0 Bytes | 1,184 Bytes | **1,184 Bytes** |
| Bob ML-KEM Ciphertext | 1,088 Bytes | 0 Bytes | 1,088 Bytes | **1,088 Bytes** |
| **Total Wire Payload** | - | **130 Bytes** | **2,272 Bytes** | **2,402 Bytes** |
| Final Shared Key | 32 Bytes | 32 Bytes | 32 Bytes | **32 Bytes (256-bit)** |

> **Payload Overhead**: The hybrid exchange incurs an $18.5	imes$ payload expansion over classical ECDH ($2,402$ bytes vs $130$ bytes). This fits easily within two standard TCP packets and standard Ethernet MTU frames.

### 2. Execution Latency Profiles (N=200 Trials, AMD64 16-Core Host)
| Operation / Primitive | Platform A Mean +/- 95% CI (ms) | Platform A p95 (ms) | Platform B Mean +/- 95% CI (ms) | Platform B p95 (ms) | Observed Delta (ms) |
|---|:---:|:---:|:---:|:---:|:---:|
| ECDH KeyGen (secp256r1) | 0.089 +/- 0.005 | 0.142 | 0.087 +/- 0.017 | 0.139 | -0.002 |
| ML-KEM KeyGen (FIPS 203) | 0.438 +/- 0.016 | 0.613 | 0.405 +/- 0.036 | 0.613 | -0.033 |
| ECDH Shared Secret (secp256r1) | 0.182 +/- 0.007 | 0.255 | 0.173 +/- 0.019 | 0.238 | -0.010 |
| ML-KEM Encapsulation (FIPS 203) | 0.168 +/- 0.007 | 0.248 | 0.154 +/- 0.018 | 0.242 | -0.013 |
| ML-KEM Decapsulation (FIPS 203) | 0.147 +/- 0.006 | 0.211 | 0.154 +/- 0.045 | 0.198 | +0.006 |
| Hybrid HKDF-SHA256 Derivation | 0.072 +/- 0.006 | 0.115 | 0.110 +/- 0.071 | 0.112 | +0.039 |
| **Total Hybrid Handshake Latency** | 1.414 +/- 0.054 | 2.030 | 1.389 +/- 0.134 | 2.859 | -0.025 |

*Platform Comparison Summary*:
- **Platform A Mean**: 1.414 +/- 0.054 ms (p95: 2.030 ms)
- **Platform B Mean**: 1.389 +/- 0.134 ms (p95: 2.859 ms)
- *Observed Latency Delta*: Mean execution latency exhibits statistical parity (-1.8%), while Platform B single-core affinity exhibits increased tail latency variance (p95: 2.859 ms vs 2.030 ms) due to localized interrupt contention on Core 0.

### 3. Quantum Architecture Routing Comparison (Qiskit Aer, 4096 Shots)
| Benchmark Circuit | Processor | Physical Qubits | Coupling Edges | Logical Basis CX | Transpiled CX | CX Routing Overhead | Routing SWAPs | Transpiled Depth | Hellinger Fidelity | Shot-Noise Floor | Topology Discrimination |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **QFT_5** | Processor A | 4 | 4 | 26 | 50 | 24 | 8 | 77 | 0.9998 | 0.9956 | Yes (Routing depth/CX) |
| **QFT_5** | Processor B | 9 | 12 | 26 | 32 | 6 | 2 | 63 | 0.9999 | 0.9956 | Yes (Routing depth/CX) |
| **GHZ_5** | Processor A | 4 | 4 | 4 | 4 | 0 | 0 | 8 | 0.9397 | 0.9996 | No (Linear nearest-neighbor) |
| **GHZ_5** | Processor B | 9 | 12 | 4 | 4 | 0 | 0 | 8 | 0.9397 | 0.9996 | No (Linear nearest-neighbor) |
| **CROSS_CONN_5** | Processor A | 4 | 4 | 12 | 18 | 6 | 2 | 22 | 0.9999 | 0.9956 | Yes (Alternative routing paths) |
| **CROSS_CONN_5** | Processor B | 9 | 12 | 12 | 12 | 0 | 0 | 16 | 0.9998 | 0.9956 | Yes (Alternative routing paths) |

---

## 🔒 Security Guarantees & Cryptographic Redaction

1. **Constant-Time Operations**: Shared secret equality checks utilize `hmac.compare_digest` to prevent timing side-channel leakage.
2. **Transcript Tamper Detection**: Both parties hash all 4 public handshake artifacts (`pk_alice_ecdh`, `pk_bob_ecdh`, `pk_bob_mlkem`, `ct_mlkem`) into the HKDF salt. Any alteration by an active attacker produces mismatched symmetric keys and immediate AES-GCM authentication failure.
3. **Honest Protocol Framing**: Standalone unauthenticated key exchange does not provide identity authentication. In production, this hybrid mechanism must be combined with digital signatures (e.g. ML-DSA) or deployed inside TLS 1.3 to prevent active Man-in-the-Middle attacks.
4. **Zero Secret Exposure**: Raw ephemeral private keys and intermediate unhashed secrets are never returned in HTTP JSON payloads, logged in terminal streams, or saved into CSV exports. Only truncated 8-byte SHA-256 fingerprints are displayed for verification.

---

## 📜 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
