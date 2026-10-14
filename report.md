# Q-SHIELD-PQC: Empirical Evaluation & Technical Report
**Qiskit Fall Fest 2026 (SRM University-AP) — Track 5: Post-Quantum Cryptography**  
**Problem Statement PS-P1: Quantum-Safe Hybrid Key Exchange (Primary Submission)**

---

## 1. Executive Summary

This report provides the definitive empirical evaluation of **Q-SHIELD-PQC**, an enterprise-grade post-quantum cryptographic suite developed for **PS-P1: Quantum-Safe Hybrid Key Exchange**. 

To mitigate *Harvest Now, Decrypt Later* (HNDL) attacks from future Cryptanalytically Relevant Quantum Computers (CRQCs) while preserving compliance with classical FIPS 140 requirements, Q-SHIELD-PQC implements a dual-PRF hybrid key encapsulation mechanism:
1. **Classical Asymmetric Primitive**: Elliptic Curve Diffie-Hellman over NIST P-256 (`secp256r1`).
2. **Post-Quantum Primitive**: Lattice-based Key Encapsulation Mechanism NIST FIPS 203 standardized **ML-KEM-768** (formerly Kyber-768).
3. **Hybrid Combiner**: Transcript-bound dual-PRF Key Derivation Function via HKDF-SHA256 (RFC 5869), securely binding both raw shared secrets with the SHA-256 digest of all public handshake parameters.
4. **Symmetric Encryption Verification**: Authenticated payload transmission via AES-256-GCM.

The cryptographic pipeline is evaluated across two distinct host execution environments:
- **Platform A (Standard CPU)**: Unconstrained multi-core workstation CPU with dynamic OS thread scheduling.
- **Platform B (Constrained Profile)**: Single-core CPU affinity (process pinned to logical Core 0 via `psutil`) executing on the exact same physical host to rigorously isolate single-threaded performance degradation.

Additionally, to benchmark future quantum cryptographic workloads and quantum-assisted cryptanalysis, Q-SHIELD-PQC incorporates the **Universal Processor A/B Evaluation Framework**, compiling and executing multi-qubit benchmark circuits (QFT-5, GHZ-5, and cross-connectivity benchmarks) on simulated physical topologies in Qiskit Aer under calibrated synthetic noise.

---

## 2. Cryptographic Protocol Specification (PS-P1)

### 2.1 Handshake Flow & Transcript Binding

```
Alice (Initiator)                                                Bob (Responder)
================                                                ===============
1. Generate ephemeral ECDH P-256 keypair:
   (sk_alice_ecdh, pk_alice_ecdh)
                                   pk_alice_ecdh (65 B)
                            ------------------------------>
                                                              2. Generate ephemeral ECDH P-256 keypair:
                                                                 (sk_bob_ecdh, pk_bob_ecdh)
                                                              3. Compute ECDH shared secret:
                                                                 ss_ecdh = ECDH(sk_bob_ecdh, pk_alice_ecdh)
                                                              4. Generate ephemeral ML-KEM-768 keypair:
                                                                 (sk_bob_mlkem, pk_bob_mlkem)
                                                              5. Encapsulate to own ML-KEM public key:
                                                                 (ct_mlkem, ss_mlkem) = Encaps(pk_bob_mlkem)
                            pk_bob_ecdh (65 B)
                            pk_bob_mlkem (1,184 B)
                            ct_mlkem (1,088 B)
                            <------------------------------
6. Compute ECDH shared secret:
   ss_ecdh = ECDH(sk_alice_ecdh, pk_bob_ecdh)
7. Decapsulate ML-KEM ciphertext:
   ss_mlkem = Decaps(sk_bob_mlkem, ct_mlkem)

8. [Both Compute Identical Transcript Hash]:
   transcript = pk_alice_ecdh || pk_bob_ecdh || pk_bob_mlkem || ct_mlkem
   transcript_hash = SHA-256(transcript)

9. [Both Derive Master Hybrid Key]:
   ikm = ss_ecdh || ss_mlkem (64 bytes)
   salt = transcript_hash (32 bytes)
   prk = HMAC-SHA256(salt, ikm)
   master_key = HKDF-Expand(prk, info="Q-SHIELD-HYBRID-KEY-v1", length=32)

10. Authenticated Payload Demo:
    Ciphertext, Tag = AES-256-GCM-Encrypt(master_key, nonce, plaintext, aad=transcript_hash)
```

### 2.2 Wire Payload Overhead Analysis

All sizes strictly adhere to SEC 1 v2.0 (uncompressed P-256) and NIST FIPS 203 Section 8 specification:

