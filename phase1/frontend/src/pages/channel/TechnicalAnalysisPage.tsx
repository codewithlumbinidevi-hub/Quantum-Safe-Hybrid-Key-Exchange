import React, { useState } from 'react';
import {
  BookOpen, ShieldCheck, CheckCircle2, AlertTriangle,
  FileText, ExternalLink, Code2, ArrowRight, Shield, Layers,
  Cpu, Lock, Check
} from 'lucide-react';
import { PageHeading, MetricCard } from '../../components/pqc/Common';

interface AcceptanceItem {
  id: string;
  category: string;
  title: string;
  requirement: string;
  implementation: string;
  codeReference: string;
  testReference: string;
  verified: boolean;
}

const ACCEPTANCE_CHECKLIST: AcceptanceItem[] = [
  {
    id: 'AC-1',
    category: 'Cryptographic Primitives',
    title: 'Vetted NIST Standardized Primitives Only',
    requirement: 'ML-KEM-768 (FIPS 203), ML-DSA-65 (FIPS 204), HKDF-SHA256 (RFC 5869), AES-256-GCM (SP 800-38D). Zero self-written crypto.',
    implementation: 'Built with official cryptography 50.0.2 and pqcrypto 1.0.0. Full parameter sets documented.',
    codeReference: 'P1_secure_channel/channel/suite.py:27',
    testReference: 'SECURITY_TESTS.md (T1 Honest Run)',
    verified: true,
  },
  {
    id: 'AC-2',
    category: 'Identity Trust Model',
    title: 'Explicitly Pinned Trust Anchors (No TOFU)',
    requirement: 'Never trust an unauthenticated public key supplied by peer or attacker. Trust-On-First-Use (TOFU) strictly rejected.',
    implementation: 'TrustAnchorStore maintains pinned verification keys with constant-time equality checks.',
    codeReference: 'P1_secure_channel/channel/trust.py:45',
    testReference: 'SECURITY_TESTS.md (T6 Untrusted Identity)',
    verified: true,
  },
  {
    id: 'AC-3',
    category: 'Authentication Scope',
    title: 'Mutual Cryptographic Authentication',
    requirement: 'Both Alice and Bob authenticate each other using digital signatures. Exactly what is signed must be documented.',
    implementation: 'Bob signs SHA-256(ClientHello || ServerHello_unsigned); Alice signs SHA-256(ClientHello || ServerHello).',
    codeReference: 'P1_secure_channel/channel/transcript.py:38',
    testReference: 'SECURITY_TESTS.md (T3 Signature Tampering)',
    verified: true,
  },
  {
    id: 'AC-4',
    category: 'Transcript Binding',
    title: 'Full Cumulative Transcript Binding',
    requirement: 'Transcript binds both endpoint identities, algorithm choices, nonces, and all exchanged key material.',
    implementation: 'Cumulative SHA-256 transcript accumulator updated after each flight; bound into HKDF expand info.',
    codeReference: 'P1_secure_channel/channel/transcript.py:65',
    testReference: 'SECURITY_TESTS.md (T7 Identity Swap & T9 Downgrade)',
    verified: true,
  },
  {
    id: 'AC-5',
    category: 'Key Derivation',
    title: 'Directional Traffic Keys & IV Separation',
    requirement: 'Separate symmetric traffic keys per direction (Alice->Bob vs Bob->Alice).',
    implementation: 'HKDF expands 96 bytes: k_c2s (32B), k_s2c (32B), iv_c2s (12B), iv_s2c (12B). Keys never reused across directions.',
    codeReference: 'P1_secure_channel/channel/suite.py:165',
    testReference: 'test_wrong_direction_key_use',
    verified: true,
  },
  {
    id: 'AC-6',
    category: 'Replay Protection',
    title: 'Monotonic Sequence Numbers & Fresh Nonces',
    requirement: 'Address replay protection on records and old handshakes, or explicitly state scope and limitations.',
    implementation: 'Monotonic 64-bit sequence counters in 13-byte AAD header; fresh 32-byte nonces in handshakes.',
    codeReference: 'P1_secure_channel/channel/record.py:85',
    testReference: 'SECURITY_TESTS.md (T8 Replay Defense)',
    verified: true,
  },
  {
    id: 'AC-7',
    category: 'Official Payloads',
    title: 'Byte-Exact Verification of Three Payloads',
    requirement: 'Exchange 1 KB, 100 KB, 10 MB payloads; verify decryption matches official payload_sha256.txt byte-for-byte.',
    implementation: 'Streaming 64 KB chunker with AES-256-GCM; verified byte-exact across all 3 official payloads.',
    codeReference: 'P1_secure_channel/channel/record.py:130',
    testReference: 'SECURITY_TESTS.md (T1 Payload SHA-256)',
    verified: true,
  },
  {
    id: 'AC-8',
    category: 'Classical Baseline',
    title: 'Exact Identical Flow with X25519 + Ed25519',
    requirement: 'Implement same handshake and record layer with classical X25519 + Ed25519 over same HKDF and AES-GCM.',
    implementation: 'Cipher suite 0x0002 implements exact state machine with RFC 7748 and RFC 8032 primitives.',
    codeReference: 'P1_secure_channel/channel/suite.py:75',
    testReference: 'handshake_results.csv (Classical trials)',
    verified: true,
  },
];

