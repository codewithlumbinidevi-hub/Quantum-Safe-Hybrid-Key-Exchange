# Raw Benchmark Observations (`data/raw/`)

This directory contains unaggregated, trial-by-trial cryptographic benchmark measurements collected via monotonic high-resolution timers (`time.perf_counter_ns()`).

## Column Schema
1. `trial`: Integer index of measured trial (warm-up cycles are excluded).
2. `platform`: Host execution profile (`platform_a` = unconstrained multi-core; `platform_b` = single-core CPU affinity Core 0).
3. `cpu_affinity_mask`: Verified OS CPU affinity mask applied during the timed section (e.g. `[0]` on Platform B).
4. `ecdh_keygen_ms`: Alice ephemeral ECDH P-256 key generation time in milliseconds.
5. `ecdh_derivation_ms`: Alice & Bob ECDH shared-secret scalar multiplication time in milliseconds.
6. `mlkem_keygen_ms`: Bob ephemeral ML-KEM-768 key generation time in milliseconds (FIPS 203).
7. `mlkem_encap_ms`: Alice ML-KEM-768 encapsulation time in milliseconds (FIPS 203).
8. `mlkem_decap_ms`: Bob ML-KEM-768 decapsulation time in milliseconds (FIPS 203).
9. `hybrid_kdf_ms`: HKDF-SHA256 dual-combinator master key derivation time in milliseconds.
10. `total_handshake_ms`: Complete end-to-end ephemeral handshake latency measured across trial boundaries.
11. `ecdh_match`: Boolean constant-time equality check between derived ECDH secrets.
12. `mlkem_match`: Boolean constant-time equality check between decapsulated ML-KEM secrets.
13. `hybrid_match`: Boolean constant-time equality check between final 256-bit hybrid master keys.
14. `handshake_success`: Composite verification status (`ecdh_match and mlkem_match and hybrid_match`).