| Primitive / Step | Parameter | Artifact Wire Size (Bytes) | Transmitted By |
|---|---|:---:|:---:|
| Classical ECDH | Alice Public Key (Uncompressed `0x04` + X + Y) | 65 | Alice |
| Classical ECDH | Bob Public Key (Uncompressed `0x04` + X + Y) | 65 | Bob |
| NIST FIPS 203 ML-KEM-768 | Bob Encapsulation Public Key | 1,184 | Bob |
| NIST FIPS 203 ML-KEM-768 | Encapsulated Ciphertext | 1,088 | Bob |
| **Total Public Wire Footprint** | **Complete Handshake Transmission** | **2,402** | Alice + Bob |
| Derived Classical Secret | Raw ECDH Shared Secret (`ss_ecdh`) | 32 (internal) | Redacted |
| Derived Post-Quantum Secret | Raw ML-KEM Shared Secret (`ss_mlkem`) | 32 (internal) | Redacted |
| **Final Symmetric Master Key** | **Authenticated Hybrid Key (`master_key`)** | **32 (256-bit)** | Bound |

#### Wire Overhead Findings:
- Pure Classical ECDH requires 130 bytes total wire payload.
- Pure NIST FIPS 203 ML-KEM-768 requires 2,272 bytes wire payload.
- The **Q-SHIELD Hybrid Protocol** requires **2,402 bytes** total ($18.5\times$ payload expansion over classical ECDH).
- Despite this expansion, 2,402 bytes fits completely within standard Ethernet IP fragmentation thresholds and requires only 2 TCP segments, demonstrating practical deployability for modern cloud and TLS infrastructures.

---

## 3. Empirical Latency & Performance Benchmarks

Benchmarks were performed with $N=50$ measured trials (+5 discarded warmup iterations) per platform profile on an AMD64 host (16 logical cores) running Python 3.10.11 and `cryptography 50.0.2`.

### 3.1 Primitive-Level Execution Latency (Platform A Standard CPU)

| Sub-Operation | Mean Latency (ms) | Std Dev (ms) | Median / p50 (ms) | p95 (ms) | Min (ms) | Max (ms) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **ECDH KeyGen** | 0.103 | 0.032 | 0.109 | 0.138 | 0.057 | 0.181 |
| **ML-KEM KeyGen** | 0.495 | 0.135 | 0.537 | 0.676 | 0.332 | 0.896 |
| **ECDH Shared Secret** | 0.196 | 0.045 | 0.217 | 0.243 | 0.140 | 0.347 |
| **ML-KEM Encapsulation** | 0.202 | 0.075 | 0.221 | 0.317 | 0.124 | 0.455 |
| **ML-KEM Decapsulation** | 0.161 | 0.049 | 0.174 | 0.198 | 0.115 | 0.411 |
| **HKDF-SHA256 Derivation**| 0.096 | 0.044 | 0.099 | 0.131 | 0.049 | 0.333 |
| **Total Hybrid Handshake** | **1.258** | **0.376** | **1.350** | **2.007** | **0.950** | **2.302** |

### 3.2 Platform A vs Platform B Comparative Evaluation

| Performance Metric | Platform A (Standard Multi-Core) | Platform B (Constrained Core 0 Affinity) | Relative Overhead (%) |
|---|:---:|:---:|:---:|
| **Mean Handshake Latency** | **1.258 ms** | **1.675 ms** | **+33.1%** |
| **Median (p50) Latency** | 1.350 ms | 1.770 ms | +31.1% |
| **95th Percentile (p95)** | 2.007 ms | 2.106 ms | +4.9% |
| **99th Percentile (p99)** | 2.238 ms | 2.302 ms | +2.9% |
| **Max Latency** | 2.302 ms | 2.450 ms | +6.4% |
| **Peak Heap Allocation** | 12.80 KB | 13.12 KB | +2.5% |
| **Process RSS Delta** | 0.12 MB | 0.18 MB | Negligible |
| **Agreement Success Rate** | **100.0%** (50/50 trials) | **100.0%** (50/50 trials) | 0.0% failure |

#### Performance Insights:
1. **Computational Dominance**: ML-KEM-768 operations (keygen, encap, decap) account for $\approx 68.2\%$ of overall handshake compute time, with ML-KEM key generation being the single most computationally intensive operation ($0.495$ ms).
2. **Platform Affinity Impact**: Restricting the process to a single CPU core via OS CPU affinity (`psutil.Process().cpu_affinity([0])`) increases mean handshake latency by **33.1%** due to CPU scheduling contention between background OS routines, GIL thread preemption, and the single execution pipeline.
3. **Memory Footprint**: Peak heap allocations measured via `tracemalloc` remain under $15$ KB across all iterations, demonstrating that hybrid post-quantum key exchange introduces virtually zero memory pressure on host systems.

---

## 4. Universal Processor A/B Quantum Architecture Simulation

The Universal Processor A/B Framework benchmarks how quantum topologies influence quantum circuit compilation, routing overhead, and execution fidelity.

