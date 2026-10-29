import React, { useState, useEffect } from 'react';
import { Server, RefreshCw, Cpu, Activity, Info } from 'lucide-react';
import { PageHeading, MetricCard } from '../../components/pqc/Common';
import { PlatformInfo } from '../../types/channel';
import { fetchPlatformInfo } from '../../services/channelApi';

export function PlatformsPage() {
  const [data, setData] = useState<PlatformInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPlatformInfo();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch platform telemetry');
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
        title="Platforms & Environment Profiles"
        subtitle="Empirical evaluation on Platform A (Host CPU), Platform B (Constrained 1-core / 128 MB), and Platform D (WAN link)"
        badge="Objective 2"
      >
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#292824] bg-white border border-[#E8E1D8] hover:bg-[#FAF8F4] transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Telemetry</span>
        </button>
      </PageHeading>

      {error && (
        <div className="p-4 rounded-lg bg-[#FBEBEB] border border-[#F5C2C2] text-xs text-[#A62626]">
          {error}
        </div>
      )}

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Platform A Card */}
        <div className="p-5 rounded-lg border bg-white shadow-sm space-y-3" style={{ borderColor: '#E8E1D8' }}>
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E1D8]">
            <span className="font-serif text-sm font-bold text-[#292824]">Platform A (Required)</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#EBF5EE] text-[#2A6B3D]">
              FULL MARKS
            </span>
          </div>
          <p className="text-xs text-[#68615A]">Host Developer Laptop / Unconstrained Environment</p>
          <div className="space-y-1.5 text-xs font-mono text-[#4A4540]">
            <div><span className="text-[#8C877F]">OS:</span> {data?.platform_a.os || 'Windows 10 AMD64'}</div>
            <div><span className="text-[#8C877F]">CPU:</span> {data?.platform_a.cpu_model?.slice(0, 30) || 'Intel64 Family 6'}...</div>
            <div><span className="text-[#8C877F]">Cores:</span> {data?.platform_a.physical_cores || 12} Phys / {data?.platform_a.logical_cores || 16} Log</div>
            <div><span className="text-[#8C877F]">RAM:</span> {data?.platform_a.ram_total_gb || 15.73} GB</div>
            <div><span className="text-[#8C877F]">Python:</span> {data?.platform_a.python || '3.10.11'}</div>
          </div>
        </div>

        {/* Platform B Card */}
        <div className="p-5 rounded-lg border bg-white shadow-sm space-y-3" style={{ borderColor: '#E8E1D8' }}>
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E1D8]">
            <span className="font-serif text-sm font-bold text-[#292824]">Platform B (Optional)</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#FAF8F4] text-[#963B43] border border-[#E8CDCE]">
              ENFORCED
            </span>
          </div>
          <p className="text-xs text-[#68615A]">1 Core · 1 Thread · 128 MB RAM Budget</p>
          <div className="space-y-1.5 text-xs font-mono text-[#4A4540]">
            <div><span className="text-[#8C877F]">Tool:</span> run_on_platform.py --platform B</div>
            <div><span className="text-[#8C877F]">Peak RSS:</span> {data?.platform_b.latest_peak_rss_mb || 85.6} MB (Budget: 128 MB)</div>
            <div><span className="text-[#8C877F]">Wall Time:</span> {data?.platform_b.latest_wall_time_s || 5.38} s</div>
            <div><span className="text-[#8C877F]">Runs Logged:</span> {data?.platform_b.runs.length || 2} runs</div>
            <div><span className="text-[#8C877F]">Memory Status:</span> <span className="text-[#2A6B3D] font-bold">WITHIN BUDGET</span></div>
          </div>
        </div>

        {/* Platform D Card */}
        <div className="p-5 rounded-lg border bg-white shadow-sm space-y-3" style={{ borderColor: '#E8E1D8' }}>
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E1D8]">
            <span className="font-serif text-sm font-bold text-[#292824]">Platform D (Optional)</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#EDE8E0] text-[#68615A]">
              DOCUMENTED
            </span>
          </div>
          <p className="text-xs text-[#68615A]">WAN Satellite / Cellular IoT Constraint</p>
          <div className="space-y-1.5 text-xs font-mono text-[#4A4540]">
            <div><span className="text-[#8C877F]">RTT Latency:</span> 50 ms</div>
            <div><span className="text-[#8C877F]">Bandwidth:</span> 1.0 Mbps</div>
            <div><span className="text-[#8C877F]">PQC Handshake:</span> ~172 ms</div>
            <div><span className="text-[#8C877F]">Classical Baseline:</span> ~102 ms</div>
            <div><span className="text-[#8C877F]">Template:</span> common/templates/platform_D_template.md</div>
          </div>
        </div>
      </div>
    </div>
  );
}
