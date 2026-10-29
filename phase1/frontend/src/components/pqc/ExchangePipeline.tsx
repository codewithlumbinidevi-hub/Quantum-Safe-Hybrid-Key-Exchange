import React, { useState } from 'react';
import {
  ShieldCheck, Lock, ArrowRight, RefreshCw, Send,
  CheckCircle2, KeyRound, Box, GitMerge, FileCheck, AlertTriangle
} from 'lucide-react';
import { HybridExchangeResult } from '../../types';
import { StatusBadge } from './Common';

interface ExchangePipelineProps {
  result: HybridExchangeResult | null;
  isRunning: boolean;
  onRunExchange: (message?: string) => Promise<void>;
  onReset?: () => void;
}

export function ExchangePipeline({
  result,
  isRunning,
  onRunExchange,
  onReset,
}: ExchangePipelineProps) {
  const [customMsg, setCustomMsg] = useState('Secure handshake verified over quantum-safe channel.');
  const [activeStageTab, setActiveStageTab] = useState<number>(1);

  const stages = [
    {
      num: 1,
      title: 'Alice & Bob Ephemeral ECDH Keygen',
      actor: 'Alice & Bob',
      primitive: 'ECDH NIST P-256 (secp256r1)',
      desc: 'Both parties generate fresh ephemeral P-256 keypairs using OS cryptographic entropy.',
      duration: result ? `${(result.timings_ms.alice_ecdh_keygen_ms + result.timings_ms.bob_ecdh_keygen_ms).toFixed(2)} ms` : undefined,
      size: result ? '65 B uncompressed public key each' : undefined,
    },
    {
      num: 2,
      title: 'ECDH Shared Secret Derivation',
      actor: 'Alice & Bob',
      primitive: 'ECDH Scalar Multiplication',
      desc: 'Alice multiplies Bob\'s PK by her SK; Bob multiplies Alice\'s PK by his SK. Both yield 32-byte ECDH shared secret.',
      duration: result ? `${(result.timings_ms.alice_ecdh_derivation_ms + result.timings_ms.bob_ecdh_derivation_ms).toFixed(2)} ms` : undefined,
      size: '32 B raw shared secret (unlogged)',
    },
    {
      num: 3,
      title: 'Bob ML-KEM-768 Keygen',
      actor: 'Bob (Responder)',
      primitive: 'NIST FIPS 203 ML-KEM-768',
      desc: 'Bob generates post-quantum module lattice keypair (seed expansion via SHAKE-256).',
      duration: result ? `${result.timings_ms.bob_mlkem_keygen_ms.toFixed(2)} ms` : undefined,
      size: result ? `${result.payload_sizes.bob_mlkem_public_key_bytes} B public key` : '1,184 B public key',
    },
    {
      num: 4,
      title: 'Alice ML-KEM Encapsulation',
      actor: 'Alice (Initiator)',
      primitive: 'ML-KEM.Encaps(pk_bob)',
      desc: 'Alice encapsulates to Bob\'s ML-KEM public key, generating ciphertext and ML-KEM shared secret.',
      duration: result ? `${result.timings_ms.alice_mlkem_encapsulation_ms.toFixed(2)} ms` : undefined,
      size: result ? `${result.payload_sizes.mlkem_ciphertext_bytes} B ciphertext` : '1,088 B ciphertext',
    },
    {
      num: 5,
      title: 'Bob ML-KEM Decapsulation',
      actor: 'Bob (Responder)',
      primitive: 'ML-KEM.Decaps(c, sk_bob)',
      desc: 'Bob decapsulates ciphertext with his secret key using Fujisaki-Okamoto transform.',
      duration: result ? `${result.timings_ms.bob_mlkem_decapsulation_ms.toFixed(2)} ms` : undefined,
      size: '32 B post-quantum shared secret (unlogged)',
    },
    {
      num: 6,
      title: 'Dual-PRF Hybrid Key Derivation',
      actor: 'Alice & Bob',
      primitive: 'HKDF-SHA256 (RFC 5869)',
      desc: 'Both derive final hybrid key using HKDF-Extract(salt=ECDH, IKM=ML-KEM) bound to SHA-256 transcript hash.',
      duration: result ? `${(result.timings_ms.alice_hybrid_kdf_ms + result.timings_ms.bob_hybrid_kdf_ms).toFixed(2)} ms` : undefined,
      size: '256-bit symmetric key derived',
    },
    {
      num: 7,
      title: 'Constant-Time Key Agreement Check',
      actor: 'Protocol Verifier',
      primitive: 'hmac.compare_digest()',
      desc: 'Verification proves Alice and Bob derived identical 256-bit keys without leaking timing side-channels.',
      duration: '< 0.01 ms',
      size: result ? `Fingerprint: ${result.verification.alice_key_fingerprint_sha256.slice(0, 16)}...` : undefined,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Handshake Trigger Toolbar */}
      <div
        className="p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ background: '#FAF8F5', borderColor: '#E8E0D7' }}
      >
        <div className="flex items-center gap-2">
          <StatusBadge
            status={isRunning ? 'running' : result ? 'completed' : 'waiting'}
            label={isRunning ? 'Executing Handshake...' : result ? 'Handshake Established' : 'Awaiting Execution'}
          />
          {result && (
            <span className="text-[11px] font-mono font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Latency: {result.timings_ms.total_handshake_ms.toFixed(2)} ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onReset && (
            <button
              onClick={onReset}
              disabled={isRunning || !result}
              className="px-2.5 py-1 text-xs rounded border transition-colors disabled:opacity-40 cursor-pointer"
              style={{ borderColor: '#DCD3C7', color: '#68615A', background: '#FFFFFF' }}
            >
              Reset
            </button>
          )}
          <button
            onClick={() => onRunExchange(customMsg)}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
            style={{ background: '#963B43' }}
          >
            <RefreshCw size={12} className={isRunning ? 'animate-spin' : ''} />
            <span>{isRunning ? 'Executing NIST FIPS 203 Handshake...' : 'Run Hybrid Handshake'}</span>
          </button>
        </div>
      </div>

      {/* Protocol Pipeline Stages Horizontal Pills (matches screenshot style) */}
      <div>
        <p className="text-[10px] font-semibold tracking-wider uppercase mb-2" style={{ color: '#8E867D' }}>
          Protocol Execution Stages (7 Steps)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {stages.map((stage) => {
            const isCompleted = result !== null;
            const isSelected = activeStageTab === stage.num;
            return (
              <button
                key={stage.num}
                onClick={() => setActiveStageTab(stage.num)}
                className={`text-left p-2 rounded border transition-all text-xs cursor-pointer ${
                  isSelected
                    ? 'ring-1 ring-[#963B43]'
                    : ''
                }`}
                style={{
                  background: isSelected ? '#FAF5F5' : '#FFFFFF',
                  borderColor: isSelected ? '#963B43' : isCompleted ? '#C2E5CD' : '#E8E0D7',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="w-4 h-4 rounded-full text-[9px] font-mono flex items-center justify-center font-bold"
                    style={{
                      background: isCompleted ? '#EBF5EE' : '#F1EFEA',
                      color: isCompleted ? '#2A6B3D' : '#8E867D',
                    }}
                  >
                    {stage.num}
                  </span>
                  {isCompleted && <CheckCircle2 size={11} className="text-emerald-700" />}
                </div>
                <p className="text-[10.5px] font-medium truncate" style={{ color: '#332F2D' }}>
                  {stage.title.split(' ')[0]} {stage.title.split(' ')[1]}
                </p>
                <p className="text-[9.5px] truncate" style={{ color: '#8E867D' }}>
                  {stage.duration || 'Pending'}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Stage Detail Card */}
      {stages[activeStageTab - 1] && (
        <div
          className="p-3.5 rounded-lg border text-xs"
          style={{ background: '#FCFBF9', borderColor: '#E8E0D7' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-800">
                Stage {activeStageTab}: {stages[activeStageTab - 1].title}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ background: '#EDE8E0', color: '#68615A' }}
              >
                {stages[activeStageTab - 1].primitive}
              </span>
            </div>
            {stages[activeStageTab - 1].duration && (
              <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-medium">
                {stages[activeStageTab - 1].duration}
              </span>
            )}
          </div>
          <p className="text-stone-600 mb-2 leading-relaxed">{stages[activeStageTab - 1].desc}</p>
          <div className="flex items-center gap-4 text-[10.5px] text-stone-500 pt-1.5 border-t border-stone-200">
            <span>Actor: <strong className="text-stone-700">{stages[activeStageTab - 1].actor}</strong></span>
            {stages[activeStageTab - 1].size && (
              <span>Size: <strong className="font-mono text-stone-700">{stages[activeStageTab - 1].size}</strong></span>
            )}
          </div>
        </div>
      )}

      {/* Verification & AES-256-GCM Secure Channel Panel */}
      {result && (
        <div className="space-y-4">
          {/* Verification Bar */}
          <div
            className="p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{
              background: result.verification.hybrid_keys_match ? '#EBF5EE' : '#FBEBEB',
              borderColor: result.verification.hybrid_keys_match ? '#C2E5CD' : '#F5C2C2',
              color: result.verification.hybrid_keys_match ? '#2A6B3D' : '#A62626',
            }}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={20} className="flex-shrink-0" />
              <div>
                <span className="font-bold text-xs block">
                  {result.verification.hybrid_keys_match
                    ? 'CHANNEL SECURED · CONSTANT-TIME AGREEMENT CONFIRMED'
                    : 'KEY AGREEMENT FAILED'}
                </span>
                <span className="text-[11px] opacity-90">
                  ECDH secrets match: {String(result.verification.ecdh_secrets_match)} | ML-KEM secrets match: {String(result.verification.mlkem_secrets_match)}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono text-[10px] opacity-80">
                Derived Key SHA-256 Fingerprint:
              </div>
              <div className="font-mono text-xs font-bold">
                {result.verification.alice_key_fingerprint_sha256.slice(0, 24)}...
              </div>
            </div>
          </div>

          {/* AES-GCM Encrypted Transmission (Live Demo Chat Box) */}
          {result.aes_gcm_demo && (
            <div
              className="p-4 rounded-lg border bg-white"
              style={{ borderColor: '#E8E0D7' }}
            >
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-[#963B43]" />
                  <span className="font-serif text-sm text-stone-800">
                    AES-256-GCM Authenticated Encryption Demo
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  DECRYPTION SUCCESSFUL
                </span>
              </div>

              {/* Chat-style messages */}
              <div className="space-y-2 mb-3 text-xs">
                {/* Alice sending */}
                <div className="flex justify-start">
                  <div
                    className="p-2.5 rounded-lg max-w-md border"
                    style={{ background: '#FAF8F5', borderColor: '#E8E0D7' }}
                  >
                    <div className="text-[10px] font-bold text-stone-500 mb-1">
                      Alice (Plaintext Input):
                    </div>
                    <div className="text-stone-800 font-sans">
                      {result.aes_gcm_demo.plaintext_input}
                    </div>
                  </div>
                </div>

                {/* Over-the-air ciphertext */}
                <div className="flex justify-center my-1">
                  <div
                    className="px-3 py-1.5 rounded text-[10.5px] font-mono border max-w-xl text-center"
                    style={{ background: '#F1EFEA', borderColor: '#DDD6CC', color: '#68615A' }}
                  >
                    <span className="font-bold text-[#963B43]">Encrypted Wire (AES-GCM): </span>
                    {result.aes_gcm_demo.ciphertext_hex.slice(0, 32)}... [Tag: {result.aes_gcm_demo.tag_hex.slice(0, 16)}]
                  </div>
                </div>

                {/* Bob receiving */}
                <div className="flex justify-end">
                  <div
                    className="p-2.5 rounded-lg max-w-md text-white border"
                    style={{ background: '#963B43', borderColor: '#7F3038' }}
                  >
                    <div className="text-[10px] font-semibold text-rose-200 mb-1">
                      Bob (Decrypted using Bob's Hybrid Key):
                    </div>
                    <div className="font-sans">
                      {result.aes_gcm_demo.decrypted_plaintext}
                    </div>
                  </div>
                </div>
              </div>

              {/* Input for next round */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                <input
                  type="text"
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="Enter a message to encrypt with the hybrid key..."
                  className="flex-1 px-3 py-1.5 rounded border text-xs focus:outline-none focus:border-[#963B43]"
                  style={{ borderColor: '#DCD3C7', background: '#FFFFFF' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isRunning) {
                      onRunExchange(customMsg);
                    }
                  }}
                />
                <button
                  onClick={() => onRunExchange(customMsg)}
                  disabled={isRunning}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs text-white font-medium disabled:opacity-50 cursor-pointer"
                  style={{ background: '#963B43' }}
                >
                  <Send size={12} />
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}

          {/* Public Transcript Previews (Zero Secrets Exposed) */}
          <div
            className="p-3 rounded-lg border text-xs"
            style={{ background: '#FAF8F5', borderColor: '#E8E0D7' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                <FileCheck size={13} className="text-stone-500" />
                Public Protocol Transcript (Bound via SHA-256)
              </span>
              <span className="text-[10px] font-mono text-stone-500">
                Total Over-The-Wire: {result.payload_sizes.total_exchange_payload_bytes} bytes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] font-mono">
              <div className="p-2 rounded bg-white border border-stone-200">
                <div className="text-stone-500 font-semibold mb-0.5">Alice ECDH PK (65 B):</div>
                <div className="text-stone-700 truncate">{result.public_transcript.alice_ecdh_pk_preview}</div>
              </div>
              <div className="p-2 rounded bg-white border border-stone-200">
                <div className="text-stone-500 font-semibold mb-0.5">Bob ECDH PK (65 B):</div>
                <div className="text-stone-700 truncate">{result.public_transcript.bob_ecdh_pk_preview}</div>
              </div>
              <div className="p-2 rounded bg-white border border-stone-200">
                <div className="text-stone-500 font-semibold mb-0.5">Bob ML-KEM-768 PK (1,184 B):</div>
                <div className="text-stone-700 truncate">{result.public_transcript.bob_mlkem_pk_preview}</div>
              </div>
              <div className="p-2 rounded bg-white border border-stone-200">
                <div className="text-stone-500 font-semibold mb-0.5">ML-KEM-768 Ciphertext (1,088 B):</div>
                <div className="text-stone-700 truncate">{result.public_transcript.mlkem_ciphertext_preview}</div>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between text-[10px]">
              <span className="font-semibold text-stone-600">
                Session Transcript Hash (SHA-256):
              </span>
              <span className="font-mono text-stone-800 font-bold">
                {result.public_transcript.transcript_hash_sha256}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
