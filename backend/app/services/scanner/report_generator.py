"""
Q-SHIELD Report Generator.

Generates Markdown, JSON, and CSV reports from scan results.
All reports are generated from actual scan data — no values are fabricated.
"""
from __future__ import annotations
import csv
import io
import json
from typing import Any, Dict


def generate_markdown_report(result: Dict[str, Any]) -> str:
    """Generate a structured Markdown report from a scan result dict."""
    summary = result["summary"]
    findings = result["findings"]
    inventory = result["algorithm_inventory"]

    lines = []
    lines.append("# Q-SHIELD Cryptographic Inventory & Migration Scanner — Scan Report")
    lines.append("")
    lines.append(f"> **Scanner Version:** {summary['scanner_version']}  ")
    lines.append(f"> **Timestamp:** {summary['timestamp']}  ")
    lines.append(f"> **Repository:** {summary['repo_source']}  ")
    if summary.get("branch"):
        lines.append(f"> **Branch:** {summary['branch']}  ")
    lines.append(f"> **Demo Mode:** {'Yes — SYNTHETIC SAMPLE DATA' if summary.get('is_demo') else 'No'}  ")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Scan Summary")
    lines.append("")
    lines.append(f"| Metric | Value |")
    lines.append(f"|--------|-------|")
    lines.append(f"| Files Scanned | {summary['files_scanned']} |")
    lines.append(f"| Total Findings | {summary['total_findings']} |")
    lines.append(f"| Algorithm Families Detected | {summary['algorithm_families']} |")
    lines.append(f"| Critical | {summary['critical_count']} |")
    lines.append(f"| High | {summary['high_count']} |")
    lines.append(f"| Medium | {summary['medium_count']} |")
    lines.append(f"| Low | {summary['low_count']} |")
    lines.append(f"| Info | {summary['info_count']} |")
    lines.append(f"| Scan Duration | {summary['scan_duration_ms']:.1f} ms |")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Algorithm Inventory")
    lines.append("")
    lines.append("| Algorithm Family | Findings | Files Affected | Migration Target |")
    lines.append("|------------------|----------|----------------|-----------------|")
    for alg in inventory:
        lines.append(
            f"| {alg['family']} | {alg['total_findings']} | {alg['files_affected']} | {alg['migration_target']} |"
        )
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Findings")
    lines.append("")
    for idx, f in enumerate(findings, 1):
        lines.append(f"### Finding {idx} — {f['rule_id']}: {f['rule_name']}")
        lines.append("")
        lines.append(f"- **Severity:** {f['severity'].upper()}")
        lines.append(f"- **Algorithm Family:** {f['algorithm_family']}")
        lines.append(f"- **File:** `{f['file_path']}`")
        lines.append(f"- **Line:** {f['line_number']}")
        lines.append(f"- **Matched Symbol:** `{f['matched_symbol']}`")
        lines.append(f"- **Confidence:** {f['confidence']}")
        lines.append("")
        lines.append(f"**Explanation:** {f['explanation']}")
        lines.append("")
        lines.append(f"**Migration Recommendation:** {f['migration_recommendation']}")
        lines.append("")
        lines.append("**Evidence:**")
        lines.append("```python")
        lines.append(f['evidence_excerpt'])
        lines.append("```")
        if f.get("references"):
            lines.append("")
            lines.append("**References:**")
            for ref in f["references"]:
                lines.append(f"- {ref}")
        lines.append("")
        lines.append("---")
        lines.append("")

    lines.append("## Migration Recommendations")
    lines.append("")
    lines.append("The following NIST-standardised post-quantum algorithms are recommended as migration targets:")
    lines.append("")
    lines.append("| Classical Usage | Recommended Migration Direction | NIST Standard |")
    lines.append("|-----------------|--------------------------------|---------------|")
    lines.append("| RSA key establishment | ML-KEM (Module-Lattice KEM) | FIPS 203 |")
    lines.append("| ECDH key establishment | ML-KEM | FIPS 203 |")
    lines.append("| DH key exchange | ML-KEM | FIPS 203 |")
    lines.append("| RSA digital signatures | ML-DSA or SLH-DSA | FIPS 204 / FIPS 205 |")
    lines.append("| ECDSA digital signatures | ML-DSA or SLH-DSA | FIPS 204 / FIPS 205 |")
    lines.append("| DSA digital signatures | ML-DSA or SLH-DSA | FIPS 204 / FIPS 205 |")
    lines.append("")
    lines.append("> **Note:** Migration depends on protocol compatibility, library support,")
    lines.append("> performance requirements, interoperability, and compliance constraints.")
    lines.append("> A one-to-one algorithm replacement is not always appropriate.")
    lines.append("> Consult the NIST FIPS documents and relevant protocol specifications before migrating.")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Limitations")
    lines.append("")
    for lim in summary.get("limitations", []):
        lines.append(f"- {lim}")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Reproducibility")
    lines.append("")
    lines.append("To reproduce this scan:")
    lines.append("")
    lines.append("```bash")
    lines.append("# 1. Install dependencies")
    lines.append("pip install -r requirements.txt")
    lines.append("")
    lines.append("# 2. Start the backend")
    lines.append("python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000")
    lines.append("")
    lines.append("# 3. Start the frontend")
    lines.append("cd frontend && npm run dev")
    lines.append("")
    lines.append("# 4. Use Demo Mode or upload a ZIP of the same repository")
    lines.append("```")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("*This report was generated by Q-SHIELD Cryptographic Inventory & Migration Scanner.*  ")
    lines.append("*PS-P2 — Qiskit Fall Fest 2026 — SRM University-AP.*  ")
    lines.append("*This tool is a research demonstration. It is not affiliated with or endorsed by IBM, Qiskit, SRM University-AP, NIST, or any government organisation.*")

    return "\n".join(lines)


def generate_csv_report(findings: list) -> str:
    """Generate a CSV string from a list of finding dicts."""
    output = io.StringIO()
    fieldnames = [
        "finding_id", "severity", "algorithm_family", "rule_id", "rule_name",
        "file_path", "line_number", "matched_symbol", "confidence",
        "explanation", "migration_recommendation",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for f in findings:
        writer.writerow({k: f.get(k, "") for k in fieldnames})
    return output.getvalue()


def generate_json_report(result: Dict[str, Any]) -> str:
    """Generate a JSON string from a scan result dict."""
    return json.dumps(result, indent=2, default=str)
