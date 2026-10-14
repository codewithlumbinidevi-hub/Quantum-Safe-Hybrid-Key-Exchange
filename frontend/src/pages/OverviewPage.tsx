import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  ArrowRight, 
  Activity, 
  Lock, 
  Zap, 
  Layers, 
  Database,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { CouplingMapVisualizer } from '../components/CouplingMapVisualizer';
import { fetchHealth, getLatestCryptoBenchmark, getLatestProcessorBenchmark } from '../services/api';
import { HealthResponse, CryptoBenchmarkResult, ProcessorBenchmarkResult } from '../types';

interface OverviewPageProps {
  onNavigate: (tab: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [cryptoLatest, setCryptoLatest] = useState<CryptoBenchmarkResult | null>(null);
  const [procLatest, setProcLatest] = useState<ProcessorBenchmarkResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [h, c, p] = await Promise.all([
          fetchHealth().catch(() => null),
          getLatestCryptoBenchmark().catch(() => null),
          getLatestProcessorBenchmark().catch(() => null),
        ]);
        setHealth(h);
        setCryptoLatest(c);
        setProcLatest(p);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner / Hero */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-[#0e1628] to-slate-900 border border-slate-800 p-6 sm:p-8 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/80 text-cyan-400 text-xs font-mono mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Qiskit Fall Fest 2026 · PS-P1 Implementation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Q-SHIELD-PQC
          </h1>
          <p className="mt-2 text-lg text-slate-300 font-medium">
            Quantum-Safe Hybrid Key Exchange & Processor Architecture Benchmark Lab
          </p>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Combines classical ECDH (NIST P-256) with Post-Quantum ML-KEM-768 (NIST FIPS 203)
            for quantum-resilient forward secrecy, paired with an architectural transpilation benchmark
            comparing 5-qubit and 9-qubit processor topologies in Qiskit.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('hybrid-exchange')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition shadow-lg shadow-cyan-900/30"
            >
              <Lock className="w-4 h-4" />
              <span>Interactive Key Exchange</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('crypto-benchmark')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition"
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Cryptographic Benchmark</span>
            </button>
            <button
              onClick={() => onNavigate('processor-benchmark')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition"
            >
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>Qiskit Processor A/B</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live System Metrics Quick Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Backend Health</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl font-bold text-white">
              {health ? health.status.toUpperCase() : 'CHECKING...'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {health ? `Python ${health.environment.python_version}` : ''}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {health ? `OS: ${health.environment.os} (${health.environment.architecture})` : 'Connecting to API'}
          </p>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Handshake Latency</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl font-bold text-white">
              {cryptoLatest
                ? `${cryptoLatest.statistics.total_handshake.mean_ms} ms`
                : 'Not measured yet'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {cryptoLatest ? `Measured over ${cryptoLatest.iterations} trials` : 'Run crypto benchmark'}
          </p>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Exchange Payload Size</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl font-bold text-white">2,402 Bytes</span>
            <span className="text-xs text-emerald-400 font-mono">Standardized</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            ECDH (130B) + ML-KEM-768 (1184B PK + 1088B CT)
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Processor Transpiled Depth</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl font-bold text-white">
              {procLatest
                ? `A: ${procLatest.processor_a.metrics.transpiled_depth} | B: ${procLatest.processor_b.metrics.transpiled_depth}`
                : 'Not measured yet'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {procLatest
              ? `CX: A=${procLatest.processor_a.metrics.transpiled_cx_count} vs B=${procLatest.processor_b.metrics.transpiled_cx_count}`
              : 'Run Qiskit benchmark'}
          </p>
        </div>
      </div>

      {/* Scientific Separation Notice */}
      <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-cyan-300">Official Scientific Principle:</strong> Classical ECDH P-256 and Post-Quantum ML-KEM-768 execute exclusively on classical CPU architectures (Platform A & B). They do <em>not</em> execute on quantum circuits. The Qiskit module benchmarks physical quantum circuit transpilation and synthetic noise independently under Phase 1 requirements.
        </div>
      </div>

      {/* Dual Architecture Diagrams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagram 1: Hybrid Cryptography Flow */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-white">1. Hybrid Key Exchange Architecture</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                ECDH + ML-KEM-768
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Alice (Initiator)</span>
                  <p className="text-slate-200 mt-0.5">ECDH P-256 (sk_A, pk_A: 65B)</p>
                </div>
                <span className="text-cyan-400 text-[10px] px-1.5 py-0.5 bg-slate-900 rounded">Step 1</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Bob (Responder)</span>
                  <p className="text-slate-200 mt-0.5">ECDH P-256 (65B) + ML-KEM-768 (1184B)</p>
                </div>
                <span className="text-cyan-400 text-[10px] px-1.5 py-0.5 bg-slate-900 rounded">Step 2-3</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Encapsulation & Decapsulation</span>
                  <p className="text-slate-200 mt-0.5">Alice Encap (1088B CT) → Bob Decap</p>
                </div>
                <span className="text-cyan-400 text-[10px] px-1.5 py-0.5 bg-slate-900 rounded">Step 4-6</span>
              </div>

              <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-950/60 to-purple-950/60 border border-cyan-800/80 flex items-center justify-between">
                <div>
                  <span className="text-cyan-300 font-bold">HKDF-SHA256 Combinator</span>
                  <p className="text-slate-200 text-[11px] mt-0.5">
                    PRK = HMAC(salt, ss_ecdh || ss_mlkem) + Transcript Hash
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => onNavigate('hybrid-exchange')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center space-x-1"
            >
              <span>Test Interactive Handshake</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Diagram 2: Qiskit Processor A vs B */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">2. Qiskit Processor A/B Architectures</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
                Phase 1 Guide
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CouplingMapVisualizer
                title="Processor A (5Q Linear)"
                architectureId="overview-proc-a"
                numQubits={5}
                edges={[[0, 1], [1, 2], [2, 3], [3, 4]]}
                colorTheme="cyan"
              />
              <CouplingMapVisualizer
                title="Processor B (9Q Heavy-Hex)"
                architectureId="overview-proc-b"
                numQubits={9}
                edges={[
                  [0, 1], [1, 2], [1, 6], [2, 3], [2, 6],
                  [2, 5], [3, 4], [4, 5], [5, 6], [6, 7], [6, 8], [8, 0]
                ]}
                colorTheme="purple"
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => onNavigate('processor-benchmark')}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center space-x-1"
            >
              <span>Run Architectural Transpilation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
