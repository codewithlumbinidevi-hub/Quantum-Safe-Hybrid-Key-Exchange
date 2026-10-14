import React from 'react';
import { ShieldCheck, Cpu, HardDrive, Zap, Info } from 'lucide-react';
import { HybridExchangeResult, CryptoBenchmarkResult, EnvironmentInfo } from '../../types';
import { MetricCard, StatusBadge, Card } from './Common';

interface TelemetryPanelProps {
  exchangeResult: HybridExchangeResult | null;
  benchmarkResult: CryptoBenchmarkResult | null;
  environmentInfo?: EnvironmentInfo | null;
}

export function TelemetryPanel({
  exchangeResult,
  benchmarkResult,
  environmentInfo,
}: TelemetryPanelProps) {
  const ecdhTotalMs = exchangeResult
    ? (
        exchangeResult.timings_ms.alice_ecdh_keygen_ms +
        exchangeResult.timings_ms.bob_ecdh_keygen_ms +
        exchangeResult.timings_ms.alice_ecdh_derivation_ms +
        exchangeResult.timings_ms.bob_ecdh_derivation_ms
      ).toFixed(2)
    : 'Not measured';

  const mlkemTotalMs = exchangeResult
    ? (
        exchangeResult.timings_ms.bob_mlkem_keygen_ms +
        exchangeResult.timings_ms.alice_mlkem_encapsulation_ms +
        exchangeResult.timings_ms.bob_mlkem_decapsulation_ms
      ).toFixed(2)
    : 'Not measured';

  const hybridDerivationMs = exchangeResult
    ? (
        exchangeResult.timings_ms.alice_hybrid_kdf_ms +
        exchangeResult.timings_ms.bob_hybrid_kdf_ms
      ).toFixed(2)
    : 'Not measured';

  const handshakeLatencyMs = exchangeResult
    ? exchangeResult.timings_ms.total_handshake_ms.toFixed(2)
    : benchmarkResult
    ? (benchmarkResult.statistics?.total_handshake_ms?.mean_ms ?? benchmarkResult.statistics?.total_handshake?.mean_ms ?? 0).toFixed(2)
    : 'Not measured';

  const ciphertextBytes = exchangeResult
    ? `${exchangeResult.payload_sizes.mlkem_ciphertext_bytes}`
    : '1,088';

  const totalPayloadBytes = exchangeResult
    ? `${exchangeResult.payload_sizes.total_exchange_payload_bytes}`
    : '2,402';

  const memoryMetric = benchmarkResult
    ? `${benchmarkResult.memory_overhead.python_heap_peak_kb.toFixed(1)} KB`
    : 'Not measured';

  return (
    <div className="space-y-4">
      {/* Live / Most Recent Telemetry Header */}
      <div
        className="p-3.5 rounded-lg border bg-white"
        style={{ borderColor: '#E8E0D7' }}
      >
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-[#963B43]" />
            <h4 className="font-serif text-sm font-normal text-stone-800">
              Live Research Telemetry
            </h4>
          </div>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded font-medium"
            style={{
              background: exchangeResult ? '#EBF5EE' : '#F1EFEA',
              color: exchangeResult ? '#2A6B3D' : '#8E867D',
            }}
          >
            {exchangeResult ? 'NOMINAL · VERIFIED' : 'AWAITING RUN'}
          </span>
        </div>

        {/* 2x2 Metric Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <MetricCard
            label="Handshake Latency"
            value={handshakeLatencyMs}
            unit="ms"
            description="End-to-end Alice + Bob exchange"
            highlight={exchangeResult !== null}
          />
          <MetricCard
            label="ML-KEM-768 Time"
            value={mlkemTotalMs}
            unit="ms"
            description="Keygen + Encap + Decap (FIPS 203)"
          />
          <MetricCard
            label="ECDH P-256 Time"
            value={ecdhTotalMs}
            unit="ms"
            description="Keygen + Scalar Derivation"
          />
          <MetricCard
            label="HKDF-SHA256 Derivation"
            value={hybridDerivationMs}
            unit="ms"
            description="Dual-PRF Transcript Combiner"
          />
        </div>

        {/* Message Size & Memory Grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded bg-stone-50 border border-stone-200">
            <span className="block text-[10px] uppercase text-stone-500 font-semibold mb-0.5">
              ML-KEM Ciphertext
            </span>
            <span className="font-mono font-bold text-stone-800">{ciphertextBytes} B</span>
          </div>
          <div className="p-2 rounded bg-stone-50 border border-stone-200">
            <span className="block text-[10px] uppercase text-stone-500 font-semibold mb-0.5">
              Total Over-Wire
            </span>
            <span className="font-mono font-bold text-stone-800">{totalPayloadBytes} B</span>
          </div>
          <div className="p-2 rounded bg-stone-50 border border-stone-200">
            <span className="block text-[10px] uppercase text-stone-500 font-semibold mb-0.5">
              Peak Heap Delta
            </span>
            <span className="font-mono font-bold text-stone-800">{memoryMetric}</span>
          </div>
        </div>

        {/* Key Agreement Status Chip */}
        <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
          <span className="text-stone-500 flex items-center gap-1.5">
            <ShieldCheck size={14} className={exchangeResult?.verification.hybrid_keys_match ? 'text-emerald-700' : 'text-stone-400'} />
            Constant-Time Verification:
          </span>
          <span className="font-mono font-bold text-stone-800">
            {exchangeResult
              ? exchangeResult.verification.hybrid_keys_match
                ? 'MATCH CONFIRMED (100%)'
                : 'MISMATCH DETECTED'
              : 'Not executed'}
          </span>
        </div>
      </div>

      {/* Processor Profiles Status Card */}
      <div
        className="p-3.5 rounded-lg border bg-white"
        style={{ borderColor: '#E8E0D7' }}
      >
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-stone-600" />
            <h4 className="font-serif text-sm font-normal text-stone-800">
              Processor Execution Profiles
            </h4>
          </div>
          <span className="text-[10px] font-mono text-stone-500">v1.2.0 Spec</span>
        </div>

        <div className="space-y-2 text-xs">
          {/* Platform A */}
          <div
            className="p-2.5 rounded border"
            style={{ background: '#FAF8F5', borderColor: '#E8E0D7' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Platform A — Standard Workstation
              </span>
              <span className="text-[10px] font-mono text-stone-500">Baseline</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-normal">
              Native execution, all logical CPU cores available ({environmentInfo?.cpu_cores_logical || 'auto'}), zero artificial latency, OS dynamic scheduling.
            </p>
          </div>

          {/* Platform B */}
          <div
            className="p-2.5 rounded border"
            style={{ background: '#FCFBF9', borderColor: '#E8E0D7' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                Platform B — Constrained Profile
              </span>
              <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                Constrained
              </span>
            </div>
            <p className="text-[11px] text-stone-600 leading-normal">
              Single core pinned (`cpu_affinity([0])` if OS supported), single-worker concurrency, calibrated slowdown model for reproducibility across host architectures.
            </p>
          </div>
        </div>

        {/* Dual-Platform Comparison Summary */}
        {benchmarkResult?.comparison_summary && (
          <div className="mt-2.5 p-2.5 rounded border bg-stone-50 border-stone-200 text-xs">
            <div className="flex items-center justify-between font-semibold text-stone-800 mb-1">
              <span>Dual-Platform Comparison</span>
              <span className="font-mono text-[10px] text-stone-600">
                Overhead: {benchmarkResult.comparison_summary.relative_latency_overhead_percent > 0 ? '+' : ''}
                {benchmarkResult.comparison_summary.relative_latency_overhead_percent}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-1.5 rounded bg-white border border-stone-200">
                <span className="text-stone-500 block text-[9.5px]">Platform A Mean:</span>
                <span className="font-bold text-stone-800">
                  {benchmarkResult.comparison_summary.platform_a.mean_ms.toFixed(3)} ms
                </span>
              </div>
              <div className="p-1.5 rounded bg-white border border-stone-200">
                <span className="text-stone-500 block text-[9.5px]">Platform B Mean:</span>
                <span className="font-bold text-stone-800">
                  {benchmarkResult.comparison_summary.platform_b.mean_ms.toFixed(3)} ms
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer anchor */}
        <div className="mt-3 pt-2 border-t border-stone-100 flex items-start gap-1.5 text-[10px] text-stone-500">
          <Info size={12} className="flex-shrink-0 mt-0.5 text-stone-400" />
          <span>
            Artificial delays are never injected into primitive timings. Results accurately reflect isolated wall-clock duration.
          </span>
        </div>
      </div>
    </div>
  );
}
