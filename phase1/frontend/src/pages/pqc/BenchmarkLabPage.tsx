import React, { useState } from 'react';
import {
  FlaskConical, Play, Download, RotateCcw, ShieldCheck,
  CheckCircle2, Clock, AlertCircle, HardDrive, Cpu
} from 'lucide-react';
import { PageHeading, Card, MetricCard, StatusBadge, NoticeBox, ErrorState } from '../../components/pqc/Common';
import { CryptoBenchmarkResult, EnvironmentInfo } from '../../types';
import { LatencyComparisonChart, PrimitiveBreakdownChart } from '../../components/pqc/Charts';

interface BenchmarkLabProps {
  benchmarkResult: CryptoBenchmarkResult | null;
  environmentInfo: EnvironmentInfo | null;
  isRunning: boolean;
  onRunBenchmark: (iterations: number, platform: string, warmup: number, mode: string) => Promise<void>;
  exportCsvUrl: string;
}

export function BenchmarkLabPage({
  benchmarkResult,
  environmentInfo,
  isRunning,
  onRunBenchmark,
  exportCsvUrl,
}: BenchmarkLabProps) {
  const [platform, setPlatform] = useState<string>('platform_a');
  const [mode, setMode] = useState<string>('hybrid');
  const [iterations, setIterations] = useState<number>(100);
  const [warmup, setWarmup] = useState<number>(5);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRun = async () => {
    setErrorMsg(null);
    try {
      await onRunBenchmark(iterations, platform, warmup, mode);
    } catch (err: any) {
      setErrorMsg(err.message || 'Benchmark execution failed.');
    }
  };

  const handleReset = () => {
    setPlatform('platform_a');
    setMode('hybrid');
    setIterations(100);
    setWarmup(5);
    setErrorMsg(null);
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Benchmark Laboratory"
        subtitle="Rigorous empirical evaluation pipeline: high-resolution timers, isolated CPU profiles, and statistical distribution analysis."
        badge="TIMERS: time.perf_counter_ns()"
      />

      {/* Benchmark Configuration & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card title="Benchmark Configuration">
            <div className="space-y-3.5 text-xs">
              {/* Target Platform */}
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Processor Profile
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  disabled={isRunning}
                  className="w-full px-2.5 py-1.5 rounded border bg-white text-stone-800 focus:outline-none focus:border-[#963B43]"
                  style={{ borderColor: '#DCD3C7' }}
                >
                  <option value="platform_a">Platform A (Standard — All Cores, Unconstrained)</option>
                  <option value="platform_b">Platform B (Constrained — Pin Core 0, 1 Worker)</option>
                  <option value="both">Compare Both (Dual-Platform A vs B)</option>
                </select>
                <span className="text-[10px] text-stone-500 mt-0.5 block">
                  Identical cryptographic parameters are executed across both profiles.
                </span>
              </div>

              {/* Benchmark Mode */}
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Cryptographic Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  disabled={isRunning}
                  className="w-full px-2.5 py-1.5 rounded border bg-white text-stone-800 focus:outline-none focus:border-[#963B43]"
                  style={{ borderColor: '#DCD3C7' }}
                >
                  <option value="hybrid">Hybrid (ECDH P-256 + ML-KEM-768) — Primary</option>
                  <option value="ecdh_only">Classical Baseline (ECDH P-256 only)</option>
                  <option value="mlkem_only">Post-Quantum Baseline (ML-KEM-768 only)</option>
                </select>
              </div>

              {/* Iterations */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Trials (N)
                  </label>
                  <select
                    value={iterations}
                    onChange={(e) => setIterations(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full px-2.5 py-1.5 rounded border bg-white text-stone-800 focus:outline-none focus:border-[#963B43]"
                    style={{ borderColor: '#DCD3C7' }}
                  >
                    <option value={10}>10 trials</option>
                    <option value={50}>50 trials</option>
                    <option value={100}>100 trials (Standard)</option>
                    <option value={500}>500 trials</option>
                    <option value={1000}>1,000 trials (Rigorous)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Warm-Up Runs
                  </label>
                  <select
                    value={warmup}
                    onChange={(e) => setWarmup(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full px-2.5 py-1.5 rounded border bg-white text-stone-800 focus:outline-none focus:border-[#963B43]"
                    style={{ borderColor: '#DCD3C7' }}
                  >
                    <option value={0}>0 (Cold)</option>
                    <option value={5}>5 cycles</option>
                    <option value={10}>10 cycles</option>
                  </select>
                </div>
              </div>

              {/* Memory Instrumentation Info */}
              <div className="p-2.5 rounded bg-stone-50 border border-stone-200 text-[11px] text-stone-600">
                <span className="font-semibold block text-stone-700 mb-0.5">Measurement Instrumentation:</span>
                <div>• Timer: Monotonic <code className="font-mono text-stone-800">time.perf_counter_ns()</code></div>
                <div>• Memory: OS Process RSS (<code className="font-mono text-stone-800">psutil</code>) + Python Heap (<code className="font-mono text-stone-800">tracemalloc</code>)</div>
                <div>• Entropy: OS CSPRNG (<code className="font-mono text-stone-800">os.urandom()</code>)</div>
              </div>

              {errorMsg && <ErrorState message={errorMsg} />}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-medium text-white transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
                  style={{ background: '#963B43' }}
                >
                  <Play size={12} className={isRunning ? 'animate-spin' : ''} />
                  <span>{isRunning ? 'Benchmarking in Progress...' : `Execute ${iterations} Trials`}</span>
                </button>
                <button
                  onClick={handleReset}
                  disabled={isRunning}
                  className="p-2 rounded border bg-white text-stone-600 hover:bg-stone-50 cursor-pointer"
                  style={{ borderColor: '#DCD3C7' }}
                  title="Reset to Defaults"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Results & Statistics Summary Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            title="Statistical Summary & Observations"
            subtitle={
              benchmarkResult
                ? `Run ID: ${benchmarkResult.run_id || 'manual'} · Platform: ${benchmarkResult.platform_profile} · Mode: ${benchmarkResult.benchmark_mode || 'hybrid'}`
                : 'Run a benchmark to populate verified statistical observations'
            }
            headerAction={
              benchmarkResult && (
                <a
                  href={exportCsvUrl}
                  download
                  className="text-xs text-[#963B43] flex items-center gap-1 font-medium hover:underline"
                >
                  <Download size={12} /> Download CSV
                </a>
              )
            }
          >
            {benchmarkResult ? (
              (() => {
                const totalHandshakeStat = benchmarkResult.statistics?.total_handshake_ms || benchmarkResult.statistics?.total_handshake;
                const meanVal = totalHandshakeStat?.mean_ms?.toFixed(2) ?? '0.00';
                const stdDevVal = totalHandshakeStat?.std_dev_ms?.toFixed(2) ?? '0.00';
                const medianVal = totalHandshakeStat?.median_ms?.toFixed(2) ?? '0.00';
                const p95Val = totalHandshakeStat?.p95_ms?.toFixed(2) ?? '0.00';

                return (
                  <div className="space-y-4">
                    {/* 4 Stat Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <MetricCard
                        label="Mean Latency"
                        value={meanVal}
                        unit="ms"
                        description={`Std Dev: ±${stdDevVal} ms`}
                        highlight
                      />
                      <MetricCard
                        label="Median (p50)"
                        value={medianVal}
                        unit="ms"
                        description="50th percentile"
                      />
                      <MetricCard
                        label="95th Percentile"
                        value={p95Val}
                        unit="ms"
                        description="Tail latency bound"
                      />
                      <MetricCard
                        label="Success Rate"
                        value={`${((benchmarkResult.verification.trials_run / benchmarkResult.iterations) * 100).toFixed(0)}%`}
                        description={`${benchmarkResult.verification.trials_run}/${benchmarkResult.iterations} matched`}
                      />
                    </div>

                {/* Primitive Breakdown Chart */}
                <div>
                  <h4 className="text-xs font-semibold text-stone-700 mb-2">
                    Cryptographic Primitive Execution Breakdown (Mean Time)
                  </h4>
                  <PrimitiveBreakdownChart stats={benchmarkResult.statistics} />
                </div>

                {/* Statistical Details Table */}
                <div className="overflow-x-auto border rounded border-stone-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                      <tr>
                        <th className="p-2">Operation</th>
                        <th className="p-2">Mean</th>
                        <th className="p-2">Std Dev</th>
                        <th className="p-2">Median</th>
                        <th className="p-2">p95</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                      {Object.entries(benchmarkResult.statistics)
                        .filter(([op, stat]) => op.endsWith('_ms') && typeof stat === 'object' && stat !== null && 'mean_ms' in stat)
                        .map(([op, stat]: [string, any]) => (
                        <tr key={op} className="hover:bg-stone-50/50">
                          <td className="p-2 font-sans font-medium text-stone-800">
                            {op.replace(/_/g, ' ').replace('ms', '').trim()}
                          </td>
                          <td className="p-2 text-stone-700">{stat.mean_ms?.toFixed(3) ?? '0.000'} ms</td>
                          <td className="p-2 text-stone-500">±{stat.std_dev_ms?.toFixed(3) ?? '0.000'} ms</td>
                          <td className="p-2 text-stone-700">{stat.median_ms?.toFixed(3) ?? '0.000'} ms</td>
                          <td className="p-2 text-stone-800 font-bold">{stat.p95_ms?.toFixed(3) ?? '0.000'} ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Memory and Hardware Notice */}
                <div className="p-2.5 rounded bg-stone-50 border border-stone-200 text-[11px] flex items-center justify-between">
                  <span className="text-stone-600">
                    RSS Memory Delta: <strong className="font-mono text-stone-800">{benchmarkResult.memory_overhead.rss_delta_mb.toFixed(2)} MB</strong> | Heap Peak: <strong className="font-mono text-stone-800">{benchmarkResult.memory_overhead.python_heap_peak_kb.toFixed(1)} KB</strong>
                  </span>
                  <span className="text-stone-500 font-mono text-[10px]">
                    N={benchmarkResult.iterations} + {benchmarkResult.warmup_iterations} warmup
                  </span>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="p-12 text-center text-stone-400 text-xs">
            No benchmark run recorded yet. Select parameters and click "Execute Trials" to run.
          </div>
        )}
      </Card>
        </div>
      </div>
    </div>
  );
}
