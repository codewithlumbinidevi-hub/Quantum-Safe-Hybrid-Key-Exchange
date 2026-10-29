"""
Q-SHIELD Scanner API Routes.
PS-P2 — Cryptographic Inventory & Migration Scanner.

Endpoints:
  GET  /api/scanner/health
  POST /api/scanner/scan          (JSON body with repo_url / demo_mode)
  POST /api/scanner/scan/upload   (multipart ZIP upload)
  GET  /api/scanner/scan/{scan_id}
  GET  /api/scanner/scan/{scan_id}/findings
  GET  /api/scanner/scan/{scan_id}/report?format=json|csv|markdown
  GET  /api/scanner/demo
  GET  /api/scanner/pqc-reference
  GET  /api/scanner/migration-guide
  GET  /api/scanner/test-metrics
  GET  /api/scanner/rules
"""
from __future__ import annotations
import shutil
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse, PlainTextResponse, Response

from backend.app.schemas.scanner_schemas import (
    AlgorithmFamily,
    MigrationRecommendation,
    PQCReference,
    ScanRequest,
    ScanStatus,
    Severity,
    TestMetrics,
)
from backend.app.services.scanner.demo_data import (
    DEMO_GROUND_TRUTH,
    create_demo_repository,
)
from backend.app.services.scanner.engine import scan_directory
from backend.app.services.scanner.fetcher import FetchError, extract_zip, fetch_github_repo
from backend.app.services.scanner.report_generator import (
    generate_csv_report,
    generate_json_report,
    generate_markdown_report,
)
from backend.app.services.scanner.rules import ALL_RULES

router = APIRouter(prefix="/api/scanner", tags=["scanner"])

# In-memory scan store (scan_id -> result dict)
# For production use a persistent store; this is sufficient for hackathon scope.
_scan_store: Dict[str, Dict[str, Any]] = {}
_store_lock = threading.Lock()


def _store_result(scan_id: str, result: Dict[str, Any]) -> None:
    with _store_lock:
        _scan_store[scan_id] = result
        # Keep at most 20 recent scans to bound memory usage
        if len(_scan_store) > 20:
            oldest = next(iter(_scan_store))
            del _scan_store[oldest]


