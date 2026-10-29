# Quantum-Safe Secure Communication Channel (PS-P1)
## Architecture & Protocol Design Specification (v1.0)

---

## 1. System Overview & Roles

The **Quantum-Safe Secure Communication Channel (Q-SHIELD Channel)** provides authenticated, confidential, and replay-protected communication between two endpoints over an untrusted network. The protocol protects against both classical eavesdroppers and future quantum adversaries armed with Shor's algorithm.

### Endpoints and Roles
- **Alice (Client / Initiator)**: Generates ephemeral key establishment material, initiates the handshake, specifies the cryptographic cipher suite, authenticates Bob, and proves her own identity.
- **Bob (Server / Responder)**: Listens for incoming connections, encapsulates a shared secret to Alice's ephemeral key, signs the handshake transcript, authenticates Alice's signature, and establishes directional traffic keys.
- **Eve / Mallory (Active Adversary)**: Can intercept, drop, delay, reorder, inject, replay, or mutate arbitrary messages on the wire.

```
       Alice (Initiator)                              Bob (Responder)
  [Trust Anchor: Bob's PK]                       [Trust Anchor: Alice's PK]
           |                                                 |
           | -------- 1. ClientHello (KEM PK, N_A) --------> |
           |                                                 |
           | <------- 2. ServerHello (KEM CT, N_B, Sig_B) -- |  [Bob authenticated]
           |                                                 |
           | -------- 3. ClientAuth (Sig_A) ---------------> |  [Alice authenticated]
           |                                                 |
     [Derive Keys]                                     [Derive Keys]
           |                                                 |
           | === 4. Authenticated Application Records ====> |  [AES-256-GCM]
           | <===    (Chunked, Sequence Numbered)     ===== |
```

---

## 2. Identity and Trust Model

### 2.1 Pinned Trust Anchors (No TOFU)
- The protocol strictly rejects **Trust-On-First-Use (TOFU)**.
- Every endpoint possesses a long-term asymmetric signing keypair (ML-DSA-65 for PQC, Ed25519 for Classical).
- Endpoints maintain a local **Trust Anchor Store** loaded out-of-band:
  - Alice's store contains Bob's authorized identity string (`"bob"`) and his exact public verification key (`bob_id_pk`).
  - Bob's store contains Alice's authorized identity string (`"alice"`) and her exact public verification key (`alice_id_pk`).
- If a peer presents an unknown identity name or a public key that does not match the pinned trust anchor byte-for-byte, the handshake **immediately aborts** with an `UntrustedIdentityError`. Unauthenticated keys supplied on the wire are **never trusted**.

### 2.2 Mutual Authentication vs Server-Only
- **Mutual Authentication is fully implemented**:
  - Server authentication: Bob signs the initial transcript containing both nonces, both identities, and the KEM key material.
  - Client authentication: Alice signs the cumulative transcript including Bob's signature, proving possession of Alice's private signing key and cryptographically binding herself to Bob's session.
  - Both endpoints are mutually authenticated before any application data is sent or accepted.

---

## 3. Cryptographic Primitives & Suites

The channel defines two standardized suites under a single unified protocol state machine:

| Component | Post-Quantum Suite (`0x0001`) | Classical Baseline Suite (`0x0002`) | Standard / RFC |
|---|---|---|---|
| **Key Establishment** | ML-KEM-768 | X25519 (ECDH) | FIPS 203 / RFC 7748 |
| **Authentication** | ML-DSA-65 | Ed25519 (EdDSA) | FIPS 204 / RFC 8032 |
| **Key Derivation** | HKDF-SHA256 | HKDF-SHA256 | RFC 5869 |
| **AEAD Encryption** | AES-256-GCM | AES-256-GCM | NIST SP 800-38D |
| **Transcript Hash** | SHA-256 | SHA-256 | FIPS 180-4 |

