import React from 'react';
import { Shield, ExternalLink } from 'lucide-react';
import { SectionHeader } from '../../components/scanner/ScannerUI';

export function AboutPage() {
  return (
    <div className="space-y-5 max-w-3xl">
      <SectionHeader
        title="About This Tool"
        description="Q-SHIELD Cryptographic Inventory & Migration Scanner"
        badge="TRACK 5 · PS-P2"
      />

      <div className="qs-card p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#963B43' }}>
            <Shield size={18} color="#fff" />
          </div>
          <div>
            <h2 className="font-serif text-xl" style={{ color: '#292824' }}>Q-SHIELD</h2>
            <p className="text-xs tracking-widest font-semibold" style={{ color: '#963B43' }}>
              QUANTUM-SAFE CRYPTOGRAPHY
            </p>
          </div>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: '#8C877F' }}>
          Q-SHIELD Cryptographic Inventory & Migration Scanner is a deterministic static-analysis tool 
          built for <strong style={{ color: '#292824' }}>PS-P2 (Post-Quantum Cryptography, Track 5)</strong> of 
          Qiskit Fall Fest 2026, SRM University-AP.
        </p>

        <p className="text-xs leading-relaxed" style={{ color: '#8C877F' }}>
          The scanner identifies quantum-vulnerable cryptographic implementations in source code repositories 
          and recommends migration paths to NIST-standardised post-quantum algorithms (FIPS 203 ML-KEM, 
          FIPS 204 ML-DSA, FIPS 205 SLH-DSA).
        </p>

        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#292824' }}>Problem Statement</h3>
          <p className="text-xs leading-relaxed" style={{ color: '#8C877F' }}>
            <strong style={{ color: '#292824' }}>PS-P2:</strong> Cryptographic Inventory & Migration Scanner — 
            Track 5, Post-Quantum Cryptography (Quantum-Safe Systems).
            The goal is to scan source code repositories for quantum-vulnerable cryptographic algorithms, 
            identify their usage, classify findings, and recommend migration paths to post-quantum standards.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#292824' }}>Technology</h3>
          <ul className="space-y-1 text-xs" style={{ color: '#8C877F' }}>
            <li>• <strong style={{ color: '#292824' }}>Frontend:</strong> React + TypeScript + Vite + Tailwind CSS</li>
            <li>• <strong style={{ color: '#292824' }}>Backend:</strong> FastAPI (Python) with deterministic regex-based scanner</li>
            <li>• <strong style={{ color: '#292824' }}>Detection:</strong> Configurable rule-based static analysis — no AI/ML</li>
            <li>• <strong style={{ color: '#292824' }}>Reports:</strong> JSON, CSV, Markdown export</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#292824' }}>Disclaimers</h3>
          <ul className="space-y-1.5 text-xs" style={{ color: '#8C877F' }}>
            <li>• This is a <strong style={{ color: '#292824' }}>research demonstration</strong>, not a production security product.</li>
            <li>• This tool is <strong style={{ color: '#292824' }}>not affiliated with or endorsed by</strong> IBM, Qiskit, SRM University-AP, NIST, or any government organisation.</li>
            <li>• A finding marks usage requiring review — it does not confirm an actively exploitable vulnerability.</li>
            <li>• Only Python source files receive full pattern-based scanning.</li>
            <li>• No code from scanned repositories is executed.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#292824' }}>References</h3>
          <div className="space-y-1">
            {[
              ['NIST FIPS 203 — ML-KEM', 'https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf'],
              ['NIST FIPS 204 — ML-DSA', 'https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf'],
              ['NIST FIPS 205 — SLH-DSA', 'https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.205.pdf'],
              ['NIST PQC Project', 'https://csrc.nist.gov/projects/post-quantum-cryptography'],
              ['Qiskit Fall Fest', 'https://github.com/qiskit-community/qiskit-fall-fest-2026'],
            ].map(([label, url]) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs" style={{ color: '#963B43' }}>
                <ExternalLink size={10} /> {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
