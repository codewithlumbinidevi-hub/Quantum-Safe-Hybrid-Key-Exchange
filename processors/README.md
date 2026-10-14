# Qiskit Processor A/B Architecture Benchmark Module

## Overview

This module implements the **Phase 1 Quantum Architecture Benchmark** specified in the **Qiskit Fall Fest 2026 Master Guide**.

### ⚠️ IMPORTANT SCIENTIFIC DISTINCTION
**Classical ECDH (NIST P-256) and Post-Quantum ML-KEM-768 execute strictly on classical CPUs.**
They do **not** run on simulated quantum circuits.
This module is a completely separate quantum architectural simulation that benchmarks circuit transpilation, routing overhead, and noise resilience across two different physical coupling topologies in Qiskit.

---

## Architecture Specifications

### Processor A
- **Physical Qubits**: 5 qubits (indices 0 through 4).
- **Topology**: Linear chain: `(0,1), (1,2), (2,3), (3,4)`.
- **Graph Diameter**: 4 hops.
- **Basis Gates**: `rz`, `sx`, `x`, `cx`.
- **Characteristics**: Highly constrained; any non-adjacent gate requires multi-hop SWAP gate insertion.

### Processor B
- **Physical Qubits**: 9 qubits (indices 0 through 8).
- **Topology**: Sparse heavy-hex-inspired graph:
  `(0,1), (1,2), (1,6), (2,3), (2,6), (2,5), (3,4), (4,5), (5,6), (6,7), (6,8), (8,0)`.
- **Graph Diameter**: 3 hops.
- **Basis Gates**: `rz`, `sx`, `x`, `cx`.
- **Characteristics**: Higher degree nodes and alternative cycles, reducing routing overhead for non-local operations.

---

## Baseline Transpilation & Simulation Settings

Per the Qiskit Fall Fest 2026 Master Guide requirements:
- **Basis Gates**: `rz, sx, x, cx`
- **Transpiler Optimization Level**: 1
- **Transpiler Seed**: 42 (deterministic routing)
- **Measurement Shots**: 4096

### Synthetic Noise Model
To isolate coupling topology as the sole independent experimental variable, an identical synthetic noise model is applied to both processors:
- **Single-Qubit Depolarizing Error**: $p = 0.001$ (`rz`, `sx`, `x`)
- **Two-Qubit CX Depolarizing Error**: $p = 0.005$ (`cx`)
- **Readout Error**: $p = 0.01$ (symmetric bit-flip on measurement)

---

## Benchmark Metrics Measured

1. **Logical vs Transpiled Depth**: Circuit layer expansion caused by gate decomposition and routing.
2. **Logical vs Transpiled CX Count**: Additional two-qubit operations added for routing.
3. **Routing CX Overhead**: $\Delta CX = CX_{\text{transpiled}} - CX_{\text{logical}}$.
4. **Estimated SWAP Gate Overhead**: In standard basis sets, each SWAP decomposes into 3 CX gates: $\text{SWAP} \approx \frac{\Delta CX}{3}$.
5. **Noisy Execution Fidelity (Hellinger Fidelity)**: Classical Bhattacharyya-based fidelity between ideal and noisy execution distributions.
6. **Total Variation Distance (TVD)**: $L_1$ distance between ideal and noisy probability distributions.

---

## Usage

Run via Python CLI:
```powershell
python -c "from processors.benchmark import ProcessorBenchmarkRunner; print(ProcessorBenchmarkRunner.run_ab_benchmark())"
```
Or run the dedicated benchmark script:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\run_processor_benchmark.ps1
```