def _get_result(scan_id: str) -> Dict[str, Any]:
    with _store_lock:
        result = _scan_store.get(scan_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Scan ID '{scan_id}' not found.")
    return result


# ---------------------------------------------------------------------------
# GET /api/scanner/health
# ---------------------------------------------------------------------------
@router.get("/health")
async def scanner_health():
    return {
        "status": "healthy",
        "module": "Q-SHIELD Cryptographic Scanner",
        "version": "1.0.0",
        "ps": "PS-P2",
        "track": "Track 5 — Post-Quantum Cryptography",
        "supported_languages": ["python"],
        "total_rules": len(ALL_RULES),
    }


# ---------------------------------------------------------------------------
# POST /api/scanner/scan   (JSON — GitHub URL or demo mode)
# ---------------------------------------------------------------------------
@router.post("/scan")
async def start_scan(request: ScanRequest):
    if not request.demo_mode and not request.repo_url:
        raise HTTPException(
            status_code=422,
            detail="Provide a GitHub repository URL or enable demo_mode.",
        )

    try:
        if request.demo_mode:
            root = create_demo_repository()
            label = "DEMO:synthetic-sample-repository"
            branch = None
            is_demo = True
        else:
            root, label = fetch_github_repo(request.repo_url, request.branch or "main")
            branch = request.branch
            is_demo = False
    except FetchError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Repository fetch failed: {e}") from e

    try:
        result = scan_directory(root, label)
    finally:
        shutil.rmtree(root.parent if root.name != root.parent.name else root, ignore_errors=True)
        shutil.rmtree(root, ignore_errors=True)

    scan_id = result["summary"]["scan_id"]
    result["summary"]["branch"] = branch
    result["summary"]["is_demo"] = is_demo

    if is_demo:
        result["demo_ground_truth"] = [
            {"file": gt[0], "rule_id": gt[1], "line": gt[2]}
            for gt in DEMO_GROUND_TRUTH
        ]

    _store_result(scan_id, result)
    return result


# ---------------------------------------------------------------------------
# POST /api/scanner/scan/upload   (ZIP file upload)
# ---------------------------------------------------------------------------
@router.post("/scan/upload")
async def upload_and_scan(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=400,
            detail="Only .zip archives are accepted.",
        )

    MAX_UPLOAD = 50 * 1024 * 1024  # 50 MB
    zip_bytes = await file.read(MAX_UPLOAD + 1)
    if len(zip_bytes) > MAX_UPLOAD:
        raise HTTPException(
            status_code=413,
            detail="Uploaded file exceeds 50 MB limit.",
        )

    try:
        root = extract_zip(zip_bytes)
    except FetchError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    try:
        result = scan_directory(root, f"upload:{file.filename}")
    finally:
        shutil.rmtree(root.parent if root.name != root.parent.name else root, ignore_errors=True)
        shutil.rmtree(root, ignore_errors=True)

    scan_id = result["summary"]["scan_id"]
    _store_result(scan_id, result)
    return result


# ---------------------------------------------------------------------------
# GET /api/scanner/demo
# ---------------------------------------------------------------------------
@router.get("/demo")
async def run_demo_scan():
    """Convenience endpoint that runs Demo Mode directly."""
    return await start_scan(ScanRequest(demo_mode=True))


# ---------------------------------------------------------------------------
# GET /api/scanner/scan/{scan_id}
# ---------------------------------------------------------------------------
@router.get("/scan/{scan_id}")
async def get_scan(scan_id: str):
    return _get_result(scan_id)


# ---------------------------------------------------------------------------
# GET /api/scanner/scan/{scan_id}/findings
# ---------------------------------------------------------------------------
@router.get("/scan/{scan_id}/findings")
async def get_findings(
    scan_id: str,
    severity: Optional[str] = Query(None),
    algorithm_family: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    result = _get_result(scan_id)
    findings = result["findings"]

    if severity:
        findings = [f for f in findings if f["severity"] == severity.lower()]
    if algorithm_family:
        findings = [f for f in findings if f["algorithm_family"].lower() == algorithm_family.lower()]
    if search:
        q = search.lower()
        findings = [
            f for f in findings
            if q in f["file_path"].lower()
            or q in f["matched_symbol"].lower()
            or q in f["rule_id"].lower()
            or q in f["rule_name"].lower()
        ]

    return {"scan_id": scan_id, "count": len(findings), "findings": findings}


# ---------------------------------------------------------------------------
# GET /api/scanner/scan/{scan_id}/report
# ---------------------------------------------------------------------------
@router.get("/scan/{scan_id}/report")
async def get_report(
    scan_id: str,
    format: str = Query("json", description="Report format: json | csv | markdown"),
):
    result = _get_result(scan_id)
    fmt = format.lower()

    if fmt == "markdown":
        content = generate_markdown_report(result)
        return PlainTextResponse(content, media_type="text/markdown")
    elif fmt == "csv":
        content = generate_csv_report(result["findings"])
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=qshield-{scan_id}.csv"},
        )
    else:
        return JSONResponse(content=result)


# ---------------------------------------------------------------------------
# GET /api/scanner/pqc-reference
# ---------------------------------------------------------------------------
@router.get("/pqc-reference")
async def pqc_reference():
    refs = [
        PQCReference(
            algorithm="ML-KEM",
            full_name="Module-Lattice-Based Key-Encapsulation Mechanism",
            nist_standard="FIPS 203",
            category="Key Establishment (KEM)",
            description=(
                "ML-KEM is a key encapsulation mechanism based on the hardness of "
                "the Module Learning With Errors (MLWE) problem. It replaces classical "
                "key establishment schemes such as RSA-OAEP, ECDH, and DH. "
                "ML-KEM is NOT a digital signature algorithm."
            ),
            key_sizes="ML-KEM-512, ML-KEM-768, ML-KEM-1024",
            status="NIST Standard (August 2024)",
            references=[
                "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf",
                "https://pq-crystals.org/kyber/",
            ],
        ),
        PQCReference(
            algorithm="ML-DSA",
            full_name="Module-Lattice-Based Digital Signature Algorithm",
            nist_standard="FIPS 204",
            category="Digital Signatures",
            description=(
                "ML-DSA is a digital signature algorithm based on the hardness of the "
                "Module Learning With Errors problem. It replaces classical signature "
                "schemes such as ECDSA, DSA, and RSA signatures."
            ),
            key_sizes="ML-DSA-44, ML-DSA-65, ML-DSA-87",
            status="NIST Standard (August 2024)",
            references=[
                "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf",
                "https://pq-crystals.org/dilithium/",
            ],
        ),
        PQCReference(
            algorithm="SLH-DSA",
            full_name="Stateless Hash-Based Digital Signature Algorithm",
            nist_standard="FIPS 205",
            category="Digital Signatures (Hash-Based)",
            description=(
                "SLH-DSA is a stateless hash-based digital signature scheme. "
                "Its security relies only on the security of the underlying hash function, "
                "not on number-theoretic assumptions. It provides a conservative alternative "
                "to ML-DSA with larger signature sizes."
            ),
            key_sizes="SLH-DSA-SHA2-128s, SLH-DSA-SHA2-128f, SLH-DSA-SHAKE-128s, etc.",
            status="NIST Standard (August 2024)",
            references=[
                "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.205.pdf",
                "https://sphincs.org/",
            ],
        ),
    ]
    return [r.model_dump() for r in refs]


# ---------------------------------------------------------------------------
# GET /api/scanner/migration-guide
# ---------------------------------------------------------------------------
@router.get("/migration-guide")
async def migration_guide():
    recommendations = [
        MigrationRecommendation(
            classical_usage="RSA key establishment (RSA-OAEP, PKCS#1 v1.5 encryption)",
            pqc_target="ML-KEM (Module-Lattice KEM)",
            nist_standard="FIPS 203",
            fips_document="https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf",
            rationale=(
                "RSA encryption is vulnerable to Shor's algorithm. ML-KEM provides "
                "key encapsulation with post-quantum security under the MLWE hardness assumption."
            ),
            considerations=[
                "ML-KEM uses larger public keys and ciphertexts than RSA.",
                "Protocol changes are required; ML-KEM is not a drop-in replacement.",
                "Hybrid schemes (ML-KEM + classical) may be appropriate during transition.",
                "Library and platform support for ML-KEM is growing but not yet universal.",
                "Compliance and interoperability requirements must be reviewed.",
            ],
            references=[
                "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf",
                "https://csrc.nist.gov/projects/post-quantum-cryptography",
            ],
        ),
        MigrationRecommendation(
            classical_usage="ECDH / DH key exchange",
            pqc_target="ML-KEM (Module-Lattice KEM)",
            nist_standard="FIPS 203",
            fips_document="https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf",
            rationale=(
                "ECDH and DH rely on the discrete logarithm problem, solvable by Shor's algorithm. "
                "ML-KEM replaces ephemeral key agreement with post-quantum key encapsulation."
            ),
            considerations=[
                "Key exchange protocols (TLS, SSH, Signal) require specification-level changes.",
                "Hybrid KEM designs (e.g., X-Wing, HPKE) may be used during transition.",
                "A custom key-combination construction should not be invented without review.",
                "Performance impact depends on parameter set; ML-KEM-768 is recommended baseline.",
            ],
            references=[
                "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf",
                "https://www.rfc-editor.org/rfc/rfc9180",
            ],
        ),
        MigrationRecommendation(
            classical_usage="ECDSA / DSA / RSA digital signatures",
            pqc_target="ML-DSA (Module-Lattice DSA) or SLH-DSA (Hash-Based)",
            nist_standard="FIPS 204 / FIPS 205",
            fips_document="https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf",
            rationale=(
                "ECDSA, DSA, and RSA signatures all rely on problems solvable by Shor's algorithm. "
                "ML-DSA (lattice-based) and SLH-DSA (hash-based) provide post-quantum digital signatures."
            ),
            considerations=[
                "ML-DSA has larger signatures and public keys than ECDSA.",
                "SLH-DSA is more conservative (hash-based security) but has larger signatures.",
                "Choose between ML-DSA and SLH-DSA based on performance and security profile requirements.",
                "Certificate authorities, code signing, and TLS use cases each have different migration paths.",
                "Backward compatibility with existing certificates and signed artefacts must be planned.",
            ],
            references=[
                "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf",
                "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.205.pdf",
                "https://csrc.nist.gov/projects/post-quantum-cryptography",
            ],
        ),
    ]
    return [r.model_dump() for r in recommendations]


# ---------------------------------------------------------------------------
# GET /api/scanner/test-metrics
# ---------------------------------------------------------------------------
@router.get("/test-metrics")
async def test_metrics():
    """
    Return test evaluation metrics for the demo repository.

    Ground truth is defined in demo_data.py DEMO_GROUND_TRUTH.
    Metrics are computed from a live scan of the synthetic demo repository
    at startup time.

    Precision = TP / (TP + FP)
    Recall    = TP / (TP + FN)
    """
    import shutil as _shutil
    from backend.app.services.scanner.demo_data import create_demo_repository, DEMO_GROUND_TRUTH

    root = create_demo_repository()
    try:
        result = scan_directory(root, "test-evaluation:synthetic-demo")
    finally:
        _shutil.rmtree(root.parent if root.name != root.parent.name else root, ignore_errors=True)
        _shutil.rmtree(root, ignore_errors=True)

    findings = result["findings"]
    summary = result["summary"]

    # Build ground-truth set: (file_path, rule_id)
    # We relax the line-number constraint to account for minor line shifts
    gt_set = set((gt[0], gt[1]) for gt in DEMO_GROUND_TRUTH)
    detected_set = set((f["file_path"], f["rule_id"]) for f in findings)

    tp = len(gt_set & detected_set)
    fp = len(detected_set - gt_set)
    fn = len(gt_set - detected_set)

    if (tp + fp) > 0:
        precision = round(tp / (tp + fp), 4)
        precision_display = f"{precision:.2%}"
    else:
        precision = None
        precision_display = "N/A (no detections)"

    if (tp + fn) > 0:
        recall = round(tp / (tp + fn), 4)
        recall_display = f"{recall:.2%}"
    else:
        recall = None
        recall_display = "N/A (empty ground truth)"

    metrics = TestMetrics(
        test_repo="qshield-synthetic-demo",
        test_repo_url="Built-in synthetic sample — no external URL",
        total_files=summary["files_scanned"],
        ground_truth_findings=len(gt_set),
        true_positives=tp,
        false_positives=fp,
        false_negatives=fn,
        precision=precision,
        recall=recall,
        precision_display=precision_display,
        recall_display=recall_display,
        scan_duration_ms=summary["scan_duration_ms"],
        notes=(
            "Ground truth is defined per (file_path, rule_id) pairs in demo_data.py. "
            "Line-number matching is relaxed to account for minor positional shifts. "
            "These metrics are evaluated against a synthetic dataset specifically designed "
            "to include known patterns; they do not represent performance on arbitrary codebases."
        ),
    )

    return metrics.model_dump()


# ---------------------------------------------------------------------------
# GET /api/scanner/rules
# ---------------------------------------------------------------------------
@router.get("/rules")
async def list_rules():
    return [
        {
            "rule_id": r.rule_id,
            "rule_name": r.rule_name,
            "algorithm_family": r.algorithm_family,
            "severity": r.severity,
            "confidence": r.confidence,
            "explanation": r.explanation,
            "migration_recommendation": r.migration_recommendation,
            "references": r.references,
            "language": r.language,
        }
        for r in ALL_RULES
    ]
