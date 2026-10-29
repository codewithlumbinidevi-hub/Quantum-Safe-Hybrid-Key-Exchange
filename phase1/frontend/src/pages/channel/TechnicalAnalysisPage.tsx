import React from 'react';
import { BookOpen, ShieldCheck, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { PageHeading } from '../../components/pqc/Common';

export function TechnicalAnalysisPage() {
  const criteria = [
    { title: 'Cryptographic Primitives', status: true, detail: 'ML-KEM-768 (FIPS 203) + ML-DSA-65 (FIPS 204) + HKDF-SHA256 (RFC 5869) + AES-256-GCM (SP 800-38D)' },
    { title: 'Identity Trust Model', status: true, detail: 'Explicitly pinned verification keys in constant-time TrustAnchorStore; TOFU strictly prohibited' },
    { title: 'Transcript Binding', status: true, detail: 'Cumulative SHA-256 over all 3 flight wire frames; binds identities, nonces, algorithm choices, and key material' },
    { title: 'Directional Traffic Keys', status: true, detail: 'HKDF expands separate 32-byte keys and 12-byte IV bases for Alice->Bob and Bob->Alice directions' },
    { title: 'Replay Protection', status: true, detail: 'Monotonic 64-bit sequence numbers in 13-byte AAD header; replayed or reordered records trigger SequenceNumberError' },
    { title: 'Classical Baseline', status: true, detail: 'Exact matching flow using X25519 + Ed25519 over same HKDF key schedule and AES-256-GCM record layer' },
    { title: 'Official Payloads (1 KB, 100 KB, 10 MB)', status: true, detail: 'Chunked into 64 KB records; decrypted byte-exact with matching SHA-256 hashes against payload_sha256.txt' },
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        title="Technical Analysis & Recommendations"
        subtitle="Security acceptance verification, trade-offs, and engineering disclosures under Objective 5"
        badge="Objective 5"
      />

      {/* Security Acceptance Conditions */}
      <div className="rounded-lg border bg-white shadow-sm p-5 space-y-4" style={{ borderColor: '#E8E1D8' }}>
        <div className="flex items-center gap-2 pb-3 border-b border-[#E8E1D8]">
          <ShieldCheck size={18} className="text-[#2A6B3D]" />
          <h3 className="font-serif text-sm font-semibold text-[#292824]">
            Official PS-P1 Security Acceptance Conditions
          </h3>
        </div>

        <div className="space-y-2.5">
          {criteria.map((c, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[#FAF8F4] border border-[#E8E1D8] text-xs">
              <CheckCircle2 size={16} className="text-[#2A6B3D] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#292824]">{c.title}</p>
                <p className="text-[#68615A] mt-0.5">{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prototype Disclosure Notice */}
      <div className="p-4 rounded-lg bg-[#FEF7EA] border border-[#F6E3B8] flex items-start gap-3 text-xs text-[#9A6B1A]">
        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Prototype Implementation Scope:</span>
          <p className="mt-0.5">
            This quantum-safe channel implementation is engineered as an empirical prototype for the Qiskit Fall Fest 2026 Hackathon.
            While mathematically compliant with FIPS 203, FIPS 204, and SP 800-38D, it has not undergone third-party cryptographic audits,
            side-channel power analysis hardening, or formal verification.
          </p>
        </div>
      </div>
    </div>
  );
}
