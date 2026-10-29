"""
Pydantic schemas for Phase 2 Quantum-Safe Secure Communication Channel API.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class HandshakeRunRequest(BaseModel):
    suite: str = Field(
        default="pqc",
        description="'pqc' (ML-KEM-768 + ML-DSA-65) or 'classical' (X25519 + Ed25519)"
    )
    transport: str = Field(
        default="loopback",
        description="'loopback' (in-process) or 'tcp' (local TCP loopback)"
    )
    payload: str = Field(
        default="none",
        description="'none', '1kb', '100kb', or '10mb'"
    )


class HandshakeFlightEvent(BaseModel):
    flight: int
    sender: str
    recipient: str
    message_type: str
    wire_bytes: int
    elapsed_ms: float
    details: Dict[str, Any]


class PayloadTransferResult(BaseModel):
    payload_name: str
    plaintext_bytes: int
    ciphertext_bytes: int
    overhead_bytes: int
    chunk_count: int
    encrypt_ms: float
    decrypt_ms: float
    encrypt_throughput_mb_s: float
    decrypt_throughput_mb_s: float
    expected_sha256: str
    decrypted_sha256: str
    sha256_match: bool


class HandshakeRunResponse(BaseModel):
    run_id: str
    timestamp: str
    suite_id: int
    suite_name: str
    transport: str
    scope_label: str
    success: bool
    handshake_time_ms: float
    flight1_bytes: int
    flight2_bytes: int
    flight3_bytes: int
    total_wire_bytes: int
    final_transcript_hash: str
    alice_write_key_fingerprint: str
    bob_write_key_fingerprint: str
    events: List[HandshakeFlightEvent]
    payload_result: Optional[PayloadTransferResult] = None
    security_notice: str = (
        "Prototype educational implementation - not evaluated for production side-channel resistance."
    )


class SecurityTestItem(BaseModel):
    test_id: str
    description: str
    injected_fault: str
    expected: str
    observed: str
    result: str
    run_command: str


class SecurityTestsResponse(BaseModel):
    tests: List[SecurityTestItem]
    total_count: int
    passed_count: int
    failed_count: int
    last_updated: str
    all_passed: bool


class AttackSimulationRequest(BaseModel):
    scenario: str = Field(
        ...,
        description="e.g. 'bit_flip_kem_pk', 'tamper_sig', 'tamper_ciphertext', 'tamper_tag', 'tamper_aad', 'untrusted_identity', 'identity_swap', 'replay_record', 'replay_handshake', 'downgrade'"
    )
    suite: str = Field(default="pqc", description="'pqc' or 'classical'")


class AttackSimulationResponse(BaseModel):
    scenario: str
    target_layer: str
    injected_fault: str
    rejected: bool
    exception_type: str
    exception_message: str
    plaintext_released: bool
    defense_mechanism: str
    log: List[str]


class BackgroundJobStatus(BaseModel):
    job_id: str
    job_type: str
    status: str
    progress: int
    current_step: str
    started_at: str
    completed_at: Optional[str] = None
    result: Optional[Any] = None
    error: Optional[str] = None


class PlatformInfoResponse(BaseModel):
    platform_a: Dict[str, Any]
    platform_b: Dict[str, Any]
    platform_d: Dict[str, Any]


class PinnedIdentity(BaseModel):
    identity: str
    algorithm: str
    public_key_bytes: int
    fingerprint_sha256: str


class TrustInfoResponse(BaseModel):
    trust_anchors: List[PinnedIdentity]
    supported_suites: List[Dict[str, Any]]
    identity_trust_model: str
    what_is_signed: str
    transcript_binding_formula: str
    record_framing: str


class ResultFileItem(BaseModel):
    filename: str
    size_bytes: int
    sha256: str
    download_url: str
    category: str


class BenchmarkRunRequest(BaseModel):
    suite: str = Field(default="both", description="'pqc', 'classical', or 'both'")
    trials: int = Field(default=20, ge=5, le=200)
    mode: str = Field(default="in_process", description="'in_process' or 'tcp_loopback'")


class SubmissionVerificationItem(BaseModel):
    path: str
    expected_sha256: str
    actual_sha256: str
    status: str
    bytes: int


class SubmissionVerificationResponse(BaseModel):
    all_verified: bool
    total_files: int
    verified_files: int
    items: List[SubmissionVerificationItem]
    checklist_status: Dict[str, bool]
