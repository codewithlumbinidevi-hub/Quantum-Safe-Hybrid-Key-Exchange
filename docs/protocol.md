# Q-SHIELD-PQC: Protocol Specification
## Hybrid Post-Quantum Key Agreement: ECDH P-256 + ML-KEM-768

---

## 1. Protocol Architecture & Participant Roles

The protocol defines two logical participants:
- **Alice (Initiator)**: Initiates ephemeral key exchange, encapsulates to Bob's post-quantum public key, and binds the transcript into the final session key.
- **Bob (Responder)**: Receives Alice's ephemeral public key, generates an ephemeral ML-KEM-768 key pair, decapsulates the ciphertext received from Alice, and computes the identical hybrid key.

```
       ALICE (Initiator)                                  BOB (Responder)
 ┌───────────────────────────┐                      ┌───────────────────────────┐
 │ 1. Generate Ephemeral     │                      │                           │
 │    ECDH Key Pair:         │                      │                           │
 │    (sk_ec_A, pk_ec_A)     │                      │                           │
 └─────────────┬─────────────┘                      └───────────────────────────┘
               │                                                  │
               │────── pk_ec_A (SEC1 uncompressed, 65B) ─────────>│
               │                                                  │
               │                                    ┌─────────────┴─────────────┐
               │                                    │ 2. Generate Ephemeral     │
               │                                    │    ECDH Key Pair:         │
               │                                    │    (sk_ec_B, pk_ec_B)     │
               │                                    │ 3. Generate ML-KEM-768    │
               │                                    │    Key Pair (FIPS 203):   │
               │                                    │    (sk_ml_B, pk_ml_B)     │
               │                                    │ 4. Derive ECDH Secret:    │
               │                                    │    ss_ec = ECDH(sk_ec_B,  │
               │                                    │                 pk_ec_A)  │
               │                                    └─────────────┬─────────────┘
               │                                                  │
               │<────── pk_ec_B (65B) + pk_ml_B (1184B) ──────────│
               │                                                  │
 ┌─────────────┴─────────────┐                                    │
 │ 5. Derive ECDH Secret:    │                                    │
 │    ss_ec = ECDH(sk_ec_A,  │                                    │
 │                 pk_ec_B)  │                                    │
 │ 6. Encapsulate to Bob:    │                                    │
 │    (ss_ml, ct_ml) =       │                                    │
 │    ML-KEM-Encap(pk_ml_B)  │                                    │
 └─────────────┬─────────────┘                                    │
               │                                                  │
               │─────── ct_ml (1088B ciphertext) ────────────────>│
               │                                                  │
 ┌─────────────┴─────────────┐                      ┌─────────────┴─────────────┐
 │ 7. Compute Transcript:    │                      │ 8. Decapsulate Ciphertext:│
 │    H_tr = SHA256(...)     │                      │    ss_ml = ML-KEM-Decap(  │
 │ 8. Derive Hybrid Key:     │                      │            sk_ml_B, ct_ml)│
 │    K_AB = HKDF-SHA256(    │                      │ 9. Compute Transcript:    │
 │      IKM=ss_ec || ss_ml,  │                      │    H_tr = SHA256(...)     │
 │      Salt=SHA256(SALT),   │                      │ 10. Derive Hybrid Key:    │
 │      Info=CTX || H_tr     │                      │    K_AB = HKDF-SHA256(    │
 │    )                      │                      │      IKM=ss_ec || ss_ml,  │
 └───────────────────────────┘                      │      Salt=SHA256(SALT),   │
                                                    │      Info=CTX || H_tr     │
                                                    │    )                      │
                                                    └───────────────────────────┘
```

---

## 2. Mathematical Combinator & Domain Separation

