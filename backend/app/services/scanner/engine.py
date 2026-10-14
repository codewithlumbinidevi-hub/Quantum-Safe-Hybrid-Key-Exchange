"""
Q-SHIELD Cryptographic Scanner — Core Scanning Engine.

Performs deterministic static analysis on Python source files using:
  1. Regex pattern matching against known quantum-vulnerable API patterns.
  2. Basic line-by-line text analysis for symbol detection.

This module does NOT:
  - Execute scanned code.
  - Install or import dependencies from scanned repositories.
  - Perform data-flow or taint analysis.
  - Claim 100% detection coverage.

Supported languages: Python (.py) only.
Other file types: scanned for string-level pattern matching with lower confidence.

See rules.py for complete rule documentation.
"""
from __future__ import annotations
import ast
import hashlib
import re
import time
import uuid
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

from backend.app.services.scanner.rules import ALL_RULES, DetectionRule
from backend.app.schemas.scanner_schemas import (
    Finding,
    AlgorithmFamily,
    Severity,
    AlgorithmSummary,
)

_SUPPORTED_EXTENSIONS = {".py", ".pyw"}
_OTHER_EXTENSIONS = {".txt", ".cfg", ".ini", ".yaml", ".yml", ".toml", ".json", ".sh", ".md"}
_MAX_FILE_SIZE_BYTES = 512 * 1024  # 512 KB per file
_EXCERPT_CONTEXT_LINES = 2

ALGORITHM_FAMILY_MAP = {
    "RSA": AlgorithmFamily.RSA,
    "DSA": AlgorithmFamily.DSA,
    "DH": AlgorithmFamily.DH,
    "ECC": AlgorithmFamily.ECC,
    "Symmetric": AlgorithmFamily.SYMMETRIC,
    "Hash": AlgorithmFamily.HASH,
    "Unknown": AlgorithmFamily.UNKNOWN,
}

SEVERITY_MAP = {
    "critical": Severity.CRITICAL,
    "high": Severity.HIGH,
    "medium": Severity.MEDIUM,
    "low": Severity.LOW,
    "info": Severity.INFO,
}


def _short_id() -> str:
    return uuid.uuid4().hex[:12].upper()


def _make_excerpt(lines: List[str], line_idx: int, context: int = _EXCERPT_CONTEXT_LINES) -> str:
    """Return a small code excerpt centred around line_idx (0-based)."""
    start = max(0, line_idx - context)
    end = min(len(lines), line_idx + context + 1)
    excerpt_lines = []
    for i, ln in enumerate(lines[start:end], start=start + 1):
        marker = ">>>" if i == line_idx + 1 else "   "
        excerpt_lines.append(f"{marker} {i:4d} | {ln.rstrip()}")
    return "\n".join(excerpt_lines)


def _scan_file(
    file_path: Path,
    relative_path: str,
    rules: List[DetectionRule],
) -> Tuple[List[Finding], bool]:
    """
    Scan a single file and return (findings, was_scanned).
    was_scanned is False if the file was skipped due to size or encoding issues.
    """
    if file_path.stat().st_size > _MAX_FILE_SIZE_BYTES:
        return [], False

    try:
        content = file_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return [], False

    lines = content.splitlines()
    findings: List[Finding] = []
    seen: set[Tuple[str, int]] = set()  # (rule_id, line_no) dedup

    is_python = file_path.suffix.lower() in _SUPPORTED_EXTENSIONS

    for rule in rules:
        for pattern in rule.patterns:
            for line_idx, line in enumerate(lines):
                match = pattern.search(line)
                if not match:
                    continue

                line_no = line_idx + 1
                dedup_key = (rule.rule_id, line_no)
                if dedup_key in seen:
                    continue
                seen.add(dedup_key)

                matched_symbol = match.group(0).strip()
                excerpt = _make_excerpt(lines, line_idx)

                finding = Finding(
                    finding_id=_short_id(),
                    file_path=relative_path,
                    line_number=line_no,
                    algorithm_family=ALGORITHM_FAMILY_MAP.get(rule.algorithm_family, AlgorithmFamily.UNKNOWN),
                    matched_symbol=matched_symbol,
                    severity=SEVERITY_MAP.get(rule.severity, Severity.INFO),
                    rule_id=rule.rule_id,
                    rule_name=rule.rule_name,
                    explanation=rule.explanation,
                    migration_recommendation=rule.migration_recommendation,
                    evidence_excerpt=excerpt,
                    confidence=rule.confidence,
                    references=list(rule.references),
                )
                findings.append(finding)

    return findings, True


