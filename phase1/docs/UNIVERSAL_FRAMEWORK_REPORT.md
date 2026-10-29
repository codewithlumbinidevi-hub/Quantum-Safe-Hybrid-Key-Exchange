# Evidence-Based Evaluation of the Universal Challenge Framework (Processor A / Processor B) in Q-SHIELD-PQC

> **Document Type**: Technical Audit & Empirical Verification Report  
> **Target System**: Q-SHIELD-PQC (Qiskit Fall Fest 2026 Submission)  
> **Evaluation Date**: October 29, 2026  
> **Evaluator**: Pair Programming Agentic Auditor (Antigravity)  
> **Mode**: Read-Only Source Audit & Live Runtime Verification  

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Requirement-by-Requirement Compliance Matrix](#2-requirement-by-requirement-compliance-matrix)
3. [Processor Models](#3-processor-models)
4. [Noise Model](#4-noise-model)
5. [Benchmark Circuits](#5-benchmark-circuits)
6. [Transpilation and Routing Pipeline](#6-transpilation-and-routing-pipeline)
7. [Simulation and Metrics](#7-simulation-and-metrics)
8. [Results Actually Produced](#8-results-actually-produced)
9. [Backend/API and UI Wiring for the Framework](#9-backendapi-and-ui-wiring-for-the-framework)
10. [Figures, Exports, and Reproducibility](#10-figures-exports-and-reproducibility)
11. [Tests and Verification Coverage](#11-tests-and-verification-coverage)
12. [Gaps, Risks, and Honesty Review](#12-gaps-risks-and-honesty-review)
13. [Extension Readiness for Phase 2 (Processor C and Custom Processor D)](#13-extension-readiness-for-phase-2-processor-c-and-custom-processor-d)
14. [Learning Appendix](#14-learning-appendix)
    - [14.1 Plain-English Glossary](#141-plain-english-glossary)
    - [14.2 Walk-Through of a Complete Run (GHZ-5 & QFT-5)](#142-walk-through-of-a-complete-run-ghz-5--qft-5)
    - [14.3 25 Likely Judge Questions with Code-Grounded Answers](#143-25-likely-judge-questions-with-code-grounded-answers)
    - [14.4 One-Page Cheat Sheet of Key Numbers](#144-one-page-cheat-sheet-of-key-numbers)

---

## 1. Executive Summary

This document provides a rigorous, evidence-based audit of how the **Qiskit Fall Fest 2026 Phase 1 Universal Challenge Framework** (Processor A and Processor B) is implemented within the **Q-SHIELD-PQC** codebase. 

### Critical Architecture Separation
The repository contains two fundamentally distinct, decoupled components that must never be conflated:
1. **Classical Post-Quantum Cryptography Benchmark (PS-P1)**: Evaluates a classical hybrid Key Encapsulation Mechanism (NIST FIPS 203 ML-KEM-768 + SECP256R1 ECDH + HKDF-SHA256) running on **Platform A** (unconstrained host CPU) versus **Platform B** (single-core CPU affinity via `psutil.Process().cpu_affinity([0])`). This component executes strictly on x86_64 host CPU hardware using the Python `cryptography 50.0.2` library.
2. **Universal Processor Benchmark (Phase 1 Universal Framework)**: Evaluates quantum circuit compilation, SABRE routing, and noisy simulation across **Processor A** (5-qubit linear topology) and **Processor B** (9-qubit sparse heavy-hex topology). This component executes in **Qiskit 2.2.3** and **Qiskit Aer 0.17.2**.

```
+----------------------------------------------------------------------------------------------------+
|                                         Q-SHIELD-PQC REPOSITORY                                    |
+--------------------------------------------------+-------------------------------------------------+
|        PS-P1 Classical Cryptography              |        Phase 1 Universal Quantum Framework      |
|  - Primitives: ML-KEM-768 + ECDH P-256          |  - Framework: Qiskit 2.2.3 + Qiskit Aer 0.17.2  |
|  - Engine: Python `cryptography 50.0.2`         |  - Topologies: Processor A (5Q) vs B (9Q)       |
|  - Hardware: Host CPU (AMD64 16 cores)           |  - Circuits: QFT-5, GHZ-5, Cross-Conn-5         |
|  - Comparison: Platform A vs Platform B          |  - Comparison: Processor A vs Processor B       |
|    (Multi-core vs Core 0 Affinity)              |    (Linear 4 edges vs Heavy-Hex 12 edges)       |
+--------------------------------------------------+-------------------------------------------------+
|  CONNECTION: STRICTLY DECOUPLED (Separate modules, separate endpoints, separate CSV tables)       |
+----------------------------------------------------------------------------------------------------+
```

### What the Quantum Part Actually Computes
The quantum module does **not** execute Shor's algorithm, Grover's algorithm, or lattice decapsulation. Simulating Shor's algorithm for 256-bit elliptic curves or 768-rank module lattices would require thousands of logical qubits (millions of physical qubits), which is intractable on classical computers. Instead, the quantum framework evaluates **algorithmic circuit compilation overhead and noise susceptibility** across three canonical 5-qubit benchmark circuits:
- **`qft_5` (Quantum Fourier Transform)**: Requires all-to-all qubit interactions ($10$ two-qubit controlled phase gates $+ 2$ swaps), testing non-local multi-hop routing stress.
- **`ghz_5` (Greenberger-Horne-Zeilinger Entanglement)**: Requires $4$ nearest-neighbor CX gates along a linear chain, testing baseline native mapping.
- **`cross_conn_5` (Cross-Connectivity Stress)**: Implements $6$ non-adjacent qubit pairs with $12$ CX operations, testing alternative cycle routing.

### Current Implementation Status
- **Fully Working**:
  - Processor JSON schemas (`processors/processor_A.json`, `processors/processor_B.json`) and NetworkX topological loader (`processors/coupling_maps.py`).
  - Basis gates (`rz`, `sx`, `x`, `cx`), optimization level (`1`), seed (`42`), and shot count (`4096`) adhere to the guide.
  - Quantum compilation pipeline (`processors/transpilation.py`) correctly computes transpiled depth, gate breakdowns, CX overhead, and real routing SWAPs.
  - Aer noisy simulation pipeline (`processors/benchmark.py`) applies identical synthetic noise ($p_{1q}=0.001$, $p_{2q}=0.005$, $p_{ro}=0.01$).
  - Fast-API backend endpoints (`/api/benchmarks/processors/run`, `/latest`, `/export`, `/chart`).
  - Headless Matplotlib figures (`results/figures/processor_ab_comparison.png`, `processor_coupling_maps.png`).
  - Jupyter Notebook (`main.ipynb`) executes top-to-bottom with exit code 0.
  - 85 automated pytest unit and integration tests pass cleanly.
- **Partially Working & Discrepancies**:
  - **Single Source of Truth Violation**: Coupling map edges are duplicated and hardcoded in frontend React files (`ProcessorBenchmarkPage.tsx`, `OverviewPage.tsx`, `CouplingMapVisualizer.tsx`). Noise values in `processors/noise_models.py` are hardcoded defaults; `ProcessorBenchmarkRunner` calls `create_reference_noise_model()` without passing the values from `processor_A.json` or `processor_B.json`.
  - **Topological Inaccuracies in Docs**: `report.md` reports Processor A as having `4` physical qubits (off-by-one error caused by `{4 if 'A' in proc else 9}` in `scripts/sync_reports_exact.py:98`). `report.md` and `processors/README.md` claim Processor B has diameter `3` and max degree `4`, whereas NetworkX proves diameter is `4` (distance between nodes 0 and 4 is 4 hops) and max degree is `5` (Node 6 has 5 incident edges).
  - **Fidelity Discrepancy**: `report.md` claims QFT-5 noisy fidelity is `0.9998` and shot-noise floor `0.9956`. Live runs and stored CSVs produce fidelity `0.9992` (Proc A) / `0.9990` (Proc B) and floor `0.9990`. The discrepancy stems from an earlier run comparing noisy vs ideal with identical simulation random seeds.
  - **Mislabeled Frontend Page**: `frontend/src/pages/pqc/ProcessorComparisonPage.tsx` is named as a processor page, imports `CouplingMapVisualizer`, but actually executes host CPU crypto benchmarks (`Platform A` vs `Platform B`) and never renders the visualizer.
- **Missing**:
  - Dynamic support for Processor C or custom Processor D (two-processor assumption hardcoded in Pydantic schemas, runners, and frontend).
  - Flexible circuit sizing (all benchmark circuits are fixed at 5 qubits).
  - Automated browser end-to-end tests for UI controls.
  - Manifest provenance tracking for quantum benchmark runs (`results/manifest.json` tracks only crypto runs).

---

## 2. Requirement-by-Requirement Compliance Matrix

| # | Official Phase 1 Guide Requirement | Where Implemented (File & Lines) | Verification Method & Output | Status | Technical Notes |
|---|---|---|---|:---:|---|
| 1 | **Phase 1 Scope**: ONLY Processor A and Processor B. C and D reserved for Phase 2. | `processors/processor_A.json`<br>`processors/processor_B.json`<br>`src/processors.py:20-21` | Checked directory listings and codebase.<br>Only A and B exist. | **Compliant** | Codebase strictly defines Processor A and B. Extension hooks for C/D are not yet dynamic. |
| 2 | **Goal**: End-to-end quantum solution mapped across 2 physical architectures; evaluate connectivity, routing, depth, noise. | `processors/benchmark.py:31-168`<br>`processors/transpilation.py:15-115` | Executed live benchmark across `qft_5`, `ghz_5`, `cross_conn_5`. | **Compliant** | Evaluates depth expansion, CX overhead, SWAPs, and noisy fidelity under identical noise. |
| 3 | **Coupling Maps Reference Only**: Models built from scratch and justified. | `processors/coupling_maps.py:13-84`<br>`processors/processor_A.json:7-12`<br>`processors/processor_B.json:7-20` | JSON loaded and parsed via custom `ProcessorTopology` class. | **Compliant** | Implemented as standalone JSON files and custom NetworkX graph builder; no black-box vendor backends. |
| 4 | **Processor A Reference**: 5 qubits (0-4); linear chain `[(0,1),(1,2),(2,3),(3,4)]` or branching tree. | `processors/processor_A.json:4-12`<br>`processors/coupling_maps.py:89` | `python -c "import json; d=json.load(open('processors/processor_A.json')); print(d['coupling_map'])"`<br>`[[0, 1], [1, 2], [2, 3], [3, 4]]` | **Compliant** | Uses the 5-qubit linear chain reference variant. |
| 5 | **Processor B Reference**: 9 qubits (0-8); sparse heavy-hex, 12 edges: (0,1),(1,2),(1,6),(2,3),(2,6),(2,5),(3,4),(4,5),(5,6),(6,7),(6,8),(8,0). | `processors/processor_B.json:4-20`<br>`processors/coupling_maps.py:90` | `python -c "import json; d=json.load(open('processors/processor_B.json')); print(len(d['coupling_map']))"`<br>`12 edges verified` | **Compliant** | 100% identical to the 12 edges in the Phase 1 reference specification. |
| 6 | **Basis Gate Set**: `{rz, sx, x, cx}` on both processors. | `processors/processor_A.json:13`<br>`processors/processor_B.json:21`<br>`src/processors.py:23`<br>`processors/transpilation.py:72-79` | `python -c "from src.processors import BASIS_GATES; print(BASIS_GATES)"`<br>`['rz', 'sx', 'x', 'cx']` | **Compliant** | Transpiler strictly enforces `basis_gates=['rz', 'sx', 'x', 'cx']`. Output circuits contain only these 4 gates. |
| 7 | **Synthetic Noise**: 1q depol $p=0.001$, 2q CX depol $p=0.005$, readout error $p=0.01$ (identical on both). | `processors/noise_models.py:13-49`<br>`processors/benchmark.py:67-68` | Inspected runtime `NoiseModel` object via python script (see Section 4). | **Compliant** | Rates verified at runtime: 1q Pauli errors $0.00025$, 2q Pauli errors $0.0003125$, readout matrix $[[0.99, 0.01],[0.01,0.99]]$. |
| 8 | **Transpilation Baseline**: `optimization_level=1`, `seed=42`, `shots=4096`. | `processors/benchmark.py:34-36`<br>`processors/transpilation.py:18-19`<br>`src/processors.py:24-28` | Verified runtime parameters passed to `transpile()` and `sim.run()`. | **Compliant** | Optimization level 1 and seed 42 enforced across all benchmark execution paths. |
| 9 | **Mandated Metrics**: routing overhead, SWAP count, circuit depth, CX count, fidelity. | `processors/metrics.py:10-82`<br>`processors/transpilation.py:81-113` | Verified in `results/tables/processor_ab_results.csv`. | **Compliant** | Transpiled depth, CX count, CX overhead, SWAP count, Hellinger fidelity, and TVD measured. |
| 10 | **Mandated Repo Structure**: All 14 files and folders specified in the guide. | Root workspace directory tree | Verified via PowerShell `Test-Path` (see structure output below). | **Compliant** | Every required file and directory exists at the root. |

### Mandated Repository Structure Verification

The following command was executed in PowerShell on the workspace root:
```powershell
@("README.md", "main.ipynb", "requirements.txt", "data/raw", "data/processed", 
  "processors/processor_A.json", "processors/processor_B.json", 
  "src/__init__.py", "src/problem.py", "src/processors.py", "src/routing.py", 
  "src/metrics.py", "src/visualization.py", "results/tables", "results/figures", 
  "report.md", "assets") | ForEach-Object { 
    [PSCustomObject]@{ Path = $_; Exists = (Test-Path $_) } 
} | Format-Table -AutoSize
```

**Real Output**:
```
Path                               Exists
----                               ------
README.md                            True
main.ipynb                           True
requirements.txt                     True
data/raw                             True
data/processed                       True
processors/processor_A.json          True
processors/processor_B.json          True
src/__init__.py                      True
src/problem.py                       True
src/processors.py                    True
src/routing.py                       True
src/metrics.py                       True
src/visualization.py                 True
results/tables                       True
results/figures                      True
report.md                            True
assets                               True
```

---

## 3. Processor Models

### 3.1 Processor A Model

**Full File Content** (`processors/processor_A.json`):
```json
{
  "name": "Processor A",
  "architecture_id": "processor_a_linear_5q",
  "num_qubits": 5,
  "qubit_indices": [0, 1, 2, 3, 4],
  "topology_type": "Linear Chain",
  "coupling_map": [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4]
  ],
  "basis_gates": ["rz", "sx", "x", "cx"],
  "description": "5-qubit linear chain reference architecture from Qiskit Fall Fest 2026 Phase 1 guide. Minimal connectivity with diameter 4.",
  "transpile_settings": {
    "optimization_level": 1,
    "seed": 42,
    "shots": 4096
  },
  "synthetic_noise": {
    "single_qubit_depolarizing_error": 0.001,
    "two_qubit_cx_depolarizing_error": 0.005,
    "readout_error": 0.01
  }
}
```

### 3.2 Processor B Model

**Full File Content** (`processors/processor_B.json`):
```json
{
  "name": "Processor B",
  "architecture_id": "processor_b_heavy_hex_9q",
  "num_qubits": 9,
  "qubit_indices": [0, 1, 2, 3, 4, 5, 6, 7, 8],
  "topology_type": "Sparse Heavy-Hex-Inspired",
  "coupling_map": [
    [0, 1],
    [1, 2],
    [1, 6],
    [2, 3],
    [2, 6],
    [2, 5],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [6, 8],
    [8, 0]
  ],
  "basis_gates": ["rz", "sx", "x", "cx"],
  "description": "9-qubit sparse heavy-hex-inspired reference architecture from Qiskit Fall Fest 2026 Phase 1 guide. Provides multi-cycle alternative routing paths.",
  "transpile_settings": {
    "optimization_level": 1,
    "seed": 42,
    "shots": 4096
  },
  "synthetic_noise": {
    "single_qubit_depolarizing_error": 0.001,
    "two_qubit_cx_depolarizing_error": 0.005,
    "readout_error": 0.01
  }
}
```

### 3.3 Explanation of JSON Fields
- `name`: Human-readable display label ("Processor A", "Processor B").
- `architecture_id`: Machine identifier used in file naming and API tags.
- `num_qubits`: Integer count of physical qubits on the chip.
- `qubit_indices`: Explicit 0-indexed list of physical qubit labels.
- `topology_type`: Descriptive classification of the graph structure.
- `coupling_map`: Undirected physical two-qubit interconnect edges. In `processors/coupling_maps.py:31-37`, this list is automatically symmetrized into directed bidirectional pairs `[u, v]` and `[v, u]` for Qiskit's `CouplingMap`.
- `basis_gates`: Supported hardware gate alphabet (`['rz', 'sx', 'x', 'cx']`).
- `description`: Rationale and context summary.
- `transpile_settings`: Transpiler defaults (`optimization_level: 1`, `seed: 42`, `shots: 4096`).
- `synthetic_noise`: Error rate parameters for depolarizing and readout noise channels.

### 3.4 Graph-Theoretic Characterization (NetworkX Verification)

The following verification script was executed to compute graph metrics directly from the JSON files:
```python
import json, networkx as nx

for path in ['processors/processor_A.json', 'processors/processor_B.json']:
    data = json.load(open(path))
    G = nx.Graph()
    G.add_nodes_from(range(data['num_qubits']))
    G.add_edges_from(data['coupling_map'])
    print(f"=== {data['name']} ===")
    print("Num Qubits:", data['num_qubits'], "| Num Edges:", len(data['coupling_map']))
    print("Adjacency List:", {n: sorted(list(G.neighbors(n))) for n in G.nodes()})
    print("Node Degrees:", dict(G.degree()))
    print("Average Degree:", round(sum(dict(G.degree()).values()) / len(G), 4))
    print("Graph Diameter:", nx.diameter(G))
    print("Is Connected:", nx.is_connected(G))
```

**Real Command Output**:
```
=== Processor A ===
Num Qubits: 5 | Num Edges: 4
Adjacency List: {0: [1], 1: [0, 2], 2: [1, 3], 3: [2, 4], 4: [3]}
Node Degrees: {0: 1, 1: 2, 2: 2, 3: 2, 4: 1}
Average Degree: 1.6000
Graph Diameter: 4
Is Connected: True

=== Processor B ===
Num Qubits: 9 | Num Edges: 12
Adjacency List: {0: [1, 8], 1: [0, 2, 6], 2: [1, 3, 5, 6], 3: [2, 4], 4: [3, 5], 5: [2, 4, 6], 6: [1, 2, 5, 7, 8], 7: [6], 8: [0, 6]}
Node Degrees: {0: 2, 1: 3, 2: 4, 3: 2, 4: 2, 5: 3, 6: 5, 7: 1, 8: 2}
Average Degree: 2.6667
Graph Diameter: 4
Is Connected: True
```

### 3.5 Comparative Topological Summary Table

| Metric | Processor A | Processor B | Notes & Discrepancy Flag |
|---|:---:|:---:|---|
| **Physical Qubit Count** | 5 | 9 | Evaluated with 5-qubit benchmark circuits; B has 4 ancillary nodes |
| **Undirected Edges** | 4 | 12 | Processor B has $3\times$ the edge count |
| **Directed Coupling Edges** | 8 | 24 | Symmetrized bidirectional pairs in Qiskit `CouplingMap` |
| **Node Degree List** | `{0:1, 1:2, 2:2, 3:2, 4:1}` | `{0:2, 1:3, 2:4, 3:2, 4:2, 5:3, 6:5, 7:1, 8:2}` | Node 6 is a high-degree hub ($k=5$) |
| **Minimum Degree** | 1 (endpoints 0, 4) | 1 (leaf node 7) | Both have dead-end leaf nodes |
| **Maximum Degree** | 2 (interior nodes 1, 2, 3) | **5** (central routing node 6) | **DISCREPANCY**: `report.md:145` incorrectly claimed max degree was 4 |
| **Average Degree** | 1.600 | 2.667 | B provides significantly higher local connectivity |
| **Graph Diameter** | 4 | **4** | **DISCREPANCY**: `report.md:145`, `README.md:27`, and UI incorrectly claimed diameter 3 |
| **Reference Architecture Variant** | Linear chain reference | Sparse heavy-hex reference | Processor A chose linear chain rather than branching tree |

#### ⚠️ Critical Discrepancy: Processor B Graph Diameter is 4, NOT 3
In `report.md:145`, `processors/README.md:27`, `src/visualization.py:244`, and `frontend/src/pages/ProcessorBenchmarkPage.tsx:335`, the documentation and UI state:
> `Coupling Graph Diameter | 4 hops | 3 hops`

**Empirical Proof that Diameter is 4**:
Testing all shortest paths in NetworkX reveals:
- Distance from Node 0 to Node 4: $\text{dist}(0, 4) = 4$
  - Path 1: `[0, 1, 2, 3, 4]` (4 hops)
  - Path 2: `[0, 1, 2, 5, 4]` (4 hops)
  - Path 3: `[0, 8, 6, 5, 4]` (4 hops)
  - Path 4: `[0, 8, 6, 2, 3, 4]` (5 hops)
There is **no** path of 3 hops between Node 0 and Node 4 in the 12-edge reference graph. Hence the diameter $\max_{u,v} d(u,v) = 4$.

### 3.6 Single Source of Truth Audit & Hardcoded Couplings
The JSON configuration files are located at `processors/processor_A.json` and `processors/processor_B.json`. They are dynamically loaded in Python via `processors/coupling_maps.py:46-50` (`ProcessorTopology.from_json_file`).

However, the coupling maps are **duplicated and hardcoded** in several locations:
1. `frontend/src/pages/ProcessorBenchmarkPage.tsx:110, 122-125`: Hardcodes `[[0, 1], [1, 2], [2, 3], [3, 4]]` and the 12-edge list of Processor B as React props.
2. `frontend/src/pages/OverviewPage.tsx:262, 269-272`: Hardcodes the same edge lists.
3. `frontend/src/components/CouplingMapVisualizer.tsx:32-44`: Hardcodes SVG layout coordinates specifically for 5 linear nodes and 9 heavy-hex nodes.
4. `processors/noise_models.py:13-17`: Function arguments hardcode defaults (`p_1q=0.001`, `p_2q=0.005`, `p_ro=0.01`). In `processors/benchmark.py:67`, `create_reference_noise_model()` is called with **no arguments**, completely bypassing the `synthetic_noise` dictionary in the JSON files.

---

## 4. Noise Model

### 4.1 Exact Implementation Code

From `processors/noise_models.py:13-49`:
```python
def create_reference_noise_model(
    p_1q: float = 0.001,
    p_2q: float = 0.005,
    p_ro: float = 0.01
) -> NoiseModel:
    noise_model = NoiseModel()

    # 1-qubit gate error on rz, sx, x
    error_1q = depolarizing_error(p_1q, 1)
    noise_model.add_all_qubit_quantum_error(error_1q, ["rz", "sx", "x"])

    # 2-qubit gate error on cx
    error_2q = depolarizing_error(p_2q, 2)
    noise_model.add_all_qubit_quantum_error(error_2q, ["cx"])

    # Readout error
    p_0_to_1 = p_ro
    p_1_to_0 = p_ro
    ro_matrix = [
        [1.0 - p_0_to_1, p_0_to_1],
        [p_1_to_0, 1.0 - p_1_to_0]
    ]
    readout_err = ReadoutError(ro_matrix)
    noise_model.add_all_qubit_readout_error(readout_err)

    return noise_model
```

### 4.2 Runtime Verification of Noise Parameters
The constructed `NoiseModel` object was inspected at runtime using the following script:
```python
from processors.noise_models import create_reference_noise_model
nm = create_reference_noise_model()
print("Basis gates covered:", nm.basis_gates)
print("Noise instructions:", nm.noise_instructions)
for g in ['rz', 'sx', 'x', 'cx']:
    err = nm._default_quantum_errors[g]
    print(f"Gate {g} (qubits={err.num_qubits}) probabilities:", err.probabilities)
print("Readout error matrix:\n", nm._default_readout_error.probabilities)
```

**Real Runtime Output**:
```
Basis gates covered: ['cx', 'id', 'rz', 'sx', 'x']
Noise instructions: ['cx', 'measure', 'rz', 'sx', 'x']
Gate rz (qubits=1) probabilities: [0.99925, 0.00025, 0.00025, 0.00025]
Gate sx (qubits=1) probabilities: [0.99925, 0.00025, 0.00025, 0.00025]
Gate x (qubits=1) probabilities: [0.99925, 0.00025, 0.00025, 0.00025]
Gate cx (qubits=2) probabilities: [0.9953125, 0.0003125, 0.0003125, ... (15 Pauli terms)]
Readout error matrix:
 [[0.99 0.01]
  [0.01 0.99]]
```

### 4.3 Mathematical and Physical Meaning
1. **Single-Qubit Depolarizing Error ($p=0.001$)**:
   The single-qubit depolarizing quantum channel is defined as:
   $$\mathcal{E}_{1}(\rho) = (1 - p)\rho + \frac{p}{3}\left(X\rho X + Y\rho Y + Z\rho Z\right)$$
   In Qiskit's internal representation, this decomposes into the identity operator with probability $1 - \frac{3}{4}p = 1 - 0.00075 = 0.99925$, and each of the three Pauli operators $\{X, Y, Z\}$ with probability $\frac{p}{4} = 0.00025$. This models isotropic loss of quantum coherence during single-qubit microwave drive pulses.
2. **Two-Qubit CX Depolarizing Error ($p=0.005$)**:
   The two-qubit depolarizing channel across qubits $(u, v)$ is:
   $$\mathcal{E}_{2}(\rho) = (1 - p)\rho + \frac{p}{15}\sum_{P \in \{I, X, Y, Z\}^{\otimes 2} \setminus \{I \otimes I\}} P \rho P$$
   In Qiskit, the identity has probability $1 - \frac{15}{16}p = 1 - 0.0046875 = 0.9953125$, and each of the 15 non-identity two-qubit Pauli tensor products has probability $\frac{p}{16} = 0.0003125$. This models cross-resonance drive imperfection, stray couplings, and gate duration infidelities.
3. **Readout Assignment Error ($p=0.01$)**:
   Modeled via a classical stochastic transition matrix $\Lambda$:
   $$\Lambda = \begin{pmatrix} P(0|0) & P(1|0) \\ P(0|1) & P(1|1) \end{pmatrix} = \begin{pmatrix} 0.99 & 0.01 \\ 0.01 & 0.99 \end{pmatrix}$$
   When measuring in the computational basis, each qubit has an independent $1.0\%$ probability of undergoing a classical bit-flip ($|0\rangle \to |1\rangle$ or $|1\rangle \to |0\rangle$) due to resonator readout discrimination error or thermal relaxation during the measurement window.

### 4.4 Symmetry and Isolation of Topological Impact
In `processors/benchmark.py:67-68`, the simulator instances are created as:
```python
sim_ideal = AerSimulator()
noise_model = create_reference_noise_model()
sim_noisy = AerSimulator(noise_model=noise_model)
```
The **exact same** `sim_noisy` object is used sequentially for both Processor A (`job_a_noisy = sim_noisy.run(transpiled_a, ...)`) and Processor B (`job_b_noisy = sim_noisy.run(transpiled_b, ...)`). Because the gate error rates and readout error rates are mathematically identical, any variation in output distribution fidelity between Processor A and Processor B arises solely from **circuit depth expansion and extra two-qubit gates inserted by graph routing constraints**.

### 4.5 What is NOT Modeled (Physical Phenomena Omitted)
The synthetic model is intentionally simplified to isolate topological effects. It omits:
- **Energy Relaxation ($T_1$) and Dephasing ($T_2$)**: Thermal decay towards ground state $|0\rangle$ and phase diffusion over physical gate durations ($\tau_{1q} \approx 30\text{ ns}, \tau_{2q} \approx 300\text{ ns}$).
- **Idle Qubit Decoherence**: Spectator qubits do not accumulate phase or amplitude damping while waiting for multi-hop SWAP sequences on other qubits.
- **ZZ Crosstalk**: Static parasitic Hamiltonian coupling between neighboring transmons.
- **State Leakage**: Population escaping the computational subspace $\{|0\rangle, |1\rangle\}$ into the $|2\rangle$ state.
- **Spatial/Per-Qubit Variation**: On real QPUs, different physical qubits have widely differing error rates (e.g. CX error varying from $0.004$ to $0.05$ across the chip).

---

## 5. Benchmark Circuits

The framework includes three 5-qubit test circuits defined in `processors/circuits.py`.

```
             BENCHMARK CIRCUITS LOGICAL SUMMARY
+--------------------+--------+-------+---------+----------+--------------------------+
| Circuit ID         | Qubits | Depth | CX/2Q   | 1Q Gates | Ideal Output Baseline    |
+--------------------+--------+-------+---------+----------+--------------------------+
| `qft_5`            | 5      | 17    | 10 (CP) | 5 (H)    | Uniform 32 states (P=1/32)
|                    |        |       | +2(SWAP)|          |                          |
| `ghz_5`            | 5      | 6     | 4 (CX)  | 1 (H)    | 50% |00000> + 50% |11111>  |
| `cross_conn_5`     | 5      | 14    | 12 (CX) | 5H + 6RZ | Uniform 32 states (P=1/32)
+--------------------+--------+-------+---------+----------+--------------------------+
```

### 5.1 Circuit 1: `qft_5` (5-Qubit Quantum Fourier Transform)

**Construction Code** (`processors/circuits.py:11-34`):
```python
def create_qft_5_circuit() -> QuantumCircuit:
    n = 5
    qc = QuantumCircuit(n, n, name="QFT-5")
    for i in range(n):
        qc.h(i)
        for j in range(i + 1, n):
            angle = math.pi / (2 ** (j - i))
            qc.cp(angle, j, i)
        qc.barrier()
    for i in range(n // 2):
        qc.swap(i, n - i - 1)
    qc.measure(range(n), range(n))
    return qc
```
- **Logical Depth**: 17 layers.
- **Logical Gate Breakdown**: 5 `h`, 10 `cp` (controlled phase), 2 `swap`, 5 `barrier`, 5 `measure`.
- **Logical Two-Qubit Gate Pairs**: All 10 pairwise combinations: `(1,0), (2,0), (3,0), (4,0), (2,1), (3,1), (4,1), (3,2), (4,2), (4,3)`, plus 2 register swaps `(0,4)` and `(1,3)`.
- **Unconstrained Basis Gate Decomposition**: Each `cp` gate decomposes into 2 CX gates ($10 \times 2 = 20\text{ CX}$), and each `swap` gate decomposes into 3 CX gates ($2 \times 3 = 6\text{ CX}$). Thus, **Logical Basis CX = 26**.
- **Ideal Output State**: When initialized to $|00000\rangle$, QFT produces an equal superposition:
  $$\text{QFT}_5|00000\rangle = \frac{1}{\sqrt{32}}\sum_{x=0}^{31}|x\rangle$$
  The computational-basis measurement distribution is perfectly uniform: $P(x) = \frac{1}{32} = 0.03125$ for all 32 states.
- **Stress Target**: Maximum non-local routing stress. Forces any graph with diameter $>1$ to insert routing SWAPs to allow all-to-all interactions.

### 5.2 Circuit 2: `ghz_5` (5-Qubit Entanglement Chain)

**Construction Code** (`processors/circuits.py:36-48`):
```python
def create_ghz_5_circuit() -> QuantumCircuit:
    qc = QuantumCircuit(5, 5, name="GHZ-5")
    qc.h(0)
    for i in range(4):
        qc.cx(i, i + 1)
    qc.barrier()
    qc.measure(range(5), range(5))
    return qc
```
- **Logical Depth**: 6 layers.
- **Logical Gate Breakdown**: 1 `h`, 4 `cx`, 1 `barrier`, 5 `measure`.
- **Logical Two-Qubit Gate Pairs**: Linear adjacent sequence: `(0,1), (1,2), (2,3), (3,4)`.
- **Unconstrained Basis Gate Decomposition**: Already in basis `{rz, sx, x, cx}`. **Logical Basis CX = 4**.
- **Ideal Output State**: Maximally entangled Greenberger-Horne-Zeilinger state:
  $$|\text{GHZ}_5\rangle = \frac{|00000\rangle + |11111\rangle}{\sqrt{2}}$$
  Theoretical probability: $P(00000) = 0.50$, $P(11111) = 0.50$, all other 30 states have $P(x) = 0$.
- **Stress Target**: Baseline coherence along a simple 1D linear chain.

### 5.3 Circuit 3: `cross_conn_5` (Cross-Connectivity Stress)

**Construction Code** (`processors/circuits.py:50-72`):
```python
def create_cross_connectivity_circuit() -> QuantumCircuit:
    qc = QuantumCircuit(5, 5, name="Cross-Connectivity-5")
    for i in range(5):
        qc.h(i)
    qc.barrier()
    non_adjacent_pairs = [(0, 2), (1, 3), (0, 4), (1, 4), (2, 4), (0, 3)]
    for u, v in non_adjacent_pairs:
        qc.cx(u, v)
        qc.rz(0.5, v)
        qc.cx(u, v)
    qc.barrier()
    qc.measure(range(5), range(5))
    return qc
```
- **Logical Depth**: 14 layers.
- **Logical Gate Breakdown**: 5 `h`, 12 `cx`, 6 `rz`, 2 `barrier`, 5 `measure`.
- **Logical Two-Qubit Gate Pairs**: Specifically non-nearest-neighbor pairs on a 1D chain: `(0,2), (1,3), (0,4), (1,4), (2,4), (0,3)` (each pair targeted twice with an intermediate $R_Z$).
- **Unconstrained Basis Gate Decomposition**: Already in basis. **Logical Basis CX = 12**.
- **Ideal Output State**: Starting from $|+\rangle^{\otimes 5} = \frac{1}{\sqrt{32}}\sum_x |x\rangle$, each $CX_{u,v} R_Z(\theta)_v CX_{u,v}$ sequence introduces diagonal phase factors $e^{\pm i \theta/2}$ dependent on qubit parity, but leaves computational basis probabilities **completely invariant**:
  $$P(x) = \frac{1}{32} = 0.03125 \quad \forall x \in \{0, \dots, 31\}$$
- **Stress Target**: Non-adjacent routing overhead and ability of a 2D topology to find zero-SWAP alternative cycle embeddings.

### 5.4 Topology Discrimination Analysis

| Circuit | Discriminates Routing Overhead (Depth / CX / SWAPs)? | Discriminates Fidelity under Depolarizing Noise? | Scientific Rationale & Evidence |
|---|:---:|:---:|---|
| **`cross_conn_5`** | **YES** (Decisive) | **NO** (Within noise floor) | On Processor A, non-adjacent pairs force **2 routing SWAPs** (+6 CX, depth 22). On Processor B, the 12-edge graph embeds the circuit with **0 routing SWAPs** (depth 16). However, because the ideal state is uniform, fidelity remains ~0.9991 on both processors. |
| **`qft_5`** | **YES** (Substantial) | **NO** (Within noise floor) | Global all-to-all connectivity requires **8 SWAPs** on A (50 CX, depth 77) vs **2 SWAPs** on B (32 CX, depth 63), a **36.0% CX reduction**. Yet noisy fidelity is ~0.9992 on A and ~0.9990 on B because depolarizing noise drives state mixtures towards the exact same uniform distribution as the ideal QFT output. |
| **`ghz_5`** | **NO** (Identical) | **NO** (Identical) | The 4 CX gates form a linear nearest-neighbor chain. Both Processor A and Processor B map it with **0 SWAPs**, 4 CX, and depth 8. Gate counts, depth, and noisy fidelity ($0.9403$) are **100% identical** on both processors. |

---

## 6. Transpilation and Routing Pipeline

### 6.1 Transpilation Execution Calls

From `processors/transpilation.py:43-79`:
```python
# 1. Unconstrained logical basis compilation
unconstrained_qc = transpile(
    circuit,
    basis_gates=['rz', 'sx', 'x', 'cx'],
    optimization_level=1,
    seed_transpiler=42,
)

# 2. Auxiliary pass with SWAP in basis to isolate routing SWAPs
basis_with_swap = ['rz', 'sx', 'x', 'cx', 'swap']
unconstrained_with_swap = transpile(circuit, basis_gates=basis_with_swap, ...)
logical_swaps = unconstrained_with_swap.count_ops().get("swap", 0)

routed_with_swap = transpile(circuit, coupling_map=coupling_map, basis_gates=basis_with_swap, ...)
total_swaps = routed_with_swap.count_ops().get("swap", 0)
routing_swaps = max(0, total_swaps - logical_swaps)

# 3. Final physical compilation strictly to hardware basis
transpiled_qc = transpile(
    circuit,
    coupling_map=coupling_map,
    basis_gates=['rz', 'sx', 'x', 'cx'],
    optimization_level=1,
    seed_transpiler=42,
)
```

### 6.2 Plain-English Stages of Qiskit Transpilation
1. **Layout (Qubit Placement)**: Qiskit maps the circuit's virtual/logical qubits ($q_0 \dots q_4$) to physical hardware qubit indices on the processor coupling map. At `optimization_level=1` with `seed_transpiler=42`, Qiskit uses heuristic SABRE layout to find an initial mapping that minimizes anticipated routing distances.
2. **Routing (SWAP Insertion)**: If a two-qubit gate (e.g. `cx(q0, q2)`) is scheduled between physical qubits that do not share a coupling edge, the SABRE router inserts SWAP operations along the shortest path to bring the qubit states adjacent.
3. **Basis Translation (Gate Synthesis)**: Any high-level gate not in `{rz, sx, x, cx}` is decomposed into this elementary universal set. For instance, Hadamard $H$ decomposes into $R_Z(\pi/2) \cdot \sqrt{X} \cdot R_Z(\pi/2)$; Controlled-Phase $CP(\theta)$ decomposes into single-qubit rotations and 2 CX gates.
4. **Optimization**: Redundant adjacent gates (e.g. $CX \cdot CX = I$, consecutive $R_Z$ rotations) are merged or canceled.

### 6.3 Why a SWAP Gate Costs 3 CX Gates
Physical superconducting transmon qubits lack direct hardware SWAP couplings. A SWAP operation exchanges quantum states $|\psi\rangle|\phi\rangle \to |\phi\rangle|\psi\rangle$ and is synthesized algebraically via three alternating CX gates:
$$\text{SWAP}_{1,2} = \text{CX}_{1,2} \cdot \text{CX}_{2,1} \cdot \text{CX}_{1,2}$$

Because two-qubit CX gates have $5\times$ higher error rate ($0.005$ vs $0.001$) and take ~10x longer to execute on hardware than single-qubit rotations, every inserted SWAP increases circuit depth and error accumulation substantially.

### 6.4 Metric Extraction Methodology

The code extracts metrics in `processors/transpilation.py:81-113` as follows:
- `transpiled_depth`: `transpiled_qc.depth()`
- `transpiled_total_gates`: `sum(transpiled_qc.count_ops().values())`
- `transpiled_cx_count`: `transpiled_qc.count_ops().get('cx', 0)`
- `logical_basis_cx_count`: `unconstrained_qc.count_ops().get('cx', 0)`
- `cx_overhead`: $\Delta CX = CX_{\text{transpiled}} - CX_{\text{logical\_basis}}$
- `routing_swaps`: Computed via step 2: $\text{SWAP}_{\text{routed}} - \text{SWAP}_{\text{logical}}$

### 6.5 Real SWAP Count vs Estimated SWAP Count

The framework uses the dictionary key `"swap_gate_estimate"`, which might suggest a heuristic guess. However, an empirical audit confirms that **the reported SWAP count is an exact measurement of routing-inserted SWAPs**.

The following throwaway script was executed to inspect the exact gates:
```python
from processors.coupling_maps import load_processors
from processors.circuits import get_circuit_by_id
from processors.transpilation import transpile_to_processor

proc_a, proc_b = load_processors()
for cid in ['qft_5', 'ghz_5', 'cross_conn_5']:
    c = get_circuit_by_id(cid)
    for p in [proc_a, proc_b]:
        qc, m = transpile_to_processor(c, p, optimization_level=1, seed_transpiler=42)
        print(f"{cid} | {p.name}: CX_overhead={m['cx_overhead']}, Routing_SWAPs={m['routing_swaps']}, Stored_Estimate={m['swap_gate_estimate']}")
```

**Real Output**:
```
qft_5 | Processor A: CX_overhead=24, Routing_SWAPs=8, Stored_Estimate=8
qft_5 | Processor B: CX_overhead=6,  Routing_SWAPs=2, Stored_Estimate=2
ghz_5 | Processor A: CX_overhead=0,  Routing_SWAPs=0, Stored_Estimate=0
ghz_5 | Processor B: CX_overhead=0,  Routing_SWAPs=0, Stored_Estimate=0
cross_conn_5 | Processor A: CX_overhead=6,  Routing_SWAPs=2, Stored_Estimate=2
cross_conn_5 | Processor B: CX_overhead=0,  Routing_SWAPs=0, Stored_Estimate=0
```

Notice that:
$$\text{Routing SWAPs} = \frac{\Delta CX}{3}$$
- On QFT-5 (Proc A): $24 / 3 = 8$ routing SWAPs. (The 2 logical SWAPs in QFT are already in the logical basis and decompose into 6 CX; the router added 8 more SWAPs = 24 CX).
- On QFT-5 (Proc B): $6 / 3 = 2$ routing SWAPs.
- On Cross-Conn-5 (Proc A): $6 / 3 = 2$ routing SWAPs.
- On Cross-Conn-5 (Proc B): $0 / 3 = 0$ routing SWAPs.

In the final transpiled circuit, the raw count of `swap` operations is **0** because `swap` is not in the hardware basis `{rz, sx, x, cx}`. Instead, each SWAP appears physically as an alternating sequence `[cx(u,v), cx(v,u), cx(u,v)]`.

---

## 7. Simulation and Metrics

### 7.1 Simulation Execution Parameters
In `processors/benchmark.py:65-101`:
- **Simulator**: `qiskit_aer.AerSimulator`
- **Simulation Method**: Statevector / density matrix backend within Aer
- **Shots**: `4096`
- **RNG Seeds**:
  - Transpiler seed: `seed_transpiler = 42`
  - Simulator seed: `seed_simulator = 42`

### 7.2 Exact Mathematical Metrics Formulations

From `processors/metrics.py:10-52`:

#### 1. Classical Hellinger Fidelity ($F_H$)
$$F_H(P, Q) = \left( \sum_{x \in \Omega} \sqrt{P(x) \cdot Q(x)} \right)^2$$
Where $P(x) = \frac{\text{counts}_P(x)}{N}$ and $Q(x) = \frac{\text{counts}_Q(x)}{N}$ are normalized measurement probability mass functions, and $\text{BC}(P, Q) = \sum_x \sqrt{P(x)Q(x)}$ is the Bhattacharyya coefficient. $F_H \in [0.0, 1.0]$, where $1.0$ indicates identical probability distributions.

#### 2. Total Variation Distance (TVD)
$$\text{TVD}(P, Q) = \frac{1}{2}\sum_{x \in \Omega} |P(x) - Q(x)|$$
$\text{TVD} \in [0.0, 1.0]$, where $0.0$ indicates identical distributions. TVD represents the maximum difference between the probabilities assigned to any event by $P$ and $Q$.

### 7.3 Distribution Comparison Audit: What Is Actually Compared?
In `processors/benchmark.py:85-105`:
```python
exact_dist = get_exact_distribution(circuit_id, shots)

# Evaluates noisy simulation against exact theoretical baseline:
fidelity_a = compute_hellinger_fidelity(counts_a_noisy, exact_dist)
tvd_a = compute_tvd(counts_a_noisy, exact_dist)

# Evaluates shot noise floor (ideal sampled vs exact theoretical):
shot_noise_fidelity_floor = compute_hellinger_fidelity(counts_a_ideal, exact_dist)
shot_noise_tvd_floor = compute_tvd(counts_a_ideal, exact_dist)
```
- **Reported Fidelity and TVD**: Compares **Noisy-Sampled Counts** vs **Exact Theoretical Probabilities**.
- **Reported Shot-Noise Floor**: Compares **Ideal-Sampled Counts** vs **Exact Theoretical Probabilities**.

### 7.4 Multi-Seed Reproducibility Check (10 Independent Seeds)

To characterize statistical variance, 10 independent simulator seeds (`seeds = [42, 101, 202, 303, 404, 505, 606, 707, 808, 909]`) were evaluated across all circuits and processors:
- **(a) Ideal-Sampled vs Exact Theoretical Baseline**
- **(b) Noisy-Sampled vs Exact Theoretical Baseline**
- **(c1) Noisy-Sampled vs Ideal-Sampled (SAME Simulator Seed)**
- **(c2) Noisy-Sampled vs Ideal-Sampled (DIFFERENT Simulator Seed: $s + 7777$)**

#### Live Execution Results Table (Mean $\pm$ Std across 10 Seeds)

| Circuit & Processor | Comparison Mode | Hellinger Fidelity ($F_H$) | Total Variation Distance (TVD) |
|---|---|:---:|:---:|
| **QFT-5 (Proc A)** | (a) Ideal-Sampled vs Exact | $0.9983 \pm 0.0003$ | $0.0324 \pm 0.0042$ |
| | (b) Noisy-Sampled vs Exact | $0.9983 \pm 0.0004$ | $0.0324 \pm 0.0038$ |
| | (c1) Noisy vs Ideal (Same Seed) | **$0.9998 \pm 0.0001$** | **$0.0106 \pm 0.0016$** |
| | (c2) Noisy vs Ideal (Diff Seed) | $0.9964 \pm 0.0010$ | $0.0480 \pm 0.0069$ |
| **QFT-5 (Proc B)** | (a) Ideal-Sampled vs Exact | $0.9983 \pm 0.0003$ | $0.0324 \pm 0.0042$ |
| | (b) Noisy-Sampled vs Exact | $0.9983 \pm 0.0004$ | $0.0323 \pm 0.0039$ |
| | (c1) Noisy vs Ideal (Same Seed) | **$0.9998 \pm 0.0000$** | **$0.0107 \pm 0.0010$** |
| | (c2) Noisy vs Ideal (Diff Seed) | $0.9965 \pm 0.0009$ | $0.0471 \pm 0.0072$ |
| **GHZ-5 (Proc A & B)** | (a) Ideal-Sampled vs Exact | $0.9999 \pm 0.0001$ | $0.0089 \pm 0.0053$ |
| | (b) Noisy-Sampled vs Exact | $0.9365 \pm 0.0033$ | $0.0634 \pm 0.0033$ |
| | (c1) Noisy vs Ideal (Same Seed) | $0.9364 \pm 0.0032$ | $0.0634 \pm 0.0033$ |
| | (c2) Noisy vs Ideal (Diff Seed) | $0.9386 \pm 0.0025$ | $0.0613 \pm 0.0025$ |
| **Cross-Conn-5 (Proc A)** | (a) Ideal-Sampled vs Exact | $0.9983 \pm 0.0003$ | $0.0324 \pm 0.0042$ |
| | (b) Noisy-Sampled vs Exact | $0.9983 \pm 0.0004$ | $0.0325 \pm 0.0047$ |
| | (c1) Noisy vs Ideal (Same Seed) | **$0.9998 \pm 0.0001$** | **$0.0106 \pm 0.0015$** |
| | (c2) Noisy vs Ideal (Diff Seed) | $0.9965 \pm 0.0010$ | $0.0480 \pm 0.0073$ |
| **Cross-Conn-5 (Proc B)** | (a) Ideal-Sampled vs Exact | $0.9983 \pm 0.0003$ | $0.0324 \pm 0.0042$ |
| | (b) Noisy-Sampled vs Exact | $0.9983 \pm 0.0004$ | $0.0320 \pm 0.0040$ |
| | (c1) Noisy vs Ideal (Same Seed) | **$0.9998 \pm 0.0001$** | **$0.0110 \pm 0.0017$** |
| | (c2) Noisy vs Ideal (Diff Seed) | $0.9963 \pm 0.0010$ | $0.0481 \pm 0.0074$ |

### 7.5 Explanation of the "Too Good" Fidelity Paradox

> [!IMPORTANT]
> **Why earlier reports cited QFT-5 Fidelity ~0.9998 and TVD ~0.010**:
> Notice column (c1) in the table above: when comparing Noisy vs Ideal simulation **using the exact same random seed** (`seed_simulator=s`), the Hellinger fidelity is **$0.9998$** and TVD is **$0.0106$**.
> 
> In pseudo-random sampling, using the same seed causes Aer's PRNG to draw identical multinomial sampling trajectories for both runs. The only divergence between ideal and noisy counts occurs when a synthetic noise gate fires! Thus, the shot noise is correlated and cancels out, making the output look unnaturally pristine.
> 
> When compared properly against the exact theoretical distribution (column b) or an independent seed (column c2), finite sampling noise (shot noise) dominates: 4096 shots over 32 states has an intrinsic sampling TVD floor of $\approx \frac{1}{2}\sum_{i=1}^{32} \sqrt{\frac{1}{32 \cdot 4096}} \approx 0.032$. The stored value in `results/tables/processor_ab_results.csv` ($F_H = 0.9992$, $\text{TVD} = 0.0244$) reflects the exact comparison against the theoretical distribution under seed 42.

---

## 8. Results Actually Produced

### 8.1 Complete Table of Stored Results
Source: `results/tables/processor_ab_results.csv` and `data/processed/processor_ab_results.csv`  
SHA-256 Checksum: `14706E312201B44FABD58990C4885F11C13A604EEC987872E11BB4032FE374FF`

| Circuit ID | Processor | Physical Qubits | Coupling Edges | Logical Depth | Transpiled Depth | Logical Basis CX | Transpiled CX | CX Overhead | Routing SWAPs | Hellinger Fidelity | TVD | Shot-Noise Floor ($F_H$) | Shot-Noise Floor (TVD) | Timestamp (ISO-8601 UTC) |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| `qft_5` | Processor A | 5 | 4 | 17 | 77 | 26 | 50 | 24 | 8 | 0.9992 | 0.0244 | 0.9990 | 0.0242 | 2026-10-14T17:08:32.481Z |
| `qft_5` | Processor B | 9 | 12 | 17 | 63 | 26 | 32 | 6 | 2 | 0.9990 | 0.0256 | 0.9990 | 0.0242 | 2026-10-14T17:08:32.481Z |
| `ghz_5` | Processor A | 5 | 4 | 6 | 8 | 4 | 4 | 0 | 0 | 0.9403 | 0.0596 | 0.9997 | 0.0186 | 2026-10-14T17:08:32.752Z |
| `ghz_5` | Processor B | 9 | 12 | 6 | 8 | 4 | 4 | 0 | 0 | 0.9403 | 0.0596 | 0.9997 | 0.0186 | 2026-10-14T17:08:32.752Z |
| `cross_conn_5` | Processor A | 5 | 4 | 14 | 22 | 12 | 18 | 6 | 2 | 0.9991 | 0.0227 | 0.9990 | 0.0242 | 2026-10-14T17:08:32.997Z |
| `cross_conn_5` | Processor B | 9 | 12 | 14 | 16 | 12 | 12 | 0 | 0 | 0.9991 | 0.0247 | 0.9990 | 0.0242 | 2026-10-14T17:08:32.997Z |

### 8.2 Plain-Language Interpretation of Results

#### 1. Why Processor B Outperformed Processor A on `cross_conn_5`
- **Result**: Processor B eliminated all routing SWAPs ($0$ vs $2$) and saved $6$ CX gates ($12$ vs $18$ CX), reducing circuit depth from $22$ to $16$ ($27.3\%$ depth reduction).
- **Physical Reason**: Processor A is a rigid 1D linear chain ($0-1-2-3-4$). Any interaction between qubit $0$ and qubit $4$ requires shuttling states across intermediate nodes via SWAP sequences. Processor B features a heavy-hex inspired core with central routing hubs (nodes $1, 2, 5, 6, 8$) that form triangular and pentagonal cycles. The SABRE transpiler embeds the 5 logical qubits onto the induced physical subgraph $\{0, 1, 2, 6, 8\}$, where physical connections exist directly for every required interaction, completely bypassing SWAP gate insertion.

#### 2. Why Processor B Outperformed Processor A on `qft_5`
- **Result**: Processor B reduced CX gates by $36.0\%$ ($32$ vs $50$ CX) and reduced depth by $18.2\%$ ($63$ vs $77$ layers).
- **Physical Reason**: In QFT-5, every qubit must interact with all four other qubits ($10$ pairwise two-qubit operations). On a linear chain, global communication is heavily bottlenecked by the 4-hop diameter. On Processor B, the presence of node 6 (degree 5) allows the router to route information across central short-cuts rather than linear cascade relays.

#### 3. Why `ghz_5` Showed Zero Difference
- **Result**: Depth ($8$), CX count ($4$), SWAP count ($0$), and fidelity ($0.9403$) were identical down to the fourth decimal place.
- **Physical Reason**: GHZ-5 is inherently a 1D nearest-neighbor cascade (`(0,1)`, `(1,2)`, `(2,3)`, `(3,4)`). Since both processors contain a 1D linear path, Qiskit maps the logical qubits to physical qubits $0, 1, 2, 3, 4$ natively without inserting a single SWAP or ancillary gate.

#### 4. Which Differences Are Within Noise (Must NOT Be Called "Advantages")
- For both `qft_5` and `cross_conn_5`, the measured noisy Hellinger fidelities ($0.9990$ vs $0.9992$ on QFT; $0.9991$ on Cross-Conn) and TVD values ($0.0244$ vs $0.0256$) differ by less than $0.0012$.
- The shot-noise sampling floor for 4096 shots is $F_H \approx 0.9990$ and $\text{TVD} \approx 0.0242$.
- **Conclusion**: Any claim that Processor B has a "fidelity advantage" on QFT-5 or Cross-Conn-5 is scientifically invalid. The fidelity differences fall directly within the finite sampling variance. Processor B's advantage is **strictly algorithmic and topological compilation overhead** (depth, CX count, SWAPs).

### 8.3 Exact Reproducibility Verification
Executing `ProcessorBenchmarkRunner.run_all_circuits_benchmark(shots=4096, seed=42, optimization_level=1)` reproduces the stored CSV table with **$0.0000$ deviation**:
- `Max diff in transpiled_depth: 0`
- `Max diff in transpiled_cx: 0`
- `Max diff in cx_overhead: 0`
- `Max diff in routing_swaps: 0`
- `Max diff in hellinger_fidelity: 0.0000`
- `Max diff in tvd: 0.0000`

---

## 9. Backend/API and UI Wiring for the Framework

```
                          SYSTEM ARCHITECTURE & TRACE
  [Browser UI]
    |-- ProcessorBenchmarkPage.tsx (Controls: circuit_id, shots, opt_level, seed)
    |     |-- API Service: runProcessorBenchmark() (frontend/src/services/api.ts:89)
    |           |
    v           v
  [FastAPI Backend: http://127.0.0.1:8000]
    |-- POST /api/benchmarks/processors/run (backend/app/api/processor_benchmarks.py:18)
    |     |-- Request: ProcessorBenchmarkRequest (backend/app/schemas/processor_schemas.py:8)
    |     |-- Core Runner: ProcessorBenchmarkRunner.run_ab_benchmark() (processors/benchmark.py:31)
    |     |     |-- Load Models: load_processors() (processors/coupling_maps.py:86)
    |     |     |-- Transpiler: transpile_to_processor() (processors/transpilation.py:15)
    |     |     |-- Aer Simulator: AerSimulator.run() with reference noise model
    |     |     |-- Metrics: compute_hellinger_fidelity(), compute_tvd() (processors/metrics.py)
    |     |     +-- Plot Generator: generate_processor_comparison_figure() (processors/visualization.py)
    |     |-- Return: ProcessorBenchmarkResponse (Pydantic validated)
    |
    |-- GET /api/benchmarks/processors/latest --> Returns cached session results
    |-- GET /api/benchmarks/processors/export --> FileResponse("results/processors/processor_ab_results.csv")
    +-- GET /api/benchmarks/processors/chart  --> FileResponse("results/figures/processor_ab_comparison.png")
```

### 9.1 API Endpoints Breakdown

| Endpoint | HTTP Method | Request Body / Query Params | Response Model / Payload | Backend Handler Function | Backend Core Implementation |
|---|:---:|---|---|---|---|
| `/api/benchmarks/processors/run` | `POST` | `ProcessorBenchmarkRequest`<br>`{circuit_id: "qft_5", shots: 4096, optimization_level: 1, seed: 42, save_csv: true}` | `ProcessorBenchmarkResponse` | `run_processor_benchmark`<br>(`processor_benchmarks.py:18`) | `ProcessorBenchmarkRunner.run_ab_benchmark()`<br>(`processors/benchmark.py:31`) |
| `/api/benchmarks/processors/latest` | `GET` | None | `ProcessorBenchmarkResponse` | `get_latest_processor_benchmark`<br>(`processor_benchmarks.py:39`) | `ProcessorBenchmarkRunner.get_latest_result()` |
| `/api/benchmarks/processors/export` | `GET` | None | `FileResponse` (`text/csv`) | `export_processor_csv`<br>(`processor_benchmarks.py:47`) | Serves `results/processors/processor_ab_results.csv` |
| `/api/benchmarks/processors/chart` | `GET` | None | `FileResponse` (`image/png`) | `get_processor_chart`<br>(`processor_benchmarks.py:63`) | Serves `results/figures/processor_ab_comparison.png` |
| `/api/results/summary` | `GET` | None | JSON summary with `latest_processor_benchmark` | `get_results_summary`<br>(`backend/app/api/results.py:17`) | Aggregates system metrics, crypto, and processor results |

### 9.2 Frontend UI Components and Controls

1. **`ProcessorBenchmarkPage.tsx` (`frontend/src/pages/ProcessorBenchmarkPage.tsx`)**:
   - **Circuit Selector Dropdown** (`line 142`): Allows choosing `qft_5`, `ghz_5`, or `cross_conn_5`.
   - **Shots Input** (`line 160`): Number input bounded between 100 and 10,000 (default 4096).
   - **Optimization Level & Seed Inputs** (`lines 178-197`): Opt level (0-3, default 1) and Seed (default 42).
   - **Run Benchmark Button** (`line 204`): Dispatches `runProcessorBenchmark()` with visual loading spinner.
   - **Interactive Visualizers** (`lines 106-127`): Two instances of `<CouplingMapVisualizer>` with hoverable nodes.
   - **Recharts Grouped Bar Chart** (`lines 288-306`): Displays Transpiled Depth, CX count, and SWAPs.
   - **Download Buttons** (`lines 266-284`): Direct links to `/export` (CSV) and `/chart` (PNG).
2. **`OverviewPage.tsx` (`frontend/src/pages/OverviewPage.tsx`)**:
   - Renders overview cards with coupling diagrams and a button navigating to `ProcessorBenchmarkPage`.
3. **`CouplingMapVisualizer.tsx` (`frontend/src/components/CouplingMapVisualizer.tsx`)**:
   - SVG canvas (viewBox `0 0 400 240`) rendering active qubits, edges, and node degree tooltips.

### 9.3 Misleading, Mislabeled, or Dead UI Controls
- **`frontend/src/pages/pqc/ProcessorComparisonPage.tsx`**:
  - **Filename Mismatch**: The file is named `ProcessorComparisonPage.tsx`, but line 73 renders the heading `title="Platform A vs Platform B (Host CPU)"`.
  - **Dead Import**: Line 8 imports `{ CouplingMapVisualizer }`, but the component is **never rendered anywhere in the file**.
  - **Functionality**: This page executes classical host CPU crypto benchmarks (`runCryptoBenchmark('platform_a')` and `runCryptoBenchmark('platform_b')`), NOT quantum processor benchmarks!
- **Hardcoded Coupling in Visualizer Props**:
  - `ProcessorBenchmarkPage.tsx:110` and `OverviewPage.tsx:262` hardcode the edge arrays in TSX rather than fetching them dynamically from `/processors/processor_A.json`.
- **Browser Testing Status**:
  - **AUTOMATED BROWSER TESTING WAS NEVER RUN**. No Playwright, Cypress, Puppeteer, or Selenium configs exist in `package.json` or the repository. Frontend functionality has only been checked via manual browser interaction.

---

## 10. Figures, Exports, and Reproducibility

### 10.1 Inventory of Generated Figures and Tables

| Artifact Filename | Type | Generating Function & Source | Saved File Paths | Included in SHA256SUMS? | Regenerated by `main.ipynb`? |
|---|:---:|---|---|:---:|:---:|
| `processor_ab_results.csv` | CSV Table | `ProcessorBenchmarkRunner.run_ab_benchmark()`<br>(`processors/benchmark.py:173-233`) | `results/tables/`<br>`results/processors/`<br>`results/`<br>`data/processed/` | **YES**<br>(Hash: `14706E31...`) | **YES**<br>(Cell 9) |
| `processor_ab_comparison.png` | PNG Figure | `generate_processor_comparison_figure()`<br>(`processors/visualization.py:14`) | `results/figures/`<br>`assets/` | **YES**<br>(Hash: `eed97667...`) | **YES**<br>(Cell 11) |
| `processor_coupling_maps.png` | PNG Figure | `plot_coupling_topologies()`<br>(`src/visualization.py:199`) | `results/figures/`<br>`assets/` | **YES**<br>(Hash: `2c813d23...`) | **YES**<br>(Cell 10) |
| `crypto_benchmark_summary.csv` | CSV Table | `CryptoBenchmarkService.run_benchmark()`<br>(`backend/app/services/crypto_benchmark_service.py`) | `results/tables/`<br>`data/processed/` | **YES**<br>(Hash: `c94ce686...`) | **YES**<br>(Cell 6) |
| `crypto_latency_breakdown.png` | PNG Figure | `plot_handshake_latency()`<br>(`src/visualization.py:36`) | `results/figures/`<br>`assets/` | **YES**<br>(Hash: `2917201e...`) | **YES**<br>(Cell 8) |
| `crypto_message_sizes.png` | PNG Figure | `plot_message_sizes()`<br>(`src/visualization.py:100`) | `results/figures/`<br>`assets/` | **YES**<br>(Hash: `726a3b69...`) | **YES**<br>(Cell 8) |
| `crypto_memory_overhead.png` | PNG Figure | `plot_memory_overhead()`<br>(`src/visualization.py:147`) | `results/figures/`<br>`assets/` | **YES**<br>(Hash: `6a957be0...`) | **YES**<br>(Cell 8) |
| `manifest.json` | JSON | `CryptoBenchmarkService.export_manifest()` | `results/` | **YES** (in results/) | **YES** (via crypto run) |
| `benchmark_results.json` | JSON | `CryptoBenchmarkService.export_json()` | `results/` | **YES** (in results/) | **YES** (via crypto run) |

### 10.2 Manifest and Checksum Integrity
- Root `SHA256SUMS` contains checksums for 12 files (CSVs, PNGs, `report.md`, `README.md`, `main.ipynb`).
- `results/SHA256SUMS.txt` contains checksums for 10 files in `results/`.
- **Manifest Scope Limitation**: `results/manifest.json` tracks only the cryptographic benchmark run metadata (`run_id: "DUAL-DD0BC0FB-6596FE8C"`, iterations: 200, platform: both). It **omits** metadata for the quantum processor runs (circuit ID, shots, transpiler seed).

### 10.3 Top-to-Bottom Execution of `main.ipynb`

To verify reproducibility, `main.ipynb` was executed top-to-bottom in memory via `nbclient`:
```python
import nbformat, nbclient
nb = nbformat.read('main.ipynb', as_version=4)
client = nbclient.NotebookClient(nb, timeout=600, kernel_name='python3')
client.execute()
print("Notebook executed successfully top-to-bottom!")
```

**Real Command Execution Output**:
```
[IPKernelApp] WARNING | Kernel is running over TCP without encryption...
Notebook executed successfully top-to-bottom!
Exit code: 0
```
Every cell executed cleanly without throwing exceptions.

### 10.4 Software Environment & Version Audit

| Package / Software | Pinned in `requirements.txt` | Actually Installed in Environment | Version Match Status |
|---|:---:|:---:|:---:|
| **Python** | N/A (Guide recommends $\ge 3.10$) | `3.10.11` | **Compliant** |
| **qiskit** | `2.2.3` | `2.2.3` | **Exact Match** |
| **qiskit-aer** | `0.17.2` | `0.17.2` | **Exact Match** |
| **networkx** | `3.4.2` | `3.4.2` | **Exact Match** |
| **cryptography** | `50.0.2` | `50.0.2` | **Exact Match** |
| **numpy** | `1.26.4` | `1.26.4` | **Exact Match** |
| **pandas** | `2.2.3` | `2.2.3` | **Exact Match** |
| **matplotlib** | `3.9.0` | `3.9.0` | **Exact Match** |
| **psutil** | `7.2.2` | `7.2.2` | **Exact Match** |
| **fastapi** | `0.141.1` | `0.141.1` | **Exact Match** |
| **uvicorn** | `0.52.0` | `0.52.0` | **Exact Match** |
| **pydantic** | `2.13.4` | `2.13.4` | **Exact Match** |
| **nbformat** | `5.10.4` | `5.10.4` | **Exact Match** |
| **nbconvert** | `7.17.1` | `7.17.1` | **Exact Match** |
| **pytest** | `9.1.1` | `9.1.1` | **Exact Match** |
| **httpx** | `0.28.1` | `0.28.1` | **Exact Match** |

Every package version pinned in `requirements.txt` matches the runtime environment with zero drift.

---

## 11. Tests and Verification Coverage

### 11.1 Test Suite Inventory

#### In `processors/tests/test_processors.py`:
1. `test_processors_loading_and_validation`: Loads `processor_A.json` and `processor_B.json`, asserts `num_qubits` are 5 and 9, and calls `.validate()` to assert both graphs are connected.
2. `test_circuits_generation`: Instantiates `ghz_5`, `qft_5`, and `cross_conn_5`, asserting `num_qubits == 5` on all.
3. `test_circuit_transpilation`: Transpiles `ghz_5` on Processor A and B with `opt_level=1, seed=42`, asserting `transpiled_depth > 0` and `transpiled_cx_count >= 4`.
4. `test_noise_model`: Instantiates `create_reference_noise_model()`, asserting it is not None and `'cx'` is in `basis_gates`.
5. `test_fidelity_metrics`: Tests `compute_hellinger_fidelity` and `compute_tvd` on identical counts (asserting $1.0$ and $0.0$) and perturbed counts (asserting $0.0 < F_H < 1.0$).
6. `test_routing_overhead_calculation`: Calls `calculate_routing_overhead(logical_cx=4, transpiled_cx=10)`, asserting `cx_overhead == 6` and `swap_gate_estimate == 2.0`.

#### In `backend/tests/`:
1. `backend/tests/test_api.py:test_processor_benchmark_api`: Calls `POST /api/benchmarks/processors/run` via FastAPI `TestClient`, asserting HTTP 200 and presence of `processor_a`, `processor_b`, and `comparison_summary`.
2. `backend/tests/test_stage3_benchmark_validation.py:test_decoupling_of_cpu_profiles_and_quantum_topologies`: Asserts that `Platform A/B` (host CPU affinity) and `Processor A/B` (quantum topologies) are strictly decoupled and do not leak state.
3. `backend/tests/test_stage4_api_integration.py:test_processor_benchmark_run_and_exports`: Tests live benchmark execution, `/latest`, `/export`, and `/chart` endpoints.

### 11.2 Real Test Execution Output
Executed via:
```powershell
$env:PYTHONPATH="."; python -m pytest -v
```

**Real Output Summary**:
```
============================= test session starts =============================
platform win32 -- Python 3.10.11, pytest-9.1.1, pluggy-1.6.0
collected 85 items

backend/tests/test_api.py::test_root_endpoint PASSED                     [  1%]
backend/tests/test_api.py::test_health_endpoint PASSED                   [  2%]
backend/tests/test_api.py::test_hybrid_exchange_api PASSED               [  3%]
backend/tests/test_api.py::test_crypto_benchmark_api PASSED              [  4%]
backend/tests/test_api.py::test_processor_benchmark_api PASSED           [  5%]
...
processors/tests/test_processors.py::test_processors_loading_and_validation PASSED [ 94%]
processors/tests/test_processors.py::test_circuits_generation PASSED     [ 95%]
processors/tests/test_processors.py::test_circuit_transpilation PASSED   [ 96%]
processors/tests/test_processors.py::test_noise_model PASSED             [ 97%]
processors/tests/test_processors.py::test_fidelity_metrics PASSED        [ 98%]
processors/tests/test_processors.py::test_routing_overhead_calculation PASSED [100%]

====================== 85 passed, 15 warnings in 52.07s =======================
```

> [!WARNING]
> **Side Effect of Test Execution**: Running `test_processor_benchmark_run_and_exports` and `test_crypto_benchmark_execution_and_retrieval` causes the tests to write fresh CSV and JSON outputs directly into `results/tables/` and `data/processed/`. In a production CI/CD pipeline, tests should mock or use temporary directories (`tmp_path`) to avoid modifying repository artifacts during test runs.

### 11.3 Important Behaviors with Zero Test Coverage
1. **No test for `run_all_processor_benchmarks()`**: The function generating the master 6-row comparative CSV is never executed in `processors/tests/`.
2. **No test for noise rate accuracy**: `test_noise_model` only checks `'cx' in noise.basis_gates`; it never asserts that $p_{1q} = 0.001$, $p_{2q} = 0.005$, or $p_{ro} = 0.01$.
3. **No transpilation test for `qft_5` or `cross_conn_5`**: Only `ghz_5` is transpiled in unit tests.
4. **No test for exact theoretical distribution accuracy**: `get_exact_distribution` is completely untested.
5. **No test verifying basis gate restriction**: Unit tests never assert that `transpiled_qc.count_ops()` contains only `rz`, `sx`, `x`, `cx`.
6. **No test for seed determinism**: No test runs two identical transpilation calls to assert deterministic outputs.
7. **No UI / Browser tests**: Zero automated frontend test coverage.

---

## 12. Gaps, Risks, and Honesty Review

### 12.1 Ranked List of Gaps and Discrepancies

| Rank | Severity | Issue / Discrepancy | Location (File & Line) | Evidence & Suggested Fix |
|:---:|:---:|---|---|---|
| **1** | **High** | **Processor A Reported as 4 Physical Qubits** in Report | `report.md:176`<br>`README.md:202`<br>`scripts/sync_reports_exact.py:98` | **Evidence**: In `sync_reports_exact.py:98`, the script formats table rows as `{4 if 'A' in proc else 9}`, printing `4` for Processor A's qubit count. Processor A has 5 qubits ($0 \dots 4$).<br>**Fix**: Change to `{5 if 'A' in proc else 9}`. |
| **2** | **High** | **Processor B Diameter Misstated as 3 Hops** | `report.md:145`<br>`processors/README.md:27`<br>`src/visualization.py:244`<br>`frontend/ProcessorBenchmarkPage.tsx:335` | **Evidence**: NetworkX shortest path between Node 0 and Node 4 is strictly 4 hops (`[0,1,2,3,4]`). Diameter is **4**, not 3.<br>**Fix**: Update all docs, figure titles, and UI text from "Diameter 3" to "Diameter 4". |
| **3** | **Medium** | **Processor B Maximum Degree Misstated as 4** | `report.md:145` | **Evidence**: Node 6 has 5 incident edges: `[1,6], [2,6], [5,6], [6,7], [6,8]`. Max degree is **5**, not 4.<br>**Fix**: Correct `report.md` text to state `Maximum Degree: 5 (Node 6)`. |
| **4** | **Medium** | **QFT-5 Fidelity Overstated in Documentation** | `report.md:176, 190`<br>`README.md:202` | **Evidence**: Table states Hellinger fidelity is `0.9998` and floor is `0.9956`. Live runs and stored CSVs produce fidelity `0.9992` (Proc A) and floor `0.9990`. The overstated 0.9998 was measured comparing noisy vs ideal under identical random seeds.<br>**Fix**: Update `report.md` and `README.md` to match the exact CSV values (`0.9992` and `0.9990`). |
| **5** | **Medium** | **Single Source of Truth Violation: Hardcoded Maps in Frontend** | `frontend/src/pages/ProcessorBenchmarkPage.tsx:110, 122`<br>`frontend/src/pages/OverviewPage.tsx:262, 269`<br>`frontend/src/components/CouplingMapVisualizer.tsx:32` | **Evidence**: Coupling edges and SVG node positions are hardcoded in React TSX files rather than fetched from backend JSON.<br>**Fix**: Add a `GET /api/benchmarks/processors/topologies` endpoint and fetch dynamically in React. |
| **6** | **Medium** | **JSON Synthetic Noise Settings Bypassed at Runtime** | `processors/benchmark.py:67`<br>`processors/noise_models.py:13` | **Evidence**: `ProcessorBenchmarkRunner` calls `create_reference_noise_model()` with no arguments, ignoring the `synthetic_noise` fields in `processor_A.json` and `processor_B.json`.<br>**Fix**: Pass `proc_a.synthetic_noise` to the constructor. |
| **7** | **Medium** | **Mislabeled Frontend Page (`ProcessorComparisonPage.tsx`)** | `frontend/src/pages/pqc/ProcessorComparisonPage.tsx` | **Evidence**: Page is named as a processor page, imports `CouplingMapVisualizer`, but actually executes host CPU benchmarks and never uses the visualizer.<br>**Fix**: Rename file to `PlatformComparisonPage.tsx` and remove unused `CouplingMapVisualizer` import. |
| **8** | **Low** | **Metric Naming Ambiguity (`swap_gate_estimate`)** | `processors/transpilation.py:102`<br>`processors/metrics.py:79` | **Evidence**: The field is named `swap_gate_estimate`, leading users to believe it is an imprecise guess, even though it is an exact measurement of routing-inserted SWAPs.<br>**Fix**: Standardize on `routing_swaps`. |
| **9** | **Low** | **Manifest Omits Quantum Benchmarks** | `results/manifest.json` | **Evidence**: `manifest.json` only tracks the crypto dual-run ID; no record of circuit transpilation parameters exists in the manifest.<br>**Fix**: Include quantum benchmark execution summary in `manifest.json`. |
| **10** | **Low** | **Fixed 5-Qubit Benchmark Circuits** | `processors/circuits.py:18, 41, 56` | **Evidence**: All test circuits are hardcoded to $n=5$, preventing benchmarking of chips with $<5$ or $>9$ qubits.<br>**Fix**: Parameterize `n` in circuit factory functions. |

### 12.2 Grep Audit of Sensitive Marketing Claims
The repository was scanned for sensitive terminology:
- `"advantage"`: Occurs only in context of "Topological Advantage / Delta" in table headers and logs; never claims cryptographic advantage.
- `"saved"`: Used exclusively in UI/CLI text to denote "Saved ~6 SWAP operations" (topological routing difference).
- `"proof"`: Found in `security_analysis.md:31`, where it explicitly states: *"It does not claim a novel zero-knowledge or formally verified machine-checked proof."*
- `"IBM"`, `"Falcon"`, `"Manila"`, `"real quantum"`: **0 occurrences** found in the codebase. The project strictly states that simulations are conducted on classical CPUs via Qiskit Aer.

### 12.3 Threats to Scientific Validity
1. **Simulation Only**: All quantum results are generated by Qiskit Aer simulations on an x86_64 CPU; no physical quantum hardware was used.
2. **Simplified Noise**: The synthetic noise model uses uniform depolarizing channels and symmetric readout bit-flips. It does not reflect coherent errors, $T_1/T_2$ relaxation, spectator crosstalk, or spatial calibration drifts found on physical QPUs.
3. **Small Circuit Scale**: Benchmarking 5-qubit circuits on 5-qubit and 9-qubit topologies provides useful educational insight into routing algorithms, but does not capture the asymptotic routing complexity of large-scale quantum algorithms.
4. **Finite Shot Noise Floor**: At 4096 shots, the sampling variance for 32 output states creates a TVD floor of $\sim 0.024$. The measured fidelities on QFT-5 and Cross-Conn-5 are dominated by this sampling floor rather than gate noise.

---

## 13. Extension Readiness for Phase 2 (Processor C and Custom Processor D)

### 13.1 Step-by-Step Implementation Guide to Add Processor C

To add a new architecture (e.g. **Processor C: 16-qubit heavy-hex** or **Custom Processor D**) during Phase 2, follow these steps:

```
                                  PHASE 2 EXTENSION WORKFLOW
  1. Create JSON Specification
     `processors/processor_C.json` (qubits, edges, basis gates)
                 |
                 v
  2. Update Backend Loaders & Runner
     `processors/coupling_maps.py`: Update load_processors() or add load_processor_by_id("C")
     `processors/benchmark.py`: Refactor run_ab_benchmark() to run_arbitrary_processors([A, B, C])
                 |
                 v
  3. Update API & Schemas
     `backend/app/schemas/processor_schemas.py`: Replace static processor_a/b with Dict[str, ProcessorData]
     `backend/app/api/processor_benchmarks.py`: Support processor selection in request
                 |
                 v
  4. Generalize Frontend Visualizer & Page
     `frontend/src/components/CouplingMapVisualizer.tsx`: Implement force-directed SVG layout
     `frontend/src/pages/ProcessorBenchmarkPage.tsx`: Fetch topologies dynamically from API
```

#### Step 1: Create Topology JSON (`processors/processor_C.json`)
Create the configuration file defining the graph structure:
```json
{
  "name": "Processor C",
  "architecture_id": "processor_c_hex_16q",
  "num_qubits": 16,
  "qubit_indices": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  "topology_type": "Heavy-Hexagonal Grid",
  "coupling_map": [
    [0, 1], [1, 2], [2, 3], [1, 4], [3, 5], [4, 6], [5, 7],
    [6, 8], [7, 9], [8, 10], [9, 11], [10, 12], [11, 13], [12, 14], [13, 15]
  ],
  "basis_gates": ["rz", "sx", "x", "cx"],
  "description": "16-qubit heavy-hexagonal architecture for Phase 2 offline evaluation.",
  "transpile_settings": { "optimization_level": 1, "seed": 42, "shots": 4096 },
  "synthetic_noise": {
    "single_qubit_depolarizing_error": 0.001,
    "two_qubit_cx_depolarizing_error": 0.005,
    "readout_error": 0.01
  }
}
```
*Estimated Time: 5 minutes.*

#### Step 2: Update Python Loaders & Routing Module
- In `processors/coupling_maps.py`: Add `load_processor_by_name(name: str) -> ProcessorTopology` or update `load_processors()` to return all available JSON files in `processors/`.
- In `src/processors.py`: Add `get_processor_c() -> ProcessorTopology` and update `PROCESSOR_C_JSON = PROCESSORS_DIR / "processor_C.json"`.
*Estimated Time: 5 minutes.*

#### Step 3: Generalize Benchmark Runner (`processors/benchmark.py`)
Currently, `run_ab_benchmark` hardcodes `proc_a, proc_b = load_processors()`.
- Refactor `run_ab_benchmark()` to accept a list of processor objects or an arbitrary target processor ID.
- Update the CSV export loop to iterate dynamically over `[proc_a, proc_b, proc_c]`.
*Estimated Time: 10 minutes.*

#### Step 4: Update Pydantic Schemas (`backend/app/schemas/processor_schemas.py`)
Replace the static fields:
```python
# Before (Breaks with Processor C):
class ProcessorBenchmarkResponse(BaseModel):
    processor_a: ProcessorData
    processor_b: ProcessorData

# After (Phase 2 Dynamic):
class ProcessorBenchmarkResponse(BaseModel):
    processors: Dict[str, ProcessorData]
    comparison_summary: Optional[Dict[str, Any]] = None
```
*Estimated Time: 5 minutes.*

#### Step 5: Generalize Frontend Visualizer (`CouplingMapVisualizer.tsx`)
In `CouplingMapVisualizer.tsx:24-44`, replace hardcoded coordinate tables with a general layout function (e.g. circle layout or simple force-directed layout):
```typescript
const getNodeCoordinates = (id: number): { x: number; y: number } => {
  const angle = (2 * Math.PI * id) / numQubits;
  return {
    x: 200 + 85 * Math.cos(angle),
    y: 120 + 85 * Math.sin(angle)
  };
};
```
*Estimated Time: 5 minutes.*

**Total Estimated Implementation Time**: ~30 minutes.

### 13.2 Hardcoded Assumptions That Will Break If Not Updated
1. **2-Tuple Processor Loader**: `load_processors()` in `processors/coupling_maps.py:86` returns exactly two values `(proc_a, proc_b)`. Unpacking into two variables will raise `ValueError: too many values to unpack`.
2. **Fixed Pydantic Schema**: `ProcessorBenchmarkResponse` requires keys `processor_a` and `processor_b`. Omitting either or adding `processor_c` causes a FastAPI validation crash (HTTP 500).
3. **Fixed Circuit Size (5 Qubits)**: If Processor C has fewer than 5 qubits, `transpile()` will throw `TranspilerError: Circuit has 5 qubits but coupling map has only N qubits`.
4. **SVG Node Stacking in UI**: `CouplingMapVisualizer.tsx:43` falls back to `{ x: 200, y: 120 }` for any qubit ID not in $\{0 \dots 8\}$, stacking all nodes on top of each other.
5. **Exact Distribution Bitstrings**: `get_exact_distribution()` in `processors/circuits.py:110` formats bitstrings as `'05b'`. If a circuit has 7 or 16 qubits, this function must format with `'07b'` or `'016b'`.

### 13.3 30-Minute Competition Checklist
- [ ] 1. Copy `processors/processor_B.json` to `processors/processor_C.json` and paste new coupling edges.
- [ ] 2. Test graph connectivity via Python: `ProcessorTopology.from_json_file("processors/processor_C.json").validate()`.
- [ ] 3. Ensure test circuits have `num_qubits <= processor_c.num_qubits`.
- [ ] 4. Add `get_processor_c()` in `src/processors.py`.
- [ ] 5. Run single transpilation test: `transpile_to_processor(get_circuit_by_id('qft_5'), proc_c)`.
- [ ] 6. Update CSV export in `processors/benchmark.py` to write `Processor C` rows.
- [ ] 7. Update `CouplingMapVisualizer.tsx` layout coordinate function for $N$ nodes.
- [ ] 8. Verify FastAPI endpoint: `curl -X POST http://127.0.0.1:8000/api/benchmarks/processors/run`.
- [ ] 9. Run pytest suite to ensure no regressions: `python -m pytest processors/tests/`.
- [ ] 10. Re-generate comparison plot `results/figures/processor_ab_comparison.png`.

### 13.4 Top 10 Most Likely Failure Points
1. **Disconnected Coupling Graph**: If coupling edges do not form a connected component, `transpile()` enters an infinite routing loop or raises `TranspilerError`.
2. **One-Way Directed Edges**: Forgetting that `CouplingMap` in Qiskit requires bidirectional pairs `[u, v]` and `[v, u]`. (Handled automatically by `ProcessorTopology`, but manual edge additions may miss this).
3. **Pydantic Validation Rejection**: Adding new fields to API response without updating `ProcessorBenchmarkResponse`.
4. **Qubit Index Out of Bounds**: Adding an edge `[15, 16]` when `num_qubits = 16` (0-indexed indices must be $0 \dots 15$).
5. **Exceeding Circuit Size**: Attempting to transpile a 7-qubit circuit onto 5-qubit Processor A.
6. **Hardcoded SVG Coordinate Collisions**: Rendering node coordinates out of viewBox bounds ($400 \times 240$) in React.
7. **Simulation Memory Explosion**: Increasing circuit size to $>25$ qubits in statevector Aer simulation will exhaust host RAM ($2^{25}$ complex amplitudes $\approx 512\text{ MB}$; $2^{30} \approx 16\text{ GB}$).
8. **Stale CSV Caching**: Forgetting to re-run `run_all_processor_benchmarks()` before inspecting `results/tables/processor_ab_results.csv`.
9. **Seed Inconsistencies**: Running transpiler with unseeded random SABRE routing, producing non-deterministic SWAP counts.
10. **Recharts Frontend Key Collision**: Recharts bar keys in `ProcessorBenchmarkPage.tsx` are hardcoded strings (`"Processor A (5Q Linear)"`); adding a third bar requires manual data key mapping in JSX.

---

## 14. Learning Appendix

### 14.1 Plain-English Glossary

- **Qubit (Quantum Bit)**: The fundamental unit of quantum information, existing in superpositions of basis states $|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$, where $|\alpha|^2 + |\beta|^2 = 1$.
- **Coupling Map**: A directed or undirected graph defining which pairs of physical qubits have physical hardware interconnects capable of executing two-qubit operations.
- **Topology**: The geometric and graph-theoretic layout of qubits and coupling edges on a quantum chip (e.g. 1D linear chain, 2D heavy-hexagonal grid).
- **Node Degree**: The number of coupling edges connected to a specific qubit. Higher degree provides more routing pathways.
- **Graph Diameter**: The maximum shortest-path distance (in hops) between any pair of qubits on the processor graph.
- **Basis Gates**: The small, finite set of native physical gates that the hardware can physically execute (e.g. `{rz, sx, x, cx}`). All other operations must be decomposed into this set.
- **Transpilation**: The compiler process of rewriting a high-level quantum circuit into an equivalent circuit that adheres to a specific processor's basis gates and coupling map.
- **Layout**: The initial placement step that assigns each logical/virtual qubit in a circuit to a physical qubit on the chip.
- **Routing**: The insertion of SWAP gates to move qubit states across the processor coupling graph so that two-qubit gates can execute between physically adjacent qubits.
- **SWAP Gate**: A two-qubit operation that exchanges quantum states between two qubits; on transmon hardware, it decomposes into 3 CX gates.
- **CX (Controlled-NOT / CNOT)**: A two-qubit entangling gate that flips the target qubit if and only if the control qubit is in state $|1\rangle$.
- **Circuit Depth**: The maximum number of sequential gate layers on any qubit path in a circuit; directly correlates with total execution time and decoherence decay.
- **Depolarizing Noise**: An isotropic quantum error channel that replaces a qubit's state with the maximally mixed state ($I/2$) with probability $p$.
- **Readout Error**: Classical measurement error where a qubit in state $|0\rangle$ is misclassified as $|1\rangle$, or vice versa, during state discrimination.
- **Shots**: The number of repeated independent circuit executions and measurements performed to estimate output probability distributions.
- **Seed**: A fixed integer used to initialize pseudo-random number generators, guaranteeing exact, deterministic reproducibility across runs.
- **Ideal vs Noisy Simulation**: Ideal simulation computes statevector evolution according to unitary Schrödinger physics without errors; noisy simulation incorporates stochastic Kraus operators or error channels.
- **Hellinger Fidelity ($F_H$)**: A classical statistical distance metric based on the Bhattacharyya coefficient that measures the geometric overlap between two discrete probability distributions ($F_H \in [0, 1]$).
- **Total Variation Distance (TVD)**: Half the sum of absolute probability differences between two distributions; measures the statistical indistinguishability of two distributions ($TVD \in [0, 1]$).
- **Shot-Noise Floor**: The unavoidable statistical variance and sampling error arising from taking a finite number of measurement shots ($N=4096$) from a discrete probability distribution.

---

### 14.2 Walk-Through of a Complete Run (GHZ-5 & QFT-5)

This section traces a live execution of `run_ab_benchmark()` from API call to CSV row generation.

```
+----------------------------------------------------------------------------------------------------+
| 1. API REQUEST                                                                                     |
|    POST /api/benchmarks/processors/run                                                             |
|    Payload: {"circuit_id": "qft_5", "shots": 4096, "optimization_level": 1, "seed": 42}            |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
| 2. TOPOLOGY & CIRCUIT LOAD                                                                         |
|    - Loads Processor A (5Q Linear, 4 edges) from processors/processor_A.json                        |
|    - Loads Processor B (9Q Heavy-Hex, 12 edges) from processors/processor_B.json                    |
|    - Instantiates QFT-5 (17 layers, 10 CP gates, 2 SWAP gates)                                     |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
| 3. TRANSPILATION (Optimization Level 1, Seed 42, Basis: ['rz', 'sx', 'x', 'cx'])                   |
|                                                                                                    |
|    Processor A (5Q Linear Chain):                                                                  |
|      - SABRE Initial Layout: q0->P1, q1->P2, q2->P0, q3->P3, q4->P4                                 |
|      - Router Inserts: 8 routing SWAPs (24 CX gates) to navigate linear 4-hop chain                |
|      - Transpiled Depth: 77 | Transpiled CX: 50 | Total Gates: 105                                 |
|                                                                                                    |
|    Processor B (9Q Heavy-Hex):                                                                     |
|      - SABRE Initial Layout: q0->P5, q1->P2, q2->P6, q3->P3, q4->P4 (Ancillae: P0, P1, P7, P8)     |
|      - Router Inserts: 2 routing SWAPs (6 CX gates) via central hub Node 6                         |
|      - Transpiled Depth: 63 | Transpiled CX: 32 | Total Gates: 82                                  |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
| 4. QISKIT AER NOISY SIMULATION (Shots=4096, Seed=42)                                               |
|    - Noise Model: 1Q depol (0.001), 2Q depol (0.005), Readout bit-flip (0.01)                      |
|    - Processor A Sampled: 4096 shots over 32 states (P_avg = 128 counts/state)                      |
|    - Processor B Sampled: 4096 shots over 32 states (P_avg = 128 counts/state)                      |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
| 5. STATISTICAL METRICS (Compared against exact theoretical uniform baseline: P=1/32)               |
|    - Processor A: Hellinger Fidelity = 0.9992 | TVD = 0.0244                                       |
|    - Processor B: Hellinger Fidelity = 0.9990 | TVD = 0.0256                                       |
|    - Theoretical Shot-Noise Sampling Floor: F_floor = 0.9990 | TVD_floor = 0.0242                  |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
| 6. CSV EXPORT & VISUALIZATION                                                                      |
|    - Appends row to results/tables/processor_ab_results.csv                                        |
|    - Generates results/figures/processor_ab_comparison.png                                         |
+----------------------------------------------------------------------------------------------------+
```

#### Physical Gate Decomposition Snippet (Live QFT-5 Execution on Processor B)
Below is the real physical gate sequence for the first SWAP operation inserted on Processor B between physical qubits 4 and 5:
```
cx physical qubits [4, 5]
cx physical qubits [5, 4]
cx physical qubits [4, 5]
```
This 3-CX sequence physically swaps the state of qubit 4 and qubit 5, allowing qubit 4 to interact with qubit 3 on the next gate cycle.

---

### 14.3 25 Likely Judge Questions with Code-Grounded Answers

1. **Q: Does this project run on real IBM quantum hardware?**  
   *A*: No. It simulates quantum architectures in software using Qiskit Aer 0.17.2. Real hardware execution was not part of Phase 1 requirements.
2. **Q: Why does the post-quantum cryptography benchmark (PS-P1) have nothing to do with quantum circuits?**  
   *A*: Post-quantum algorithms (ML-KEM-768) are classical mathematical algorithms designed to run on classical CPUs to withstand future quantum attacks. Simulating quantum cryptanalysis (Shor's algorithm) would require millions of physical qubits, which cannot be simulated on classical workstations.
3. **Q: What is the connection between Platform A/B and Processor A/B?**  
   *A*: They are separate benchmarks. Platform A/B benchmarks classical CPU thread affinity for cryptographic key exchange. Processor A/B benchmarks quantum coupling topologies in Qiskit.
4. **Q: Is the SWAP count an estimate or an exact measurement?**  
   *A*: It is an exact measurement of routing-inserted SWAPs. While the Pydantic schema uses the key `swap_gate_estimate`, `processors/transpilation.py:62-70` transpiles with `swap` in the basis to count exact routing SWAPs, which equals $\Delta CX / 3$.
5. **Q: Why are QFT-5 fidelities so high (~0.999) under noise?**  
   *A*: Ideal QFT on $|00000\rangle$ produces a uniform superposition over all 32 states. Depolarizing noise also drives states towards a uniform mixture ($I/32$). Because the ideal and noisy distributions have nearly identical measurement probabilities, Hellinger fidelity remains close to 1.0.
6. **Q: Why does GHZ-5 produce identical results on Processor A and Processor B?**  
   *A*: GHZ-5 is a 1D nearest-neighbor chain. Both Processor A (a linear chain) and Processor B (which contains linear subgraphs) map it natively with 0 SWAPs, 4 CX gates, and depth 8.
7. **Q: Why did Processor B achieve 0 SWAPs on `cross_conn_5`?**  
   *A*: Processor B's 12-edge graph contains central routing cycles. SABRE embeds the 5 logical qubits onto physical nodes $\{0, 1, 2, 6, 8\}$, where physical edges exist for all required two-qubit interactions without routing SWAPs.
8. **Q: What is the graph diameter of Processor B?**  
   *A*: NetworkX calculates it as **4 hops** ($\text{dist}(0, 4) = 4$). Documentation claiming diameter 3 was an analytical oversight.
9. **Q: What is the maximum node degree of Processor B?**  
   *A*: Node 6 has **5 incident edges** (`[1,6], [2,6], [5,6], [6,7], [6,8]`). Documentation stating max degree 4 was incorrect.
10. **Q: Why does `report.md` say Processor A has 4 physical qubits?**  
    *A*: A bug in `scripts/sync_reports_exact.py:98` (`{4 if 'A' in proc else 9}`) printed 4 instead of 5. Processor A has 5 qubits ($0 \dots 4$).
11. **Q: How is the synthetic noise model made identical between processors?**  
    *A*: A single `NoiseModel` instance is constructed in `processors/noise_models.py` and passed to `AerSimulator`, ensuring identical error rates ($p_{1q}=0.001$, $p_{2q}=0.005$, $p_{ro}=0.01$).
12. **Q: What physical error mechanisms are omitted from the noise model?**  
    *A*: $T_1$ relaxation, $T_2$ dephasing, spectator idle decoherence, ZZ crosstalk, and state leakage.
13. **Q: What is the shot-noise floor?**  
    *A*: The statistical sampling variance resulting from taking 4096 shots over 32 states. For 32 uniform states, sampling variance establishes a baseline TVD of $\approx 0.024$ and fidelity floor of $\approx 0.9990$.
14. **Q: Why did earlier documentation claim QFT-5 fidelity was 0.9998?**  
    *A*: Earlier test scripts compared noisy-sampled counts against ideal-sampled counts generated with the **same random seed**, causing sampling noise to cancel.
15. **Q: What transpiler optimization level was used?**  
    *A*: Level 1 (`optimization_level=1`) with deterministic seed `42`, complying with the Phase 1 Master Guide.
16. **Q: What are the basis gates used by both processors?**  
    *A*: `{rz, sx, x, cx}`.
17. **Q: Why does Processor A use a linear chain instead of a branching tree?**  
    *A*: The team chose the linear chain reference variant to evaluate the worst-case communication diameter (diameter 4).
18. **Q: Is the JSON file the single source of truth for processor topology?**  
    *A*: In the backend Python modules, yes. However, coupling maps are duplicated in frontend React files.
19. **Q: What does `test_processors.py` test?**  
    *A*: Graph connectivity, circuit loading, GHZ transpilation, noise model construction, metric mathematical properties, and SWAP calculations.
20. **Q: Are there any failing automated tests in the repository?**  
    *A*: No. All 85 pytest tests pass.
21. **Q: Does `main.ipynb` execute from start to finish?**  
    *A*: Yes. Executed via `nbclient`, it completes top-to-bottom with exit code 0.
22. **Q: What is the CX routing overhead?**  
    *A*: $\Delta CX = CX_{\text{transpiled}} - CX_{\text{logical\_basis}}$, representing the additional CX gates introduced solely by SWAP operations during physical routing.
23. **Q: Can this framework benchmark a 16-qubit processor today?**  
    *A*: Yes, by creating a JSON configuration, but the runner, Pydantic schemas, and frontend visualizers currently have hardcoded assumptions tailored to A/B.
24. **Q: Why did you not fix the bugs in `report.md`?**  
    *A*: This audit was conducted under strict read-only constraints to document reality without altering repository files.
25. **Q: What is the main conclusion of the Processor A vs B benchmark?**  
    *A*: Processor B's heavy-hex connectivity reduces circuit depth by up to $27.3\%$ and CX gates by up to $36.0\%$ on non-local circuits, but noisy fidelity differences remain within the finite shot-noise floor.

---

### 14.4 One-Page Cheat Sheet of Key Numbers

```
+====================================================================================================+
|                                    Q-SHIELD-PQC CHEAT SHEET                                        |
+====================================================================================================+
| 1. PROCESSOR TOPOLOGIES                                                                            |
|    - Processor A: 5 qubits, 4 edges, diameter 4, avg degree 1.60, max degree 2                    |
|      Coupling Map: [(0,1), (1,2), (2,3), (3,4)]                                                    |
|    - Processor B: 9 qubits, 12 edges, diameter 4, avg degree 2.67, max degree 5 (Node 6)          |
|      Coupling Map: [(0,1),(1,2),(1,6),(2,3),(2,6),(2,5),(3,4),(4,5),(5,6),(6,7),(6,8),(8,0)]      |
+----------------------------------------------------------------------------------------------------+
| 2. BASELINE COMPILATION & NOISE PARAMETERS                                                         |
|    - Basis Gates: ['rz', 'sx', 'x', 'cx']                                                          |
|    - Transpiler: optimization_level = 1, seed_transpiler = 42                                      |
|    - Simulator: Qiskit Aer (AerSimulator), shots = 4096, seed_simulator = 42                       |
|    - Synthetic Noise: 1Q depol p=0.001 | 2Q CX depol p=0.005 | Readout bit-flip p=0.01             |
+----------------------------------------------------------------------------------------------------+
| 3. BENCHMARK CIRCUITS LOGICAL SPECIFICATIONS                                                       |
|    - QFT-5: 5 qubits, logical depth 17, 10 CP gates + 2 SWAP gates -> Logical Basis CX = 26        |
|    - GHZ-5: 5 qubits, logical depth 6, 4 CX gates -> Logical Basis CX = 4                          |
|    - Cross-Conn-5: 5 qubits, logical depth 14, 12 CX gates -> Logical Basis CX = 12                |
+----------------------------------------------------------------------------------------------------+
| 4. STORED EMPIRICAL RESULTS (results/tables/processor_ab_results.csv)                              |
|    Circuit       Processor    Transp Depth  Transp CX   CX Overhead  Routing SWAPs  Fidelity   TVD |
|    --------------------------------------------------------------------------------------------    |
|    QFT-5         Proc A            77          50           24             8         0.9992   0.0244 |
|    QFT-5         Proc B            63          32            6             2         0.9990   0.0256 |
|    GHZ-5         Proc A             8           4            0             0         0.9403   0.0596 |
|    GHZ-5         Proc B             8           4            0             0         0.9403   0.0596 |
|    Cross-Conn-5  Proc A            22          18            6             2         0.9991   0.0227 |
|    Cross-Conn-5  Proc B            16          12            0             0         0.9991   0.0247 |
+----------------------------------------------------------------------------------------------------+
| 5. TOPOLOGY ADVANTAGE SUMMARY                                                                      |
|    - QFT-5: Processor B achieves 36.0% CX reduction (32 vs 50) and 18.2% depth reduction (63 vs 77) |
|    - Cross-Conn-5: Processor B achieves 33.3% CX reduction (12 vs 18) and 0 routing SWAPs          |
|    - GHZ-5: 0% difference (identical 1D mapping on both architectures)                             |
|    - Fidelity: Differences (<0.001) fall directly within the shot-noise floor (F_floor = 0.9990)   |
+====================================================================================================+
```

---
*Report generated and validated autonomously against active source code, real command executions, and empirical result files.*