### 2.1 Input Keying Material (IKM)
The hybrid scheme follows a dual-PRF combinator construction:
$$\text{IKM} = \text{ss}_{\text{ec}} \mathbin{\Vert} \text{ss}_{\text{ml}}$$
Where:
- $\text{ss}_{\text{ec}} \in \{0,1\}^{256}$ is the 32-byte shared secret derived from scalar multiplication on SECP256R1 ($x$-coordinate).
- $\text{ss}_{\text{ml}} \in \{0,1\}^{256}$ is the 32-byte shared secret decapsulated via ML-KEM-768 (FIPS 203).
- $\text{IKM} \in \{0,1\}^{512}$ (64 bytes total).

### 2.2 Public Transcript Authentication
To prevent man-in-the-middle (MITM) transcript substitution and cross-protocol attacks, the transcript hash is strictly computed over all transmitted public elements:
$$\text{Transcript} = \text{len}(\text{pk}_{\text{ec}}^A) \mathbin{\Vert} \text{pk}_{\text{ec}}^A \mathbin{\Vert} \text{len}(\text{pk}_{\text{ec}}^B) \mathbin{\Vert} \text{pk}_{\text{ec}}^B \mathbin{\Vert} \text{len}(\text{pk}_{\text{ml}}^B) \mathbin{\Vert} \text{pk}_{\text{ml}}^B \mathbin{\Vert} \text{len}(\text{ct}_{\text{ml}}) \mathbin{\Vert} \text{ct}_{\text{ml}}$$
$$H_{\text{tr}} = \text{SHA-256}(\text{"TRANSCRIPT-START"} \mathbin{\Vert} \text{Transcript} \mathbin{\Vert} \text{"TRANSCRIPT-END"})$$

### 2.3 HKDF-SHA256 Extraction and Expansion
$$\text{PRK} = \text{HKDF-Extract}(\text{Salt} = \text{SHA256}(\text{"Q-SHIELD-PQC-SALT-v1"}), \text{IKM})$$
$$K_{\text{hybrid}} = \text{HKDF-Expand}(\text{PRK}, \text{Info} = \text{PROTOCOL\_CONTEXT} \mathbin{\Vert} H_{\text{tr}}, L = 32)$$
Where $\text{PROTOCOL\_CONTEXT} = \text{"Q-SHIELD-PQC-v1:HYBRID-KDF:ECDH-P256:ML-KEM-768"}$.

---

## 3. Protocol Message Sizes

| Protocol Artifact | Standard Format | Size (Bytes) | Security Level |
|---|---|---|---|
| Alice ECDH Public Key ($\text{pk}_{\text{ec}}^A$) | SEC1 Uncompressed ($0x04 \parallel x \parallel y$) | 65 | Classical 128-bit |
| Bob ECDH Public Key ($\text{pk}_{\text{ec}}^B$) | SEC1 Uncompressed ($0x04 \parallel x \parallel y$) | 65 | Classical 128-bit |
| Bob ML-KEM Public Key ($\text{pk}_{\text{ml}}^B$) | NIST FIPS 203 Raw Format | 1,184 | Post-Quantum Category 3 (AES-192 equivalent) |
| ML-KEM Ciphertext ($\text{ct}_{\text{ml}}$) | NIST FIPS 203 Encapsulation | 1,088 | Post-Quantum Category 3 |
| Derived Symmetric Key ($K_{\text{hybrid}}$) | Raw 256-bit Key | 32 | Post-Quantum 256-bit |
| **Total Transmitted Payload** | **Full Handshake** | **2,402** | **Hybrid Quantum-Safe** |

---

## 4. Constant-Time Verification & Secret Protection

1. **Constant-Time Digest Comparison**:
   Verification of derived key equality is performed using Python's `hmac.compare_digest(alice_key, bob_key)` to mitigate timing side-channel analysis.
2. **Zero Secret Leakage**:
   Neither private keys nor raw intermediate shared secrets ($\text{ss}_{\text{ec}}, \text{ss}_{\text{ml}}, K_{\text{hybrid}}$) are ever serialized, logged, or returned across API boundaries. Verification is reported strictly via Boolean flags and SHA-256 key fingerprints.
