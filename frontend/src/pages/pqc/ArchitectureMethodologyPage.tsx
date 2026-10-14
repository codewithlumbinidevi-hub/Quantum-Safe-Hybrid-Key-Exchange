import React from 'react';
import { BookOpen, Layers, Cpu, ShieldCheck, Terminal, HardDrive } from 'lucide-react';
import { PageHeading, Card, NoticeBox } from '../../components/pqc/Common';

export function ArchitectureMethodologyPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Architecture & Measurement Methodology"
        subtitle="System topology, benchmarking pipeline boundaries, timer instrumentation, and statistical formulation."
        badge="EXPERIMENTAL METHODOLOGY"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card title="System Component Architecture">
          <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
            <div className="p-3 rounded bg-stone-50 border border-stone-200 space-y-2">
              <span className="font-semibold text-stone-800 block border-b pb-1 border-stone-200">
                Full-Stack Module Boundaries
              </span>
              <div>
                <strong>• Cryptography Core (`backend/app/services/`):</strong>
                <div className="text-stone-600 pl-3">
                  Direct execution of NIST FIPS 203 ML-KEM-768 via PyCA Cryptography and NIST P-256 ECDH. Zero mock objects or artificial delays in crypto functions.
                </div>
              </div>
              <div>
                <strong>• Benchmark Engine (`crypto_benchmark_service.py`):</strong>
                <div className="text-stone-600 pl-3">
                  Isolated test harness executing N iterations (10 to 1,000) with configurable warm-up. Records per-trial wall-clock nanoseconds.
                </div>
              </div>
              <div>
                <strong>• Processor Profiles (`processors/`):</strong>
                <div className="text-stone-600 pl-3">
                  Platform A (native multi-worker) vs Platform B (core affinity lock via psutil, single worker).
                </div>
              </div>
              <div>
                <strong>• Dashboard Frontend (`frontend/src/`):</strong>
                <div className="text-stone-600 pl-3">
                  React 18 + TypeScript + Recharts research dashboard mirroring the Q-SHIELD visual reference style.
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Timer Instrumentation & Boundaries">
          <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
            <p>
              High-resolution timing is achieved using Python's monotonic nanosecond timer:
            </p>
            <div className="p-2.5 rounded bg-stone-900 text-stone-100 font-mono text-[11px]">
              t0 = time.perf_counter_ns()<br />
              # ... isolated cryptographic primitive ...<br />
              t1 = time.perf_counter_ns()<br />
              duration_ms = (t1 - t0) / 1_000_000.0
            </div>
            <div className="space-y-1 text-[11px] text-stone-600">
              <div><strong>• Excluded from Timings:</strong> HTTP request serialization, JSON parsing, logging, and disk I/O.</div>
              <div><strong>• Warm-up Phase:</strong> 5 warm-up iterations are executed before measurement to pre-fill instruction caches and memory allocations, then discarded from statistics.</div>
              <div><strong>• Outliers:</strong> No outliers are trimmed silently. Minimum, maximum, and 95th percentiles are reported to reflect real OS jitter.</div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Statistical Formulations">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-700">
          <div className="p-3 rounded bg-stone-50 border border-stone-200">
            <span className="font-semibold text-stone-800 block mb-1">Mean & Standard Deviation</span>
            <div className="font-mono text-[11px] text-stone-600 mb-1">
              μ = (1/N) ∑ t_i<br />
              σ = √[(1/(N-1)) ∑ (t_i - μ)²]
            </div>
            <p className="text-[10px] text-stone-500">
              Captures central tendency and trial variability under identical CPU workloads.
            </p>
          </div>

          <div className="p-3 rounded bg-stone-50 border border-stone-200">
            <span className="font-semibold text-stone-800 block mb-1">Median (p50) & Tail (p95)</span>
            <div className="font-mono text-[11px] text-stone-600 mb-1">
              p50 = Sorted[N * 0.50]<br />
              p95 = Sorted[N * 0.95]
            </div>
            <p className="text-[10px] text-stone-500">
              Robust against OS context-switch spikes; essential for latency SLAs in real security gateways.
            </p>
          </div>

          <div className="p-3 rounded bg-stone-50 border border-stone-200">
            <span className="font-semibold text-stone-800 block mb-1">Memory Overhead</span>
            <div className="font-mono text-[11px] text-stone-600 mb-1">
              RSS = Process.memory_info().rss<br />
              Heap = tracemalloc.get_traced_memory()
            </div>
            <p className="text-[10px] text-stone-500">
              Evaluates both resident set size at OS level and peak allocated heap in Python runtime.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
