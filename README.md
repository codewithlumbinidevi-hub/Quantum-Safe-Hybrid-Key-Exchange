# Q-SHIELD — PS-P1: Quantum-Safe Secure Communication Channel

**Team:** Q-SHIELD  
**Problem statement:** PS-P1 — Quantum-Safe Secure Communication Channel  
**Phase 1 work reused:** Yes (cryptographic wrapping patterns for NIST FIPS 203 ML-KEM-768 and AES-256-GCM; Phase 1 hybrid legacy code is preserved in `phase1/` with 79 passing regression tests).

---

## 1. Summary

Q-SHIELD PS-P1 implements an end-to-end authenticated, confidential, and replay-protected quantum-safe communication channel between Alice (Initiator) and Bob (Responder). Built using vetted, standardized primitives—**ML-KEM-768** (FIPS 203) for post-quantum key establishment, **ML-DSA-65** (FIPS 204) for post-quantum mutual authentication, **HKDF-SHA256** (RFC 5869) for directional key derivation, and **AES-256-GCM** (NIST SP 800-38D) for chunked authenticated encryption—the system binds endpoint identities, protocol versions, algorithm choices, and all ephemeral key material into a canonical session transcript. An identical Classical Baseline (**X25519 + Ed25519**) operates behind the exact same interface and wire format, providing an empirical benchmark that demonstrates a $28.35\times$ handshake wire byte expansion and a $4.81\times$ local latency overhead on Platform A. The complete mandatory test suite (**T1–T9**) passes with 100% automated fault injection validation, zero plaintext release upon tampering, and byte-exact verification of all official payloads (1 KB, 100 KB, 10 MB).

> [!IMPORTANT]
> **Prototype Statement**: This software is an academic hackathon prototype engineered for Qiskit Fall Fest 2026. It is not intended for production cryptographic deployment without formal verification and production side-channel hardened hardware enclaves.

---

## 2. Setup — Exact Steps

```bash
# 1. Clone repository and navigate to root
git clone <repo-url>
cd qff26

# 2. Create and activate a fresh Python virtual environment (Python 3.10 - 3.13)
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# 3. Install pinned dependencies
python -m pip install -r requirements.txt

# 4. Verify environment (must print READY)
python common/env_check.py
```

---

## 3. Reproduce the Principal Results — Exact Commands

All results, CSVs, and visualization figures can be regenerated from scratch with these exact commands:

```bash
# 1. Generate the three official payloads (1 KB, 100 KB, 10 MB) and verify official SHA-256 hashes
python P1_secure_channel/gen_payloads.py

# 2. Run the one-command mandatory security test suite (T1 - T9 for PQC and Classical)
python P1_secure_channel/run_security_tests.py
# (Alternative: pytest P1_secure_channel/tests -v)

# 3. Run the performance benchmarks (100 trials in-process, 20 trials TCP loopback, payload benchmarks)
python P1_secure_channel/benchmark_channel.py

# 4. Generate all publication figures (saved to P1_secure_channel/results/figures/)
python P1_secure_channel/plot_results.py

# 5. Execute provenance check (verifies all reported metrics match raw per-trial CSVs with zero error)
python P1_secure_channel/provenance_check.py

# 6. (Optional) Run Platform B constrained profile (1 core, 128 MB budget)
python common/run_on_platform.py --platform B -- python P1_secure_channel/benchmark_channel.py

# 7. (Optional) Run Platform D constrained WAN emulation (50ms RTT, 1 Mbps bandwidth)
python P1_secure_channel/measure_platform_d.py

# 8. Regenerate checksums and manifest
python P1_secure_channel/generate_manifest.py
```

**Expected run time on Platform A**: $\approx 1.5$ minutes total for all tests, 240+ handshake trials, and full payload transfers.

---

## 4. Platforms Used

| Platform | Machine / Profile | Evidence File |
|---|---|---|
| **A (Required)** | Intel Core i5-1335U (12 physical / 16 logical cores @ 2.60 GHz), 16 GB RAM, Windows 10 x64 | [`platform_A_info.json`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/platform_A_info.json) |
| **B (Constrained)** | 1 CPU core pinned, single-threaded libraries, 128 MB RAM budget applied via `run_on_platform.py` | [`platform_runs.jsonl`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/platform_runs.jsonl) |
| **D (Constrained WAN)** | 50ms RTT (25ms one-way latency), 1 Mbps bandwidth cap via `measure_platform_d.py` | [`platform_D.md`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/platform_D.md) |

---

## 5. Libraries and Versions

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

---

## 6. Tests: Mandatory Security Suite (T1–T9)

Run command: `python P1_secure_channel/run_security_tests.py`  
Recorded results: [`P1_secure_channel/results/security_tests.csv`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/P1_secure_channel/results/security_tests.csv)

