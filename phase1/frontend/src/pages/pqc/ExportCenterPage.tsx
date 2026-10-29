import React from 'react';
import { Download, FileText, CheckCircle2, ShieldCheck, Terminal, HardDrive } from 'lucide-react';
import { PageHeading, Card, NoticeBox } from '../../components/pqc/Common';
import {
  getExportCryptoCsvUrl,
  getManifestUrl,
  getChecksumsUrl,
  getBenchmarkDataUrl,
  getExportProcessorCsvUrl,
  getProcessorChartUrl,
} from '../../services/api';

export function ExportCenterPage() {
  const exportItems = [
    {
      title: 'Cryptographic Benchmark Summary CSV',
      filename: 'results/crypto/crypto_benchmark_summary.csv',
      desc: 'Aggregated statistical metrics (mean, median, p95, min, max, std dev) for all cryptographic operations across Platform A/B.',
      url: getExportCryptoCsvUrl('summary'),
      badge: 'CSV Table',
    },
    {
      title: 'Raw Per-Trial Observations CSV',
      filename: 'results/crypto/crypto_benchmark_trials.csv',
      desc: 'Microsecond-accurate wall-clock timestamps for every individual iteration executed in the benchmark.',
      url: getExportCryptoCsvUrl('trials'),
      badge: 'CSV Raw Data',
    },
    {
      title: 'Quantum Processor A vs B Routing CSV',
      filename: 'results/processor_ab_results.csv',
      desc: 'Transpiled circuit depth, CX gate counts, SWAP overhead, and noisy Hellinger fidelity comparing 5Q Linear vs 9Q Heavy-Hex.',
      url: getExportProcessorCsvUrl(),
      badge: 'Quantum CSV',
    },
    {
      title: 'Quantum Processor A vs B Figure PNG',
      filename: 'results/figures/processor_ab_comparison.png',
      desc: 'Publication-quality matplotlib bar chart comparing compilation metrics between Processor A and Processor B.',
      url: getProcessorChartUrl(),
      badge: 'Figure PNG',
    },
    {
      title: 'Complete Benchmark Results JSON',
      filename: 'results/benchmark_results.json',
      desc: 'Structured machine-readable benchmark records, environment metrics, and constant-time verification results.',
      url: getBenchmarkDataUrl(),
      badge: 'JSON Record',
    },
    {
      title: 'Experiment Manifest & Provenance',
      filename: 'results/manifest.json',
      desc: 'Hardware specs, Python version, cryptography version, commit hash, and parameter bindings.',
      url: getManifestUrl(),
      badge: 'Provenance JSON',
    },
    {
      title: 'Cryptographic Integrity Checksums',
      filename: 'results/SHA256SUMS.txt',
      desc: 'SHA-256 digests for all generated benchmark tables, raw trials, and manifests.',
      url: getChecksumsUrl(),
      badge: 'SHA-256 Checksums',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        title="Export Center & Judge Evidence"
        subtitle="Download verified empirical observation data, experiment manifests, and cryptographic checksums."
        badge="AUDITABLE EVIDENCE"
      />

      <div className="space-y-3">
        {exportItems.map((item) => (
          <div
            key={item.filename}
            className="p-4 rounded-lg border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
            style={{ borderColor: '#E8E0D7' }}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm font-semibold text-stone-800">
                  {item.title}
                </span>
                <span
                  className="px-1.5 py-0.2 rounded text-[10px] font-mono"
                  style={{ background: '#EDE8E0', color: '#68615A' }}
                >
                  {item.badge}
                </span>
              </div>
              <p className="text-xs text-stone-600">{item.desc}</p>
              <div className="text-[10px] font-mono text-stone-400">{item.filename}</div>
            </div>

            <a
              href={item.url}
              download
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white transition-opacity cursor-pointer shadow-sm flex-shrink-0"
              style={{ background: '#963B43' }}
            >
              <Download size={13} />
              <span>Download File</span>
            </a>
          </div>
        ))}
      </div>

      {/* Terminal Checksum Verification Instructions */}
      <Card title="How Judges Can Independently Verify Checksums">
        <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
          <p>
            All generated result files are fingerprinted with SHA-256 hashes immediately upon creation. To independently verify file integrity on any standard terminal:
          </p>
          <div className="p-3 rounded bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto space-y-1">
            <div className="text-stone-400"># Navigate to Phase 1 directory</div>
            <div>cd phase1</div>
            <div className="text-stone-400 mt-2"># Verify all SHA-256 checksums</div>
            <div>sha256sum -c results/SHA256SUMS.txt</div>
          </div>
          <p className="text-[11px] text-stone-500">
            If any record has been modified or falsified, the checksum validation will return <code className="text-rose-600 font-bold">FAILED</code>.
          </p>
        </div>
      </Card>
    </div>
  );
}
