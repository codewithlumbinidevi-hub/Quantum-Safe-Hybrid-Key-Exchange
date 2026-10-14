"""
PS-P1 Problem Formulation: Quantum-Safe Hybrid Key Exchange.
Implements and benchmarks a hybrid key encapsulation mechanism combining:
- Classical Elliptic Curve Diffie-Hellman (ECDH over NIST P-256 / secp256r1)
- Post-Quantum Module-Lattice-Based Key Encapsulation (NIST FIPS 203 ML-KEM-768)
- Transcript-bound dual-PRF Key Derivation (HKDF-SHA256 RFC 5869)
- Authenticated Symmetric Encryption demonstration (AES-256-GCM)
Across standard (Platform A) vs constrained (Platform B) CPU environments.
"""
from typing import Dict, Any, Optional
from backend.app.services.ecdh_service import ECDHService
from backend.app.services.mlkem_service import MLKEMService
from backend.app.services.hybrid_kdf import HybridKDFService
from backend.app.services.hybrid_exchange_service import HybridExchangeService
from backend.app.services.crypto_benchmark_service import CryptoBenchmarkService

# Standardized FIPS 203 & SECP256R1 Wire Constants
ALICE_ECDH_PUBLIC_KEY_BYTES = 65
BOB_ECDH_PUBLIC_KEY_BYTES = 65
BOB_MLKEM_PUBLIC_KEY_BYTES = 1184
MLKEM_CIPHERTEXT_BYTES = 1088
TOTAL_HYBRID_PAYLOAD_BYTES = (
    ALICE_ECDH_PUBLIC_KEY_BYTES +
    BOB_ECDH_PUBLIC_KEY_BYTES +
    BOB_MLKEM_PUBLIC_KEY_BYTES +
    MLKEM_CIPHERTEXT_BYTES
)  # 2,402 bytes

HYBRID_SHARED_SECRET_BYTES = 32
AES_256_GCM_KEY_BYTES = 32

# Execution Platform Profiles
PLATFORM_A = "platform_a"  # Unconstrained multi-core host CPU
PLATFORM_B = "platform_b"  # Single-core CPU affinity (Process.cpu_affinity([0]))


def run_hybrid_handshake(demo_message: Optional[str] = None) -> Dict[str, Any]:
    """
    Execute a single end-to-end ephemeral hybrid key exchange between Alice and Bob.
    
    Returns:
        Structured dictionary containing:
        - success: boolean
        - verification: constant-time agreement checks and truncated SHA-256 fingerprints
        - timings_ms: per-primitive and total handshake latency
        - payload_sizes: public wire byte breakdown
        - public_transcript: hex previews of exchanged public artifacts
        - aes_gcm_demo: authenticated transmission result
    """
    return HybridExchangeService.execute_handshake(demo_message=demo_message)


def run_crypto_benchmark(
    iterations: int = 100,
    platform_profile: str = PLATFORM_A,
    warmup_iterations: int = 5,
    benchmark_mode: str = "hybrid",
    save_csv: bool = True
) -> Dict[str, Any]:
    """
    Execute empirical benchmark evaluation across N iterations on the designated platform profile.
    
    Args:
        iterations: Number of measured trials (e.g. 100).
        platform_profile: 'platform_a', 'platform_b', or 'both'.
        warmup_iterations: Discarded cache warm-up cycles (default 5).
        benchmark_mode: 'hybrid', 'ecdh_only', or 'mlkem_only'.
        save_csv: Whether to write summary and trial observations to results/.
        
    Returns:
        Structured results dictionary with empirical statistics and memory overhead.
    """
    return CryptoBenchmarkService.run_benchmark(
        iterations=iterations,
        platform_profile=platform_profile,
        warmup_iterations=warmup_iterations,
        save_csv=save_csv,
        benchmark_mode=benchmark_mode
    )
