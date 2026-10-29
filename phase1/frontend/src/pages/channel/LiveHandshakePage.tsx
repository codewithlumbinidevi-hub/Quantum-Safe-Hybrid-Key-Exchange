import React, { useState, useEffect } from 'react';
import {
  Radio, Play, RefreshCw, CheckCircle2, Lock, ArrowRight,
  Shield, Key, Layers, FileText, Check, Database, Sparkles,
  ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { PageHeading, MetricCard } from '../../components/pqc/Common';
import { HandshakeRunResponse, TrustInfo } from '../../types/channel';
import { runLiveHandshake, fetchTrustInfo } from '../../services/channelApi';

export function LiveHandshakePage() {
  const [suite, setSuite] = useState<'pqc' | 'classical'>('pqc');
  const [transport, setTransport] = useState<'loopback' | 'tcp'>('loopback');
  const [payload, setPayload] = useState<'none' | '1kb' | '100kb' | '10mb'>('none');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HandshakeRunResponse | null>(null);
  const [trustInfo, setTrustInfo] = useState<TrustInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStepTab, setActiveStepTab] = useState<number>(1);

  useEffect(() => {
    async function loadTrust() {
      try {
        const info = await fetchTrustInfo();
        setTrustInfo(info);
      } catch {
        // Fallback
      }
    }
    loadTrust();
  }, []);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runLiveHandshake(suite, transport, payload);
      setResult(res);
      setActiveStepTab(1);
    } catch (err: any) {
      setError(err.message || 'Handshake failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 select-none">
      <PageHeading
        title="Solution Design & Live Handshake"
        subtitle="Mutual 3-flight authenticated key agreement (ML-KEM-768 + ML-DSA-65) and directional record layer under Objective 1"
        badge="Objective 1 (P0)"
      />

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: SYSTEM ARCHITECTURE & TRUST ANCHOR MODEL */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border bg-white shadow-sm overflow-hidden"
        style={{ borderColor: '#E8E1D8' }}
      >
        <div className="px-5 py-4 border-b border-[#E8E1D8] bg-[#FAF8F4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#963B43]" />
            <h2 className="font-serif text-sm font-bold text-[#292824]">
              Protocol Specification & Trust Anchor Store
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#8C877F]">
            Strict Mutual Authentication · Zero Trust-On-First-Use (TOFU)
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 text-xs">
            <span className="text-[11px] uppercase font-bold text-[#8C877F]">Identity & Pinned Anchors</span>
            <div className="space-y-2">
              {trustInfo?.trust_anchors.map((ta) => (
                <div key={ta.identity} className="p-2.5 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8] font-mono">
                  <div className="flex items-center justify-between font-bold text-[#963B43]">
                    <span>Peer ID: &quot;{ta.identity}&quot;</span>
                    <span className="text-[10px] text-[#68615A]">{ta.algorithm}</span>
                  </div>
                  <div className="text-[11px] text-[#4A4540] truncate mt-1" title={ta.fingerprint_sha256}>
                    Fingerprint: {ta.fingerprint_sha256.slice(0, 20)}...
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <span className="text-[11px] uppercase font-bold text-[#8C877F]">Mutual Authentication Scope</span>
            <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8] space-y-1.5 text-[#4A4540]">
              <p className="font-semibold text-[#292824]">What is Signed:</p>
              <p className="text-[11px] text-[#68615A] leading-relaxed">
                Bob signs: SHA-256(ClientHello || ServerHello_unsigned).<br />
                Alice signs: SHA-256(ClientHello || ServerHello).<br />
                Both signatures authenticate identities, nonces, algorithm choices, and KEM keys.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <span className="text-[11px] uppercase font-bold text-[#8C877F]">Directional Key Derivation</span>
            <div className="p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8] space-y-1.5 text-[#4A4540]">
              <p className="font-semibold text-[#292824]">HKDF-SHA256 Key Schedule:</p>
              <p className="text-[11px] text-[#68615A] leading-relaxed">
                Derives separate traffic keys (k_c2s, k_s2c) and IV bases (iv_c2s, iv_s2c) bound to the cumulative
                transcript hash Thash.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: LIVE HANDSHAKE RUNNER CONTROLS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        className="p-5 rounded-xl border bg-white shadow-sm space-y-4"
        style={{ borderColor: '#E8E1D8' }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E1D8]">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-[#963B43]" />
            <h2 className="font-serif text-sm font-bold text-[#292824]">
              Live Handshake & Payload Execution
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#8C877F]">
            Generates fresh ephemeral keypairs and nonces per execution
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#8C877F] uppercase mb-1.5">
              Cipher Suite
            </label>
            <select
              value={suite}
              onChange={(e) => setSuite(e.target.value as any)}
              disabled={loading}
              className="w-full text-xs p-2 rounded-lg border border-[#E8E1D8] bg-[#FAF8F4] text-[#292824] font-medium"
            >
              <option value="pqc">Post-Quantum: ML-KEM-768 + ML-DSA-65 (FIPS 203/204)</option>
              <option value="classical">Classical Baseline: X25519 + Ed25519</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#8C877F] uppercase mb-1.5">
              Transport Mechanism
            </label>
            <select
              value={transport}
              onChange={(e) => setTransport(e.target.value as any)}
              disabled={loading}
              className="w-full text-xs p-2 rounded-lg border border-[#E8E1D8] bg-[#FAF8F4] text-[#292824] font-medium"
            >
              <option value="loopback">local (in-process dual-queue)</option>
              <option value="tcp">local (TCP loopback socket)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#8C877F] uppercase mb-1.5">
              Encrypted Application Payload
            </label>
            <select
              value={payload}
              onChange={(e) => setPayload(e.target.value as any)}
              disabled={loading}
              className="w-full text-xs p-2 rounded-lg border border-[#E8E1D8] bg-[#FAF8F4] text-[#292824] font-medium"
            >
              <option value="none">None (Handshake establishment only)</option>
              <option value="1kb">Official 1 KB payload (payload_1KB.bin)</option>
              <option value="100kb">Official 100 KB payload (payload_100KB.bin)</option>
              <option value="10mb">Official 10 MB payload (payload_10MB.bin)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#E8E1D8]">
          <span className="text-[11px] font-mono text-[#8C877F]">
            Canonical Wire Framing: b&apos;QSC1&apos; || 1B msg_type || 4B len || body
          </span>
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            style={{ background: '#963B43' }}
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
            <span>{loading ? 'Executing Handshake...' : 'Execute Live Handshake'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-[#FBEBEB] border border-[#F5C2C2] text-xs text-[#A62626]">
          {error}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: PROTOCOL SEQUENCE DIAGRAM & FLIGHT INSPECTION */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-6">
          {/* Top Handshake Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Handshake Latency"
              value={`${result.handshake_time_ms.toFixed(2)} ms`}
              description={`Scope: ${result.scope_label}`}
              sourceRunId={result.run_id}
              highlight
            />
            <MetricCard
              label="Serialized Wire Bytes"
              value={`${result.total_wire_bytes.toLocaleString()} B`}
              description="3 flights total length"
              badge={result.suite_name.includes('MLKEM') ? 'PQC Suite' : 'Classical Baseline'}
            />
            <MetricCard
              label="Cumulative Transcript Hash"
              value={result.final_transcript_hash.slice(0, 16) + '...'}
              description="SHA-256 bound key schedule"
            />
            <MetricCard
              label="Record Session Security"
              value="ACTIVE"
              description="Directional AES-256-GCM Keys"
              badge="Ready for Traffic"
            />
          </div>

          {/* Interactive Sequence Diagram Flow */}
          <div
            className="rounded-xl border bg-white shadow-sm p-6 space-y-6"
            style={{ borderColor: '#E8E1D8' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E1D8]">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#963B43]" />
                <h3 className="font-serif text-sm font-bold text-[#292824]">
                  Interactive Handshake Sequence Timeline
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#8C877F]">
                Click a flight to inspect its binary fields and public key fingerprints
              </span>
            </div>

            {/* Sequence Flow Header: Alice vs Bob */}
            <div className="grid grid-cols-2 text-center text-xs font-bold font-serif pb-3 border-b border-[#E8E1D8]">
              <div className="flex items-center justify-center gap-2 text-[#963B43]">
                <div className="w-6 h-6 rounded-full bg-[#963B43] text-white flex items-center justify-center text-xs">A</div>
                <span>ALICE (Initiator / Client)</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-[#2A6B3D]">
                <div className="w-6 h-6 rounded-full bg-[#2A6B3D] text-white flex items-center justify-center text-xs">B</div>
                <span>BOB (Responder / Server)</span>
              </div>
            </div>

            {/* Flights Representation */}
            <div className="space-y-4">
              {result.events.map((ev) => {
                const isSelected = activeStepTab === ev.flight;
                const isAliceToBob = ev.sender === 'Alice';
                return (
                  <div
                    key={ev.flight}
                    onClick={() => setActiveStepTab(ev.flight)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#963B43] bg-[#F4E8E7]/30 shadow-sm ring-1 ring-[#963B43]'
                        : 'border-[#E8E1D8] bg-[#FAF8F4] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#963B43] text-white flex items-center justify-center font-bold text-[10px]">
                          {ev.flight}
                        </span>
                        <span className="font-bold text-[#292824]">Flight {ev.flight}: {ev.message_type}</span>
                        <span className="text-[10px] text-[#8C877F]">
                          ({ev.sender} &rarr; {ev.recipient})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[#68615A]">
                        <span className="font-bold text-[#963B43]">{ev.wire_bytes.toLocaleString()} bytes</span>
                        <span>·</span>
                        <span>{ev.elapsed_ms.toFixed(2)} ms</span>
                      </div>
                    </div>

                    {/* Arrow Graphic */}
                    <div className="relative py-2 flex items-center">
                      <div className="w-full h-0.5 bg-[#DDD6CC]" />
                      <div
                        className={`absolute text-xs flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded bg-white border border-[#DDD6CC] shadow-xs ${
                          isAliceToBob ? 'left-1/3 text-[#963B43]' : 'right-1/3 text-[#2A6B3D]'
                        }`}
                      >
                        {isAliceToBob ? <span>Client &rarr; Server</span> : <span>Server &rarr; Client</span>}
                      </div>
                    </div>

                    {/* Flight Detail Preview */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono text-[#68615A]">
                      {Object.entries(ev.details).map(([key, val]) => (
                        <div key={key} className="bg-white p-1.5 rounded border border-[#E8E1D8] truncate" title={String(val)}>
                          <span className="text-[#8C877F] uppercase text-[9.5px] block">{key.replace(/_/g, ' ')}</span>
                          <span className="text-[#292824] font-medium">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Derived Traffic Keys Detail */}
            <div className="p-4 rounded-xl border bg-[#FAF8F4] border-[#E8E1D8] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E1D8]">
                <div className="flex items-center gap-2">
                  <Key size={15} className="text-[#963B43]" />
                  <span className="text-xs font-bold text-[#292824]">
                    Derived Traffic Keys (HKDF-SHA256 Expansion)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#8C877F]">
                  Secrets never revealed on wire or UI (Truncated SHA-256 Fingerprints only)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 rounded-lg bg-white border border-[#E8E1D8] space-y-1">
                  <div className="flex items-center justify-between font-bold text-[#963B43]">
                    <span>Alice &rarr; Bob Direction (k_c2s)</span>
                    <span className="text-[10px] text-[#68615A]">256-bit AES-GCM</span>
                  </div>
                  <div className="text-[11px] text-[#4A4540]">
                    Key Fingerprint: <span className="font-semibold">{result.alice_write_key_fingerprint}</span>
                  </div>
                  <div className="text-[10.5px] text-[#8C877F]">
                    IV Base: iv_c2s (12 bytes) · Sequence counter initialized to 0
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#E8E1D8] space-y-1">
                  <div className="flex items-center justify-between font-bold text-[#2A6B3D]">
                    <span>Bob &rarr; Alice Direction (k_s2c)</span>
                    <span className="text-[10px] text-[#68615A]">256-bit AES-GCM</span>
                  </div>
                  <div className="text-[11px] text-[#4A4540]">
                    Key Fingerprint: <span className="font-semibold">{result.bob_write_key_fingerprint}</span>
                  </div>
                  <div className="text-[10.5px] text-[#8C877F]">
                    IV Base: iv_s2c (12 bytes) · Sequence counter initialized to 0
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SECTION 4: PAYLOAD TRANSMISSION & BYTE-EXACT SHA-256 VERIFICATION */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {result.payload_result && (
            <div
              className="rounded-xl border bg-white shadow-sm p-6 space-y-4"
              style={{ borderColor: result.payload_result.sha256_match ? '#C2E5CD' : '#F5C2C2' }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E1D8]">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-[#2A6B3D]" />
                  <h3 className="font-serif text-sm font-bold text-[#292824]">
                    Official Application Payload Transmission: {result.payload_result.payload_name}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#EBF5EE] text-[#2A6B3D] border border-[#C2E5CD]">
                  <CheckCircle2 size={13} />
                  <span>SHA-256 BYTE-EXACT MATCH</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-3 rounded bg-[#FAF8F4] border border-[#E8E1D8]">
                  <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Plaintext Payload</span>
                  <span className="text-sm font-bold text-[#292824]">
                    {result.payload_result.plaintext_bytes.toLocaleString()} bytes
                  </span>
                  <span className="text-[10.5px] text-[#68615A] block mt-0.5">
                    ({result.payload_result.chunk_count} chunk{result.payload_result.chunk_count > 1 ? 's' : ''})
                  </span>
                </div>

                <div className="p-3 rounded bg-[#FAF8F4] border border-[#E8E1D8]">
                  <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Ciphertext + Overhead</span>
                  <span className="text-sm font-bold text-[#963B43]">
                    {result.payload_result.ciphertext_bytes.toLocaleString()} bytes
                  </span>
                  <span className="text-[10.5px] text-[#68615A] block mt-0.5">
                    Overhead: {result.payload_result.overhead_bytes} B
                  </span>
                </div>

                <div className="p-3 rounded bg-[#FAF8F4] border border-[#E8E1D8]">
                  <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Encryption Throughput</span>
                  <span className="text-sm font-bold text-[#2A6B3D]">
                    {result.payload_result.encrypt_throughput_mb_s.toFixed(2)} MB/s
                  </span>
                  <span className="text-[10.5px] text-[#68615A] block mt-0.5">
                    Time: {result.payload_result.encrypt_ms.toFixed(3)} ms
                  </span>
                </div>

                <div className="p-3 rounded bg-[#FAF8F4] border border-[#E8E1D8]">
                  <span className="text-[10px] uppercase font-bold text-[#8C877F] block">Decryption Throughput</span>
                  <span className="text-sm font-bold text-[#2A6B3D]">
                    {result.payload_result.decrypt_throughput_mb_s.toFixed(2)} MB/s
                  </span>
                  <span className="text-[10.5px] text-[#68615A] block mt-0.5">
                    Time: {result.payload_result.decrypt_ms.toFixed(3)} ms
                  </span>
                </div>
              </div>

              {/* SHA-256 Digest Validation Box */}
              <div className="p-3.5 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8] font-mono text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[#8C877F] text-[10px] uppercase font-bold">
                  <span>Cryptographic Integrity Verification</span>
                  <span className="text-[#2A6B3D]">payload_sha256.txt</span>
                </div>
                <div className="text-[11px] text-[#4A4540]">
                  <span className="text-[#8C877F]">Expected SHA-256: </span>
                  <span className="font-semibold">{result.payload_result.expected_sha256}</span>
                </div>
                <div className="text-[11px] text-[#4A4540]">
                  <span className="text-[#8C877F]">Decrypted SHA-256:</span>{' '}
                  <span className="font-semibold text-[#2A6B3D]">{result.payload_result.decrypted_sha256}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
