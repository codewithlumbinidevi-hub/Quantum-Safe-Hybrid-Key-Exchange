# Q-SHIELD — PS-P1: Quantum-Safe Secure Communication Channel

**Team:** Q-SHIELD  
**Problem statement:** PS-P1 — Quantum-Safe Secure Communication Channel  
**Phase 1 work reused:** Yes (Phase 1 hybrid implementation is preserved in `phase1/`). Note: `phase1/` differs from the original Phase 1 submission only by the complete removal of the PS-P2 scanner, referencing tag `phase1-submitted` for the byte-exact original submission state.

> [!IMPORTANT]
> **One-Command Mandatory Security Test Suite (T1–T9)**:
> ```bash
> python run_security_tests.py
> ```
> *(Definitions: [`SECURITY_TESTS.md`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/SECURITY_TESTS.md) | Logged Outcomes: [`results/security_tests.csv`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/results/security_tests.csv))*

---

## 1. Summary

Q-SHIELD PS-P1 implements an end-to-end authenticated, confidential, and replay-protected quantum-safe communication channel between Alice (Initiator) and Bob (Responder). Built using vetted, standardized primitives—**ML-KEM-768** (NIST FIPS 203) for post-quantum key establishment, **ML-DSA-65** (NIST FIPS 204) for post-quantum mutual authentication, **HKDF-SHA256** (RFC 5869) for directional key derivation, and **AES-256-GCM** (NIST SP 800-38D) for chunked authenticated encryption—the system binds endpoint identities, protocol versions, algorithm choices, and all ephemeral key material into a canonical session transcript. An identical Classical Baseline (**X25519 + Ed25519**) operates behind the exact same interface and wire format, providing an empirical benchmark that demonstrates a $28.35\times$ handshake wire byte expansion and a 2.05$\times$ local latency overhead on Platform A. The complete mandatory test suite (**T1–T9**) passes with 100% automated fault injection validation, zero plaintext release upon tampering, and byte-exact verification of all official payloads (1 KB, 100 KB, 10 MB).

> [!NOTE]
> **Prototype Statement**: This software is an academic hackathon prototype engineered for Qiskit Fall Fest 2026. It is not intended for commercial production cryptographic deployment without formal verification and production side-channel hardened hardware enclaves.

---

## 2. Setup — Exact Windows Steps

```powershell
# 1. Clone repository and navigate to root
git clone <repo-url>
cd qff26

# 2. Create and activate a fresh Python virtual environment (Python 3.10 - 3.13)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 3. Install pinned dependencies
python -m pip install -r requirements.txt

# 4. Verify environment (must print READY)
python common/env_check.py
```

---

## 3. Reproduce the Principal Results — Exact Commands

All results, CSVs, and visualization figures can be regenerated from scratch with these exact commands:

```powershell
# 1. Generate the three official payloads (1 KB, 100 KB, 10 MB) and verify official SHA-256 hashes
python gen_payloads.py

# 2. Run the one-command mandatory security test suite (T1 - T9 for PQC and Classical)
python run_security_tests.py
# (Alternative: pytest tests/test_security.py -v)

# 3. Run the performance benchmarks (N=100 trials in-process, N=100 trials TCP loopback, payload benchmarks)
python benchmark_channel.py

# 4. Run Platform D constrained WAN emulation (N=100, 50ms RTT, 1 Mbps bandwidth)
python measure_platform_d.py

# 5. Generate all publication figures (saved to results/figures/)
python plot_results.py

# 6. Execute automated mathematical provenance and parity verifier
python tools/verify_results.py

# 7. (Optional) Run Platform B constrained profile (1 core, 128 MB budget - approximation on Windows)
python common/run_on_platform.py --platform B -- python benchmark_channel.py

# 8. Regenerate checksums and manifest
python generate_manifest.py
```

---

## 4. How to Start the Unified Web UI

Q-SHIELD includes an interactive dashboard featuring a live handshake inspector, the Security Suite & Attack Lab (interactive live fault injection across 11 adversary scenarios), and the Performance Evaluation page:

```powershell
# In Terminal 1: Start FastAPI backend service (from repository root)
cd phase1/backend
uvicorn app.main:app --port 8000

# In Terminal 2: Start React/Vite frontend (from repository root)
cd phase1/frontend
npm run dev

# Open browser at: http://localhost:5173
```

---

## 5. Repository Layout