def _build_file_tree(root: Path, files: List[Path]) -> Dict[str, Any]:
    """Build a nested dict representing the file tree."""
    tree: Dict[str, Any] = {}
    for f in files:
        try:
            rel = f.relative_to(root)
        except ValueError:
            rel = f
        parts = rel.parts
        node = tree
        for part in parts[:-1]:
            node = node.setdefault(part, {"_type": "dir", "_children": {}})["_children"]
        node[parts[-1]] = {"_type": "file", "path": str(rel).replace("\\", "/")}
    return tree


def _build_algorithm_inventory(findings: List[Finding]) -> List[AlgorithmSummary]:
    """Aggregate findings into per-algorithm-family summaries."""
    agg: Dict[AlgorithmFamily, Dict] = {}
    for f in findings:
        fam = f.algorithm_family
        if fam not in agg:
            agg[fam] = {
                "family": fam,
                "total": 0,
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
                "info": 0,
                "files": set(),
            }
        agg[fam]["total"] += 1
        agg[fam][f.severity.value] += 1
        agg[fam]["files"].add(f.file_path)

    migration_targets = {
        AlgorithmFamily.RSA: "ML-DSA (FIPS 204) for signatures; ML-KEM (FIPS 203) for key establishment",
        AlgorithmFamily.DSA: "ML-DSA (FIPS 204) or SLH-DSA (FIPS 205)",
        AlgorithmFamily.DH: "ML-KEM (FIPS 203) for key establishment",
        AlgorithmFamily.ECC: "ML-KEM (FIPS 203) for key establishment; ML-DSA / SLH-DSA for signatures",
        AlgorithmFamily.SYMMETRIC: "Symmetric ciphers with key size ≥ 256 bits remain adequate for near-term post-quantum security",
        AlgorithmFamily.HASH: "SHA-3 or SHA-256 (with output truncation awareness); generally adequate",
        AlgorithmFamily.UNKNOWN: "Review required",
    }

    inventory = []
    for fam, data in agg.items():
        inventory.append(
            AlgorithmSummary(
                family=fam,
                total_findings=data["total"],
                critical=data["critical"],
                high=data["high"],
                medium=data["medium"],
                low=data["low"],
                info=data["info"],
                files_affected=len(data["files"]),
                migration_target=migration_targets.get(fam, "Review required"),
            )
        )

    return sorted(inventory, key=lambda x: x.total_findings, reverse=True)


def scan_directory(root: Path, source_label: str) -> Dict[str, Any]:
    """
    Scan all supported files in root recursively.
    Returns a dict matching ScanResult schema.
    """
    start_time = time.perf_counter()
    scan_id = uuid.uuid4().hex

    # Collect files — skip hidden dirs and __pycache__
    all_files: List[Path] = []
    for p in root.rglob("*"):
        if any(part.startswith(".") or part == "__pycache__" for part in p.parts):
            continue
        if p.is_file() and p.suffix.lower() in (_SUPPORTED_EXTENSIONS | _OTHER_EXTENSIONS):
            all_files.append(p)

    all_findings: List[Finding] = []
    files_scanned = 0
    for f in all_files:
        rel_path = str(f.relative_to(root)).replace("\\", "/")
        findings, was_scanned = _scan_file(f, rel_path, ALL_RULES)
        if was_scanned:
            files_scanned += 1
        all_findings.extend(findings)

    duration_ms = (time.perf_counter() - start_time) * 1000.0

    algorithm_inventory = _build_algorithm_inventory(all_findings)
    file_tree = _build_file_tree(root, all_files)

    severity_counts = {s.value: 0 for s in Severity}
    for f in all_findings:
        severity_counts[f.severity.value] += 1

    summary = {
        "scan_id": scan_id,
        "status": "completed",
        "repo_source": source_label,
        "branch": None,
        "files_scanned": files_scanned,
        "total_findings": len(all_findings),
        "algorithm_families": len(algorithm_inventory),
        "critical_count": severity_counts["critical"],
        "high_count": severity_counts["high"],
        "medium_count": severity_counts["medium"],
        "low_count": severity_counts["low"],
        "info_count": severity_counts["info"],
        "scan_duration_ms": round(duration_ms, 2),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "scanner_version": "1.0.0",
        "limitations": [
            "Supports Python (.py) source files; other file types receive limited pattern scanning.",
            "Detection is pattern-based and does not perform data-flow or taint analysis.",
            "False positives may occur in comments, docstrings, or string literals.",
            "False negatives may occur for obfuscated, dynamically constructed, or indirected API calls.",
            "Severity classification reflects quantum-security risk, not an active exploitability score.",
            "No external network requests are made during scanning.",
            "A finding marks usage requiring human review, not a confirmed vulnerability.",
        ],
        "is_demo": False,
    }

    return {
        "summary": summary,
        "findings": [f.model_dump() for f in all_findings],
        "algorithm_inventory": [a.model_dump() for a in algorithm_inventory],
        "file_tree": file_tree,
    }
