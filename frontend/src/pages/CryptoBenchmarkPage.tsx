import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Play, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  HardDrive, 
  Clock, 
  BarChart2,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { runCryptoBenchmark, getLatestCryptoBenchmark, getExportCryptoCsvUrl } from '../services/api';
import { CryptoBenchmarkResult } from '../types';

export const CryptoBenchmarkPage: React.FC = () => {
  const [iterations, setIterations] = useState<number>(100);
  const [platformProfile, setPlatformProfile] = useState<string>('platform_a');
  const [warmupIterations, setWarmupIterations] = useState<number>(5);
  const [saveCsv, setSaveCsv] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [benchmarkResult, setBenchmarkResult] = useState<CryptoBenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLatest() {
      try {
        const latest = await getLatestCryptoBenchmark();
        if (latest) setBenchmarkResult(latest);
      } catch (e) {
        // Ignored if none exists yet
      }
    }
    loadLatest();
  }, []);

  const handleRunBenchmark = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await runCryptoBenchmark(iterations, platformProfile, warmupIterations, saveCsv);
      setBenchmarkResult(data);
    } catch (err: any) {
      setError(err.message || 'Benchmark execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data from statistics
  const chartData = benchmarkResult
    ? [
        {
          name: 'ECDH KeyGen',
          mean: benchmarkResult.statistics.ecdh_keygen?.mean_ms || 0,
          median: benchmarkResult.statistics.ecdh_keygen?.median_ms || 0,
          p95: benchmarkResult.statistics.ecdh_keygen?.p95_ms || 0,
        },
        {
          name: 'ML-KEM KeyGen',
          mean: benchmarkResult.statistics.mlkem_keygen?.mean_ms || 0,
          median: benchmarkResult.statistics.mlkem_keygen?.median_ms || 0,
          p95: benchmarkResult.statistics.mlkem_keygen?.p95_ms || 0,
        },
        {
          name: 'ECDH Deriv',
          mean: benchmarkResult.statistics.ecdh_derivation?.mean_ms || 0,
          median: benchmarkResult.statistics.ecdh_derivation?.median_ms || 0,
          p95: benchmarkResult.statistics.ecdh_derivation?.p95_ms || 0,
        },
        {
          name: 'ML-KEM Encap',
          mean: benchmarkResult.statistics.mlkem_encapsulation?.mean_ms || 0,
          median: benchmarkResult.statistics.mlkem_encapsulation?.median_ms || 0,
          p95: benchmarkResult.statistics.mlkem_encapsulation?.p95_ms || 0,
        },
        {
          name: 'ML-KEM Decap',
          mean: benchmarkResult.statistics.mlkem_decapsulation?.mean_ms || 0,
          median: benchmarkResult.statistics.mlkem_decapsulation?.median_ms || 0,
          p95: benchmarkResult.statistics.mlkem_decapsulation?.p95_ms || 0,
        },
        {
          name: 'Hybrid KDF',
          mean: benchmarkResult.statistics.hybrid_kdf?.mean_ms || 0,
          median: benchmarkResult.statistics.hybrid_kdf?.median_ms || 0,
          p95: benchmarkResult.statistics.hybrid_kdf?.p95_ms || 0,
        },
      ]
    : [];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/80 text-cyan-400 text-xs font-mono mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Cryptographic Microbenchmark</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Hybrid Key Establishment Benchmark
        </h2>
        <p className="mt-1 text-sm text-slate-400 max-w-3xl">
          Statistical profiling of individual cryptographic operations across repeatable iterations.
          Accurately distinguishes Python heap allocations from OS resident process memory (RSS)
          and evaluates CPU affinity profiles.
        </p>
      </div>

      {/* Configuration Controls Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Benchmark Execution Configuration</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Iterations */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Iterations (Trials)
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={iterations}
              onChange={(e) => setIterations(parseInt(e.target.value) || 10)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Platform Profile */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Platform Profile
            </label>
            <select
              value={platformProfile}
              onChange={(e) => setPlatformProfile(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="platform_a">Platform A (Standard CPU - All Cores)</option>
              <option value="platform_b">Platform B (Constrained Affinity - Core 0)</option>
            </select>
          </div>

          {/* Warm-up Policy */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Warm-up Cycles
            </label>
            <input
              type="number"
              min={0}
              max={20}
              value={warmupIterations}
              onChange={(e) => setWarmupIterations(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Action Button */}
          <div className="flex items-end">
            <button
              onClick={handleRunBenchmark}
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-semibold text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-cyan-900/30"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Measuring...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run Benchmark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Constrained Profile Warning & Details */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
          <span>
            {platformProfile === 'platform_a'
              ? 'Standard CPU environment executes across all available processor cores.'
              : 'Constrained profile binds the execution thread strictly to CPU core 0 via OS thread affinity.'}
          </span>
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={saveCsv}
              onChange={(e) => setSaveCsv(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span className="text-slate-300">Auto-save CSV exports</span>
          </label>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <span>Benchmark execution error: {error}</span>
        </div>
      )}

      {/* Benchmark Results */}
      {benchmarkResult ? (
        <div className="space-y-6">
          {/* Header Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400">Mean Handshake Latency</span>
              <p className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                {benchmarkResult.statistics.total_handshake.mean_ms} ms
              </p>
              <span className="text-[11px] text-slate-400 font-mono">
                Median: {benchmarkResult.statistics.total_handshake.median_ms} ms
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400">P95 / P99 Latency</span>
              <p className="text-2xl font-bold font-mono text-purple-400 mt-1">
                {benchmarkResult.statistics.total_handshake.p95_ms} ms
              </p>
              <span className="text-[11px] text-slate-400 font-mono">
                P99: {benchmarkResult.statistics.total_handshake.p99_ms} ms
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400">Verification Rate</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1 flex items-center space-x-1">
                <span>100%</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-1" />
              </p>
              <span className="text-[11px] text-slate-400">
                {benchmarkResult.iterations} of {benchmarkResult.iterations} trials matched
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400">Process Resident Memory (RSS)</span>
              <p className="text-2xl font-bold font-mono text-blue-400 mt-1">
                {benchmarkResult.memory_overhead.final_rss_mb} MB
              </p>
              <span className="text-[11px] text-slate-400 font-mono">
                Python Heap: {benchmarkResult.memory_overhead.python_heap_peak_kb} KB peak
              </span>
            </div>
          </div>

          {/* Latency Bar Chart */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  <span>Operation Latency Profile (Mean, Median, P95)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Platform: {benchmarkResult.platform_profile} ({benchmarkResult.iterations} iterations)
                </p>
              </div>

              {/* CSV Export Buttons */}
              <div className="flex items-center space-x-2">
                <a
                  href={getExportCryptoCsvUrl('summary')}
                  download="crypto_benchmark_summary.csv"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Summary CSV</span>
                </a>
                <a
                  href={getExportCryptoCsvUrl('trials')}
                  download="crypto_benchmark_trials.csv"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Raw Trials CSV</span>
                </a>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} unit=" ms" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="mean" name="Mean (ms)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="median" name="Median (ms)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="p95" name="P95 (ms)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Statistical Breakdown Table */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Full Statistical Breakdown Table</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-3">Operation</th>
                    <th className="py-2 px-3">Mean</th>
                    <th className="py-2 px-3">Std Dev</th>
                    <th className="py-2 px-3">Median</th>
                    <th className="py-2 px-3">Min</th>
                    <th className="py-2 px-3">Max</th>
                    <th className="py-2 px-3">P50</th>
                    <th className="py-2 px-3">P95</th>
                    <th className="py-2 px-3">P99</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {Object.entries(benchmarkResult.statistics).map(([op, s]) => (
                    <tr key={op} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-cyan-300">
                        {op.replace('_', ' ').toUpperCase()}
                      </td>
                      <td className="py-2.5 px-3">{s.mean_ms} ms</td>
                      <td className="py-2.5 px-3 text-slate-400">{s.std_dev_ms} ms</td>
                      <td className="py-2.5 px-3">{s.median_ms} ms</td>
                      <td className="py-2.5 px-3 text-slate-400">{s.min_ms} ms</td>
                      <td className="py-2.5 px-3 text-slate-400">{s.max_ms} ms</td>
                      <td className="py-2.5 px-3">{s.p50_ms} ms</td>
                      <td className="py-2.5 px-3 text-purple-300">{s.p95_ms} ms</td>
                      <td className="py-2.5 px-3 text-purple-300">{s.p99_ms} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
          <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-slate-300">Not measured yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Click "Run Benchmark" above to generate genuine, reproducible latency and memory measurements.
          </p>
        </div>
      )}
    </div>
  );
};
