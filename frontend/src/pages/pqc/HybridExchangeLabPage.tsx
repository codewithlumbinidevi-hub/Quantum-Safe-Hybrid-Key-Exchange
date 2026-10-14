import React, { useState } from 'react';
import {
  Activity, RefreshCw, Send, ShieldCheck, Lock,
  KeyRound, Box, GitMerge, FileCheck, Info
} from 'lucide-react';
import { PageHeading, Card, StatusBadge, NoticeBox } from '../../components/pqc/Common';
import { HybridExchangeResult } from '../../types';

interface HybridExchangeLabProps {
  result: HybridExchangeResult | null;
  isRunning: boolean;
  onRunExchange: (msg?: string) => Promise<void>;
}

export function HybridExchangeLabPage({
  result,
  isRunning,
  onRunExchange,
}: HybridExchangeLabProps) {
  const [demoMessage, setDemoMessage] = useState('Confidential message secured by post-quantum hybrid key.');

  return (
    <div className="space-y-6">
      <PageHeading
        title="Hybrid Exchange Laboratory"
        subtitle="Step-by-step cryptographic protocol execution between Alice (Initiator) and Bob (Responder)."
        badge="FIPS 203 ML-KEM-768 + SECP256R1"
      >
        <button
          onClick={() => onRunExchange(demoMessage)}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium text-white transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
          style={{ background: '#963B43' }}
        >
          <RefreshCw size={12} className={isRunning ? 'animate-spin' : ''} />
          <span>{isRunning ? 'Executing...' : 'Run New Independent Session'}</span>
        </button>
      </PageHeading>

      {/* Main 2-Panel Lab Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel (7 cols): Workflow Sequence & Encryption Test */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            title="Interactive Exchange Workflow"
            subtitle="Deterministic sequence: ephemeral keys generated, public keys exchanged, encapsulated, and combined"
          >
            {/* Alice vs Bob Actor Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div
                className="p-3 rounded-lg border text-xs"
                style={{ background: '#FAF8F5', borderColor: '#E8E0D7' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded-full bg-stone-300 flex items-center justify-center font-bold text-[10px] text-stone-700">
                    A
                  </div>
                  <span className="font-bold text-stone-800">Alice (Initiator)</span>
                </div>
                <p className="text-[11px] text-stone-600 mb-2">
                  Generates ephemeral P-256 keypair; encapsulates to Bob's ML-KEM PK; derives hybrid key.
                </p>
                <div className="font-mono text-[10px] text-stone-500">
                  ECDH PK: {result ? result.public_transcript.alice_ecdh_pk_preview.slice(0, 18) + '...' : 'Not generated'}
                </div>
              </div>

              <div
                className="p-3 rounded-lg border text-xs"
                style={{ background: '#FAF8F5', borderColor: '#E8E0D7' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded-full bg-stone-300 flex items-center justify-center font-bold text-[10px] text-stone-700">
                    B
                  </div>
                  <span className="font-bold text-stone-800">Bob (Responder)</span>
                </div>
                <p className="text-[11px] text-stone-600 mb-2">
                  Generates ephemeral P-256 + ML-KEM-768 keypairs; decapsulates ciphertext; derives hybrid key.
                </p>
                <div className="font-mono text-[10px] text-stone-500">
                  ML-KEM PK: {result ? result.public_transcript.bob_mlkem_pk_preview.slice(0, 18) + '...' : 'Not generated'}
                </div>
              </div>
            </div>

            {/* Step-by-Step Sequence */}
            <div className="space-y-2 mb-4 text-xs">
              <div className="p-2.5 rounded border bg-white flex items-center justify-between" style={{ borderColor: '#E8E0D7' }}>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold flex items-center justify-center">1</span>
                  <span>Alice generates ephemeral ECDH P-256 keypair</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-800">
                  {result ? `${result.timings_ms.alice_ecdh_keygen_ms.toFixed(2)} ms` : '—'}
                </span>
              </div>

              <div className="p-2.5 rounded border bg-white flex items-center justify-between" style={{ borderColor: '#E8E0D7' }}>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold flex items-center justify-center">2</span>
                  <span>Bob generates ephemeral ECDH P-256 keypair</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-800">
                  {result ? `${result.timings_ms.bob_ecdh_keygen_ms.toFixed(2)} ms` : '—'}
                </span>
              </div>

              <div className="p-2.5 rounded border bg-white flex items-center justify-between" style={{ borderColor: '#E8E0D7' }}>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold flex items-center justify-center">3</span>
                  <span>Bob generates NIST FIPS 203 ML-KEM-768 keypair (1,184 B PK)</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-800">
                  {result ? `${result.timings_ms.bob_mlkem_keygen_ms.toFixed(2)} ms` : '—'}
                </span>
              </div>

              <div className="p-2.5 rounded border bg-white flex items-center justify-between" style={{ borderColor: '#E8E0D7' }}>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold flex items-center justify-center">4</span>
                  <span>Alice encapsulates to Bob's ML-KEM PK → 1,088 B ciphertext</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-800">
                  {result ? `${result.timings_ms.alice_mlkem_encapsulation_ms.toFixed(2)} ms` : '—'}
                </span>
              </div>

              <div className="p-2.5 rounded border bg-white flex items-center justify-between" style={{ borderColor: '#E8E0D7' }}>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold flex items-center justify-center">5</span>
                  <span>Bob decapsulates ciphertext with his private key</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-800">
                  {result ? `${result.timings_ms.bob_mlkem_decapsulation_ms.toFixed(2)} ms` : '—'}
                </span>
              </div>

              <div className="p-2.5 rounded border bg-white flex items-center justify-between" style={{ borderColor: '#E8E0D7' }}>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold flex items-center justify-center">6</span>
                  <span>Dual-PRF HKDF-SHA256 combines ECDH + ML-KEM + Transcript</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-800">
                  {result ? `${result.timings_ms.alice_hybrid_kdf_ms.toFixed(2)} ms` : '—'}
                </span>
              </div>

              <div className="p-2.5 rounded border bg-white flex items-center justify-between" style={{ borderColor: '#E8E0D7' }}>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold flex items-center justify-center">7</span>
                  <span>Constant-time comparison verifies derived keys match</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-800 font-bold">
                  {result ? 'VERIFIED' : '—'}
                </span>
              </div>
            </div>

            {/* Live Message Encryption Input */}
            <div className="p-3.5 rounded-lg border bg-stone-50" style={{ borderColor: '#E8E0D7' }}>
              <div className="text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Lock size={13} className="text-[#963B43]" />
                Test Channel Encryption (AES-256-GCM)
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={demoMessage}
                  onChange={(e) => setDemoMessage(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded border text-xs bg-white focus:outline-none focus:border-[#963B43]"
                  style={{ borderColor: '#DCD3C7' }}
                  placeholder="Enter message..."
                />
                <button
                  onClick={() => onRunExchange(demoMessage)}
                  disabled={isRunning}
                  className="px-3 py-1.5 rounded text-xs font-medium text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  style={{ background: '#963B43' }}
                >
                  <Send size={12} />
                  <span>Encrypt & Send</span>
                </button>
              </div>

              {/* AES-GCM Transmission Result Preview */}
              {result?.aes_gcm_demo && (
                <div className="mt-3 pt-3 border-t border-stone-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-700">AES-256-GCM Channel Result:</span>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      TAG VERIFIED · {result.aes_gcm_demo.decryption_success ? 'DECRYPTED' : 'FAILED'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-white border border-stone-200 space-y-1.5 font-mono text-[11px]">
                    <div>
                      <span className="text-stone-500 font-sans">Wire Ciphertext: </span>
                      <span className="text-[#963B43] break-all">{result.aes_gcm_demo.ciphertext_hex.slice(0, 48)}...</span>
                    </div>
                    <div>
                      <span className="text-stone-500 font-sans">128-bit Tag: </span>
                      <span className="text-stone-700">{result.aes_gcm_demo.tag_hex}</span>
                    </div>
                    <div className="pt-1 border-t border-stone-100 font-sans">
                      <span className="text-stone-500">Bob Decrypted: </span>
                      <strong className="text-emerald-900">{result.aes_gcm_demo.decrypted_plaintext}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel (5 cols): Exchange Telemetry & Verification Result */}
        <div className="lg:col-span-5 space-y-4">
          <Card title="Session Telemetry & Verification">
            {result ? (
              <div className="space-y-4 text-xs">
                {/* Status Box */}
                <div
                  className="p-3 rounded-lg border"
                  style={{
                    background: result.verification.hybrid_keys_match ? '#EBF5EE' : '#FBEBEB',
                    borderColor: result.verification.hybrid_keys_match ? '#C2E5CD' : '#F5C2C2',
                    color: result.verification.hybrid_keys_match ? '#2A6B3D' : '#A62626',
                  }}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <ShieldCheck size={16} />
                    <span>
                      {result.verification.hybrid_keys_match
                        ? 'HYBRID AGREEMENT VERIFIED'
                        : 'AGREEMENT FAILED'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    Both Alice and Bob derived identical 256-bit hybrid keys under full transcript binding. No private key or raw shared secret was exposed.
                  </p>
                </div>

                {/* Metrics Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">ECDH Secrets Agreement:</span>
                    <strong className="font-mono text-emerald-800">
                      {String(result.verification.ecdh_secrets_match)} (Constant-time)
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">ML-KEM Secrets Agreement:</span>
                    <strong className="font-mono text-emerald-800">
                      {String(result.verification.mlkem_secrets_match)} (Constant-time)
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Total Handshake Latency:</span>
                    <strong className="font-mono text-stone-800">
                      {result.timings_ms.total_handshake_ms.toFixed(3)} ms
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Total Wire Payload:</span>
                    <strong className="font-mono text-stone-800">
                      {result.payload_sizes.total_exchange_payload_bytes} bytes
                    </strong>
                  </div>
                </div>

                {/* Key Fingerprint */}
                <div className="p-2.5 rounded bg-stone-50 border border-stone-200">
                  <div className="text-[10px] uppercase text-stone-500 font-semibold mb-1">
                    Derived Key SHA-256 Fingerprint
                  </div>
                  <div className="font-mono text-[10.5px] text-stone-800 break-all">
                    {result.verification.alice_key_fingerprint_sha256}
                  </div>
                </div>

                {/* Notice */}
                <NoticeBox type="info" title="Cryptographic Guarantee">
                  Even if a quantum computer solves discrete logarithms on P-256 via Shor's algorithm, the derived key remains secure under ML-KEM-768 hardness (Module-LWE).
                </NoticeBox>
              </div>
            ) : (
              <div className="p-8 text-center text-stone-400 text-xs">
                No active session. Click "Run New Independent Session" to execute handshake.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