### Standard Parameter Sizes
- **ML-KEM-768**: Public Key = 1,184 bytes; Ciphertext = 1,088 bytes; Shared Secret = 32 bytes.
- **ML-DSA-65**: Public Key = 1,952 bytes; Signature = 3,309 bytes; Context = `b"QFF-SECCHAN-v1"`.
- **X25519**: Public Key = 32 bytes; Shared Secret = 32 bytes.
- **Ed25519**: Public Key = 32 bytes; Signature = 64 bytes.
- **AES-256-GCM**: Key = 32 bytes (256 bits); Nonce = 12 bytes (96 bits); Auth Tag = 16 bytes (128 bits).

---

## 4. Wire Format & Framing

To prevent packet fragmentation vulnerabilities, truncation attacks, and ambiguous deserialization, every message sent over the wire uses strict length-prefixed binary framing.

### 4.1 Frame Header (5 bytes)
```
+--------------------+----------------+-------------------------+
| Magic (4 bytes)    | Type (1 byte)  | Body Length (4 bytes)   |
| b"QSC1" (0x51534331) | 0x01 .. 0x05   | uint32 big-endian       |
+--------------------+----------------+-------------------------+
| Body payload ...                                              |
+---------------------------------------------------------------+
```

### 4.2 Message Types
- `0x01` : `ClientHello`
- `0x02` : `ServerHello`
- `0x03` : `ClientAuth`
- `0x04` : `AppRecord`
- `0x05` : `Alert`

### 4.3 Canonical Field Serialization
All variable-length fields inside message bodies are serialized with explicit length prefixes:
- `VarBytes16`: `length` (2 bytes, big-endian) + `data` (e.g., identities, public keys, ciphertexts).
- `VarBytes32`: `length` (4 bytes, big-endian) + `data` (e.g., signatures, chunk payloads).
This canonical encoding guarantees that no two distinct data structures can yield identical wire serializations.

---

## 5. Detailed Handshake Flow

```
Alice                                                              Bob
  |                                                                 |
  | 1. ClientHello:                                                 |
  |    - version: uint8 (0x01)                                      |
  |    - suite_id: uint16 (0x0001 or 0x0002)                        |
  |    - sender_id: "alice" (VarBytes16)                            |
  |    - target_id: "bob" (VarBytes16)                              |
  |    - client_random: 32 bytes                                    |
  |    - kem_public_key: VarBytes16 (1,184 B or 32 B)               |
  | --------------------------------------------------------------> |
  |                                                                 |
  |                                 Validate suite_id, target_id.   |
  |                                 Generate server_random (32 B).  |
  |                                 Encapsulate kem_ct to KEM PK.   |
  |                                 Compute H_server.               |
  |                                 Sign H_server with Bob's SK.    |
  |                                                                 |
  | <-------------------------------------------------------------- |
  | 2. ServerHello:                                                 |
  |    - version: uint8 (0x01)                                      |
  |    - suite_id: uint16 (0x0001 or 0x0002)                        |
  |    - sender_id: "bob" (VarBytes16)                              |
  |    - server_random: 32 bytes                                    |
  |    - kem_ciphertext: VarBytes16 (1,088 B or 32 B)              |
  |    - signature: VarBytes32 (3,309 B or 64 B)                    |
  |                                                                 |
  | Verify Bob's identity in Trust Anchor.                          |
  | Compute H_server and verify Bob's signature.                    |
  | Decapsulate kem_ct to recover shared_secret.                    |
  | Compute H_client.                                               |
  | Sign H_client with Alice's SK.                                  |
  |                                                                 |
  | 3. ClientAuth:                                                  |
  |    - signature: VarBytes32 (3,309 B or 64 B)                    |
  | --------------------------------------------------------------> |
  |                                                                 |
  |                                 Verify Alice's ID in Trust Anchor.|
  |                                 Compute H_client & verify sig.  |
  |                                                                 |
  | [Compute H_final]                               [Compute H_final]|
  | [Derive Directional Keys]                       [Derive Directional Keys]|
```

---

## 6. Transcript Binding

The transcript binding mechanism guarantees non-malleability and cryptographically links the communicating endpoints, selected algorithms, and all exchanged key material into both signatures and the final key schedule.

