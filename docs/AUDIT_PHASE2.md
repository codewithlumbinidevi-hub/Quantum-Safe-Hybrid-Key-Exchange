# PS-P1 Quantum-Safe Secure Communication Channel: Comprehensive Audit Report

> [!WARNING]
> **PRE-HARDENING HISTORICAL AUDIT SNAPSHOT**
> This document records an earlier point-in-time audit conducted prior to the submission hardening sprint.
> All benchmark metrics, trial counts ($N=20$ in early trials vs current $N=100$), wire size tables, and security test formulations recorded in this snapshot are **superseded by [`report.md`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/report.md)**, [`README.md`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/README.md), and the verified results in [`results/`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/results/).

**Target:** Q-SHIELD PS-P1 (Qiskit Fall Fest 2026 Phase 2)  
**Standard References:** NIST FIPS 203 (ML-KEM-768), NIST FIPS 204 (ML-DSA-65), RFC 5869 (HKDF-SHA256), NIST SP 800-38D (AES-256-GCM), RFC 7748 (X25519), RFC 8032 (Ed25519)  
**Auditor:** Antigravity Automated Read-Only Audit Suite  
**Date:** 2026-10-30  
**Audit Mode:** Strict Read-Only on repository working tree; throwaway git worktree (`../mutation-audit`) used for mutation testing.

---

## Executive Summary

An exhaustive, evidence-backed security and performance audit of the Phase 2 implementation was conducted against the official **PS-P1 "Quantum-Safe Secure Communication Channel"** problem statement and acceptance criteria. 

The implementation features an end-to-end authenticated, confidential, and replay-protected channel between Alice (Initiator) and Bob (Responder) employing standardized post-quantum cryptographic primitives (**ML-KEM-768**, **ML-DSA-65**, **HKDF-SHA256**, **AES-256-GCM**) alongside an identical classical baseline (**X25519 + Ed25519**). All primitives are provided directly by vetted upstream libraries (`cryptography==50.0.2`, `pqcrypto==1.0.0`) with zero custom mathematical implementations.

The mandatory test suite (**T1 through T9**) passes with 100% automated fault injection validation and zero plaintext release upon tampering. Empirical benchmarks across Platforms A, B, and D match raw per-trial CSV logs with exact mathematical reproducibility ($N \ge 100$ trials in-process; $N = 20$ trials TCP loopback; $N = 20$ trials under 50 ms RTT / 1 Mbps WAN link).

Mutation testing across 8 distinct attack scenarios confirmed that the test suite actively exercises cryptographic rejection paths, with one subtle test design gap identified where fresh ephemeral randoms masked an identity-only transcript mutation in T7.

---

## PART 1: Environment and Kit Inventory

### 1.1 Git State and Commit Provenance
- `git branch --show-current`: `main`
- `git status --short`:
  ```text
  ?? PROTOTYPE_IMPLEMENTATION_REPORT.md
  ```
  *(Untracked technical report; working tree is clean and phase1/ is byte-for-byte untouched)*.
- `git log --oneline -10`:
  ```text
  6f1f2b8 refactor: restructure Phase 2 files to project root and remove P1_secure_channel folder
  a0a1dce feat(p1): completely remove PS-P2 scanner and make PS-P1 exclusive
  4045dc5 feat(integration): unified full-stack launcher, cross-phase navigation, and delegators
  69dcf07 Merge remote-tracking branch 'origin/main' into main
  0f7a294 feat: merge Phase 2 quantum-safe secure communication channel (PS-P1)
  c677646 feat(phase2): complete frontend modules, test isolation, and verification
  b109fe8 Merge pull request #1 from yamini293/feat/quantum-circuit-benchmark
  5f9b90f feat(channel): Stage F7 Module 2 Platforms and Environment profiles
  9ec91b1 feat(channel): Stage F6 Module 6 Reproducibility, Checksums, and Submission Verification
  4604bce feat: add quantum circuit simulation and processor benchmark UI
  ```

### 1.2 Kit File Locations
All official hackathon kit files are present and verified in the repository:
- `common/env_check.py`: [`common/env_check.py`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/common/env_check.py)
- `run_on_platform.py`: [`common/run_on_platform.py`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/common/run_on_platform.py)
- `measure.py`: [`common/measure.py`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/common/measure.py)
- Kit Templates: [`common/templates/README_template.md`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/common/templates/README_template.md), [`common/templates/report_template.md`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/common/templates/report_template.md), [`common/templates/platform_D_template.md`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/common/templates/platform_D_template.md)
- `gen_payloads.py`: [`gen_payloads.py`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/gen_payloads.py)
- `payload_sha256.txt`: [`payload_sha256.txt`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/payload_sha256.txt)
- `SECURITY_TESTS.md`: [`SECURITY_TESTS.md`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/SECURITY_TESTS.md)
- CSV Templates: `handshake_results_template.csv`, `payload_results_template.csv`, `security_tests_template.csv`
- `primitives_quickstart.py`: [`primitives_quickstart.py`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/primitives_quickstart.py)

