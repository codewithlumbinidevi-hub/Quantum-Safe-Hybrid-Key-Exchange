import React from 'react';
import { KeyRound, ShieldAlert, Cpu, CheckCircle2, Lock } from 'lucide-react';
import { PageHeading, Card, NoticeBox } from '../../components/pqc/Common';

export function EcdhReferencePage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="ECDH P-256 (secp256r1) Technical Reference"
        subtitle="Classical asymmetric key agreement primitive based on the Elliptic Curve Discrete Logarithm Problem (ECDLP)."
        badge="NIST SP 800-56A REV 3"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card title="Cryptographic Role & Purpose">
          <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
            <p>
              Elliptic Curve Diffie-Hellman (ECDH) over the NIST P-256 (secp256r1) curve provides 128 bits of classical security against classical adversaries. It is universally supported across TLS 1.3, SSH, and IPsec.
            </p>
            <div className="p-2.5 rounded bg-stone-50 border border-stone-200 space-y-1 font-mono text-[11px]">
              <div>Curve: NIST P-256 (secp256r1, prime order 2^256 - 2^224 + ...)</div>
              <div>Private Key: 32-byte scalar d ∈ [1, n-1]</div>
              <div>Public Key: 65-byte uncompressed point (0x04 || X || Y)</div>
              <div>Shared Secret: 32-byte scalar multiplication x-coordinate</div>
            </div>
            <p>
              In our hybrid design, Alice and Bob generate ephemeral keypairs for every session. Neither party reuses public keys, ensuring Forward Secrecy against classical compromise.
            </p>
          </div>
        </Card>

        <Card title="Quantum Vulnerability & Shor's Algorithm">
          <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
            <NoticeBox type="warning" title="Store Now, Decrypt Later (SNDL) Threat">
              Adversaries are actively harvesting encrypted TLS sessions today. When a Cryptographically Relevant Quantum Computer (CRQC) becomes operational, Shor's algorithm will solve the discrete logarithm problem on P-256 in polynomial time:
              <div className="mt-1 font-mono font-bold text-amber-900">
                O((log p)³) quantum gates
              </div>
            </NoticeBox>
            <p>
              Because ECDH P-256 offers <strong>zero quantum resistance</strong>, classical-only exchanges provide no long-term security. However, retaining P-256 in the hybrid combiner ensures compliance with FIPS 140-3 transition rules while post-quantum algorithms undergo operational maturation.
            </p>
          </div>
        </Card>
      </div>

      <Card title="What is Measured in Q-SHIELD Benchmarks">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded bg-stone-50 border border-stone-200">
            <span className="font-semibold text-stone-800 block mb-1">Key Generation</span>
            <p className="text-stone-600 text-[11px]">
              Time required to draw 256 bits of OS cryptographic entropy and perform point scalar multiplication with curve generator G.
            </p>
          </div>
          <div className="p-3 rounded bg-stone-50 border border-stone-200">
            <span className="font-semibold text-stone-800 block mb-1">Derivation Time</span>
            <p className="text-stone-600 text-[11px]">
              Point scalar multiplication of the peer's public key with the local private scalar, followed by x-coordinate serialization.
            </p>
          </div>
          <div className="p-3 rounded bg-stone-50 border border-stone-200">
            <span className="font-semibold text-stone-800 block mb-1">Wire Payload</span>
            <p className="text-stone-600 text-[11px]">
              Exactly 65 bytes transmitted per participant (uncompressed point format `0x04 || X || Y`).
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