### 6.1 Canonical Transcript Accumulation
The transcript is computed over raw wire serializations:
1. `T_1 = ClientHello_wire_bytes`
2. `T_2_unsigned = ServerHello_wire_bytes_without_signature`
3. `H_server = SHA256( b"QSC-TRANSCRIPT-v1:SERVER:" || T_1 || T_2_unsigned )`
   - Bob signs: `b"SERVER-AUTH:" || H_server` using ML-DSA-65 with context `b"QFF-SECCHAN-v1"` (or Ed25519).
4. `T_2_full = ServerHello_wire_bytes_with_signature`
5. `H_client = SHA256( b"QSC-TRANSCRIPT-v1:CLIENT:" || T_1 || T_2_full )`
   - Alice signs: `b"CLIENT-AUTH:" || H_client` using ML-DSA-65 with context `b"QFF-SECCHAN-v1"` (or Ed25519).
6. `T_3 = ClientAuth_wire_bytes`
7. `H_final = SHA256( b"QSC-TRANSCRIPT-v1:FINAL:" || T_1 || T_2_full || T_3 )`

### 6.2 Bound Fields Summary
- Endpoint identities: `"alice"`, `"bob"`.
- Protocol version: `0x01`.
- Suite identifier: `0x0001` (PQC) or `0x0002` (Classical).
- Session freshness: `client_random` (32 B) and `server_random` (32 B).
- Ephemeral key material: `kem_public_key` and `kem_ciphertext`.
- Proof of possession: `server_sig` and `client_sig`.

---

## 7. Key Schedule (RFC 5869 HKDF-SHA256)

Separate directional keys are derived to prevent reflection attacks and ensure distinct cryptographic state in each direction.

```
                  Shared Secret (IKM: 32 bytes)
                                |
                                v
               +----------------------------------+
               | HKDF-Extract(salt, IKM)          |  salt = client_random || server_random (64 B)
               +----------------------------------+
                                |
                                v
                       PRK (32 bytes)
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
  HKDF-Expand             HKDF-Expand             HKDF-Expand             HKDF-Expand
info="c2s:key"||H_final info="s2c:key"||H_final info="c2s:iv"||H_final  info="s2c:iv"||H_final
        |                       |                       |                       |
        v                       v                       v                       v
   K_c2s (32 B)            K_s2c (32 B)           IV_c2s (4 B)            IV_s2c (4 B)
(Alice -> Bob Key)      (Bob -> Alice Key)      (Alice Nonce Base)      (Bob Nonce Base)
```

- **`K_c2s`** (32 bytes): Client-to-Server AES-256 traffic key.
- **`K_s2c`** (32 bytes): Server-to-Client AES-256 traffic key.
- **`IV_c2s`** (4 bytes): Client-to-Server 32-bit IV base.
- **`IV_s2c`** (4 bytes): Server-to-Client 32-bit IV base.

---

## 8. Record Layer & Chunking

### 8.1 Record Construction (AES-256-GCM)
Application messages are transmitted inside encrypted records:
```
+---------------+------------------------+---------------------+
| RecType (1 B) | SequenceNumber (8 B)   | PayloadLength (4 B) |  <-- Authenticated AAD (13 B)
+---------------+------------------------+---------------------+
| AES-256-GCM Ciphertext (PayloadLength bytes)                 |
+--------------------------------------------------------------+
| GCM Authentication Tag (16 bytes)                            |
+--------------------------------------------------------------+
```

### 8.2 Nonce Formulation (96 bits / 12 bytes)
To ensure absolute nonce uniqueness under a given key without state synchronization overhead:
$$\text{Nonce} = \text{IV\_base (4 bytes)} \parallel \text{Sequence Number (8 bytes, uint64 big-endian)}$$
- `Sequence Number` starts at `0` upon handshake completion and increments strictly by `1` per transmitted record.
- Because the sequence number is 64-bit and monotonic, nonces never repeat for the lifetime of the session keys.