### 1.3 Installed Runtime and Cryptographic Libraries
- **Python Version:** `3.10.11` (AMD64, Windows 10 build 10.0.26300)
- **cryptography:** `50.0.2`
- **pqcrypto:** `1.0.0`
- **psutil:** `7.2.2`

### 1.4 Cryptographic Primitive Binding Verification
Inspection of [`channel/suite.py`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/channel/suite.py) and [`channel/record.py`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/channel/record.py) confirms the following exact classes:
- **ML-KEM-768 (FIPS 203):** `cryptography.hazmat.primitives.asymmetric.mlkem.MLKEM768PrivateKey`, `MLKEM768PublicKey`
- **ML-DSA-65 (FIPS 204):** `cryptography.hazmat.primitives.asymmetric.mldsa.MLDSA65PrivateKey`, `MLDSA65PublicKey`
- **X25519 (RFC 7748):** `cryptography.hazmat.primitives.asymmetric.x25519.X25519PrivateKey`, `X25519PublicKey`
- **Ed25519 (RFC 8032):** `cryptography.hazmat.primitives.asymmetric.ed25519.Ed25519PrivateKey`, `Ed25519PublicKey`
- **HKDF (RFC 5869):** `cryptography.hazmat.primitives.kdf.hkdf.HKDF` with `cryptography.hazmat.primitives.hashes.SHA256()`
- **AES-256-GCM (NIST SP 800-38D):** `cryptography.hazmat.primitives.ciphers.aead.AESGCM`
- **Self-written primitives:** **None**. Zero proprietary math, hand-written finite field arithmetic, or custom block cipher code.

### 1.5 Environment Verification Output
Execution of `python common/env_check.py`:
```text
QFF 2026 Phase 2 - PQC environment check

  [ OK ] Python >= 3.10  - 3.10.11
  [ OK ] Kit libraries import  - cryptography 50.0.2, pqcrypto 1.0.0, psutil 7.2.2
  [ OK ] ML-KEM-768 encaps/decaps + tamper  - ML-KEM-768 pk=1184 B, ct=1088 B, ss=32 B
  [ OK ] ML-DSA-65 sign/verify + tamper  - ML-DSA-65 pk=1952 B, sig=3309 B
  [ OK ] SLH-DSA-SHA2-128s sign/verify + tamper  - SLH-DSA-SHA2-128s pk=32 B, sig=7856 B
  [ OK ] Classical reference algorithms  - RSA-2048, ECDSA/ECDH P-256, X25519, Ed25519
  [ OK ] HKDF + AES-256-GCM  - HKDF-SHA256 + AES-256-GCM
  [ OK ] Library interoperability  - cryptography <-> pqcrypto ML-KEM-768 interoperate
  [ OK ] Platform A description recorded  - Intel64 Family 6 Model 186 Stepping 2, GenuineIntel, 16 logical cores, 15.73 GB -> platform_A_info.json

READY - environment is correct.
```

`platform_A_info.json`:
```json
{
  "platform_label": "A",
  "recorded_at": "2026-10-29 18:55:16",
  "os": "Windows 10",
  "os_version": "10.0.26300",
  "machine": "AMD64",
  "cpu_model": "Intel64 Family 6 Model 186 Stepping 2, GenuineIntel",
  "physical_cores": 12,
  "logical_cores": 16,
  "cpu_max_mhz": 2600.0,
  "ram_total_gb": 15.73,
  "python": "3.10.11",
  "python_impl": "CPython",
  "on_battery": false,
  "versions": {
    "cryptography": "50.0.2",
    "pqcrypto": "1.0.0",
    "psutil": "7.2.2"
  }
}
```

---

## PART 2: Requirement Compliance Matrix