export function TechnicalAnalysisPage() {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const categories = ['all', 'Cryptographic Primitives', 'Identity Trust Model', 'Authentication Scope', 'Transcript Binding', 'Key Derivation', 'Replay Protection', 'Official Payloads', 'Classical Baseline'];

  const filteredItems = filterCategory === 'all'
    ? ACCEPTANCE_CHECKLIST
    : ACCEPTANCE_CHECKLIST.filter((i) => i.category === filterCategory);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(id);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  return (
    <div className="space-y-8 select-none">
      <PageHeading
        title="Technical Analysis & Security Acceptance"
        subtitle="Formal verification of official PS-P1 security acceptance conditions, architectural design decisions, and trade-off analysis under Objective 5"
        badge="Objective 5 (P1)"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Acceptance Conditions"
          value="8 / 8 VERIFIED"
          description="All official requirements met"
          badge="100% Compliant"
          highlight
        />
        <MetricCard
          label="NIST Security Level"
          value="Category 3"
          description="192-bit classical · 128-bit quantum"
          badge="FIPS 203 / 204"
        />
        <MetricCard
          label="Wire Expansion"
          value="28.35x"
          description="9,016 B (PQC) vs 318 B (Classical)"
          badge="PQC Trade-off"
        />
        <MetricCard
          label="Implementation Scope"
          value="PROTOTYPE"
          description="Educational research prototype"
          badge="Audited Invariant"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: ARCHITECTURAL DESIGN DECISIONS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border bg-white shadow-sm overflow-hidden"
        style={{ borderColor: '#E8E1D8' }}
      >
        <div className="px-5 py-4 border-b border-[#E8E1D8] bg-[#FAF8F4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[#963B43]" />
            <h2 className="font-serif text-sm font-bold text-[#292824]">
              Design Decisions & Rationales (DESIGN.md)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#8C877F]">
            Cryptographic primitives conformant to NIST FIPS specifications
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="p-4 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#963B43]">
              <Shield size={14} />
              <span>Key Encapsulation: ML-KEM-768 (FIPS 203)</span>
            </div>
            <p className="text-[#4A4540] leading-relaxed">
              Selected at NIST Security Category 3 (192-bit classical, 128-bit quantum). Parameterized with
              k=3, &eta;1=&eta;2=2, du=10, dv=4. Provides optimal balance between public key size (1,184 B),
              ciphertext size (1,088 B), and decapsulation speed (0.10 ms), maintaining quantum-safe secrecy
              against future cryptanalytic breakthroughs without the massive overhead of ML-KEM-1024.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#963B43]">
              <Lock size={14} />
              <span>Digital Signatures: ML-DSA-65 (FIPS 204)</span>
            </div>
            <p className="text-[#4A4540] leading-relaxed">
              NIST Category 3 lattice-based signature scheme over module learning with errors. Parameterized with
              (k,l)=(6,5), &gamma;1=2^19, &gamma;2=(q-1)/32. Provides constant-time verification (0.30 ms) with a
              1,952 B public key and 3,309 B signature. Guarantees authenticity against Shor-equipped active adversaries.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#2A6B3D]">
              <Layers size={14} />
              <span>Key Schedule: HKDF-SHA256 (RFC 5869)</span>
            </div>
            <p className="text-[#4A4540] leading-relaxed">
              Standardized Extract-and-Expand key derivation. PRK is extracted from the 32-byte KEM shared secret
              with client/server nonces as salt. 96 bytes are expanded using a domain-separated context string
              concatenated with the cumulative 32-byte transcript hash Thash, mathematically binding keying material
              to the exact wire negotiation.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#2A6B3D]">
              <Code2 size={14} />
              <span>Authenticated Encryption: AES-256-GCM (SP 800-38D)</span>
            </div>
            <p className="text-[#4A4540] leading-relaxed">
              Industry-standard AEAD with hardware acceleration (AES-NI). Monotonic 64-bit sequence numbers are
              XORed into the 12-byte IV base to guarantee nonce uniqueness. The 13-byte record header (record type,
              sequence number, payload length) is passed as Authenticated Additional Data (AAD), ensuring header
              tampering aborts before any plaintext is released.
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: OFFICIAL SECURITY ACCEPTANCE CHECKLIST */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border bg-white shadow-sm overflow-hidden"
        style={{ borderColor: '#E8E1D8' }}
      >
        <div className="px-5 py-4 border-b border-[#E8E1D8] flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F4]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#2A6B3D]" />
            <div>
              <h2 className="font-serif text-sm font-bold text-[#292824]">
                Official Security Acceptance Conditions
              </h2>
              <p className="text-[11px] text-[#8C877F]">
                All 8 mandatory security conditions verified against code invariants and automated test suites
              </p>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-[#963B43] text-white'
                    : 'bg-white border border-[#E8E1D8] text-[#68615A] hover:bg-[#FAF8F4]'
                }`}
              >
                {cat === 'all' ? 'All Conditions' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#E8E1D8]">
          {filteredItems.map((item) => (
            <div key={item.id} className="p-5 hover:bg-[#FAF8F4] transition-colors space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-[#EBF5EE] text-[#2A6B3D] border border-[#C2E5CD] flex items-center justify-center font-mono font-bold text-xs">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <div>
                    <span className="font-mono text-[10.5px] font-bold text-[#963B43] mr-2">[{item.id}]</span>
                    <span className="text-xs font-bold text-[#292824]">{item.title}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-[#EBF5EE] text-[#2A6B3D] border border-[#C2E5CD]">
                  VERIFIED IN CODE & TESTS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 rounded bg-white border border-[#E8E1D8] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#8C877F]">Organizers Requirement</span>
                  <p className="text-[#4A4540]">{item.requirement}</p>
                </div>
                <div className="p-3 rounded bg-white border border-[#E8E1D8] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#8C877F]">Implementation Evidence</span>
                  <p className="text-[#2A6B3D] font-medium">{item.implementation}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono pt-1 text-[#8C877F]">
                <div className="flex items-center gap-4">
                  <span>Source: <code className="text-[#292824] bg-[#EDE8E0] px-1.5 py-0.2 rounded">{item.codeReference}</code></span>
                  <span>Test: <code className="text-[#292824] bg-[#EDE8E0] px-1.5 py-0.2 rounded">{item.testReference}</code></span>
                </div>
                <button
                  onClick={() => handleCopy(item.codeReference, item.id)}
                  className="text-[#963B43] hover:underline cursor-pointer flex items-center gap-1"
                >
                  {copiedRef === item.id ? <Check size={11} className="text-[#2A6B3D]" /> : <Code2 size={11} />}
                  <span>{copiedRef === item.id ? 'Copied' : 'Copy Reference'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: TRADE-OFF MATRIX (PQC VS CLASSICAL BASELINE) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border bg-white shadow-sm overflow-hidden"
        style={{ borderColor: '#E8E1D8' }}
      >
        <div className="px-5 py-4 border-b border-[#E8E1D8] bg-[#FAF8F4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-[#963B43]" />
            <h2 className="font-serif text-sm font-bold text-[#292824]">
              Empirical Trade-off Matrix: PQC vs Classical Baseline
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#8C877F]">
            Direct comparison from 100 timed trials on Platform A
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F4] border-b border-[#E8E1D8] text-[11px] font-mono uppercase text-[#8C877F]">
              <tr>
                <th className="py-3 px-4 font-semibold">Evaluation Metric</th>
                <th className="py-3 px-4 font-semibold text-[#963B43]">Post-Quantum (ML-KEM-768 + ML-DSA-65)</th>
                <th className="py-3 px-4 font-semibold text-[#2A6B3D]">Classical Baseline (X25519 + Ed25519)</th>
                <th className="py-3 px-4 font-semibold">Relative Impact / Trade-off</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E1D8] font-mono">
              <tr className="hover:bg-[#FAF8F4]">
                <td className="py-3 px-4 font-semibold text-[#292824]">Median Handshake Latency</td>
                <td className="py-3 px-4 font-bold text-[#963B43]">6.64 ms (IQR: 4.25 ms)</td>
                <td className="py-3 px-4 font-bold text-[#2A6B3D]">1.44 ms (IQR: 2.09 ms)</td>
                <td className="py-3 px-4 text-[#68615A]">4.61x compute overhead on host CPU</td>
              </tr>
              <tr className="hover:bg-[#FAF8F4]">
                <td className="py-3 px-4 font-semibold text-[#292824]">Total Serialized Wire Bytes</td>
                <td className="py-3 px-4 font-bold text-[#963B43]">9,016 bytes</td>
                <td className="py-3 px-4 font-bold text-[#2A6B3D]">318 bytes</td>
                <td className="py-3 px-4 text-[#963B43] font-bold">28.35x wire expansion factor</td>
              </tr>
              <tr className="hover:bg-[#FAF8F4]">
                <td className="py-3 px-4 font-semibold text-[#292824]">KEM Public Key Size</td>
                <td className="py-3 px-4 text-[#292824]">1,184 bytes</td>
                <td className="py-3 px-4 text-[#292824]">32 bytes</td>
                <td className="py-3 px-4 text-[#68615A]">37.0x larger public key</td>
              </tr>
              <tr className="hover:bg-[#FAF8F4]">
                <td className="py-3 px-4 font-semibold text-[#292824]">KEM Ciphertext Size</td>
                <td className="py-3 px-4 text-[#292824]">1,088 bytes</td>
                <td className="py-3 px-4 text-[#292824]">32 bytes</td>
                <td className="py-3 px-4 text-[#68615A]">34.0x larger ciphertext</td>
              </tr>
              <tr className="hover:bg-[#FAF8F4]">
                <td className="py-3 px-4 font-semibold text-[#292824]">Digital Signature Size</td>
                <td className="py-3 px-4 text-[#292824]">3,309 bytes</td>
                <td className="py-3 px-4 text-[#292824]">64 bytes</td>
                <td className="py-3 px-4 text-[#68615A]">51.7x larger signature witness</td>
              </tr>
              <tr className="hover:bg-[#FAF8F4]">
                <td className="py-3 px-4 font-semibold text-[#292824]">Microbenchmark: Keygen</td>
                <td className="py-3 px-4 text-[#292824]">0.28 ms (KEM) / 0.41 ms (DSA)</td>
                <td className="py-3 px-4 text-[#292824]">0.06 ms (X25519) / 0.06 ms (Ed25519)</td>
                <td className="py-3 px-4 text-[#68615A]">Lattice sampling overhead</td>
              </tr>
              <tr className="hover:bg-[#FAF8F4]">
                <td className="py-3 px-4 font-semibold text-[#292824]">Microbenchmark: Sign / Verify</td>
                <td className="py-3 px-4 text-[#292824]">1.29 ms (Sign) / 0.30 ms (Verify)</td>
                <td className="py-3 px-4 text-[#292824]">0.06 ms (Sign) / 0.17 ms (Verify)</td>
                <td className="py-3 px-4 text-[#68615A]">Asymmetric: sign is compute-dominant</td>
              </tr>
              <tr className="hover:bg-[#FAF8F4]">
                <td className="py-3 px-4 font-semibold text-[#292824]">Memory Footprint (Platform B)</td>
                <td className="py-3 px-4 text-[#2A6B3D]">85.6 MB Peak RSS</td>
                <td className="py-3 px-4 text-[#2A6B3D]">64.3 MB Peak RSS</td>
                <td className="py-3 px-4 text-[#2A6B3D] font-bold">Both fit cleanly in 128 MB RAM budget</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 4: EVIDENCE-BASED RECOMMENDATIONS & MANDATORY DISCLOSURE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border bg-white shadow-sm space-y-3" style={{ borderColor: '#E8E1D8' }}>
          <div className="flex items-center gap-2 pb-2 border-b border-[#E8E1D8]">
            <CheckCircle2 size={16} className="text-[#2A6B3D]" />
            <h3 className="font-serif text-sm font-bold text-[#292824]">
              Evidence-Based Engineering Recommendations
            </h3>
          </div>
          <div className="space-y-2 text-xs text-[#4A4540]">
            <p>
              <strong>1. MTU Fragmentation Defense:</strong> Because PQC handshakes reach 9,016 bytes (exceeding standard
              1,500 B Ethernet MTU), transport framing must support fragmentation over TCP or use robust length-prefixed chunks
              to prevent packet drop on lossy WAN links.
            </p>
            <p>
              <strong>2. Pre-Authentication Session Caching:</strong> ML-DSA-65 signing consumes ~1.29 ms. Session resumption
              with pre-shared keys (PSKs) derived from initial PQC key exchange eliminates public-key signatures on reconnects.
            </p>
            <p>
              <strong>3. Streaming Chunker Size:</strong> The 64 KB chunk size demonstrated peak throughput (1,135 MB/s on 100 KB payload,
              479 MB/s on 10 MB payload) while keeping per-chunk AEAD overhead to just 29 bytes.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl border bg-[#FEF7EA] border-[#F6E3B8] shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#F6E3B8]">
            <AlertTriangle size={16} className="text-[#9A6B1A]" />
            <h3 className="font-serif text-sm font-bold text-[#9A6B1A]">
              Mandatory Prototype Scope Disclosure
            </h3>
          </div>
          <div className="space-y-2 text-xs text-[#7A5310] leading-relaxed">
            <p>
              <strong>Educational Research Prototype:</strong> This secure communication channel is developed specifically
              for Qiskit Fall Fest 2026 Phase 2 (PS-P1).
            </p>
            <p>
              <strong>Non-Production Notice:</strong> While it strictly implements NIST FIPS 203 (ML-KEM-768), NIST FIPS 204
              (ML-DSA-65), RFC 5869 (HKDF), and SP 800-38D (AES-256-GCM), this implementation has not been hardened against
              hardware physical side-channel power analysis, electromagnetic emissions, or differential fault attacks.
            </p>
            <p>
              Do not deploy this prototype in production systems requiring certified high-assurance cryptographic hardware boundaries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
