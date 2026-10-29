import React, { useState } from 'react';
import { 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Clock, 
  ShieldAlert, 
  Send, 
  FileCheck2,
  RefreshCw
} from 'lucide-react';
import { runHybridExchange } from '../services/api';
import { HybridExchangeResult } from '../types';

export const HybridExchangePage: React.FC = () => {
  const [demoMessage, setDemoMessage] = useState<string>(
    'Q-SHIELD-PQC Quantum-Resilient Secret Message (NIST FIPS 203 + P-256)'
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<HybridExchangeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);

  const handleExecuteHandshake = async () => {
    setIsLoading(true);
    setError(null);
    setActiveStep(1);

    try {
      // Step visual progression
      const timer = setInterval(() => {
        setActiveStep((prev) => (prev < 8 ? prev + 1 : prev));
      }, 100);

      const exchangeData = await runHybridExchange(demoMessage);
      clearInterval(timer);
      setActiveStep(9);
      setResult(exchangeData);
    } catch (err: any) {
      setError(err.message || 'Key exchange failed');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Alice ECDH KeyGen', detail: 'NIST P-256 ephemeral key pair' },
    { num: 2, title: 'Bob ECDH KeyGen', detail: 'NIST P-256 ephemeral key pair' },
    { num: 3, title: 'Bob ML-KEM KeyGen', detail: 'NIST FIPS 203 ML-KEM-768 key pair' },
    { num: 4, title: 'ECDH Derivation', detail: 'Alice & Bob independently derive 32B secret' },
    { num: 5, title: 'ML-KEM Encapsulation', detail: 'Alice encapsulates to Bob\'s PK (1088B CT)' },
    { num: 6, title: 'ML-KEM Decapsulation', detail: 'Bob decapsulates CT with his SK (32B secret)' },
    { num: 7, title: 'Transcript Binding & KDF', detail: 'HKDF-SHA256 bound to handshake transcript' },
    { num: 8, title: 'Key Equality Verification', detail: 'Cryptographic fingerprint equality check' },
    { num: 9, title: 'Exchange Verified', detail: 'Symmetric channel established successfully' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/80 text-cyan-400 text-xs font-mono mb-2">
          <KeyRound className="w-3.5 h-3.5" />
          <span>Interactive Protocol Handshake</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Hybrid Key Agreement (ECDH P-256 + ML-KEM-768)
        </h2>
        <p className="mt-1 text-sm text-slate-400 max-w-3xl">
          Observe the sequential execution of classical elliptic curve Diffie-Hellman and standardized
          post-quantum lattice encapsulation. Both parties compute independent secrets, which are securely combined
          via HKDF-SHA256 into a shared AES-256 session key.
        </p>
      </div>

      {/* Security Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-amber-300">Zero Secret Leakage Assurance:</strong> Private keys and raw shared secrets are never exposed, logged, or returned across API boundaries. Verification is demonstrated exclusively through public parameter verification, timings, object sizes, and safe SHA-256 key fingerprints.
        </div>
      </div>

      {/* Controls Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Optional AES-256-GCM Test Message</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={demoMessage}
            onChange={(e) => setDemoMessage(e.target.value)}
            placeholder="Enter plaintext message to test symmetric channel..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            onClick={handleExecuteHandshake}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-semibold text-sm transition flex items-center justify-center space-x-2 shrink-0 shadow-lg shadow-cyan-900/30"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Negotiating...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Execute Hybrid Exchange</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Step-by-Step Flow Progress Indicator */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Protocol Step-by-Step State</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {steps.map((st) => {
            const isCompleted = result ? true : activeStep >= st.num;
            const isCurrent = activeStep === st.num && isLoading;

            return (
              <div
                key={st.num}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-slate-950 border-cyan-500/40 text-slate-200'
                    : isCurrent
                    ? 'bg-cyan-950/30 border-cyan-500 text-cyan-300 animate-pulse'
                    : 'bg-slate-950/50 border-slate-800/80 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-cyan-400">Step {st.num}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-slate-700" />
                  )}
                </div>
                <h4 className="text-xs font-semibold mt-1 text-slate-100">{st.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{st.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Execution Results View */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <span>Error during handshake: {error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Handshake Verification Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/40">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Hybrid Key Agreement Verified Successfully
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Alice and Bob independently arrived at identical 256-bit hybrid master keys.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Total Latency</span>
                <p className="text-xl font-bold font-mono text-cyan-400">
                  {result.timings_ms.total_handshake_ms} ms
                </p>
              </div>
            </div>

            {/* Verification Hash Match */}
            <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Alice Key Fingerprint (SHA-256):</span>
                <p className="text-cyan-300 truncate mt-0.5">
                  {result.verification.alice_key_fingerprint_sha256}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Bob Key Fingerprint (SHA-256):</span>
                <p className="text-cyan-300 truncate mt-0.5">
                  {result.verification.bob_key_fingerprint_sha256}
                </p>
              </div>
            </div>
          </div>

          {/* Timings and Payload Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Step Timings */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Execution Latency Breakdown</span>
                </h4>
                <span className="text-xs text-slate-400 font-mono">Milliseconds</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1.5 px-2.5 rounded bg-slate-950">
                  <span className="text-slate-400">Alice ECDH KeyGen:</span>
                  <span className="text-slate-200">{result.timings_ms.alice_ecdh_keygen_ms} ms</span>
                </div>
                <div className="flex justify-between py-1.5 px-2.5 rounded bg-slate-950">
                  <span className="text-slate-400">Bob ECDH KeyGen:</span>
                  <span className="text-slate-200">{result.timings_ms.bob_ecdh_keygen_ms} ms</span>
                </div>
                <div className="flex justify-between py-1.5 px-2.5 rounded bg-slate-950">
                  <span className="text-slate-400">Bob ML-KEM-768 KeyGen:</span>
                  <span className="text-slate-200">{result.timings_ms.bob_mlkem_keygen_ms} ms</span>
                </div>
                <div className="flex justify-between py-1.5 px-2.5 rounded bg-slate-950">
                  <span className="text-slate-400">Alice ECDH Shared Secret:</span>
                  <span className="text-slate-200">{result.timings_ms.alice_ecdh_derivation_ms} ms</span>
                </div>
                <div className="flex justify-between py-1.5 px-2.5 rounded bg-slate-950">
                  <span className="text-slate-400">Alice ML-KEM Encapsulation:</span>
                  <span className="text-slate-200">{result.timings_ms.alice_mlkem_encapsulation_ms} ms</span>
                </div>
                <div className="flex justify-between py-1.5 px-2.5 rounded bg-slate-950">
                  <span className="text-slate-400">Bob ML-KEM Decapsulation:</span>
                  <span className="text-slate-200">{result.timings_ms.bob_mlkem_decapsulation_ms} ms</span>
                </div>
                <div className="flex justify-between py-1.5 px-2.5 rounded bg-slate-950">
                  <span className="text-slate-400">Hybrid HKDF Derivation:</span>
                  <span className="text-slate-200">{result.timings_ms.alice_hybrid_kdf_ms} ms</span>
                </div>
              </div>
            </div>

            {/* Cryptographic Object Sizes */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <FileCheck2 className="w-4 h-4 text-blue-400" />
                  <span>Public Object Sizes (NIST Standards)</span>
                </h4>
                <span className="text-xs text-slate-400 font-mono">Bytes</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1.5 px-2.5 rounded bg-slate-950">
                  <span className="text-slate-400">Alice ECDH Public Key (SEC1):</span>
                  <span className="text-cyan-300">{result.payload_sizes.alice_ecdh_public_key_bytes} B</span>
                </div>
                <div className="flex justify-between py-1.5 px-2.5 rounded bg-slate-950">
                  <span className="text-slate-400">Bob ECDH Public Key (SEC1):</span>
                  <span className="text-cyan-300">{result.payload_sizes.bob_ecdh_public_key_bytes} B</span>
                </div>
                <div className="flex justify-between py-1.5 px-2.5 rounded bg-slate-950">
                  <span className="text-slate-400">Bob ML-KEM-768 Public Key (FIPS 203):</span>
                  <span className="text-purple-300">{result.payload_sizes.bob_mlkem_public_key_bytes} B</span>
                </div>
                <div className="flex justify-between py-1.5 px-2.5 rounded bg-slate-950">
                  <span className="text-slate-400">ML-KEM-768 Ciphertext (FIPS 203):</span>
                  <span className="text-purple-300">{result.payload_sizes.mlkem_ciphertext_bytes} B</span>
                </div>
                <div className="flex justify-between py-2 px-2.5 rounded bg-gradient-to-r from-slate-900 to-cyan-950/60 border border-cyan-800/60 font-bold">
                  <span className="text-slate-200">Total Exchange Payload:</span>
                  <span className="text-cyan-400">{result.payload_sizes.total_exchange_payload_bytes} Bytes</span>
                </div>
              </div>
            </div>
          </div>

          {/* AES-GCM Encrypted Demonstration Box */}
          {result.aes_gcm_demo && (
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>AES-256-GCM Symmetric Message Demonstration</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-slate-400">Encrypted Payload (Alice):</span>
                  <p className="text-slate-300 break-all">{result.aes_gcm_demo.ciphertext_hex}</p>
                  <div className="pt-2 text-[11px] text-slate-500">
                    Nonce: <span className="text-slate-400">{result.aes_gcm_demo.nonce_hex}</span> | Tag: <span className="text-slate-400">{result.aes_gcm_demo.tag_hex}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-slate-400">Authenticated Decryption (Bob):</span>
                  <p className="text-emerald-400 font-bold break-all">
                    "{result.aes_gcm_demo.decrypted_plaintext}"
                  </p>
                  <div className="pt-2 text-[11px] text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tag validated without tampering</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
