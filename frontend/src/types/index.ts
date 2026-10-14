export interface EnvironmentInfo {
  os: string;
  architecture: string;
  processor: string;
  cpu_cores_logical: number;
  python_version: string;
  cryptography_version: string;
  qiskit_version: string;
  affinity_constraint_supported: boolean;
}

export interface SystemMemory {
  process_rss_mb: number;
  process_vms_mb: number;
  python_traced_current_kb: number;
  python_traced_peak_kb: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  description: string;
  environment: EnvironmentInfo;
  system_memory: SystemMemory;
}

export interface HybridExchangeResult {
  success: boolean;
  verification: {
    ecdh_secrets_match: boolean;
    mlkem_secrets_match: boolean;
    hybrid_keys_match: boolean;
    alice_key_fingerprint_sha256: string;
    bob_key_fingerprint_sha256: string;
  };
  timings_ms: {
    alice_ecdh_keygen_ms: number;
    bob_ecdh_keygen_ms: number;
    bob_mlkem_keygen_ms: number;
    alice_ecdh_derivation_ms: number;
    bob_ecdh_derivation_ms: number;
    alice_mlkem_encapsulation_ms: number;
    bob_mlkem_decapsulation_ms: number;
    alice_hybrid_kdf_ms: number;
    bob_hybrid_kdf_ms: number;
    total_handshake_ms: number;
  };
  payload_sizes: {
    alice_ecdh_public_key_bytes: number;
    bob_ecdh_public_key_bytes: number;
    bob_mlkem_public_key_bytes: number;
    mlkem_ciphertext_bytes: number;
    total_exchange_payload_bytes: number;
  };
  public_transcript: {
    alice_ecdh_pk_preview: string;
    bob_ecdh_pk_preview: string;
    bob_mlkem_pk_preview: string;
    mlkem_ciphertext_preview: string;
    transcript_hash_sha256: string;
  };
  aes_gcm_demo?: {
    plaintext_input: string;
    ciphertext_hex: string;
    nonce_hex: string;
    tag_hex: string;
    decryption_success: boolean;
    decrypted_plaintext?: string;
    error_message?: string;
  };
  security_notice: string;
}

export interface StatMetrics {
  mean_ms: number;
  std_dev_ms: number;
  median_ms: number;
  min_ms: number;
  max_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
}

export interface CryptoBenchmarkResult {
  run_id?: string;
  timestamp: string;
  platform_profile: string;
  benchmark_mode?: string;
  cpu_configuration: {
    profile: string;
    applied: boolean;
    active_cores?: number[];
    warning?: string;
    note?: string;
  };
  hardware_info: EnvironmentInfo;
  iterations: number;
  warmup_iterations: number;
  verification: {
    trials_run: number;
    all_ecdh_secrets_matched: boolean;
    all_mlkem_secrets_matched: boolean;
    all_hybrid_keys_matched: boolean;
    status: string;
  };
  statistics: Record<string, StatMetrics>;
  payload_sizes: Record<string, number>;
  memory_overhead: {
    initial_rss_mb: number;
    final_rss_mb: number;
    rss_delta_mb: number;
    python_heap_peak_kb: number;
    python_heap_final_kb: number;
    note: string;
  };
  trials_preview: Array<{
    trial: number;
    total_handshake_ms: number;
    ecdh_keygen_ms: number;
    mlkem_keygen_ms: number;
    ecdh_derivation_ms: number;
    mlkem_encap_ms: number;
    mlkem_decap_ms: number;
    hybrid_kdf_ms: number;
    hybrid_match: boolean;
    platform?: string;
  }>;
  csv_files?: {
    trials_csv: string;
    summary_csv: string;
    raw_run_csv: string;
  };
  manifest_file?: string;
  generated_figures?: Record<string, any>;
  platform_a_result?: any;
  platform_b_result?: any;
  comparison_summary?: {
    platform_a: {
      profile_name: string;
      mean_ms: number;
      p95_ms: number;
      python_heap_peak_kb: number;
      rss_delta_mb: number;
    };
    platform_b: {
      profile_name: string;
      mean_ms: number;
      p95_ms: number;
      python_heap_peak_kb: number;
      rss_delta_mb: number;
    };
    relative_latency_overhead_percent: number;
  };
}

export interface ProcessorData {
  topology: {
    name: string;
    architecture_id: string;
    num_qubits: number;
    undirected_edges_count: number;
    directed_edges_count: number;
    is_connected: boolean;
    graph_diameter: number;
    avg_qubit_degree: number;
    max_qubit_degree: number;
    raw_edges: number[][];
  };
  metrics: {
    logical_depth: number;
    transpiled_depth: number;
    depth_expansion_ratio: number;
    logical_cx_count: number;
    transpiled_cx_count: number;
    cx_overhead: number;
    swap_gate_estimate: number;
    cx_overhead_ratio: number;
    logical_total_gates: number;
    transpiled_total_gates: number;
    gate_breakdown: Record<string, number>;
  };
  hellinger_fidelity: number;
  tvd: number;
  top_measured_states: Record<string, number>;
}

export interface ProcessorBenchmarkResult {
  timestamp: string;
  circuit: {
    id: string;
    name: string;
    description: string;
    qubit_count: number;
    logical_depth: number;
    logical_cx_count: number;
  };
  transpiler_settings: {
    optimization_level: number;
    seed: number;
    shots: number;
  };
  noise_settings: {
    single_qubit_depolarizing_rate: number;
    two_qubit_cx_depolarizing_rate: number;
    readout_error_rate: number;
  };
  processor_a: ProcessorData;
  processor_b: ProcessorData;
  comparison_summary: {
    depth_reduction_b_vs_a_percent: number;
    cx_reduction_b_vs_a_percent: number;
    swap_overhead_diff: number;
    fidelity_difference: number;
  };
  scientific_disclaimer: string;
}

export interface ResultsSummary {
  project: string;
  version: string;
  reproducibility_environment: Record<string, any>;
  latest_cryptographic_benchmark: any;
  latest_processor_benchmark: any;
  scientific_integrity_checklist: Record<string, any>;
}
