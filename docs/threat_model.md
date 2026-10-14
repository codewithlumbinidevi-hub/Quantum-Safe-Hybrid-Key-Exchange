# Threat Model & Cryptographic Security Analysis

## 1. System Threat Landscape

The emergence of Cryptanalytically Relevant Quantum Computers (CRQCs) threatens classical public key cryptography:
- **Shor's Algorithm** solves the discrete logarithm problem over elliptic curve groups in polynomial time $O((\log N)^3)$, reducing the security of NIST P-256 from 128-bit classical security to 0 bits against quantum adversaries.
- **"Harvest Now, Decrypt Later" (HNDL)** attacks: Adversaries passively record encrypted network traffic today to decrypt it in the future once quantum hardware is capable.

---

## 2. Security Objectives

1. **Quantum-Resilient Forward Secrecy**: An adversary capturing session transcripts today cannot decrypt them retroactively using a quantum computer.
2. **Classical Fallback Resilience (The "Combinator Principle")**: If any unexpected mathematical weakness is discovered in lattice-based post-quantum cryptography (ML-KEM-768), the established session remains protected by the classical NIST P-256 ECDH security margin (and vice-versa).
3. **Handshake Integrity & MITM Resistance**: All public parameters, ephemeral keys, and ciphertexts are cryptographically bound to the key derivation function through transcript hashing.
4. **Zero Key Material Leakage**: Private keys and unhashed shared secrets are never exposed to logs, client responses, or storage.

---

## 3. Cryptographic Primitives & Parameters

| Component | Standard / RFC | Primitive | Key/Ciphertext Size | Security Target |
| :--- | :--- | :--- | :--- | :--- |
| **Classical KEM/KEX** | SEC 1 / FIPS 186-5 | ECDH (P-256 / secp256r1) | PK: 65 bytes (SEC1 uncompressed) | 128-bit classical security |
| **Post-Quantum KEM** | NIST FIPS 203 | ML-KEM-768 | PK: 1,184 bytes, CT: 1,088 bytes | NIST Category 3 (AES-192 equivalent) |
| **Key Combinator** | NIST SP 800-56C Rev 2 | HKDF-SHA256 | PRK: 32 bytes, OKM: 32 bytes | Dual-PRF combinator security |
| **Symmetric Demo** | NIST SP 800-38D | AES-256-GCM | 96-bit nonce, 128-bit tag | Authenticated Encryption with AAD |

---

## 4. Dual-PRF Combinator Formal Construction

The hybrid key derivation function (KDF) uses the **dual-PRF combinator**:
$$\text{IKM} = ss_{\text{ECDH}} \parallel ss_{\text{ML-KEM}}$$
$$\text{Transcript} = \mathcal{H}(\text{pk}_{A,\text{ec}} \parallel \text{pk}_{B,\text{ec}} \parallel \text{pk}_{B,\text{ml}} \parallel \text{ct}_{\text{ml}})$$
$$K_{\text{hybrid}} = \text{HKDF-Expand}(\text{HKDF-Extract}(\text{Salt}, \text{IKM}), \text{Context} \parallel \text{Transcript}, 32)$$

### Formal Theorem (Krawczyk, 2010):
If HKDF-Extract is modeled as an HMAC-based randomness extractor or pseudo-random function (PRF), then the derived key $K_{\text{hybrid}}$ is cryptographically indistinguishable from uniform random as long as **at least one** of $\{ss_{\text{ECDH}}, ss_{\text{ML-KEM}}\}$ has sufficient min-entropy and is computationally secure.
