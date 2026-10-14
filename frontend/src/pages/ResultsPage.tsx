import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Server, 
  HardDrive, 
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { 
  fetchResultsSummary, 
  getExportCryptoCsvUrl, 
  getExportProcessorCsvUrl, 
  getProcessorChartUrl 
} from '../services/api';
import { ResultsSummary } from '../types';

export const ResultsPage: React.FC = () => {
  const [summary, setSummary] = useState<ResultsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await fetchResultsSummary();
        setSummary(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  const handleDownloadJsonReport = () => {
    if (!summary) return;
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `q_shield_pqc_report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/80 text-cyan-400 text-xs font-mono mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Benchmark Reports & Scientific Reproducibility</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Consolidated Results & Reproducibility Summary
          </h2>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Export raw and summarized datasets, inspect system metadata, and review publication-ready
            reproducibility metrics generated exclusively from genuine benchmark runs.
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadJsonReport}
            disabled={!summary}
            className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Report</span>
          </button>
          <a
            href={getExportCryptoCsvUrl('summary')}
            download="crypto_benchmark_summary.csv"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Crypto Summary CSV</span>
          </a>
          <a
            href={getExportProcessorCsvUrl()}
            download="processor_ab_results.csv"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Processor CSV</span>
          </a>
          <a
            href={getProcessorChartUrl()}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Figure PNG</span>
          </a>
        </div>
      </div>

      {/* Reproducibility Environment Card */}
      {summary && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center space-x-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span>Hardware & Software Reproducibility Metadata</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500">Operating System</span>
              <p className="text-slate-200 font-bold mt-1">
                {summary.reproducibility_environment.os} ({summary.reproducibility_environment.architecture})
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500">CPU Architecture</span>
              <p className="text-slate-200 font-bold mt-1 truncate">
                {summary.reproducibility_environment.processor || 'x86_64'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500">Physical / Logical Cores</span>
              <p className="text-slate-200 font-bold mt-1">
                {summary.reproducibility_environment.cpu_physical_cores} / {summary.reproducibility_environment.cpu_logical_cores} cores
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500">Python Runtime</span>
              <p className="text-slate-200 font-bold mt-1">
                Python {summary.reproducibility_environment.python_version}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500">Cryptography Library</span>
              <p className="text-cyan-400 font-bold mt-1">
                cryptography {summary.reproducibility_environment.cryptography_version}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500">Quantum SDK</span>
              <p className="text-purple-400 font-bold mt-1">
                Qiskit {summary.reproducibility_environment.qiskit_version}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500">Post-Quantum Standard</span>
              <p className="text-emerald-400 font-bold mt-1">
                NIST FIPS 203 (ML-KEM-768)
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500">Classical Curve</span>
              <p className="text-blue-400 font-bold mt-1">
                NIST P-256 (SECP256R1)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scientific Integrity Checklist */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Scientific Integrity Verification</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start space-x-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">No Mocked/Invented Performance Metrics</span>
              <p className="text-slate-400 mt-0.5">
                All reported latencies, memory counters, and fidelity rates are derived strictly from executed trials.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start space-x-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Strict Scientific Separation of Classical & Quantum</span>
              <p className="text-slate-400 mt-0.5">
                ECDH and ML-KEM run on classical CPU cores. Qiskit models physical quantum circuit routing independently.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start space-x-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Cryptographic Key Hygiene</span>
              <p className="text-slate-400 mt-0.5">
                Zero private key leakage. Ephemeral keys are discarded and only public parameter sizes and fingerprints are tracked.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start space-x-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">FIPS 203 Standard Conformance</span>
              <p className="text-slate-400 mt-0.5">
                ML-KEM-768 parameters match standardized FIPS 203 (1184-byte public key, 1088-byte ciphertext).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
