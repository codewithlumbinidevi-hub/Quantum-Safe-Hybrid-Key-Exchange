import React from 'react';
import { Box, ShieldCheck, Cpu, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { PageHeading, Card, NoticeBox } from '../../components/pqc/Common';

export function MlkemReferencePage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="ML-KEM-768 (FIPS 203) Technical Reference"
        subtitle="Standardized Module-Lattice-Based Key Encapsulation Mechanism ratified by NIST in August 2024."
        badge="NIST FIPS 203 · CATEGORY 3"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card title="Algorithm Overview & Mathematical Foundation">
          <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
            <p>
              ML-KEM-768 (derived from CRYSTALS-Kyber) is based on the computational hardness of the Module Learning With Errors (M-LWE) problem over polynomial ring <strong>R_q = Z_q[X]/(X^256 + 1)</strong> with modulus q = 3329 and matrix rank k = 3.
            </p>
            <div className="p-2.5 rounded bg-stone-50 border border-stone-200 space-y-1 font-mono text-[11px]">
              <div>Standard: NIST FIPS 203 (Ratified Aug 2024)</div>
              <div>Security Level: Category 3 (Equivalent to AES-192)</div>
              <div>Public Key Size: 1,184 bytes (ρ seed + t vector)</div>
              <div>Ciphertext Size: 1,088 bytes (u vector + v compressed scalar)</div>
              <div>Shared Secret: 32 bytes (256 bits)</div>
            </div>
            <p>
              Unlike traditional Diffie-Hellman protocols where both parties exchange public keys symmetrically, ML-KEM is an asymmetric <strong>Key Encapsulation Mechanism (KEM)</strong>. Bob generates a keypair; Alice encapsulates to Bob's public key; Bob decapsulates.
            </p>
          </div>
        </Card>

        <Card title="Fujisaki-Okamoto Transform & IND-CCA2 Security">
          <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
            <p>
              FIPS 203 utilizes a derandomized Fujisaki-Okamoto (FO) transform to convert a CPA-secure public-key encryption scheme into an <strong>IND-CCA2</strong> secure KEM.
            </p>
            <div className="p-2.5 rounded bg-stone-50 border border-stone-200 space-y-1.5 text-[11px]">
              <div className="font-semibold text-stone-800">Decapsulation Verification:</div>
              <p className="text-stone-600">
                During <code className="font-mono text-stone-800">ML-KEM.Decaps</code>, Bob re-encrypts the decrypted plaintext using pseudo-random coins re-derived from the decrypted value. If the recomputed ciphertext does not match the received ciphertext byte-for-byte, Bob returns a pseudorandom rejection key rather than an error, preventing adaptive chosen-ciphertext timing attacks.
              </p>
            </div>
            <NoticeBox type="info" title="Implementation Clarification">
              ML-KEM is purely an encapsulation scheme for establishing shared symmetric keys. It is <strong>not</strong> a digital signature scheme (digital signatures are standardized under FIPS 204 ML-DSA and FIPS 205 SLH-DSA).
            </NoticeBox>
          </div>
        </Card>
      </div>

      <Card title="NIST FIPS 203 Parameter Set Comparison">
        <div className="overflow-x-auto border rounded border-stone-200 text-xs">
          <table className="w-full text-left">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
              <tr>
                <th className="p-2.5">Parameter Set</th>
                <th className="p-2.5">NIST Security Category</th>
                <th className="p-2.5">Public Key</th>
                <th className="p-2.5">Ciphertext</th>
                <th className="p-2.5">Status in Q-SHIELD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
              <tr className="text-stone-500">
                <td className="p-2.5 font-sans">ML-KEM-512</td>
                <td className="p-2.5">Category 1 (AES-128)</td>
                <td className="p-2.5">800 bytes</td>
                <td className="p-2.5">768 bytes</td>
                <td className="p-2.5 font-sans">Supported</td>
              </tr>
              <tr className="bg-[#FAF5F5] font-bold text-stone-800">
                <td className="p-2.5 font-sans text-[#963B43]">ML-KEM-768</td>
                <td className="p-2.5 text-[#963B43]">Category 3 (AES-192)</td>
                <td className="p-2.5 text-[#963B43]">1,184 bytes</td>
                <td className="p-2.5 text-[#963B43]">1,088 bytes</td>
                <td className="p-2.5 font-sans text-emerald-800">Primary Benchmark Standard</td>
              </tr>
              <tr className="text-stone-500">
                <td className="p-2.5 font-sans">ML-KEM-1024</td>
                <td className="p-2.5">Category 5 (AES-256)</td>
                <td className="p-2.5">1,568 bytes</td>
                <td className="p-2.5">1,568 bytes</td>
                <td className="p-2.5 font-sans">Supported</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
