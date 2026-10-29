import React from 'react';
import { Info, Shield, Award, Terminal, CheckCircle2 } from 'lucide-react';
import { PageHeading, Card, NoticeBox } from '../../components/pqc/Common';

export function AboutPqcPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="About Q-SHIELD-PQC"
        subtitle="Quantum-Safe Post-Quantum Cryptography Research Platform for Qiskit Fall Fest 2026."
        badge="SRM UNIVERSITY-AP · TRACK 5"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card title="Project Identity & Mission">
          <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
            <p>
              <strong>Q-SHIELD-PQC</strong> is developed for <strong>Qiskit Fall Fest 2026 (Track 5: Post-Quantum Cryptography & Quantum-Safe Systems)</strong> at SRM University-AP.
            </p>
            <p>
              The platform addresses <strong>Problem Statement PS-P1: Quantum-Safe Hybrid Key Exchange</strong> as our primary and sole submission statement, adhering strictly to the official universal Processor A/B benchmarking framework. (An auxiliary cryptographic scanner is included as a non-graded bonus extension).
            </p>
            <div className="p-3 rounded bg-stone-50 border border-stone-200 space-y-1.5 text-[11px]">
              <div>• <strong>Standards Compliance:</strong> NIST FIPS 203 ML-KEM-768, RFC 5869 HKDF-SHA256, NIST SP 800-56A Rev 3 ECDH.</div>
              <div>• <strong>Verification Model:</strong> Constant-time verification, transcript authentication, and zero private key logging.</div>
              <div>• <strong>Evaluation Rigor:</strong> Real wall-clock benchmarks across unconstrained and constrained hardware profiles.</div>
            </div>
          </div>
        </Card>

        <Card title="Technical Excellence Principles">
          <div className="space-y-2.5 text-xs text-stone-700 leading-relaxed">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-700 flex-shrink-0 mt-0.5" />
              <span><strong>Zero Mock Cryptography:</strong> All key exchanges and encapsulations execute real NIST FIPS 203 algorithms via PyCA Cryptography.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-700 flex-shrink-0 mt-0.5" />
              <span><strong>Zero Fabricated Benchmarks:</strong> Latency metrics, ciphertext sizes, and memory usage are measured directly from the running host.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-700 flex-shrink-0 mt-0.5" />
              <span><strong>Clean Separation of Concerns:</strong> Classical cryptographic key exchange runs on host CPUs, while Qiskit Aer independently models quantum hardware circuit depth and gate overhead.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-700 flex-shrink-0 mt-0.5" />
              <span><strong>Instant Reproducibility:</strong> Includes full automated test suite, JSON/CSV exports, SHA-256 checksums, and execution scripts.</span>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Quick CLI Verification Commands">
        <div className="p-3 rounded bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto space-y-2">
          <div><span className="text-stone-400"># 1. Run all automated backend & processor unit tests</span></div>
          <div>python -m pytest backend/tests processors/tests -v</div>
          <div className="pt-2"><span className="text-stone-400"># 2. Run dual-platform 100-trial hybrid benchmark</span></div>
          <div>python scripts/run_crypto_benchmark.py --iterations 100 --profile both</div>
          <div className="pt-2"><span className="text-stone-400"># 3. Verify SHA-256 checksums of result artifacts</span></div>
          <div>python -c "import hashlib, pathlib; [print(p.name, hashlib.sha256(p.read_bytes()).hexdigest()) for p in pathlib.Path('results').glob('*.json')]"</div>
        </div>
      </Card>
    </div>
  );
}
