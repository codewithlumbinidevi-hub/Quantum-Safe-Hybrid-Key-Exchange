import React, { useState } from 'react';
import { Radio, Play, RefreshCw, CheckCircle2, Lock, ArrowRight, Shield } from 'lucide-react';
import { PageHeading, MetricCard } from '../../components/pqc/Common';
import { HandshakeRunResponse } from '../../types/channel';
import { runLiveHandshake } from '../../services/channelApi';

export function LiveHandshakePage() {
  const [suite, setSuite] = useState<'pqc' | 'classical'>('pqc');
  const [transport, setTransport] = useState<'loopback' | 'tcp'>('loopback');
  const [payload, setPayload] = useState<'none' | '1kb' | '100kb' | '10mb'>('none');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HandshakeRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runLiveHandshake(suite, transport, payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Handshake failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Solution Design & Live Handshake"
        subtitle="Mutual 3-flight authenticated key agreement (ML-KEM-768 + ML-DSA-65) under Objective 1"
        badge="Objective 1"
      />

      {/* Interactive Controls */}
      <div className="p-4 rounded-lg border bg-white shadow-sm space-y-4" style={{ borderColor: '#E8E1D8' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#8C877F] uppercase mb-1.5">
              Cipher Suite
            </label>
            <select
              value={suite}
              onChange={(e) => setSuite(e.target.value as any)}
              className="w-full text-xs p-2 rounded border border-[#E8E1D8] bg-[#FAF8F4] text-[#292824] font-medium"
            >
              <option value="pqc">Post-Quantum: ML-KEM-768 + ML-DSA-65 (FIPS 203/204)</option>
              <option value="classical">Classical Baseline: X25519 + Ed25519</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8C877F] uppercase mb-1.5">
              Transport Scope
            </label>
            <select
              value={transport}
              onChange={(e) => setTransport(e.target.value as any)}
              className="w-full text-xs p-2 rounded border border-[#E8E1D8] bg-[#FAF8F4] text-[#292824] font-medium"
            >
              <option value="loopback">local (in-process queue)</option>
              <option value="tcp">local (TCP loopback socket)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8C877F] uppercase mb-1.5">
              Official Payload Stream
            </label>
            <select
              value={payload}
              onChange={(e) => setPayload(e.target.value as any)}
              className="w-full text-xs p-2 rounded border border-[#E8E1D8] bg-[#FAF8F4] text-[#292824] font-medium"
            >
              <option value="none">None (Handshake only)</option>
              <option value="1kb">1 KB (payload_1KB.bin)</option>
              <option value="100kb">100 KB (payload_100KB.bin)</option>
              <option value="10mb">10 MB (payload_10MB.bin)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#E8E1D8]">
          <span className="text-[11px] font-mono text-[#8C877F]">
            Strict Mutual Authentication · Pinned Trust Anchors
          </span>
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            style={{ background: '#963B43' }}
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{loading ? 'Running Handshake...' : 'Execute Live Handshake'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-[#FBEBEB] border border-[#F5C2C2] text-xs text-[#A62626]">
          {error}
        </div>
      )}

      {/* Metrics Result */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Handshake Latency"
              value={`${result.handshake_time_ms.toFixed(2)} ms`}
              description={`Scope: ${result.scope_label}`}
              sourceRunId={result.run_id}
              highlight
            />
            <MetricCard
              label="Total Wire Bytes"
              value={`${result.total_wire_bytes.toLocaleString()} B`}
              description="3 flights serialized length"
            />
            <MetricCard
              label="Transcript Hash"
              value={result.final_transcript_hash.slice(0, 12) + '...'}
              description="SHA-256 cumulative hash"
            />
            <MetricCard
              label="Record Session"
              value="ESTABLISHED"
              description="AES-256-GCM directional keys"
            />
          </div>

          {/* Sequence Diagram Flights */}
          <div className="rounded-lg border bg-white shadow-sm p-5 space-y-4" style={{ borderColor: '#E8E1D8' }}>
            <h3 className="font-serif text-sm font-medium text-[#292824]">Protocol Flight Sequence</h3>
            <div className="space-y-3">
              {result.events.map((ev) => (
                <div
                  key={ev.flight}
                  className="p-3 rounded-lg border bg-[#FAF8F4] flex items-center justify-between gap-4 text-xs font-mono"
                  style={{ borderColor: '#E8E1D8' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#963B43] text-white flex items-center justify-center font-bold text-[11px]">
                      {ev.flight}
                    </span>
                    <span className="font-semibold text-[#292824]">{ev.sender}</span>
                    <ArrowRight size={13} className="text-[#8C877F]" />
                    <span className="font-semibold text-[#292824]">{ev.recipient}</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-[#DDD6CC] font-bold text-[#963B43]">
                      {ev.message_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[#68615A] text-[11px]">
                    <span>{ev.wire_bytes} bytes</span>
                    <span>·</span>
                    <span>{ev.elapsed_ms.toFixed(2)} ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