### 8.3 Authenticated Additional Data (AAD)
The 13-byte record header is passed as AAD into AES-256-GCM:
$$\text{AAD} = \text{RecType (1 byte)} \parallel \text{SequenceNumber (8 bytes)} \parallel \text{PayloadLength (4 bytes)}$$
Any modification to the record type, sequence order, or payload length causes immediate tag verification failure (`InvalidTag`), preventing truncation, splicing, or reordering attacks.

### 8.4 Maximum Record Size & Streaming Chunking
- Standard maximum chunk size: **64 KB (65,536 bytes)**.
- For official payloads (1 KB, 100 KB, 10 MB):
  - **1 KB** (1,024 B): 1 record (`RecType = 0x02` [End-Of-Payload]).
  - **100 KB** (102,400 B): 2 records (64 KB `0x01` [Chunk], 36 KB `0x02` [End]).
  - **10 MB** (10,485,760 B): 160 records (159 $\times$ 64 KB `0x01`, 1 $\times$ 64 KB `0x02`).
- **Memory Efficiency**: Chunked processing guarantees streaming encryption and decryption, maintaining peak heap memory well below 2 MB during the 10 MB payload transfer, safely fitting within Platform B's 128 MB constraint.

---

## 9. Replay & Downgrade Protection

### 9.1 Handshake Replay Protection
- Both endpoints generate 32 bytes of cryptographically secure randomness (`client_random` and `server_random`).
- The randoms are included directly in the transcript signed by both peers and hashed into the HKDF salt.
- An attacker replaying an older handshake message cannot forge valid signatures or derive matching traffic keys against a fresh peer random.

### 9.2 Record Replay Protection
- The receiver maintains `expected_sequence_number` initialized to `0`.
- Incoming records must strictly satisfy `record.seq == expected_sequence_number`.
- Duplicated records, delayed retransmissions, or reordered records are rejected instantly.

### 9.3 Downgrade Protection
- The cipher suite identifier (`0x0001` or `0x0002`) is sent in `ClientHello` and confirmed in `ServerHello`.
- Both the client and server signatures authenticate the cumulative transcript which explicitly includes the suite ID.
- An attacker flipping the suite ID on the wire causes signature verification to fail immediately.

---

## 10. Threat Model & Security Properties

### 10.1 Adversary Model
We assume a full **Dolev-Yao network attacker**:
- Complete control of the transmission media (can intercept, alter, drop, inject, and replay packets).
- Access to high-performance quantum computing resources capable of Shor's algorithm (breaking RSA, ECDSA, ECDH).
- The attacker does *not* possess the private signing keys of Alice or Bob.

### 10.2 Guaranteed Properties
1. **Quantum-Safe Confidentiality**: Protected by ML-KEM-768 (IND-CCA2 post-quantum security).
2. **Post-Quantum Authentication**: Protected by ML-DSA-65 (EUF-CMA post-quantum security).
3. **PFS (Perfect Forward Secrecy)**: Ephemeral KEM keypairs generated per session.
4. **Mutual Identity Binding**: Handshake cryptographically binds the identities of both endpoints.
5. **Integrity & Plaintext Confinement**: AES-256-GCM authenticated encryption guarantees ciphertext cannot be altered; upon any tampering, execution aborts and **plaintext is never released**.

---

## 11. Honest Disclosures & Limitations

1. **Prototype Disclaimer**: This channel is an academic/hackathon prototype designed for Qiskit Fall Fest 2026. It is not a certified production TLS 1.3 implementation.
2. **Identity Distribution**: Uses explicitly pinned public keys (Trust Anchors) rather than an automated X.509 PKI certificate hierarchy with revocation mechanisms (CRL/OCSP).
3. **Stateless Replay Limitation**: Handshake replay protection relies on fresh ephemeral randoms generated per session. Stateless servers do not maintain persistent cross-session cache databases across server process reboots.
4. **Side-Channel Hardening**: While vetted primitives from `cryptography` provide constant-time core operations, high-level Python code and socket framing are not hardened against physical microarchitectural side channels (e.g., cache-timing).
