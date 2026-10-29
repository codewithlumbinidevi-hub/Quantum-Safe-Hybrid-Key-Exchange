"""
Pydantic schemas for the Q-SHIELD Cryptographic Inventory & Migration Scanner.
PS-P2 — Qiskit Fall Fest 2026, SRM University-AP.
"""
from __future__ import annotations
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlgorithmFamily(str, Enum):
    RSA = "RSA"
    DSA = "DSA"
    DH = "DH"
    ECC = "ECC"
    SYMMETRIC = "Symmetric"
    HASH = "Hash"
    UNKNOWN = "Unknown"


class ScanStatus(str, Enum):
    IDLE = "idle"
    SCANNING = "scanning"
    COMPLETED = "completed"
    FAILED = "failed"


class Finding(BaseModel):
    finding_id: str = Field(description="Unique finding identifier")
    file_path: str = Field(description="Relative file path within the repository")
    line_number: int = Field(description="Line number where the pattern was found")
    algorithm_family: AlgorithmFamily
    matched_symbol: str = Field(description="The matched code symbol or expression")
    severity: Severity
    rule_id: str = Field(description="Detection rule identifier, e.g. CRYPTO-RSA-001")
    rule_name: str = Field(description="Human-readable rule name")
    explanation: str = Field(description="Why this finding matters for quantum security")
    migration_recommendation: str = Field(description="Recommended post-quantum migration direction")
    evidence_excerpt: str = Field(description="Code excerpt around the matched line")
    confidence: str = Field(description="Detection confidence: definite / probable / possible")
    references: List[str] = Field(default_factory=list)


class AlgorithmSummary(BaseModel):
    family: AlgorithmFamily
    total_findings: int
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0
    files_affected: int = 0
    migration_target: str = ""


class ScanRequest(BaseModel):
    repo_url: Optional[str] = Field(None, description="GitHub repository URL to scan")
    branch: Optional[str] = Field("main", description="Git branch to scan")
    demo_mode: bool = Field(False, description="Use synthetic demo repository")


class ScanSummary(BaseModel):
    scan_id: str
    status: ScanStatus
    repo_source: str
    branch: Optional[str]
    files_scanned: int
    total_findings: int
    algorithm_families: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    scan_duration_ms: float
    timestamp: str
    scanner_version: str
    limitations: List[str]
    is_demo: bool = False


class ScanResult(BaseModel):
    summary: ScanSummary
    findings: List[Finding]
    algorithm_inventory: List[AlgorithmSummary]
    file_tree: Dict[str, Any]


class TestMetrics(BaseModel):
    test_repo: str
    test_repo_url: str
    total_files: int
    ground_truth_findings: int
    true_positives: int
    false_positives: int
    false_negatives: int
    precision: Optional[float]
    recall: Optional[float]
    precision_display: str
    recall_display: str
    scan_duration_ms: float
    notes: str


class MigrationRecommendation(BaseModel):
    classical_usage: str
    pqc_target: str
    nist_standard: str
    fips_document: str
    rationale: str
    considerations: List[str]
    references: List[str]


class PQCReference(BaseModel):
    algorithm: str
    full_name: str
    nist_standard: str
    category: str
    description: str
    key_sizes: str
    status: str
    references: List[str]