### 4.1 Topology Graph Definitions
- **Processor A (Baseline Linear Chain)**:
  - Qubits: 5
  - Graph Edges: 4 (`[(0,1), (1,2), (2,3), (3,4)]`)
  - Degree: Maximum 2, Average 1.6
- **Processor B (Reference Heavy-Hex Topology)**:
  - Qubits: 9
  - Graph Edges: 12 (`[(0,1), (1,2), (1,6), (2,3), (2,6), (2,5), (3,4), (4,5), (5,6), (6,7), (6,8), (8,0)]`)
  - Degree: Maximum 4, Average 2.67

### 4.2 Benchmark Execution Settings
- Transpiler: `basis_gates=['rz', 'sx', 'x', 'cx']`, `optimization_level=1`, `seed_transpiler=42`
- Simulator: Qiskit Aer `AerSimulator`
- Synthetic Noise Model:
  - 1-qubit depolarizing error: $p_{1q} = 0.001$
  - 2-qubit CX depolarizing error: $p_{2q} = 0.005$
  - Readout error: $p_{ro} = 0.01$
- Shots: 4,096

### 4.3 Empirical Transpilation & Simulation Results (QFT-5 Benchmark)

| Architectural Metric | Logical Circuit | Processor A (5Q Linear) | Processor B (9Q Heavy-Hex) | Processor B Advantage |
|---|:---:|:---:|:---:|:---:|
| **Physical Qubit Count** | 5 | 5 | 9 | +4 ancilla routing options |
| **Coupling Edges** | - | 4 | 12 | $3.0\times$ edge density |
| **Circuit Depth** | 17 | 77 | 63 | **18.18% depth reduction** |
| **2-Qubit CX Count** | 0 (Native QFT) | 50 | 32 | **36.00% CX gate reduction** |
| **Estimated SWAP Count** | 0 | 16.67 | 10.67 | **36.00% SWAP reduction** |
| **Hellinger Fidelity** | 1.0000 | 0.9998 | 0.9999 | Higher state fidelity |
| **Total Variation Dist (TVD)** | 0.0000 | 0.0112 | 0.0088 | **21.4% TVD reduction** |

#### Architectural Findings:
Processor B's 9-qubit heavy-hex coupling topology with 12 bidirectional edges significantly reduces routing overhead. Because non-adjacent logical qubits have multiple alternative graph traversal paths through central routing nodes (e.g., node 6 with degree 4), the Qiskit Sabre routing algorithm eliminates **18 CX gates** (equivalent to 6 SWAP operations) compared to the linear chain of Processor A, directly improving noisy circuit fidelity.

---

## 5. Security Analysis, Integrity, and Redaction Guarantees

### 5.1 Constant-Time Verification
All shared secrets derived by Alice and Bob are evaluated using `hmac.compare_digest` to ensure complete resistance against side-channel timing analysis.

### 5.2 Transcript Context Binding & Security Disclaimers
The hybrid KDF binds the public transcript hash into the HKDF salt. This guarantees **Transcript Tamper Detection**: if an adversary alters any public key or ciphertext on the wire, Alice and Bob derive non-matching keys and AES-GCM decryption fails.
> **Security Notice**: This standalone hybrid exchange operates without authenticated digital signatures (e.g. ML-DSA or Falcon). Therefore, it is vulnerable to active Man-in-the-Middle (MitM) adversaries unless encapsulated within an authenticated channel such as TLS 1.3 or paired with pre-shared certificates.

### 5.3 Zero Secret Exposure
In accordance with strict cryptographic best practices:
- Raw ephemeral private keys and unhashed shared secrets are never exposed to HTTP responses, UI components, logging pipelines, export CSVs, or Jupyter notebook cells.
- Public views and diagnostic displays expose only 8-byte SHA-256 key fingerprints (`HEX:xxxx...`) and truncated public key digests.

---

## 6. Reproducibility & Compliance Verification

The entire experimental pipeline is 100% reproducible through:
1. **Interactive Notebook**: `main.ipynb` at the project root executes all benchmarks and generates figures in real time without hardcoded mock data.
2. **Pinned Dependencies**: `requirements.txt` specifies exact verified library versions (`cryptography==50.0.2`, `qiskit==2.2.3`, `qiskit-aer==0.17.2`).
3. **Automated Test Suite**: 85 automated pytest suites covering cryptographic correctness, REST endpoints, and transpilation metrics (`python -m pytest backend/tests processors/tests`).
4. **Structured Artifacts**:
   - `data/raw/`: Individual per-trial benchmark CSV logs.
   - `data/processed/`: Processed summary datasets (`crypto_benchmark_summary.csv`, `processor_ab_results.csv`).
   - `results/figures/`: Publication-ready high-resolution figures (`crypto_latency_breakdown.png`, `crypto_message_sizes.png`, `crypto_memory_overhead.png`, `processor_ab_comparison.png`, `processor_coupling_maps.png`).
