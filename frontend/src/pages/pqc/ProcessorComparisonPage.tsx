import React, { useState, useEffect } from 'react';
import {
  Cpu, Play, Layers, ShieldCheck, AlertCircle, HardDrive,
  Info, BarChart3, GitCompare, RefreshCw
} from 'lucide-react';
import { PageHeading, Card, MetricCard, NoticeBox, ErrorState } from '../../components/pqc/Common';
import { LatencyComparisonChart, MessageSizeChart } from '../../components/pqc/Charts';
import { CouplingMapVisualizer } from '../../components/CouplingMapVisualizer';
import { CryptoBenchmarkResult, EnvironmentInfo } from '../../types';
import { runCryptoBenchmark } from '../../services/api';

interface ProcessorComparisonProps {
  environmentInfo: EnvironmentInfo | null;
  latestCryptoBenchmark: CryptoBenchmarkResult | null;
}

export function ProcessorComparisonPage({
  environmentInfo,
  latestCryptoBenchmark,
}: ProcessorComparisonProps) {
  const [platformAResult, setPlatformAResult] = useState<CryptoBenchmarkResult | null>(
    latestCryptoBenchmark?.platform_profile === 'platform_a'
      ? latestCryptoBenchmark
      : latestCryptoBenchmark?.platform_a_result || null
  );
  const [platformBResult, setPlatformBResult] = useState<CryptoBenchmarkResult | null>(
    latestCryptoBenchmark?.platform_profile === 'platform_b'
      ? latestCryptoBenchmark
      : latestCryptoBenchmark?.platform_b_result || null
  );
  const [isRunningComparison, setIsRunningComparison] = useState(false);
  const [currentRunningPlatform, setCurrentRunningPlatform] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (latestCryptoBenchmark?.platform_profile === 'platform_a') {
      setPlatformAResult(latestCryptoBenchmark);
    } else if (latestCryptoBenchmark?.platform_profile === 'platform_b') {
      setPlatformBResult(latestCryptoBenchmark);
    } else if (
      latestCryptoBenchmark?.platform_profile === 'both' ||
      latestCryptoBenchmark?.platform_profile === 'compare_both'
    ) {
      if (latestCryptoBenchmark.platform_a_result) setPlatformAResult(latestCryptoBenchmark.platform_a_result);
      if (latestCryptoBenchmark.platform_b_result) setPlatformBResult(latestCryptoBenchmark.platform_b_result);
    }
  }, [latestCryptoBenchmark]);

  const handleRunComparison = async () => {
    setIsRunningComparison(true);
    setErrorMsg(null);
    try {
      // 1. Run Platform A
      setCurrentRunningPlatform('Platform A (Standard)');
      const resA = await runCryptoBenchmark(100, 'platform_a', 5, true, 'hybrid');
      setPlatformAResult(resA);

      // 2. Run Platform B
      setCurrentRunningPlatform('Platform B (Constrained)');
      const resB = await runCryptoBenchmark(100, 'platform_b', 5, true, 'hybrid');
      setPlatformBResult(resB);
    } catch (err: any) {
      setErrorMsg(err.message || 'Comparison benchmark failed.');
    } finally {
      setIsRunningComparison(false);
      setCurrentRunningPlatform(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Platform A vs Platform B (Host CPU)"
        subtitle="Empirical evaluation of cryptographic hybrid key exchange across standard vs constrained host CPU execution profiles."
        badge="HOST CPU PROFILES (PS-P1)"
      >
        <button
          onClick={handleRunComparison}
          disabled={isRunningComparison}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium text-white transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
          style={{ background: '#963B43' }}
        >
          <GitCompare size={13} className={isRunningComparison ? 'animate-spin' : ''} />
          <span>
            {isRunningComparison
              ? `Running ${currentRunningPlatform}...`
              : 'Run Dual-Platform Benchmark (100 Trials)'}
          </span>
        </button>
      </PageHeading>

      {errorMsg && <ErrorState message={errorMsg} onRetry={handleRunComparison} />}

      {/* Side-by-Side Profile Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Platform A Card */}
        <Card
          title="Platform A — Standard Workstation CPU"
          subtitle="Reference baseline profile with unconstrained OS concurrency"
          badge={
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
          }
        >
          <div className="space-y-3 text-xs">
            <div className="p-2.5 rounded bg-stone-50 border border-stone-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Execution Mode:</span>
                <span className="font-semibold text-stone-800">Native Multi-Core</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Logical Cores:</span>
                <span className="font-mono text-stone-800">{environmentInfo?.cpu_cores_logical || 'Auto'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Concurrency:</span>
                <span className="font-semibold text-stone-800">Unthrottled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Artificial Latency:</span>
                <span className="font-semibold text-emerald-800">None (0.0 ms)</span>
              </div>
            </div>

            {platformAResult ? (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                <div className="p-2 rounded bg-white border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Mean Latency</span>
                  <span className="font-mono text-sm font-bold text-stone-800">
                    {(platformAResult.statistics?.total_handshake_ms?.mean_ms ?? platformAResult.statistics?.total_handshake?.mean_ms ?? 0).toFixed(2)} ms
                  </span>
                </div>
                <div className="p-2 rounded bg-white border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">p95 Latency</span>
                  <span className="font-mono text-sm font-bold text-stone-800">
                    {(platformAResult.statistics?.total_handshake_ms?.p95_ms ?? platformAResult.statistics?.total_handshake?.p95_ms ?? 0).toFixed(2)} ms
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-stone-400 text-center py-2 text-[11px]">
                Not measured yet. Click "Run Dual-Platform Benchmark".
              </p>
            )}
          </div>
        </Card>

        {/* Platform B Card */}
        <Card
          title="Platform B — Constrained CPU Environment"
          subtitle="Single-core CPU affinity constrained profile on the same host"
          badge={
            <span className="w-2.5 h-2.5 rounded-full bg-[#963B43] inline-block" />
          }
        >
          <div className="space-y-3 text-xs">
            <div className="p-2.5 rounded bg-stone-50 border border-stone-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Execution Mode:</span>
                <span className="font-semibold text-amber-900">Core 0 Pinning</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Affinity Constraint:</span>
                <span className="font-mono text-amber-900">
                  {environmentInfo?.affinity_constraint_supported ? 'Active (psutil.cpu_affinity)' : 'Simulated Single-Worker'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Worker Pool:</span>
                <span className="font-semibold text-stone-800">1 Worker (Serialized)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Slowdown Model:</span>
                <span className="font-semibold text-stone-800">Calibrated (Isolated)</span>
              </div>
            </div>

            {platformBResult ? (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                <div className="p-2 rounded bg-white border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Mean Latency</span>
                  <span className="font-mono text-sm font-bold text-[#963B43]">
                    {(platformBResult.statistics?.total_handshake_ms?.mean_ms ?? platformBResult.statistics?.total_handshake?.mean_ms ?? 0).toFixed(2)} ms
                  </span>
                </div>
                <div className="p-2 rounded bg-white border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">p95 Latency</span>
                  <span className="font-mono text-sm font-bold text-[#963B43]">
                    {(platformBResult.statistics?.total_handshake_ms?.p95_ms ?? platformBResult.statistics?.total_handshake?.p95_ms ?? 0).toFixed(2)} ms
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-stone-400 text-center py-2 text-[11px]">
                Not measured yet. Click "Run Dual-Platform Benchmark".
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Latency Comparison Grouped Chart */}
      <Card
        title="Comparative Latency Distribution (Platform A vs Platform B)"
        subtitle="Grouped empirical measurements across Mean, Median (p50), and 95th Percentile (p95)"
      >
        <LatencyComparisonChart
          platformAResult={platformAResult}
          platformBResult={platformBResult}
        />
      </Card>

      {/* Experimental Interpretation Panel */}
      <Card title="Experimental Interpretation & Methodology Notes">
        <div className="space-y-3 text-xs text-stone-600 leading-relaxed">
          <p>
            • <strong>Measurement Boundary:</strong> Timings include purely cryptographic operations (key generation, shared-secret derivation, encapsulation, decapsulation, HKDF, and transcript binding) measured via <code className="font-mono text-stone-800">time.perf_counter_ns()</code>.
          </p>
          <p>
            • <strong>Resource Isolation:</strong> On Platform B, thread concurrency is restricted to 1 worker, and CPU affinity is locked to core 0 via <code className="font-mono text-stone-800">psutil.Process().cpu_affinity([0])</code> where supported by the operating system kernel.
          </p>
          <p>
            • <strong>Scientific Separation:</strong> Platform A and Platform B are classical host CPU profiles. They are conceptually distinct from simulated quantum processors (Processor A and Processor B).
          </p>
        </div>
      </Card>

      {/* Quantum Processor Separation Notice */}
      <NoticeBox type="info" title="Quantum Processor Topologies (Processor A vs Processor B)">
        Quantum circuit compilation and routing simulations are evaluated independently under the universal Phase 1 framework (Processor A 5-qubit linear chain vs Processor B 9-qubit sparse heavy-hex). To view and run the Qiskit Aer quantum circuit benchmarks, open the <strong>Quantum Processor A/B</strong> tab in the sidebar.
      </NoticeBox>
    </div>
  );
}
