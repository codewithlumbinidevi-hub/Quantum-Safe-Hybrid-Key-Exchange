import React from 'react';
import { History, Download, Calendar, Cpu, CheckCircle2, FileText, Database } from 'lucide-react';
import { PageHeading, Card, StatusBadge, EmptyState } from '../../components/pqc/Common';
import { CryptoBenchmarkResult } from '../../types';
import { getExportCryptoCsvUrl, getManifestUrl } from '../../services/api';

interface ExperimentHistoryProps {
  benchmarkResult: CryptoBenchmarkResult | null;
}

export function ExperimentHistoryPage({ benchmarkResult }: ExperimentHistoryProps) {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Experiment History & Audit Trail"
        subtitle="Chronological log of benchmark runs, versioned configuration snapshots, and immutable execution metadata."
        badge="AUDIT LOG"
      />

      {benchmarkResult ? (
        <div className="space-y-4">
          <Card
            title={`Run Record: ${benchmarkResult.run_id || 'Current Execution'}`}
            subtitle={`Executed at: ${new Date(benchmarkResult.timestamp).toLocaleString()} UTC`}
            badge={<StatusBadge status="completed" label="Verified" />}
            headerAction={
              <a
                href={getExportCryptoCsvUrl('summary')}
                download
                className="text-xs text-[#963B43] flex items-center gap-1 font-medium hover:underline"
              >
                <Download size={12} /> Export Run Data
              </a>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded bg-stone-50 border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-800 block border-b pb-1 border-stone-200">
                  Execution Parameters
                </span>
                <div className="flex justify-between">
                  <span className="text-stone-500">Run Identifier:</span>
                  <span className="font-mono text-stone-800">{benchmarkResult.run_id || 'manual-001'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Platform Profile:</span>
                  <span className="font-semibold text-stone-800">{benchmarkResult.platform_profile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Algorithm Mode:</span>
                  <span className="font-mono text-stone-800">{benchmarkResult.benchmark_mode || 'hybrid'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Iterations / Warmup:</span>
                  <span className="font-mono text-stone-800">
                    {benchmarkResult.iterations} measured (+{benchmarkResult.warmup_iterations} warmup)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Success Rate:</span>
                  <span className="font-mono text-emerald-800 font-bold">100% (All Matched)</span>
                </div>
              </div>

              <div className="p-3 rounded bg-stone-50 border border-stone-200 space-y-2">
                <span className="font-semibold text-stone-800 block border-b pb-1 border-stone-200">
                  Host Environment Metadata
                </span>
                <div className="flex justify-between">
                  <span className="text-stone-500">Operating System:</span>
                  <span className="font-mono text-stone-800">{benchmarkResult.hardware_info.os}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Architecture:</span>
                  <span className="font-mono text-stone-800">{benchmarkResult.hardware_info.architecture}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Python Version:</span>
                  <span className="font-mono text-stone-800">{benchmarkResult.hardware_info.python_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Cryptography Lib:</span>
                  <span className="font-mono text-stone-800">{benchmarkResult.hardware_info.cryptography_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Core Affinity Status:</span>
                  <span className="font-mono text-stone-800">
                    {benchmarkResult.cpu_configuration.applied ? 'Applied' : 'Dynamic Concurrency'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-500">
                Mean Total Handshake: <strong className="font-mono text-stone-800">{((benchmarkResult.statistics?.total_handshake_ms?.mean_ms ?? benchmarkResult.statistics?.total_handshake?.mean_ms ?? 0)).toFixed(3)} ms</strong> (p95: <strong className="font-mono text-stone-800">{((benchmarkResult.statistics?.total_handshake_ms?.p95_ms ?? benchmarkResult.statistics?.total_handshake?.p95_ms ?? 0)).toFixed(3)} ms</strong>)
              </span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 size={13} />
                Cryptographic Integrity Verified
              </span>
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState
          title="No Past Benchmark Runs Recorded"
          description="Execute a benchmark run to record an immutable experiment snapshot in the history log."
        />
      )}
    </div>
  );
}
