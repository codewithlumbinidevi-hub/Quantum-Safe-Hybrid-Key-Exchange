import React, { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, Download, ArrowUpRight } from 'lucide-react';
import { PageHeading, MetricCard } from '../../components/pqc/Common';
import { BenchmarkLatestResponse } from '../../types/channel';
import { fetchBenchmarkLatest, getDownloadResultUrl } from '../../services/channelApi';

export function PerformanceEvaluationPage() {
  const [data, setData] = useState<BenchmarkLatestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBenchmarkLatest();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load benchmarks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Performance Evaluation & Benchmarks"
        subtitle="Rigorous empirical evaluation (100 trials, median/IQR, wire bytes, payloads) under Objective 3"
        badge="Objective 3"
      >
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#292824] bg-white border border-[#E8E1D8] hover:bg-[#FAF8F4] transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </PageHeading>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="PQC Median Handshake"
          value="6.64 ms"
          description="IQR: 4.25 ms (100 trials)"
          badge="local (in-process)"
          highlight
        />
        <MetricCard
          label="Classical Baseline"
          value="1.44 ms"
          description="IQR: 2.09 ms (100 trials)"
          badge="local (in-process)"
        />
        <MetricCard
          label="Wire Expansion"
          value="28.35x"
          description="9,016 B (PQC) vs 318 B (Classical)"
        />
        <MetricCard
          label="10 MB Throughput"
          value="479.56 MB/s"
          description="AES-256-GCM Streaming"
        />
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-[#FBEBEB] border border-[#F5C2C2] text-xs text-[#A62626]">
          {error}
        </div>
      )}

      {/* Handshake Results Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden" style={{ borderColor: '#E8E1D8' }}>
        <div className="px-5 py-3 border-b border-[#E8E1D8] flex items-center justify-between bg-[#FAF8F4]">
          <span className="font-semibold text-xs tracking-wide text-[#332F2D]">
            HANDSHAKE LATENCY & WIRE BYTES (handshake_results.csv)
          </span>
          <a
            href={getDownloadResultUrl('handshake_results.csv')}
            download
            className="flex items-center gap-1 text-[11px] font-mono text-[#963B43] hover:underline"
          >
            <Download size={12} />
            <span>Download CSV</span>
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F4] border-b border-[#E8E1D8] text-[11px] font-mono uppercase text-[#8C877F]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Mode</th>
                <th className="py-2.5 px-4 font-semibold">Primitives</th>
                <th className="py-2.5 px-4 font-semibold">Trials</th>
                <th className="py-2.5 px-4 font-semibold">Median Latency</th>
                <th className="py-2.5 px-4 font-semibold">IQR</th>
                <th className="py-2.5 px-4 font-semibold">Total Wire Bytes</th>
                <th className="py-2.5 px-4 font-semibold">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E1D8]">
              {data?.handshakes.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#FAF8F4] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#963B43]">{row.mode}</td>
                  <td className="py-3 px-4 font-mono text-[11px]">{row.kem} + {row.signature}</td>
                  <td className="py-3 px-4 font-mono">{row.trials}</td>
                  <td className="py-3 px-4 font-bold text-[#292824]">{Number(row.median_handshake_ms).toFixed(2)} ms</td>
                  <td className="py-3 px-4 font-mono text-[#68615A]">{Number(row.iqr_ms).toFixed(2)} ms</td>
                  <td className="py-3 px-4 font-mono font-semibold">{Number(row.total_handshake_bytes).toLocaleString()} B</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#8C877F]">{row.local_or_network}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