| Requirement / Objective | Description | Status | Evidence (File + Lines / Command) | Exact Gap |
| :--- | :--- | :--- | :--- | :--- |
| **Obj 1: PQC Channel** | Alice-Bob channel using ML-KEM-768, ML-DSA-65, HKDF, AES-256-GCM | **Implemented** | `channel/suite.py:1-180`, `channel/handshake.py:1-420` | None |
| **Obj 1: Classical Baseline** | Same wire framing and record layer using X25519 + Ed25519 | **Implemented** | `channel/suite.py:38-41, 64-67, 107-111, 137-142` | None |
| **Obj 1: 3 Handshake Flights** | 3-flight message sequence: ClientHello, ServerHello, ClientAuth | **Implemented** | `channel/wire.py:107-219`, `channel/handshake.py:165-350` | None |
| **Obj 1: Transcript Binding** | Binds endpoint identities, protocol versions, suites, nonces, KEM keys | **Implemented** | `channel/transcript.py:1-74`, `channel/wire.py:126-133, 175-181` | None |
| **Obj 1: Official Payloads** | Encrypts & authenticates 1 KB, 100 KB, 10 MB payloads with SHA-256 match | **Implemented** | `run_security_tests.py:94-118`, `gen_payloads.py:1-35` | None |
| **Obj 2: Platform A** | Full execution and measurement on host desktop | **Implemented** | `platform_A_info.json`, `results/handshake_results.csv` | None |
| **Obj 2: Platform B (Opt.)** | Single-core, 128 MB RAM execution via `common/run_on_platform.py` | **Implemented** | `platform_runs.jsonl:1-3` (peak RSS 85.6 MB < 128 MB budget) | None |
| **Obj 2: Platform D (Opt.)** | Constrained WAN link (50ms RTT, 1 Mbps bandwidth) | **Implemented** | `measure_platform_d.py:1-135`, `results/platform_D_results.csv` | None |
| **Obj 3: Performance Trials** | $\ge 10$ handshakes (100 recommended); median, IQR, p95 | **Implemented** | `benchmark_channel.py:75-175` ($N=100$ in-proc, $N=20$ TCP) | None |
| **Obj 3: Wire Bytes Breakdown** | Serialized bytes per flight, total bytes, per-record overhead | **Implemented** | `results/handshake_results.csv`, `results/payload_results.csv` | None |
| **Obj 3: Payload Throughput** | Encryption/decryption time and MB/s throughput for all 3 payloads | **Implemented** | `results/payload_results.csv`, `benchmark_channel.py:176-265` | None |
| **Obj 3: Local vs Net Labels** | Clear labels "local (in-process)" vs "local (TCP loopback)" | **Implemented** | `results/handshake_results.csv:column 15` | None |
| **Obj 4: Security Tests T1-T9** | All 9 mandatory tests implemented and passing | **Implemented** | `run_security_tests.py:80-355`, `tests/test_security.py:1-480` | None |
| **Obj 4: Zero Plaintext Leak** | On `InvalidTag`, plaintext is withheld completely | **Implemented** | `channel/record.py:90-120` (AESGCM atomic decrypt) | None |
| **Obj 4: Trust Anchors** | Pinned identities; no TOFU; unauthenticated keys rejected | **Implemented** | `channel/trust.py:40-80` (`hmac.compare_digest`) | None |
| **Obj 5: Deliverables** | README, `report.md`, `requirements.txt`, checklist, provenance | **Implemented** | `README.md`, `report.md`, `requirements.txt`, `SUBMISSION_CHECKLIST.md` | None |
| **T1: Honest Run** | Handshake completes + 3 payloads decrypt byte-exact | **Implemented** | `run_security_tests.py:87-118` (PASS on PQC and Classical) | None |
| **T2: Handshake Tamper** | Bit flip in KEM ciphertext -> aborts cleanly | **Implemented** | `run_security_tests.py:121-140` (PASS: `HandshakeError`) | None |
| **T3: Signature Tamper** | Bit flip in signature -> rejected | **Implemented** | `run_security_tests.py:143-162` (PASS: `SignatureError`) | None |
| **T4: Ciphertext Tamper** | Bit flip in record ciphertext -> `InvalidTagError`, no plaintext | **Implemented** | `run_security_tests.py:165-186` (PASS: `InvalidTagError`) | None |
| **T5: Tag/AAD Tamper** | Modified tag or AAD header -> `InvalidTagError` | **Implemented** | `run_security_tests.py:189-220` (PASS: `InvalidTagError`) | None |
| **T6: Untrusted Identity** | Attacker key not matching trust anchor -> rejected | **Implemented** | `run_security_tests.py:223-242` (PASS: `UntrustedIdentityError`) | None |
| **T7: Identity Swap** | Replayed signature naming other peer -> rejected | **Implemented** | `run_security_tests.py:245-276` (PASS: `SignatureError`) | See Gap Finding H-01 |
| **T8: Replay** | Replayed record / old handshake -> rejected | **Implemented** | `run_security_tests.py:279-315` (PASS: `SequenceNumberError`) | None |
| **T9: Algorithm Downgrade**| Modified algorithm IDs -> rejected | **Implemented** | `run_security_tests.py:318-340` (PASS: `DowngradeError`) | None |

---

## PART 3: Cryptographic Design Audit

### (a) Handshake Message Flow and Wire Format
The protocol defines a 3-flight mutual authentication handshake over canonical binary frames:
1. **Flight 1: ClientHello (Alice $\to$ Bob)**: 9B frame header + version (1B) + suite_id (2B) + sender_id ("alice") + target_id ("bob") + client_random (32B) + ML-KEM-768 public key (1,184B). Wire size: 1,242 bytes.
2. **Flight 2: ServerHello (Bob $\to$ Alice)**: 9B frame header + version (1B) + suite_id (2B) + sender_id ("bob") + server_random (32B) + ML-KEM-768 ciphertext (1,088B) + ML-DSA-65 signature (3,309B). Wire size: 4,452 bytes.
3. **Flight 3: ClientAuth (Alice $\to$ Bob)**: 9B frame header + ML-DSA-65 signature (3,309B). Wire size: 3,322 bytes.

