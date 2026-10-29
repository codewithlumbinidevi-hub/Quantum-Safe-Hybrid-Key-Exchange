# Limitations and Operational Scope

## 1. Cryptographic Protocol Scope

### Educational Construction Notice
The hybrid key derivation construction implemented in Q-SHIELD-PQC is designed for research, benchmarking, and educational demonstration. While modeled directly on **NIST SP 800-56C Rev. 2**, **IETF RFC 9180 (HPKE)**, and **draft-ietf-tls-hybrid-design**, it has not undergone an independent third-party cryptographic formal audit. 
- Do not deploy in high-assurance production environments without formal verification and protocol standardization.
- Real-world production deployments should migrate to IETF TLS 1.3 post-quantum hybrid key exchange drafts (e.g. `X25519MLKEM768` or `SecP256r1MLKEM768`) once finalized.

### Side-Channel Countermeasures
The underlying ML-KEM-768 operations leverage OpenSSL's Rust/C implementations. However, timing and power side-channel resistance on specific target embedded hardware architectures must be verified independently.

---

## 2. Resource Constraints & Platform Profiling

### CPU Affinity vs Physical Microcontrollers
- **Platform B** constraints are applied honestly via operating system thread affinity (`psutil.Process().cpu_affinity([0])`).
- Restricting execution to a single CPU core limits parallel worker execution and restricts thread scheduling, but it **does not** simulate the clock frequency reduction, L1/L2 cache bottlenecks, or RAM constraints of an embedded ARM Cortex-M4 or RISC-V device.
- All benchmark outputs record this distinction honestly.

---

## 3. Quantum Architecture Simulation Scope

### Synthetic vs Physical Quantum Noise
- The Qiskit Aer noise models implement the standard reference parameters from the **Qiskit Fall Fest 2026 Master Guide**:
  - Single-qubit depolarizing error: $p = 0.001$.
  - Two-qubit CX depolarizing error: $p = 0.005$.
  - Readout error: $p = 0.01$.
- Physical superconducting quantum processors (such as IBM Quantum Eagle or Heron) exhibit non-Markovian noise, spectator qubit crosstalk, $T_1$ relaxation, $T_2$ dephasing, and time-dependent drift.
- The comparative findings illustrate **topological compilation penalties** (routing SWAP gate counts and depth expansion) rather than experimental hardware execution.
