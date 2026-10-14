# Q-SHIELD-PQC: Security Analysis & Threat Model

---

## 1. Threat Model & Adversarial Assumptions

### 1.1 Store-Now, Decrypt-Later (SNDL)
Classical key agreement algorithms such as Diffie-Hellman and ECDH (SECP256R1) rely on the hardness of the Discrete Logarithm Problem. A passive adversary with sufficient storage can intercept and store all encrypted communications today. When a cryptanalytically relevant quantum computer (CRQC) running Shor's algorithm becomes operational in the future, the adversary can factor RSA moduli or solve elliptic-curve discrete logarithms in polynomial time, retroactively decrypting historical transcripts.

### 1.2 Quantum vs. Classical Attacks
- **Classical Attacks**: ECDH P-256 provides approximately 128 bits of security against best-known classical algorithms (Pollard's rho algorithm requires $\approx 2^{128}$ operations).
- **Quantum Attacks**: Shor's algorithm breaks ECDH P-256 in $O(n^3)$ operations. Conversely, ML-KEM-768 is based on the Module Learning With Errors (MLWE) problem over module lattices, for which no polynomial-time quantum algorithm is known.

---

## 2. Hybrid Combinator Security Guarantee

The dual-PRF combinator ensures that the derived symmetric session key $K_{\text{hybrid}}$ is secure as long as **at least one** of the underlying component algorithms remains unbroken:
1. **Case 1: Quantum Computer breaks ECDH P-256**:
   The adversary solves the discrete logarithm and recovers $\text{ss}_{\text{ec}}$. However, ML-KEM-768 remains secure under MLWE hardness. Because $\text{IKM} = \text{ss}_{\text{ec}} \mathbin{\Vert} \text{ss}_{\text{ml}}$, the adversary cannot compute $\text{ss}_{\text{ml}}$, and HKDF-Extract outputs an pseudorandom PRK indistinguishable from uniform.
2. **Case 2: Unexpected mathematical breakthrough breaks ML-KEM-768**:
   If an unexpected classical lattice reduction attack breaks ML-KEM-768, ECDH P-256 continues to safeguard the exchange against classical adversaries.

---

## 3. Explicit Non-Claims & Scientific Boundaries

1. **No Physical Quantum Hardware Claims**:
   All cryptographic operations (ECDH P-256, ML-KEM-768, HKDF-SHA256, AES-256-GCM) execute on **classical host CPUs**.
2. **No Formally Proven Hybrid Protocol Claim**:
   The hybrid construction follows best-practice IETF and NIST guidelines (RFC 9180, NIST SP 800-56C Rev. 2). It does not claim a novel zero-knowledge or formally verified machine-checked proof.
3. **No Key Reuse**:
   ECDH keys and ML-KEM randomness are ephemeral per session; static key reuse is prohibited.