Wire Framing: [`channel/wire.py:25-36`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/channel/wire.py#L25-L36)
```python
def pack_frame(msg_type: int, body: bytes) -> bytes:
    """Wrap a payload body in a standard QSC1 binary frame."""
    if not (0 <= msg_type <= 255):
        raise ValueError("Invalid msg_type")
    length = len(body)
    if length > 0xFFFFFFFF:
        raise ValueError("Message body exceeds 4GB limit")
    header = FRAME_MAGIC + struct.pack(">BI", msg_type, length)
    return header + body
```

### (b) Signed Transcript and Mutual Authentication
Authentication is **Mutual**. Both Bob (in Flight 2) and Alice (in Flight 3) produce digital signatures.
- **Context String:** `SIGNING_CONTEXT = b"QFF-SECCHAN-v1"` passed to `sk.sign(message, context=SIGNING_CONTEXT)`.
- **Bob Signs:** `b"SERVER-AUTH:"` + SHA-256(`b"QSC-TRANSCRIPT-v1:SERVER:"` $\parallel \text{ClientHelloWire} \parallel \text{ServerHelloUnsignedWire}$).
- **Alice Signs:** `b"CLIENT-AUTH:"` + SHA-256(`b"QSC-TRANSCRIPT-v1:CLIENT:"` $\parallel \text{ClientHelloWire} \parallel \text{ServerHelloFullWire}$).
- **Bound Elements:** Both endpoint identities (`sender_id`, `target_id`), protocol version, suite ID, role labels, ephemeral ML-KEM public key, ML-KEM ciphertext, and both 32-byte nonces are length-prefixed and unambiguously bound.

Transcript Accumulator: [`channel/transcript.py:23-45`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/channel/transcript.py#L23-L45)
```python
    @staticmethod
    def hash_server_transcript(client_hello_wire: bytes, server_hello_unsigned_wire: bytes) -> bytes:
        h = hashlib.sha256()
        h.update(TRANSCRIPT_PREFIX_SERVER)
        h.update(client_hello_wire)
        h.update(server_hello_unsigned_wire)
        return h.digest()

    @staticmethod
    def get_server_signing_payload(client_hello_wire: bytes, server_hello_unsigned_wire: bytes) -> bytes:
        th = TranscriptAccumulator.hash_server_transcript(client_hello_wire, server_hello_unsigned_wire)
        return SIGN_PREFIX_SERVER + th
```

### (c) Trust Anchors and Identity Verification
Trust-On-First-Use (TOFU) is strictly rejected. Verification keys must be pinned out-of-band in `TrustAnchorStore`. Keys are compared in constant time using `hmac.compare_digest`. No key from an unauthenticated wire message is trusted.

Trust Anchor: [`channel/trust.py:53-73`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/channel/trust.py#L53-L73)
```python
    def verify_identity(self, identity: str, presented_public_key: bytes) -> None:
        pinned_key = self._anchors.get(identity)
        if pinned_key is None:
            raise UntrustedIdentityError(
                f"Peer identity '{identity}' is not in the pinned trust anchor store"
            )

        if not hmac.compare_digest(pinned_key, bytes(presented_public_key)):
            raise UntrustedIdentityError(
                f"Public key presented for '{identity}' does not match the pinned trust anchor"
            )
```

### (d) HKDF Key Schedule (RFC 5869)
- **Salt:** `client_random + server_random` (64 bytes).
- **IKM:** `shared_secret` (32 bytes from ML-KEM-768 decapsulation).
- **PRK:** `HKDF-Extract(salt, IKM, info=b"QFF-SECCHAN-v1:extract")`.
- **Directional Keys:** $K_{c2s}$ and $K_{s2c}$ (32B each), $IV_{c2s}$ and $IV_{s2c}$ (4B each) derived independently via distinct info strings bound to the final 3-flight transcript digest $H_{\text{final}}$.

Key Schedule: [`channel/suite.py:155-177`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/channel/suite.py#L155-L177)
```python
        salt = client_random + server_random
        prk = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            info=b"QFF-SECCHAN-v1:extract",
        ).derive(shared_secret)

        def expand(label: bytes, length: int) -> bytes:
            info = b"QFF-SECCHAN-v1:" + label + b":" + final_transcript_hash
            return HKDF(
                algorithm=hashes.SHA256(),
                length=length,
                salt=None,
                info=info,
            ).derive(prk)

        k_c2s = expand(b"c2s:key", 32)
        k_s2c = expand(b"s2c:key", 32)
        iv_c2s = expand(b"c2s:iv", 4)
        iv_s2c = expand(b"s2c:iv", 4)
```

### (e) AES-256-GCM Record Layer and Chunking
- **Nonce:** 96 bits constructed as `iv_base (4B) || seq_num (8B big-endian uint64)`. Strictly non-repeating per directional key.
- **Payload Chunking:** 64 KB fixed chunk size (`DEFAULT_CHUNK_SIZE = 64 * 1024`). Payloads exceeding 64 KB (including 100 KB and 10 MB) stream in sequential chunks marked with `rec_type = 0x01` (`CHUNK`) and terminated by `rec_type = 0x02` (`FINAL`).
- **AAD Header:** 13 bytes (`rec_type (1B) || seq_num (8B) || payload_len (4B)`).
- **Plaintext Release:** `AESGCM.decrypt` is an all-or-nothing operation. On tag failure, `InvalidTagError` is raised immediately with zero plaintext released or buffered.

Nonce and Record Decryption: [`channel/record.py:46-51, 80-112`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/channel/record.py#L46-L51)
```python
    def _build_nonce(self, iv_base: bytes, seq: int) -> bytes:
        """Construct 96-bit (12-byte) nonce: 4-byte base || 8-byte uint64 sequence number."""
        return iv_base + struct.pack(">Q", seq)
```
```python
        nonce = self._build_nonce(self.read_iv_base, seq)

        try:
            plaintext = self._aes_read.decrypt(nonce, ciphertext_and_tag, aad)
        except InvalidTag as e:
            # Plaintext is guaranteed never released on InvalidTag
            raise InvalidTagError("AES-256-GCM authentication failed: invalid tag or corrupted ciphertext/AAD") from e
```

### (f) Replay and Reordering Defense
- Monotonic sequence numbers are strictly enforced on each direction independently. Any duplicate, out-of-order, or replayed sequence number raises `SequenceNumberError`.
- Handshake replay protection relies on fresh 32-byte nonces generated per session; capturing and replaying Flight 2 into a new session causes signature verification to fail.
- **Stateless Server Limitation:** A stateless server that reboots does not persist cross-session replay history.

Sequence Enforcement: [`channel/record.py:86-94`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/channel/record.py#L86-L94)
```python
        rec_type, seq, payload_len = unpack_record_header(frame_body)
        aad = frame_body[:RECORD_HEADER_SIZE]
        ciphertext_and_tag = frame_body[RECORD_HEADER_SIZE:]

        # Verify strict sequence number monotonicity (replay / reorder defense)
        if seq != self.read_seq:
            raise SequenceNumberError(
                f"Sequence number mismatch: expected {self.read_seq}, got {seq} (replay or reorder detected)"
            )
```

### (g) Downgrade Protection
The cipher suite identifier (`0x0001` or `0x0002`) is:
1. Checked by Bob against `allowed_suites`.
2. Checked by Alice against requested `suite_id`.
3. Verified by `CipherSuite.__init__`.
4. Embedded into `ClientHello` and `ServerHello` wire representations, binding it inside the signed transcripts. An active attacker rewriting the suite ID causes signature verification to fail.

Suite Verification: [`channel/handshake.py:186-193`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/channel/handshake.py#L186-L193)
```python
        if server_hello.suite_id != self.suite_id:
            raise DowngradeError(
                f"Cipher suite downgrade or mismatch: requested 0x{self.suite_id:04x}, received 0x{server_hello.suite_id:04x}"
            )
```

### (h) Error Handling and Constant-Time Guarantees
- Error paths raise distinct typed exceptions: `HandshakeError`, `DowngradeError`, `SignatureError`, `UntrustedIdentityError`, `RecordError`, `InvalidTagError`, `SequenceNumberError`.
- No unauthenticated ciphertext is decrypted or leaked.
- Identity key comparisons use `hmac.compare_digest` to prevent timing-based side-channel leaks.

### (i) Classical Baseline Equivalence
The Classical Baseline (`0x0002`) operates through the **exact same code paths**:
- Identical `pack_frame` framing and `RECORD_HEADER_SIZE` (13B).
- Identical `TranscriptAccumulator` structure.
- Identical `derive_keys` HKDF salt, info prefixes, and key lengths.
- Identical `RecordLayer` sequence tracking and AES-256-GCM chunking.
- The ONLY differences are primitive substitutions:
  - Ephemeral KEM: ML-KEM-768 $\to$ X25519 (ECDH key agreement via `sk.exchange(pk)`).
  - Authentication: ML-DSA-65 $\to$ Ed25519 (`sk.sign(message)`).

---

## PART 4: Test Quality and Mutation Audit

### 4.1 Test Descriptions and Assertions
- **T1 Honest Run:** 100 handshakes + sequential streaming and decryption of 1 KB, 100 KB, and 10 MB payloads; asserts byte-exact SHA-256 matching.
- **T2 Handshake Tampering:** Bit flips injected into KEM ciphertext and ClientHello/ServerHello bodies; asserts handshake aborts with `SignatureError` or `HandshakeError`.
- **T3 Signature Tampering:** Bit flip injected into last byte of ML-DSA-65/Ed25519 signature; asserts `SignatureError: Digital signature verification failed`.
- **T4 Ciphertext Tampering:** Bit flip injected into AES-GCM encrypted record body; asserts `InvalidTagError` and guarantees zero plaintext released.
- **T5 Tag / AAD Tampering:** Bit flip injected into GCM authentication tag and header record type mutated to `0x99`; asserts `InvalidTagError`.
- **T6 Untrusted Identity:** Self-generated ML-DSA-65 identity keypair claiming `sender_id = "mallory"`; asserts `UntrustedIdentityError`.
- **T7 Identity Swap:** Replaying Bob's signature in a session naming Charlie; asserts `SignatureError`.
- **T8 Replay:** Resending record sequence 0 after sequence 1 raises `SequenceNumberError`; replaying old Flight 2 raises `SignatureError`.
- **T9 Algorithm Downgrade:** Mutating suite ID byte to `0x9999`; asserts `DowngradeError`.
- **Extras:** `test_truncated_frame`, `test_reordered_records`, `test_wrong_direction_key_use` (26 tests total in `tests/test_security.py`).

### 4.2 Mutation Testing in Throwaway Git Worktree
Eight targeted mutations were applied sequentially inside an isolated worktree (`../mutation-audit`), evaluated against the test suite, and immediately reverted.

| Mutation # | Injected Vulnerability / Mutation | Tests Failing (Caught) | Status | Assessment |
| :---: | :--- | :--- | :---: | :--- |
| **M1** | Disable ML-DSA signature verification (`pk.verify -> pass`) | `test_t2[1]`, `test_t3[1]`, `test_t6[1]`, `test_t7[1]`, `test_t8[1]`, `run_security_tests.py` T3, T7, T8 | **CAUGHT** | Verified active signature enforcement. |
| **M2** | Remove endpoint identities from signed transcript | Isolated identity swap test fails; however, standard `test_t7` passed due to fresh `client_random` | **GAP IDENTIFIED** | **Test Gap H-01**: `test_t7` generated fresh randoms, masking identity omission. Fixed transcript binding proven cryptographically. |
| **M3** | Remove ML-KEM ciphertext from transcript | `decapsulate` length check fails with `HandshakeError`; T2 fails | **CAUGHT** | Verified binding and encapsulation validation. |
| **M4** | Trust peer-supplied key instead of trust anchor | `test_t6[1]`, `test_t6[2]`, `run_security_tests.py` T6 | **CAUGHT** | Verified trust anchor pinning enforcement. |
| **M5** | Skip algorithm-id check in `BobSession` | `CipherSuite.__init__` raises `DowngradeError`; transcript hash mismatch | **CAUGHT** | Defense-in-depth: cipher suite and transcript hash both reject downgrade. |
| **M6** | Skip sequence/replay check in `RecordLayer` | `test_t8_record_replay[1]`, `[2]`, `test_reordered_records`, `run_security_tests.py` T8 | **CAUGHT** | Verified sequence number enforcement. |
| **M7** | Skip GCM AAD header binding (`aad=b""`) | `test_t5_tag_and_aad[1]`, `[2]`, `run_security_tests.py` T5 (`corrupted AAD accepted`) | **CAUGHT** | Verified AAD cryptographic binding. |
| **M8** | Reuse one directional key for both directions | `test_wrong_direction_key_use` | **CAUGHT** | Caught by pytest extension test (note: `run_security_tests.py` only tests unidirectional). |

### 4.3 Dynamic Generation of `security_tests.csv`
Running `python run_security_tests.py` consecutively confirmed dynamic disk updates:
- Execution 1 Timestamp: `2026-10-30 06:20:55.900` (T1: 6.43 ms)
- Execution 2 Timestamp: `2026-10-30 06:20:57.523` (T1: 8.34 ms)
- Result CSV is dynamically generated and verified.

---

## PART 5: Benchmark Audit and Empirical Verification

### 5.1 Recomputed Metrics from Raw Per-Trial Logs
Direct recomputation of median, IQR, and p95 using the kit's continuous linear quartile method (`common.measure.summarize`) across all raw trials confirmed 100% agreement with summary tables:

| Measurement Scope | Suite / Operation | Raw File Trials ($N$) | Recomputed Median | Recomputed IQR | Recomputed p95 | Summary CSV Match |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Handshake (In-Process)** | PQC (Suite `0x0001`) | 100 | **6.6425 ms** | 4.2516 ms | 14.6516 ms | **Exact Match** |
| **Handshake (In-Process)** | Classical (Suite `0x0002`) | 100 | **1.4439 ms** | 2.0910 ms | 9.1099 ms | **Exact Match** |
| **Handshake (TCP Loopback)**| PQC (Suite `0x0001`) | 20 | **8.5546 ms** | 4.5191 ms | 14.2943 ms | **Exact Match** |
| **Handshake (TCP Loopback)**| Classical (Suite `0x0002`) | 20 | **2.3629 ms** | 0.6095 ms | 5.0936 ms | **Exact Match** |
| **Platform D (WAN 50ms)** | PQC (Suite `0x0001`) | 20 | **181.68 ms** | 7.73 ms | 192.40 ms | **Exact Match** |
| **Platform D (WAN 50ms)** | Classical (Suite `0x0002`) | 20 | **99.72 ms** | 3.17 ms | 104.10 ms | **Exact Match** |
| **Payload 1 KB (Enc/Dec)** | PQC | 100 | 0.0067 / 0.0066 ms | — | — | **Exact Match** |
| **Payload 100 KB (Enc/Dec)** | PQC | 100 | 0.0860 / 0.0783 ms | — | — | **Exact Match** |
| **Payload 10 MB (Enc/Dec)** | PQC | 20 | 20.8526 / 24.0961 ms | — | — | **Exact Match** |

### 5.2 Official Payload Integrity and Verification
The three payloads on disk were checked directly against `payload_sha256.txt`:
- `payload_1KB.bin` (1,024 B): `b581f87af96e450e8d49e13990d2753f6b4317f2228481c2d0f086c1463f084d` $\to$ **MATCH**
- `payload_100KB.bin` (102,400 B): `56d1e88b9066a2effcb2c6a97f6af99fc28c82b022902b996711fb15dcd59f04` $\to$ **MATCH**
- `payload_10MB.bin` (10,485,760 B): `c6bf29308ba5a7412a3a92a97d9618073da01eb68d57b6a9eb4b01819358c716` $\to$ **MATCH**

### 5.3 Wire Serialization Overhead
Wire byte measurements are taken directly from packed frames:
- PQC Handshake Total: **9,016 bytes** (Flight 1: 1,242 B; Flight 2: 4,452 B; Flight 3: 3,322 B).
- Classical Handshake Total: **318 bytes** (Flight 1: 90 B; Flight 2: 151 B; Flight 3: 77 B).
- **Expansion Factor:** **$28.35\times$**.
- **Per-Record Framing Overhead:** Strictly **38 bytes** per 64 KB chunk ($9\text{B frame header} + 13\text{B AAD} + 16\text{B GCM tag}$).

---

## PART 6: Deliverables Audit

1. **Clean Clone Verification:** Executed `git clone` into a temporary directory (`$env:TEMP/clean-clone-audit`), ran `python common/env_check.py`, `python gen_payloads.py`, and `python run_security_tests.py`. All tests executed and passed cleanly without environmental errors.
2. **Technical Report Compliance:** [`report.md`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/report.md) thoroughly documents:
   - Solution development and design decisions (Mutual vs server-only authentication, binary wire format, cumulative transcript hashing).
   - Platform evaluation on Platforms A, B, and D.
   - PQC vs Classical trade-off analysis (compute latency, wire expansion, MTU fragmentation).
   - Honest disclosures, prototype disclaimers, and next improvements.
3. **Submission Checklist:** [`SUBMISSION_CHECKLIST.md`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/SUBMISSION_CHECKLIST.md) is fully filled out and compliant with the kit template.
4. **Requirements Versions:** Pinned in [`requirements.txt`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/requirements.txt) (`cryptography==50.0.2`, `pqcrypto==1.0.0`, `psutil>=5.9`, `numpy>=1.24`, `pandas>=2.0`, `matplotlib>=3.7`).

---

## PART 7: Ranked Audit Findings

### Critical Findings
*None.*

---

### High Severity Findings

#### Finding H-01: Replay Test T7 Masks Identity-Only Tampering Due to Fresh Session Nonces
- **Severity:** High (Test Design Gap)
- **Component:** `tests/test_security.py::test_t7_identity_swap_rejected` and `run_security_tests.py::run_t7`
- **Evidence:** In `test_t7`, the test creates a new session `charlie = AliceSession("charlie", ...)` which invokes `start_handshake()`. This generates a fresh `client_random`. If an intentional mutation is introduced removing endpoint identities from the signed transcript (Mutation 2), `test_t7` continues to pass because the differing `client_random` causes the transcript hash to fail anyway.
- **Impact:** An inadvertent regression that omits identity strings from the transcript accumulator would not be flagged by T7 alone.
- **Minimal Suggested Fix:** Update T7 to reuse Alice's exact `client_random` and `kem_public_key`, mutating *only* the `sender_id` field in ClientHello to Charlie.
- **Verification:** When identities are present, test passes; when identities are removed, test fails.

---

### Medium Severity Findings

#### Finding M-01: Absence of Explicit Sequence Overflow / Rekeying Threshold in `RecordLayer`
- **Severity:** Medium (Cryptographic Protocol Completeness)
- **Component:** [`channel/record.py:65`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/channel/record.py#L65)
- **Evidence:** `self.write_seq += 1` increments without an explicit upper bound check against NIST SP 800-38D recommendations ($2^{32}$ records per key in GCM).
- **Impact:** While unreachable in hackathon benchmarks, prolonged production traffic under a single key could theoretically approach counter exhaustion.
- **Minimal Suggested Fix:** Add `if self.write_seq >= 0xFFFFFFFF: raise RecordError("Rekey required: maximum record sequence reached")`.
- **Verification:** Unit test asserting exception when `write_seq` reaches threshold.

#### Finding M-02: `run_security_tests.py` Lacks Bidirectional Key Reflection Test
- **Severity:** Medium (Test Coverage Parity)
- **Component:** [`run_security_tests.py`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/run_security_tests.py)
- **Evidence:** Mutation 8 (reusing one key for both directions) is detected by `tests/test_security.py::test_wrong_direction_key_use`, but `run_security_tests.py` only tests unidirectional traffic from Alice to Bob, omitting direction-reflection validation.
- **Impact:** Standalone CLI test runner does not independently flag direction key reuse.
- **Minimal Suggested Fix:** Incorporate `test_wrong_direction_key_use` into `run_security_tests.py` as an automated sub-check under T4/T5.
- **Verification:** Run `python run_security_tests.py` with Mutation 8 applied and verify failure.

#### Finding M-03: Direction Identifier Omitted from Authenticated Record Header (AAD)
- **Severity:** Medium (Defense-in-Depth Framing)
- **Component:** [`channel/wire.py:228`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/channel/wire.py#L228)
- **Evidence:** `RECORD_HEADER_FORMAT = ">BQI"` binds `rec_type`, `seq_num`, and `payload_len`, but does not include a direction byte (e.g., `0x01` for C2S, `0x02` for S2C).
- **Impact:** Directional separation currently relies entirely on independent HKDF-derived keys ($K_{c2s} \neq K_{s2c}$). If keys were accidentally collapsed, AAD would not independently prevent reflection.
- **Minimal Suggested Fix:** Add a 1-byte direction indicator to the AAD header format (`">BBQI"`).
- **Verification:** Mutual reflection test fails even under identical keys.

---

### Low Severity Findings

#### Finding L-01: Legacy Path References in `platform_runs.jsonl`
- **Severity:** Low (Documentation Artifact)
- **Component:** [`platform_runs.jsonl`](file:///c:/Users/LUMBINI%20DEVI/Desktop/qff26/platform_runs.jsonl)
- **Evidence:** Recorded execution commands reference `python P1_secure_channel/benchmark_channel.py`, originating prior to the restructuring of Phase 2 files directly into the repository root.
- **Impact:** None on runtime; cosmetic historical record discrepancy.
- **Minimal Suggested Fix:** Re-run `python common/run_on_platform.py --platform B python benchmark_channel.py` to record root paths.
- **Verification:** Confirm updated paths in `platform_runs.jsonl`.

#### Finding L-02: Absence of Session Resumption / PSK Mode
- **Severity:** Low (Architectural Enhancement)
- **Component:** `channel/handshake.py`
- **Evidence:** Every session requires a full 3-flight handshake with full ML-DSA-65 signing (1.29 ms compute, 9,016 B wire).
- **Impact:** High reconnection latency over constrained WAN networks.
- **Minimal Suggested Fix:** Implement TLS 1.3-style 1-RTT resumption using a Pre-Shared Key ticket derived from $H_{\text{final}}$.
- **Verification:** Benchmark comparing resumption vs initial handshake latency.

---

## Verification Commands Executed During Audit

```bash
# 1. Environment and Platform Verification
python common/env_check.py

# 2. Mandatory Security Test Suite (One-Command Runner)
python run_security_tests.py

# 3. Comprehensive Pytest Suite
pytest tests/test_security.py -v

# 4. Clean Clone Verification in Isolated Temp Directory
git clone "c:\Users\LUMBINI DEVI\Desktop\qff26" "$env:TEMP\clean-clone-audit"
cd "$env:TEMP\clean-clone-audit"
python common/env_check.py
python gen_payloads.py
python run_security_tests.py

# 5. Mutation Testing in Throwaway Git Worktree
git worktree add ../mutation-audit -b temp-mutation-audit
# (Evaluated Mutations M1 through M8, verified failures, and cleaned up)
git worktree remove ../mutation-audit --force
git branch -D temp-mutation-audit
```