```
qff26/
|-- channel/                    # Core Phase 2 Quantum-Safe Secure Channel Protocol
|   |-- handshake.py            # 3-flight mutual authentication handshake engine
|   |-- suite.py                # ML-KEM-768, ML-DSA-65, X25519, Ed25519, HKDF, AES-GCM
|   |-- record.py               # 64 KB chunked AES-256-GCM record layer with monotonic counters
|   |-- transcript.py           # Cumulative SHA-256 transcript binding accumulator
|   `-- wire.py                 # Binary TLV framing (Magic b"QSC1")
|-- common/                     # Official challenge kit environment and platform tools
|   |-- env_check.py            # Environment validation
|   |-- measure.py              # High-resolution monotonic timing & Type 7 quantile stats
|   `-- run_on_platform.py      # Platform A / Platform B executor
|-- docs/                       # Architectural & methodological documentation
|   |-- BENCHMARK_METHOD.md     # In-depth timer boundaries, quartile formulas, symmetry audit
|   `-- AUDIT_PHASE2.md         # Read-only audit report
|-- payloads/                   # Official challenge payloads (1 KB, 100 KB, 10 MB)
|-- results/                    # Generated CSVs, raw trial logs, figures, SHA256SUMS
|-- tests/                      # Pytest automated test suite (29/29 passed)
|-- tools/                      # Automated verification and provenance tools
|   `-- verify_results.py       # Recomputes stats from raw CSVs; checks API & formula parity
|-- phase1/                     # Preserved legacy Phase 1 submission (PS-P2 scanner removed)
|-- benchmark_channel.py        # Comprehensive performance benchmark runner (N=100)
|-- measure_platform_d.py       # Platform D WAN emulation runner (N=100)
|-- run_security_tests.py       # One-command mandatory test runner (T1–T9)
|-- SECURITY_TESTS.md           # Mandatory security test specifications
|-- SUBMISSION_CHECKLIST.md     # Verified hackathon submission checklist
`-- report.md                   # Comprehensive technical report
```

---

## 6. Results: Benchmark Summary

### 6.1 Handshake Latency and Wire Bytes ($N=100$ Trials Each)
From [`results/handshake_results.csv`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/results/handshake_results.csv) and [`results/platform_D_results.csv`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/results/platform_D_results.csv):

| Metric | Classical Baseline (`0x0002`) | PQC Suite (`0x0001`) | PQC / Classical Trade-off |
|---|---|---|---|
| **Handshake Latency (`local (in-process)`, Median)** | 2.32 ms (IQR 4.40 ms) | 4.75 ms (IQR 2.48 ms) | 2.05$\times$ slower |
| **Handshake Latency (`local (TCP loopback)`, Median)** | 1.91 ms (IQR 0.28 ms) | 5.52 ms (IQR 2.40 ms) | 2.89$\times$ slower |
| **Handshake Latency (`emulated link (local, throttled)`, Median)** | 100.06 ms (IQR 3.83 ms) | 177.20 ms (IQR 14.28 ms) | +77.14 ms penalty |
| **ClientHello Wire Bytes** | 90 B | 1,242 B | $13.8\times$ expansion |
| **ServerHello Wire Bytes** | 151 B | 4,452 B | $29.5\times$ expansion |
| **ClientAuth Wire Bytes** | 77 B | 3,322 B | $43.1\times$ expansion |
| **Total Handshake Bytes on Wire** | **318 B** | **9,016 B** | **$28.35\times$ expansion** |

### 6.2 Official Payloads Processing (AES-256-GCM Streaming, $N=100$)
From [`results/payload_results.csv`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/results/payload_results.csv):

| Payload | Size | Chunks (64 KB) | Overhead Bytes | Median Encrypt | Median Decrypt | Throughput | SHA-256 Match |
|---|---|---|---|---|---|---|---|
| `payload_1KB.bin` | 1,024 B | 1 | 38 B | 0.007 ms | 0.007 ms | >147 MB/s | **MATCH** |
| `payload_100KB.bin` | 102,400 B | 2 | 76 B | 0.064 ms | 0.058 ms | >1525 MB/s | **MATCH** |
| `payload_10MB.bin` | 10,485,760 B | 160 | 6,080 B | 15.789 ms | 19.725 ms | >633 MB/s | **MATCH** |

---

## 7. Platforms Used

| Platform | Machine / Profile | Evidence File |
|---|---|---|
| **A (Required)** | Intel Core i5-1335U (16 logical cores @ 2.60 GHz), 16 GB RAM, Windows 11 / Windows 10 x64 | [`platform_A_info.json`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/platform_A_info.json) |
| **B (Constrained)** | 1 CPU core pinned, single-threaded libraries, 128 MB RAM budget (labeled *approximation* on Windows) | [`platform_runs.jsonl`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/platform_runs.jsonl) |
| **D (Constrained WAN)** | 50ms RTT (25ms one-way latency), 1 Mbps bandwidth cap via `measure_platform_d.py` | [`platform_D.md`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/platform_D.md) |

---

## 8. Libraries and Versions

No cryptographic primitives are self-implemented. All algorithms use standardized, vetted libraries:
- **`cryptography==50.0.2`**:
  - `MLKEM768PrivateKey` / `MLKEM768PublicKey` (NIST FIPS 203)
  - `MLDSA65PrivateKey` / `MLDSA65PublicKey` (NIST FIPS 204 with context `b"QFF-SECCHAN-v1"`)
  - `X25519PrivateKey` / `X25519PublicKey` (RFC 7748)
  - `Ed25519PrivateKey` / `Ed25519PublicKey` (RFC 8032)
  - `HKDF` with `hashes.SHA256()` (RFC 5869)
  - `AESGCM` 256-bit (NIST SP 800-38D)
- **`pqcrypto==1.0.0`**: Installed for environment interoperability self-tests.
- **`psutil==7.2.2`**: Platform profiling and memory budget tracking.
- **`pytest==9.1.1`**: Automated security test execution.
- **`matplotlib==3.9.0`**, **`pandas==2.2.3`**, **`numpy==1.26.4`**: Data processing and plotting.
