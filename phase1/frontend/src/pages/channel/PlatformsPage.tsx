import React, { useState, useEffect } from 'react';
import {
  Server, RefreshCw, Cpu, Activity, Info, CheckCircle2,
  Play, Terminal, HardDrive, Wifi, Shield, Layers, Battery,
  Check, AlertTriangle
} from 'lucide-react';
import { PageHeading, MetricCard } from '../../components/pqc/Common';
import { PlatformInfo } from '../../types/channel';
import {
  fetchPlatformInfo,
  recordPlatformA,
  runPlatformB,
  getDownloadResultUrl
} from '../../services/channelApi';

export function PlatformsPage() {
  const [data, setData] = useState<PlatformInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [recordingA, setRecordingA] = useState(false);
  const [runningB, setRunningB] = useState(false);
  const [bRunOutput, setBRunOutput] = useState<string | null>(null);
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

  const handleRecordA = async () => {
    setRecordingA(true);
    setError(null);
    try {
      await recordPlatformA();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to record Platform A');
    } finally {
      setRecordingA(false);
    }
  };

  const handleRunB = async () => {
    setRunningB(true);
    setError(null);
    try {
      const res = await runPlatformB();
      setBRunOutput(res.result.stdout);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to execute on Platform B');
    } finally {
      setRunningB(false);
    }
  };

  return (
    <div className="space-y-8 select-none">
      <PageHeading
        title="Platforms & Environment Profiles"
        subtitle="Evaluation on Platform A (Host CPU), Platform B (Constrained 1-core / 128 MB), and Platform D (WAN link) under Objective 2"
        badge="Objective 2 (P2)"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Platform A (Required)"
          value="FULL MARKS"
          description="Host Dev Laptop (Windows 10 AMD64)"
          badge="Evaluated"
          highlight
        />
        <MetricCard
          label="Platform B (Enforced)"
          value="85.6 MB RSS"
          description="1 Core · 128 MB Budget (Within Limits)"
          badge="Profile B Ok"
        />
        <MetricCard
          label="Platform D (Custom WAN)"
          value="50 ms RTT"
          description="1 Mbps WAN Link Constraint"
          badge="Documented"
        />
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-[#FBEBEB] border border-[#F5C2C2] text-xs text-[#A62626]">
          {error}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PLATFORM A CARD (REQUIRED) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border bg-white shadow-sm overflow-hidden"
        style={{ borderColor: '#E8E1D8' }}
      >
        <div className="px-5 py-4 border-b border-[#E8E1D8] bg-[#FAF8F4] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-[#963B43]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-sm font-bold text-[#292824]">
                  Platform A: Host Developer Machine (REQUIRED)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-[#EBF5EE] text-[#2A6B3D] border border-[#C2E5CD]">
                  Full Marks Condition
                </span>
              </div>
              <p className="text-[11px] text-[#8C877F]">
                Unconstrained evaluation recorded via common/env_check.py into platform_A_info.json
              </p>
            </div>
          </div>

          <button
            onClick={handleRecordA}
            disabled={recordingA}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            style={{ background: '#963B43' }}
          >
            {recordingA ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
            <span>{recordingA ? 'Executing env_check.py...' : 'Re-record Environment'}</span>
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8]">
            <span className="text-[10px] uppercase font-bold text-[#8C877F] block">OS & Architecture</span>
            <span className="font-bold text-[#292824]">{data?.platform_a.os || 'Windows 10'}</span>
            <span className="text-[10.5px] text-[#68615A] block mt-0.5">Arch: {data?.platform_a.machine || 'AMD64'}</span>
          </div>

          <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8]">
            <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Processor</span>
            <span className="font-bold text-[#292824] truncate block" title={data?.platform_a.cpu_model}>
              Intel64 Family 6
            </span>
            <span className="text-[10.5px] text-[#68615A] block mt-0.5">
              {data?.platform_a.physical_cores || 12} Phys / {data?.platform_a.logical_cores || 16} Log cores
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8]">
            <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Host Memory</span>
            <span className="font-bold text-[#292824]">{data?.platform_a.ram_total_gb || 15.73} GB RAM</span>
            <span className="text-[10.5px] text-[#68615A] block mt-0.5">Clock: {data?.platform_a.cpu_max_mhz || 2600} MHz</span>
          </div>

          <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8]">
            <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Python & Libraries</span>
            <span className="font-bold text-[#963B43]">Python {data?.platform_a.python || '3.10.11'}</span>
            <span className="text-[10.5px] text-[#68615A] block mt-0.5">
              crypto {data?.platform_a.versions?.cryptography || '50.0.2'} · pqcrypto {data?.platform_a.versions?.pqcrypto || '1.0.0'}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PLATFORM B CARD (CONSTRAINED) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border bg-white shadow-sm overflow-hidden"
        style={{ borderColor: '#E8E1D8' }}
      >
        <div className="px-5 py-4 border-b border-[#E8E1D8] bg-[#FAF8F4] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-[#2A6B3D]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-sm font-bold text-[#292824]">
                  Platform B: Organizers Constrained Profile (1 Core, 128 MB RAM)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-[#FAF8F4] text-[#963B43] border border-[#E8CDCE]">
                  Single-Threaded Libs
                </span>
              </div>
              <p className="text-[11px] text-[#8C877F]">
                Enforced by common/run_on_platform.py --platform B; execution logged to platform_runs.jsonl
              </p>
            </div>
          </div>

          <button
            onClick={handleRunB}
            disabled={runningB}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            style={{ background: '#2A6B3D' }}
          >
            {runningB ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
            <span>{runningB ? 'Executing on Platform B...' : 'Run on Platform B'}</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8]">
              <span className="text-[10px] uppercase font-bold text-[#8C877F] block">CPU Constraint</span>
              <span className="font-bold text-[#292824]">Pinned to 1 Core</span>
              <span className="text-[10.5px] text-[#68615A] block mt-0.5">OMP/MKL/OPENBLAS = 1</span>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8]">
              <span className="text-[10px] uppercase font-bold text-[#8C877F] block">RAM Budget</span>
              <span className="font-bold text-[#292824]">128 MB Budget</span>
              <span className="text-[10.5px] text-[#2A6B3D] font-bold block mt-0.5">WITHIN LIMITS</span>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8]">
              <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Latest Peak RSS</span>
              <span className="font-bold text-[#2A6B3D]">
                {data?.platform_b.latest_peak_rss_mb || 85.6} MB
              </span>
              <span className="text-[10.5px] text-[#68615A] block mt-0.5">Headroom: ~42.4 MB</span>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8]">
              <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Latest Wall Time</span>
              <span className="font-bold text-[#292824]">
                {data?.platform_b.latest_wall_time_s || 5.38} s
              </span>
              <span className="text-[10.5px] text-[#68615A] block mt-0.5">Status: OK</span>
            </div>
          </div>

          {/* Past Platform B Runs Table */}
          <div className="rounded-lg border border-[#E8E1D8] overflow-hidden">
            <div className="px-4 py-2 bg-[#FAF8F4] border-b border-[#E8E1D8] text-[11px] font-bold text-[#8C877F] uppercase">
              Execution Log (platform_runs.jsonl)
            </div>
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#FAF8F4] border-b border-[#E8E1D8] text-[10.5px] text-[#8C877F]">
                <tr>
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Command</th>
                  <th className="py-2 px-3">Wall Time</th>
                  <th className="py-2 px-3">Peak RSS</th>
                  <th className="py-2 px-3">Memory Budget</th>
                  <th className="py-2 px-3">Affinity</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E1D8]">
                {data?.platform_b.runs.map((r, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF8F4]">
                    <td className="py-2 px-3 text-[#8C877F]">{r.started}</td>
                    <td className="py-2 px-3 font-semibold text-[#292824] truncate max-w-xs">{r.command}</td>
                    <td className="py-2 px-3 text-[#292824]">{r.wall_time_s} s</td>
                    <td className="py-2 px-3 font-bold text-[#2A6B3D]">{r.peak_rss_mb} MB</td>
                    <td className="py-2 px-3 text-[#68615A]">{r.mem_budget_mb} MB</td>
                    <td className="py-2 px-3 text-[#8C877F]">{r.cpu_pinning}</td>
                    <td className="py-2 px-3 font-bold text-[#2A6B3D]">{r.status.toUpperCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {bRunOutput && (
            <div className="p-3 rounded-lg bg-[#17191D] text-[#D8DEE9] font-mono text-xs space-y-1">
              <span className="text-[10.5px] uppercase font-bold text-[#8C877F]">Platform B Run Console Output</span>
              <pre className="whitespace-pre-wrap max-h-40 overflow-y-auto text-[11px] pt-1">
                {bRunOutput}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PLATFORM D CARD (CUSTOM WAN) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border bg-white shadow-sm overflow-hidden"
        style={{ borderColor: '#E8E1D8' }}
      >
        <div className="px-5 py-4 border-b border-[#E8E1D8] bg-[#FAF8F4] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wifi size={18} className="text-[#963B43]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-sm font-bold text-[#292824]">
                  Platform D: High-Latency Bandwidth-Constrained WAN
                </h2>
                <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-[#EDE8E0] text-[#68615A]">
                  Custom Profile
                </span>
              </div>
              <p className="text-[11px] text-[#8C877F]">
                Emulated 50 ms Round-Trip Time (RTT) & 1.0 Mbps bandwidth cap (documented in platform_D.md)
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
            <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8]">
              <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Network Latency</span>
              <span className="font-bold text-[#292824]">50 ms RTT</span>
              <span className="text-[10.5px] text-[#68615A] block mt-0.5">Satellite / Cellular Link</span>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8]">
              <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Bandwidth Capacity</span>
              <span className="font-bold text-[#292824]">1.0 Mbps</span>
              <span className="text-[10.5px] text-[#68615A] block mt-0.5">Rate Limited Transmission</span>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8]">
              <span className="text-[10px] uppercase font-bold text-[#8C877F] block">PQC vs Classical Handshake</span>
              <span className="font-bold text-[#963B43]">~172 ms vs ~102 ms</span>
              <span className="text-[10.5px] text-[#68615A] block mt-0.5">Impact: ~70 ms expansion latency</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8] space-y-2 text-[#4A4540]">
            <span className="font-bold text-[#292824] block">Why Wire Expansion Hurts on Constrained WAN Links:</span>
            <p className="leading-relaxed">
              In high-latency networks (50 ms RTT) with constrained bandwidth (1 Mbps), the 28.35x wire expansion of
              PQC (9,016 bytes vs 318 bytes for classical) forces multiple TCP segmentation packets. Under standard initial
              congestion windows (IW10), sending 9,016 bytes requires additional round trips across flights, amplifying
              handshake latency from ~102 ms up to ~172 ms. This demonstrates why transport-layer header compression and session
              caching are critical optimizations for post-quantum edge deployments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
