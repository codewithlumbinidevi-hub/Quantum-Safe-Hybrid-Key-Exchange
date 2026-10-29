# Benchmarking Methodology & Experimental Design

## 1. Cryptographic Benchmarking Methodology

### 1.1 Precision Timing Infrastructure
Cryptographic microbenchmarks utilize monotonic high-precision system timers via Python's `time.perf_counter_ns()` with sub-microsecond resolution.

### 1.2 Isolation of Handshake Stages
Each iteration measures 6 independent cryptographic lifecycle events:
1. `ecdh_keygen`: Ephemeral keypair creation on NIST P-256.
2. `mlkem_keygen`: Ephemeral keypair generation on NIST FIPS 203 ML-KEM-768.
3. `ecdh_derivation`: Scalar multiplication $S = d_A \cdot Q_B \pmod p$.
4. `mlkem_encap`: Decisional Learning with Errors (MLWE) polynomial encapsulation yielding shared secret and ciphertext.
5. `mlkem_decap`: Decapsulation of ciphertext recovering the 256-bit secret.
6. `hybrid_kdf`: Extraction and expansion of input key material (IKM) bound to public transcript hashes.

### 1.3 Statistical Rigor
For sample size $N$ (default $N=100$):
- **Mean & Standard Deviation**: $\mu = \frac{1}{N} \sum t_i, \quad \sigma = \sqrt{\frac{1}{N-1} \sum (t_i - \mu)^2}$.
- **Percentiles**: Median ($P_{50}$), $P_{95}$, and $P_{99}$ computed via linear interpolation on sorted trial arrays.
- **Warm-Up Cycles**: Pre-benchmark iterations (default 5) execute without logging to eliminate CPU cache misses, OS page faults, and dynamic library loading overheads.

### 1.4 Memory Overhead Measurement
Memory metrics distinguish two operational boundaries:
1. **Python Heap Allocation**: Monitored via `tracemalloc`, isolating memory allocated explicitly to Python runtime objects and byte arrays.
2. **OS Resident Set Size (RSS)**: Measured via `psutil.Process().memory_info().rss`, capturing the physical RAM occupied by the entire process, including OpenSSL C/Rust dynamic libraries.

### 1.5 Honest Platform Profiling (Platform A vs Platform B)
- **Platform A (Standard CPU)**: Process executes with unrestricted CPU affinity across all available logical cores.
- **Platform B (Constrained CPU)**: Process is pinned strictly to core 0 using `psutil.Process().cpu_affinity([0])`.
- **Honest System Detection**: If the underlying platform or container restricts affinity modification, the system explicitly logs a warning without attempting to fabricate artificial frequency throttling.

---

## 2. Quantum Architecture Benchmarking Methodology

### 2.1 Qiskit Fall Fest 2026 Phase 1 Baseline
- **Basis Gate Decomposition**: `['rz', 'sx', 'x', 'cx']`.
- **Transpiler Optimization Level**: Level 1.
- **Transpiler Seed**: Deterministic seed 42 to ensure identical initial layout and routing decisions.
- **Execution Shots**: 4096 measurement samples.

### 2.2 Architectural Topologies Under Test
- **Processor A**: 5-qubit linear chain with nearest-neighbor edges $(i, i+1)$ for $i \in [0, 3]$. Diameter: 4.
- **Processor B**: 9-qubit sparse heavy-hex-inspired graph containing 12 undirected edges. Diameter: 3.

### 2.3 Noise Model Baseline
Identical synthetic noise rates are injected to isolate physical graph connectivity as the single experimental variable:
- Single-qubit depolarizing error: $p = 0.001$ on `rz`, `sx`, `x`.
- Two-qubit depolarizing error: $p = 0.005$ on `cx`.
- Readout error: $p = 0.01$ symmetric flip.

### 2.4 Mathematical Metrics
1. **CX Overhead**: $\Delta CX = CX_{\text{transpiled}} - CX_{\text{logical}}$.
2. **Estimated SWAP Count**: $\text{SWAP} \approx \frac{\Delta CX}{3}$.
3. **Hellinger Fidelity**:
   $$F_H(P, Q) = \left( \sum_{x \in \{0, 1\}^n} \sqrt{P(x) Q(x)} \right)^2$$
4. **Total Variation Distance (TVD)**:
   $$\text{TVD}(P, Q) = \frac{1}{2} \sum_{x \in \{0, 1\}^n} |P(x) - Q(x)|$$
