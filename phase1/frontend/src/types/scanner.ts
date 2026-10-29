// Q-SHIELD Scanner — TypeScript type definitions

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlgorithmFamily = 'RSA' | 'DSA' | 'DH' | 'ECC' | 'Symmetric' | 'Hash' | 'Unknown';
export type ScanStatus = 'idle' | 'scanning' | 'completed' | 'failed';

export interface Finding {
  finding_id: string;
  file_path: string;
  line_number: number;
  algorithm_family: AlgorithmFamily;
  matched_symbol: string;
  severity: Severity;
  rule_id: string;
  rule_name: string;
  explanation: string;
  migration_recommendation: string;
  evidence_excerpt: string;
  confidence: string;
  references: string[];
}

export interface AlgorithmSummary {
  family: AlgorithmFamily;
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  files_affected: number;
  migration_target: string;
}

export interface ScanSummary {
  scan_id: string;
  status: ScanStatus;
  repo_source: string;
  branch: string | null;
  files_scanned: number;
  total_findings: number;
  algorithm_families: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  scan_duration_ms: number;
  timestamp: string;
  scanner_version: string;
  limitations: string[];
  is_demo: boolean;
}

export interface ScanResult {
  summary: ScanSummary;
  findings: Finding[];
  algorithm_inventory: AlgorithmSummary[];
  file_tree: Record<string, any>;
  demo_ground_truth?: Array<{ file: string; rule_id: string; line: number }>;
}

export interface PQCReference {
  algorithm: string;
  full_name: string;
  nist_standard: string;
  category: string;
  description: string;
  key_sizes: string;
  status: string;
  references: string[];
}

export interface MigrationRecommendation {
  classical_usage: string;
  pqc_target: string;
  nist_standard: string;
  fips_document: string;
  rationale: string;
  considerations: string[];
  references: string[];
}

export interface DetectionRule {
  rule_id: string;
  rule_name: string;
  algorithm_family: string;
  severity: string;
  confidence: string;
  explanation: string;
  migration_recommendation: string;
  references: string[];
  language: string;
}

export interface TestMetrics {
  test_repo: string;
  test_repo_url: string;
  total_files: number;
  ground_truth_findings: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  precision: number | null;
  recall: number | null;
  precision_display: string;
  recall_display: string;
  scan_duration_ms: number;
  notes: string;
}