| ID | Test Name | Injected Fault | Expected Result | Observed Behavior | Status |
|---|---|---|---|---|---|
| **T1** | Honest Run | None | Handshake OK + payloads decrypt byte-exact | Handshake completed, identical keys derived, 1 KB / 100 KB / 10 MB payloads decrypt with SHA-256 match | **PASS** |
| **T2** | Handshake Tampering | Bit flip in KEM ciphertext & random | Handshake aborts | Clean abort via `HandshakeError` / `SignatureError`; no traffic keys derived | **PASS** |
| **T3** | Signature Tampering | Bit flip in ML-DSA/Ed25519 signature | Rejected with signature error | Rejected with `SignatureError: Digital signature verification failed` | **PASS** |
| **T4** | Ciphertext Tampering | Bit flip in record ciphertext | `InvalidTag`; plaintext withheld | `InvalidTagError` raised immediately; plaintext never released | **PASS** |
| **T5** | Tag / AAD Tampering | Modified GCM tag or 13-byte header | `InvalidTag` | `InvalidTagError` raised on tag and AAD header tampering | **PASS** |
| **T6** | Untrusted Identity | Attacker generates valid keypair & signature | Rejected against trust anchor | Rejected with `UntrustedIdentityError`; unauthenticated keys rejected | **PASS** |
| **T7** | Identity Swap | Signature reused in session naming another peer | Rejected via transcript binding | Rejected with `SignatureError` because transcript binds peer names | **PASS** |
| **T8** | Replay Protection | Resent record / old handshake flight | Rejected (sequence numbers & fresh nonces) | Record replay raises `SequenceNumberError`; old handshake raises `SignatureError` | **PASS** |
| **T9** | Algorithm Downgrade | Mutated suite ID in transcript | Rejected | Rejected with `DowngradeError`; suite ID bound to signed transcript | **PASS** |

---

## 7. Results: Benchmark Summary & Visualizations

### 7.1 Handshake Latency and Wire Bytes
From [`P1_secure_channel/results/handshake_results.csv`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/P1_secure_channel/results/handshake_results.csv):

| Metric | Classical Baseline (`0x0002`) | PQC Suite (`0x0001`) | PQC / Classical Trade-off |
|---|---|---|---|
| **Handshake Latency (In-Process, Median)** | 1.44 ms (IQR 2.09 ms) | 6.64 ms (IQR 4.25 ms) | $4.60\times$ slower |
| **Handshake Latency (TCP Loopback, Median)** | 2.36 ms (IQR 0.61 ms) | 8.55 ms (IQR 4.52 ms) | $3.62\times$ slower |
| **Handshake Latency (Platform D WAN 50ms RTT)** | 99.72 ms (IQR 3.17 ms) | 181.68 ms (IQR 7.73 ms) | $+81.96\text{ ms}$ penalty |
| **ClientHello Wire Bytes** | 90 B | 1,242 B | $13.8\times$ expansion |
| **ServerHello Wire Bytes** | 151 B | 4,452 B | $29.5\times$ expansion |
| **ClientAuth Wire Bytes** | 77 B | 3,322 B | $43.1\times$ expansion |
| **Total Handshake Bytes on Wire** | **318 B** | **9,016 B** | **$28.35\times$ expansion** |

### 7.2 Official Payloads Processing (AES-256-GCM Streaming)
From [`P1_secure_channel/results/payload_results.csv`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/P1_secure_channel/results/payload_results.csv):

| Payload | Size | Chunks (64 KB) | Overhead Bytes | Median Encrypt | Median Decrypt | Throughput | SHA-256 Match |
|---|---|---|---|---|---|---|---|
| `payload_1KB.bin` | 1,024 B | 1 | 38 B | 0.007 ms | 0.007 ms | >140 MB/s | **MATCH** |
| `payload_100KB.bin` | 102,400 B | 2 | 76 B | 0.086 ms | 0.078 ms | >1,100 MB/s | **MATCH** |
| `payload_10MB.bin` | 10,485,760 B | 160 | 6,080 B | 20.85 ms | 24.10 ms | >415 MB/s | **MATCH** |

### 7.3 Visualization Figures
- Handshake Latency Comparison: [`P1_secure_channel/results/figures/handshake_latency_comparison.png`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/P1_secure_channel/results/figures/handshake_latency_comparison.png)
- Wire Bytes Breakdown: [`P1_secure_channel/results/figures/wire_bytes_breakdown.png`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/P1_secure_channel/results/figures/wire_bytes_breakdown.png)
- Primitive Breakdown: [`P1_secure_channel/results/figures/primitive_microbenchmarks.png`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/P1_secure_channel/results/figures/primitive_microbenchmarks.png)
- Payload Streaming Throughput: [`P1_secure_channel/results/figures/payload_throughput.png`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/P1_secure_channel/results/figures/payload_throughput.png)
- Platform D WAN Comparison: [`P1_secure_channel/results/figures/platform_D_comparison.png`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/P1_secure_channel/results/figures/platform_D_comparison.png)

---

## 8. Baseline Used

The classical baseline implements an identical 3-flight mutual authentication message flow, framing, and transcript accumulator using:
- **X25519** (RFC 7748) for Diffie-Hellman key agreement.
- **Ed25519** (RFC 8032) for digital signatures.
- **HKDF-SHA256** (RFC 5869) and **AES-256-GCM** (SP 800-38D).
Configured via `suite_id = 0x0002` behind the identical `CipherSuite` abstraction.

---

## 9. Known Limitations

1. **Prototype Disclaimer**: Built as an academic hackathon prototype for Qiskit Fall Fest 2026.
2. **Trust Distribution**: Operates via out-of-band pinned trust anchors rather than an automated X.509 PKI certificate chain parser.
3. **Stateless Handshake Replay Boundary**: Handshake replay protection is enforced via ephemeral nonces bound into the transcript; stateless server implementations do not persist across process reboots.
4. **Side-Channel Hardening**: While primitives in `cryptography` provide constant-time core operations, high-level Python framing is not hardened against physical side-channel attacks.
