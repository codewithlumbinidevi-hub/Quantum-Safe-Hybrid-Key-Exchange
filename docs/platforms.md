# Q-SHIELD-PQC: Processor A/B Platform Profiles
## Standard vs. Constrained Compute Evaluation Methodology

---

## 1. Scientific Overview & Portability Principles

In classical cryptographic evaluation, execution duration and memory consumption depend heavily on CPU clock speed, microarchitecture, cache hierarchy, memory bandwidth, and operating system scheduling.

To provide empirical benchmarking under varying compute constraints, Q-SHIELD-PQC introduces two versioned benchmark environments:
- **Platform A (Standard Profile)**: Unconstrained native multi-core execution reflecting server-grade or high-performance client environments.
- **Platform B (Constrained Profile)**: Pinned single-core execution with resource monitoring, reflecting IoT devices, constrained microcontrollers, or busy edge nodes.

> **Important Scientific Rule:**  
> Artificial sleep delays are **never** injected into measured cryptographic execution times and presented as genuine CPU performance. Measurements reflect actual execution latency via `time.perf_counter_ns()`.

---

## 2. Platform Profile Specifications

| Configuration Parameter | Platform A (Standard) | Platform B (Constrained) | Portability Notes |
|---|---|---|---|
| **Profile ID** | `platform_a` | `platform_b` | Standardized JSON profiles |
| **Profile Version** | `v1.0.0-standard` | `v1.0.0-constrained` | Versioned for reproducibility |
| **CPU Core Allocation** | All Available Cores | Single Dedicated Core (`Core 0`) | OS CPU Affinity via `psutil` |
| **Worker Concurrency** | Default OS threadpool | Single-threaded affinity | Eliminates cross-core cache migration |
| **Clock Source** | `time.perf_counter_ns()` | `time.perf_counter_ns()` | Monotonic nanosecond precision |
| **Memory Monitoring** | RSS (psutil) + Heap (tracemalloc) | RSS + Heap + Peak Delta | Tracked per trial batch |
| **Warmup Protocol** | Configurable (Default 5 cycles) | Configurable (Default 5 cycles) | JIT/cache warmup |
| **Benchmark Repetitions** | 10 to 1,000 trials | 10 to 1,000 trials | Statistically significant samples |

---

## 3. Operating System Enforcement Mechanisms

### 3.1 Windows & Linux Core Pinning
On systems supporting process affinity (`Windows` and `Linux`), Platform B sets the process CPU affinity to a single logical core (`[0]`):
```python
p = psutil.Process()
p.cpu_affinity([0])
```
Upon benchmark completion, affinity is restored across all logical processors:
```python
p.cpu_affinity(list(range(psutil.cpu_count(logical=True))))
```

### 3.2 Environments Lacking CPU Affinity Support
On operating systems that restrict CPU pinning (e.g. macOS without root privileges), the platform records the configuration as:
```json
{
  "profile": "platform_b",
  "affinity_supported": false,
  "simulation_method": "single-worker concurrency policy with resource monitoring"
}
```
This ensures complete scientific transparency without fabricating unsupported capabilities.
