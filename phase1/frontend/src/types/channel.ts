/**
 * TypeScript types for Phase 2 Quantum-Safe Secure Communication Channel (PS-P1).
 */

export interface HandshakeFlightEvent {
  flight: number;
  sender: 'Alice' | 'Bob';
  recipient: 'Alice' | 'Bob';
  message_type: 'ClientHello' | 'ServerHello' | 'ClientAuth';
  wire_bytes: number;
  elapsed_ms: number;
  details: {
    sender_id?: string;
    target_id?: string;
    client_random_prefix?: string;
    server_random_prefix?: string;
    kem_public_key_bytes?: number;
    kem_ciphertext_bytes?: number;
    signature_bytes?: number;
    kem_pk_fingerprint?: string;
    kem_ct_fingerprint?: string;
    signature_fingerprint?: string;
    suite_id?: string;
    client_id?: string;
  };
}

export interface PayloadTransferResult {
  payload_name: string;
  plaintext_bytes: number;
  ciphertext_bytes: number;
  overhead_bytes: number;
  chunk_count: number;
  encrypt_ms: number;
  decrypt_ms: number;
  encrypt_throughput_mb_s: number;
  decrypt_throughput_mb_s: number;
  expected_sha256: string;
  decrypted_sha256: string;
  sha256_match: boolean;
}

export interface HandshakeRunResponse {
  run_id: string;
  timestamp: string;
  suite_id: number;
  suite_name: string;
  transport: string;
  scope_label: 'local (in-process)' | 'local (TCP loopback)' | 'real network';
  success: boolean;
  handshake_time_ms: number;
  flight1_bytes: number;
  flight2_bytes: number;
  flight3_bytes: number;
  total_wire_bytes: number;
  final_transcript_hash: string;
  alice_write_key_fingerprint: string;
  bob_write_key_fingerprint: string;
  events: HandshakeFlightEvent[];
  payload_result?: PayloadTransferResult | null;
  security_notice: string;
}

export interface SecurityTestItem {
  test_id: string;
  description: string;
  injected_fault: string;
  expected: string;
  observed: string;
  result: 'PASS' | 'FAIL' | string;
  run_command: string;
}

export interface SecurityTestsResponse {
  tests: SecurityTestItem[];
  total_count: number;
  passed_count: number;
  failed_count: number;
  last_updated: string;
  all_passed: boolean;
}

export interface AttackSimulationResult {
  scenario: string;
  target_layer: string;
  injected_fault: string;
  rejected: boolean;
  exception_type: string;
  exception_message: string;
  plaintext_released: boolean;
  defense_mechanism: string;
  log: string[];
}

export interface BackgroundJob {
  job_id: string;
  job_type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  started_at: string;
  completed_at?: string;
  result?: any;
  error?: string;
}

export interface PlatformInfo {
  platform_a: {
    platform_label?: string;
    recorded_at?: string;
    os?: string;
    os_version?: string;
    machine?: string;
    cpu_model?: string;
    physical_cores?: number;
    logical_cores?: number;
    cpu_max_mhz?: number;
    ram_total_gb?: number;
    python?: string;
    python_impl?: string;
    on_battery?: boolean;
    versions?: Record<string, string>;
  };
  platform_b: {
    profile_label: string;
    rules: string;
    tool: string;
    runs: Array<{
      platform: string;
      command: string;
      started: string;
      status: string;
      wall_time_s: number;
      peak_rss_mb: number;
      mem_budget_mb: number;
      cpu_pinning: string;
      threads_forced: number;
      os: string;
    }>;
    latest_peak_rss_mb: number;
    latest_wall_time_s: number;
  };
  platform_d: {
    profile_label: string;
    rationale: string;
    template: string;
    benchmark_results: Array<Record<string, string>>;
  };
}

export interface PinnedIdentity {
  identity: string;
  algorithm: string;
  public_key_bytes: number;
  fingerprint_sha256: string;
}

export interface TrustInfo {
  trust_anchors: PinnedIdentity[];
  supported_suites: Array<{
    id: string;
    name: string;
    role: string;
    fips: string;
    kem_params: string;
    dsa_params: string;
  }>;
  identity_trust_model: string;
  what_is_signed: string;
  transcript_binding_formula: string;
  record_framing: string;
}

export interface ResultFileItem {
  filename: string;
  size_bytes: number;
  sha256: string;
  download_url: string;
  category: string;
}

export interface BenchmarkLatestResponse {
  handshakes: Array<Record<string, any>>;
  payloads: Array<Record<string, any>>;
  primitives: Array<Record<string, any>>;
  platform_d: Array<Record<string, any>>;
  figures: Array<{ name: string; url: string }>;
}

export interface SubmissionVerificationItem {
  path: string;
  expected_sha256: string;
  actual_sha256: string;
  status: 'MATCH' | 'MISMATCH' | 'MISSING';
  bytes: number;
}

export interface SubmissionVerificationResponse {
  all_verified: boolean;
  total_files: number;
  verified_files: number;
  items: SubmissionVerificationItem[];
  checklist_status: Record<string, boolean>;
}
