# Q-SHIELD-PQC System Architecture

## 1. System Overview

**Q-SHIELD-PQC** is an enterprise-grade hybrid post-quantum key exchange benchmarking and quantum processor architecture simulation platform built for the **Qiskit Fall Fest 2026 (PS-P1)**.

The system is organized into two distinct, scientifically separated engineering domains:
1. **Classical Hybrid Post-Quantum Key Agreement**: Combining NIST P-256 Elliptic Curve Diffie-Hellman (ECDH) with NIST FIPS 203 standardized ML-KEM-768 via HKDF-SHA256.
2. **Quantum Processor Architecture Transpilation & Simulation**: Benchmarking topological routing overhead, SWAP gate penalties, and synthetic noise fidelity between Processor A (5 qubits, linear) and Processor B (9 qubits, heavy-hex-inspired) in Qiskit.

---

## 2. Scientific Distinction

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Q-SHIELD-PQC ARCHITECTURAL DOMAINS                   │
├───────────────────────────────────┬────────────────────────────────────┤
│   Domain 1: Cryptographic Engine  │   Domain 2: Quantum Transpiler     │
│   (Classical CPU Execution)       │   (Qiskit Circuit Simulation)      │
├───────────────────────────────────┼────────────────────────────────────┤
│ • NIST P-256 ECDH                 │ • Processor A (5Q Linear)          │
│ • NIST FIPS 203 ML-KEM-768        │ • Processor B (9Q Heavy-Hex)       │
│ • HKDF-SHA256 Transcript Binding  │ • Basis Gates: ['rz','sx','x','cx']│
│ • AES-256-GCM Session Demo        │ • Synthetic Noise: 1Q, 2Q, Readout │
│ • Platform A vs B (CPU Affinity)  │ • Hellinger Fidelity & TVD Metric  │
└───────────────────────────────────┴────────────────────────────────────┘
```

> **IMPORTANT**: Classical cryptographic algorithms (ECDH and ML-KEM) execute exclusively on physical CPU hardware. They do **not** run on simulated quantum circuits. The Qiskit module benchmarks physical quantum circuit topologies independently under the Fall Fest Phase 1 guide.

---

## 3. Cryptographic Hybrid Key Agreement Protocol

### Protocol Execution Flow

```
Alice (Initiator)                                            Bob (Responder)
=================                                            ===============
1. Generate ephemeral ECDH keypair
   (sk_A_ec, pk_A_ec)

                                     pk_A_ec (65B)
                         ─────────────────────────────────────►

                                                         2. Generate ephemeral ECDH keypair
                                                            (sk_B_ec, pk_B_ec)
                                                         3. Generate ephemeral ML-KEM keypair
                                                            (sk_B_ml, pk_B_ml)
                                                         4. Derive ECDH Shared Secret:
                                                            ss_B_ec = ECDH(sk_B_ec, pk_A_ec)

                                pk_B_ec (65B), pk_B_ml (1184B)
                         ◄─────────────────────────────────────

5. Derive ECDH Shared Secret:
   ss_A_ec = ECDH(sk_A_ec, pk_B_ec)
6. Encapsulate to Bob's ML-KEM PK:
   (ss_A_ml, ct_ml) = Encap(pk_B_ml)

                                   ct_ml (1088B)
                         ─────────────────────────────────────►

                                                         7. Decapsulate ML-KEM Ciphertext:
                                                            ss_B_ml = Decap(sk_B_ml, ct_ml)

8. Compute Handshake Transcript Hash:                     8. Compute Handshake Transcript Hash:
   Transcript = Hash(pk_A_ec || pk_B_ec ||                   Transcript = Hash(pk_A_ec || pk_B_ec ||
                     pk_B_ml || ct_ml)                                         pk_B_ml || ct_ml)

9. Derive Final Hybrid Key:                               9. Derive Final Hybrid Key:
   K_hybrid = HKDF-SHA256(                                   K_hybrid = HKDF-SHA256(
     IKM = ss_A_ec || ss_A_ml,                                 IKM = ss_B_ec || ss_B_ml,
     Salt = H("Q-SHIELD-PQC-SALT-v1"),                         Salt = H("Q-SHIELD-PQC-SALT-v1"),
     Info = Context || Transcript                              Info = Context || Transcript
   )                                                         )

10. Keys Match Verified:                                  10. Keys Match Verified:
    Fingerprint(K_A) == Fingerprint(K_B)                      Fingerprint(K_A) == Fingerprint(K_B)
```

---

## 4. Quantum Architecture Module

### Topologies
- **Processor A**: Linear chain topology with 5 physical qubits.
- **Processor B**: Sparse heavy-hex-inspired topology with 9 physical qubits.

### Compilation Pipeline
1. Input Logical Circuit (e.g. QFT-5, GHZ-5).
2. Layout & Routing using Qiskit Transpiler (Optimization Level 1, Seed 42).
3. Basis Gate Mapping to `['rz', 'sx', 'x', 'cx']`.
4. Noise Simulation with Qiskit Aer (1Q depolarizing $p=0.001$, 2Q depolarizing $p=0.005$, readout error $p=0.01$).
5. Output extraction: Transpiled Depth, Transpiled CX, Estimated SWAP Overhead, and Hellinger Fidelity.
