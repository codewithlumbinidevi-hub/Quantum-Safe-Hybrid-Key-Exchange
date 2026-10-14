import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { CryptoBenchmarkResult } from '../../types';

interface LatencyComparisonChartProps {
  platformAResult: CryptoBenchmarkResult | null;
  platformBResult: CryptoBenchmarkResult | null;
}

export function LatencyComparisonChart({
  platformAResult,
  platformBResult,
}: LatencyComparisonChartProps) {
  if (!platformAResult && !platformBResult) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-xs text-stone-500 border border-dashed rounded-lg bg-[#FAF8F5]">
        <span>No benchmark measurements recorded yet.</span>
        <span className="text-[11px] text-stone-400 mt-1">Run benchmark under Platform A or Platform B to generate charts.</span>
      </div>
    );
  }

  const data = [
    {
      metric: 'Mean Latency',
      'Platform A (Standard)': platformAResult ? platformAResult.statistics.total_handshake_ms.mean_ms : 0,
      'Platform B (Constrained)': platformBResult ? platformBResult.statistics.total_handshake_ms.mean_ms : 0,
    },
    {
      metric: 'Median (p50)',
      'Platform A (Standard)': platformAResult ? platformAResult.statistics.total_handshake_ms.median_ms : 0,
      'Platform B (Constrained)': platformBResult ? platformBResult.statistics.total_handshake_ms.median_ms : 0,
    },
    {
      metric: '95th Percentile (p95)',
      'Platform A (Standard)': platformAResult ? platformAResult.statistics.total_handshake_ms.p95_ms : 0,
      'Platform B (Constrained)': platformBResult ? platformBResult.statistics.total_handshake_ms.p95_ms : 0,
    },
  ];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D7" vertical={false} />
          <XAxis dataKey="metric" tick={{ fill: '#68615A', fontSize: 11 }} />
          <YAxis unit=" ms" tick={{ fill: '#68615A', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: '#FFFFFF',
              border: '1px solid #E8E0D7',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#332F2D',
            }}
            formatter={(value: any) => [`${Number(value).toFixed(2)} ms`]}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Bar dataKey="Platform A (Standard)" fill="#2A6B3D" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Platform B (Constrained)" fill="#963B43" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PrimitiveBreakdownChartProps {
  stats: Record<string, { mean_ms: number }> | null;
}

export function PrimitiveBreakdownChart({ stats }: PrimitiveBreakdownChartProps) {
  if (!stats) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-xs text-stone-500 border border-dashed rounded-lg bg-[#FAF8F5]">
        <span>No cryptographic primitive timing available.</span>
      </div>
    );
  }

  const ecdhTotal = (stats.ecdh_keygen_ms?.mean_ms || 0) + (stats.ecdh_derivation_ms?.mean_ms || 0);
  const mlkemTotal =
    (stats.mlkem_keygen_ms?.mean_ms || 0) +
    (stats.mlkem_encap_ms?.mean_ms || 0) +
    (stats.mlkem_decap_ms?.mean_ms || 0);
  const kdfTotal = stats.hybrid_kdf_ms?.mean_ms || 0;
  const total = ecdhTotal + mlkemTotal + kdfTotal || 1;

  const data = [
    { name: 'ECDH P-256', ms: parseFloat(ecdhTotal.toFixed(3)), fill: '#3B82F6' },
    { name: 'ML-KEM-768 (FIPS 203)', ms: parseFloat(mlkemTotal.toFixed(3)), fill: '#963B43' },
    { name: 'HKDF-SHA256 Derivation', ms: parseFloat(kdfTotal.toFixed(3)), fill: '#10B981' },
  ];

  return (
    <div className="space-y-4">
      {/* Visual Proportional Horizontal Bar */}
      <div className="space-y-1">
        <div className="flex h-4 w-full rounded-md overflow-hidden bg-stone-100 border border-stone-200">
          <div
            style={{ width: `${(ecdhTotal / total) * 100}%`, background: '#3B82F6' }}
            title={`ECDH P-256: ${ecdhTotal.toFixed(3)} ms`}
          />
          <div
            style={{ width: `${(mlkemTotal / total) * 100}%`, background: '#963B43' }}
            title={`ML-KEM-768: ${mlkemTotal.toFixed(3)} ms`}
          />
          <div
            style={{ width: `${(kdfTotal / total) * 100}%`, background: '#10B981' }}
            title={`HKDF-SHA256: ${kdfTotal.toFixed(3)} ms`}
          />
        </div>
      </div>

      {/* BarChart Details */}
      <div className="w-full h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 70, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D7" horizontal={false} />
            <XAxis type="number" unit=" ms" tick={{ fill: '#68615A', fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: '#68615A', fontSize: 11 }} width={140} />
            <Tooltip
              contentStyle={{
                background: '#FFFFFF',
                border: '1px solid #E8E0D7',
                borderRadius: '6px',
                fontSize: '11px',
              }}
              formatter={(val: any) => [`${val} ms`]}
            />
            <Bar dataKey="ms" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-stone-600">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
            <span>{d.name}: <strong className="font-mono text-stone-800">{d.ms} ms</strong> ({((d.ms / total) * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MessageSizeChartProps {
  sizes?: {
    ecdh_public_key_bytes?: number;
    mlkem_public_key_bytes?: number;
    mlkem_ciphertext_bytes?: number;
    total_exchange_payload_bytes?: number;
  };
}

export function MessageSizeChart({ sizes }: MessageSizeChartProps) {
  const data = [
    { component: 'ECDH PK (Alice)', bytes: sizes?.ecdh_public_key_bytes || 65 },
    { component: 'ECDH PK (Bob)', bytes: sizes?.ecdh_public_key_bytes || 65 },
    { component: 'ML-KEM PK (Bob)', bytes: sizes?.mlkem_public_key_bytes || 1184 },
    { component: 'ML-KEM Ciphertext', bytes: sizes?.mlkem_ciphertext_bytes || 1088 },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D7" horizontal={false} />
          <XAxis type="number" unit=" B" tick={{ fill: '#68615A', fontSize: 11 }} />
          <YAxis dataKey="component" type="category" tick={{ fill: '#68615A', fontSize: 10 }} width={120} />
          <Tooltip
            contentStyle={{
              background: '#FFFFFF',
              border: '1px solid #E8E0D7',
              borderRadius: '6px',
              fontSize: '11px',
            }}
            formatter={(value: any) => [`${value} bytes`]}
          />
          <Bar dataKey="bytes" fill="#963B43" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
