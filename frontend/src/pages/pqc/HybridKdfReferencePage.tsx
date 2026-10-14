import React from 'react';
import { GitMerge, ShieldCheck, KeyRound, Box, ArrowRight, Lock } from 'lucide-react';
import { PageHeading, Card, NoticeBox } from '../../components/pqc/Common';

export function HybridKdfReferencePage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Hybrid Key Derivation & Transcript Binding"
        subtitle="Dual-PRF key combiner design based on RFC 5869 HKDF-SHA256 with full session transcript authentication."
        badge="DUAL-PRF COMBINER"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card title="Dual-PRF Combiner Construction">
          <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
            <p>
              Combining two cryptographic key exchange mechanisms requires a <strong>dual-PRF combiner</strong>. An arbitrary concatenation or simple XOR of the secrets is not formally provably secure.
            </p>
            <div className="p-3 rounded bg-stone-900 text-stone-100 font-mono text-[11px] space-y-1.5 overflow-x-auto">
              <div className="text-stone-400"># 1. HKDF-Extract Phase</div>
              <div>PRK = HMAC-SHA256(salt=ss_ecdh, IKM=ss_mlkem)</div>
              <div className="text-stone-400 mt-2"># 2. Context Binding (Info)</div>
              <div>transcript_hash = SHA256(alice_ecdh_pk || bob_ecdh_pk || bob_mlkem_pk || mlkem_ciphertext)</div>
              <div>info = "Q-SHIELD-HYBRID-v1:" || transcript_hash</div>
              <div className="text-stone-400 mt-2"># 3. HKDF-Expand Phase</div>
              <div>HybridKey = HKDF-Expand(PRK, info, L=32)</div>
            </div>
            <p>
              In this design, <code className="font-mono text-stone-800">ss_ecdh</code> acts as the salt, and <code className="font-mono text-stone-800">ss_mlkem</code> acts as the input keying material (IKM). Even if one secret is fully compromised or entirely known to an adversary, the extraction property of HKDF guarantees that the output pseudorandom key (PRK) retains maximum entropy as long as either secret remains uncompromised.
            </p>
          </div>
        </Card>

        <Card title="Security Properties & Transcript Binding">
          <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
            <div className="p-2.5 rounded bg-stone-50 border border-stone-200 space-y-2">
              <span className="font-semibold text-stone-800 block border-b pb-1 border-stone-200">
                Guaranteed Security Invariants:
              </span>
              <div>
                <strong>1. Dual-PRF Robustness:</strong> The session key is cryptographically secure if AT LEAST ONE of ECDH or ML-KEM is uncompromised.
              </div>
              <div>
                <strong>2. Transcript Tamper Detection & Context Binding:</strong> Binding the complete transcript hash to the HKDF info context guarantees that any tampering with public keys or ciphertexts will cause Alice and Bob to derive divergent keys (causing downstream message authentication to fail). Note: Unauthenticated ephemeral-ephemeral key exchange provides passive eavesdropping and Harvest-Now-Decrypt-Later (HNDL) protection; active MitM defense requires asymmetric digital signatures (e.g., NIST ML-DSA / SLH-DSA).
              </div>
              <div>
                <strong>3. Constant-Time Verification:</strong> Derived keys are compared using <code className="font-mono text-stone-800">hmac.compare_digest()</code> to ensure verification reports zero timing side-channel leakage.
              </div>
            </div>

            <NoticeBox type="info" title="Scientific Honesty Disclaimer">
              While HKDF-based dual-PRF combiners are widely analyzed and adopted by NIST and IETF, combining two primitives does not create an invincible protocol. Authentication must be provided via an authenticated handshake (such as TLS 1.3 certificate signatures) to prevent active impersonation.
            </NoticeBox>
          </div>
        </Card>
      </div>

      <Card title="Full Protocol Exchange Diagram">
        <div className="p-4 rounded bg-[#FAF8F5] border border-stone-200 text-xs font-mono space-y-2 text-stone-800 overflow-x-auto">
          <div className="text-[#963B43] font-bold">ALICE (Initiator)                                                BOB (Responder)</div>
          <div>────────────────────────────────────────────────────────────────────────────</div>
          <div>1. Generate Ephemeral ECDH (sk_A, pk_A)                 1. Generate Ephemeral ECDH (sk_B, pk_B)</div>
          <div>                                                       2. Generate ML-KEM-768 (sk_B_kem, pk_B_kem)</div>
          <div>                                                       </div>
          <div>                          &lt;───── pk_B (65 B), pk_B_kem (1,184 B) ─────</div>
          <div>                                                       </div>
          <div>3. Derive ss_ecdh = ECDH(sk_A, pk_B)</div>
          <div>4. (c_kem, ss_mlkem) = ML-KEM.Encaps(pk_B_kem)</div>
          <div>                                                       </div>
          <div>───── pk_A (65 B), c_kem (1,088 B) ─────&gt;</div>
          <div>                                                       5. Derive ss_ecdh = ECDH(sk_B, pk_A)</div>
          <div>                                                       6. ss_mlkem = ML-KEM.Decaps(c_kem, sk_B_kem)</div>
          <div>                                                       </div>
          <div>7. transcript = pk_A || pk_B || pk_B_kem || c_kem      7. transcript = pk_A || pk_B || pk_B_kem || c_kem</div>
          <div>8. K_A = HKDF(ss_ecdh, ss_mlkem, transcript)           8. K_B = HKDF(ss_ecdh, ss_mlkem, transcript)</div>
          <div>                                                       </div>
          <div>─────────────────────────── VERIFICATION ───────────────────────────────</div>
          <div className="text-emerald-800 font-bold">Assert: hmac.compare_digest(K_A, K_B) == True  [Identical 256-bit Hybrid Key]</div>
        </div>
      </Card>
    </div>
  );
}
