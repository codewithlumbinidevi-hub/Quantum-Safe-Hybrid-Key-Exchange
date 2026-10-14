"""
Pydantic schemas for Cryptographic and Hybrid Key Exchange API endpoints.
"""
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class HybridExchangeRequest(BaseModel):
    demo_message: Optional[str] = Field(
        default="Post-quantum secure message transmission using Q-SHIELD-PQC.",
        description="Optional plaintext message to encrypt with AES-256-GCM using derived hybrid key"
    )


class PayloadSizes(BaseModel):
    alice_ecdh_public_key_bytes: int
    bob_ecdh_public_key_bytes: int
    bob_mlkem_public_key_bytes: int
    mlkem_ciphertext_bytes: int
    total_exchange_payload_bytes: int


class ExchangeVerification(BaseModel):
    ecdh_secrets_match: bool
    mlkem_secrets_match: bool
    hybrid_keys_match: bool
    alice_key_fingerprint_sha256: str
    bob_key_fingerprint_sha256: str


class AesGcmDemoResult(BaseModel):
    plaintext_input: str
    ciphertext_hex: str
    nonce_hex: str
    tag_hex: str
    decryption_success: bool
    decrypted_plaintext: Optional[str] = None
    error_message: Optional[str] = None


class HybridExchangeResponse(BaseModel):
    success: bool
    verification: ExchangeVerification
    timings_ms: Dict[str, float]
    payload_sizes: PayloadSizes
    public_transcript: Dict[str, str]
    aes_gcm_demo: Optional[AesGcmDemoResult] = None
    security_notice: str


class CryptoBenchmarkRequest(BaseModel):
    iterations: int = Field(default=100, ge=1, le=1000, description="Benchmark iterations count")
    platform_profile: str = Field(
        default="platform_a",
        description="'platform_a' (standard), 'platform_b' (constrained), or 'both'/'compare_both' (dual-profile)"
    )
    benchmark_mode: str = Field(default="hybrid", description="'hybrid', 'ecdh_only', or 'mlkem_only'")
    warmup_iterations: int = Field(default=5, ge=0, le=20, description="Warmup cycles before measurement")
    save_csv: bool = Field(default=True, description="Save trials and summary to CSV")


class StatMetrics(BaseModel):
    mean_ms: float
    std_dev_ms: float
    median_ms: float
    min_ms: float
    max_ms: float
    p50_ms: float
    p95_ms: float
    p99_ms: float
    sample_count: Optional[int] = None


class CryptoBenchmarkResponse(BaseModel):
    run_id: str = Field(default="", description="Unique run identifier")
    timestamp: str
    platform_profile: str
    benchmark_mode: str = Field(default="hybrid", description="Benchmark mode: hybrid, ecdh_only, mlkem_only")
    cpu_configuration: Dict[str, Any]
    hardware_info: Dict[str, Any]
    iterations: int
    warmup_iterations: int
    verification: Dict[str, Any]
    statistics: Dict[str, StatMetrics]
    payload_sizes: Dict[str, int]
    memory_overhead: Dict[str, Any]
    trials_preview: List[Dict[str, Any]]
    csv_files: Optional[Dict[str, str]] = None
    manifest_file: Optional[str] = None
    generated_figures: Optional[Dict[str, Any]] = None
    platform_a_result: Optional[Dict[str, Any]] = None
    platform_b_result: Optional[Dict[str, Any]] = None
    comparison_summary: Optional[Dict[str, Any]] = None
