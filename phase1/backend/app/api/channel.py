"""
FastAPI Router for Phase 2 Quantum-Safe Secure Communication Channel (PS-P1).
Exposes live handshake execution, payload transmission, security tests T1-T9,
attack simulation laboratory, platform telemetry, and reproducible artifacts.
"""
from __future__ import annotations

import csv
import io
import os
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse, PlainTextResponse

from backend.app.schemas.channel_schemas import (
    AttackSimulationRequest,
    AttackSimulationResponse,
    BackgroundJobStatus,
    BenchmarkRunRequest,
    HandshakeRunRequest,
    HandshakeRunResponse,
    PlatformInfoResponse,
    ResultFileItem,
    SecurityTestsResponse,
    SubmissionVerificationResponse,
    TrustInfoResponse,
)
from backend.app.services.channel_service import (
    CHANNEL_DIR,
    REPO_ROOT,
    RESULTS_DIR,
    ChannelService,
)

router = APIRouter(prefix="/api/channel", tags=["Phase 2 - Secure Channel"])


@router.get("/status")
async def get_channel_status() -> Dict[str, Any]:
    """Return runtime metadata, library versions, and active cipher suites."""
    import cryptography
    import pqcrypto
    return {
        "status": "ready",
        "channel_version": "1.0.0-FIPS",
        "cryptography_version": cryptography.__version__,
        "pqcrypto_version": pqcrypto.__version__,
        "supported_suites": [
            {"id": "0x0001", "name": "ML-KEM-768 + ML-DSA-65", "type": "Post-Quantum (FIPS 203/204)"},
            {"id": "0x0002", "name": "X25519 + Ed25519", "type": "Classical Baseline"},
        ],
        "kdf": "HKDF-SHA256 (RFC 5869)",
        "aead": "AES-256-GCM (SP 800-38D)",
        "security_scope": "prototype, not production security",
    }


@router.post("/handshake/run", response_model=HandshakeRunResponse)
async def run_handshake_endpoint(req: HandshakeRunRequest) -> HandshakeRunResponse:
    """Execute live 3-flight handshake with real key material, transcript hashing, and optional payload."""
    try:
        return ChannelService.execute_handshake(
            suite_param=req.suite,
            transport_param=req.transport,
            payload_param=req.payload,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Handshake execution failed: {str(exc)}")


@router.get("/handshake/{run_id}", response_model=HandshakeRunResponse)
async def get_handshake_run_endpoint(run_id: str) -> HandshakeRunResponse:
    """Retrieve detailed flight event timeline and metrics for a specific handshake run."""
    run = ChannelService.get_handshake_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Handshake run '{run_id}' not found")
    return run


@router.get("/tests/latest", response_model=SecurityTestsResponse)
async def get_latest_security_tests() -> SecurityTestsResponse:
    """Retrieve results of mandatory automated tests T1 through T9 from security_tests.csv."""
    return ChannelService.get_security_tests()


@router.post("/tests/run")
async def run_security_tests(test_id: Optional[str] = Query(None, description="Optional single test e.g. T1")):
    """Trigger execution of automated security tests in background."""
    job_id = ChannelService.start_tests_job(test_id=test_id)
    return {"job_id": job_id, "status": "queued", "message": f"Security tests queued under run {job_id}"}


@router.post("/attack/simulate", response_model=AttackSimulationResponse)
async def simulate_attack_endpoint(req: AttackSimulationRequest) -> AttackSimulationResponse:
    """Interactive Attack Lab: inject real protocol faults and observe cryptographic rejection."""
    try:
        return ChannelService.simulate_attack(scenario=req.scenario, suite_param=req.suite)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(exc)}")


@router.get("/benchmark/latest")
async def get_latest_benchmarks() -> Dict[str, Any]:
    """Retrieve summarized latency, byte counts, payload throughput, and primitive microbenchmarks."""
    handshake_rows = []
    hs_file = RESULTS_DIR / "handshake_results.csv"
    if hs_file.exists():
        with open(hs_file, "r", encoding="utf-8") as f:
            handshake_rows = list(csv.DictReader(f))

    payload_rows = []
    pl_file = RESULTS_DIR / "payload_results.csv"
    if pl_file.exists():
        with open(pl_file, "r", encoding="utf-8") as f:
            payload_rows = list(csv.DictReader(f))

    primitive_rows = []
    pm_file = RESULTS_DIR / "primitive_breakdown.csv"
    if pm_file.exists():
        with open(pm_file, "r", encoding="utf-8") as f:
            primitive_rows = list(csv.DictReader(f))

    platform_d_rows = []
    pd_file = RESULTS_DIR / "platform_D_results.csv"
    if pd_file.exists():
        with open(pd_file, "r", encoding="utf-8") as f:
            platform_d_rows = list(csv.DictReader(f))

    return {
        "handshakes": handshake_rows,
        "payloads": payload_rows,
        "primitives": primitive_rows,
        "platform_d": platform_d_rows,
        "figures": [
            {"name": "Handshake Latency", "url": "/api/channel/results/download/figures/handshake_latency_comparison.png"},
            {"name": "Wire Bytes Breakdown", "url": "/api/channel/results/download/figures/wire_bytes_breakdown.png"},
            {"name": "Payload Throughput", "url": "/api/channel/results/download/figures/payload_throughput.png"},
            {"name": "Primitive Microbenchmarks", "url": "/api/channel/results/download/figures/primitive_microbenchmarks.png"},
            {"name": "Platform D WAN Latency", "url": "/api/channel/results/download/figures/platform_D_comparison.png"},
        ],
    }


@router.post("/benchmark/run")
async def run_benchmark_endpoint(req: BenchmarkRunRequest):
    """Trigger execution of benchmark trials in background."""
    job_id = ChannelService.start_benchmark_job(
        suite_param=req.suite,
        trials=req.trials,
        mode_param=req.mode,
    )
    return {
        "job_id": job_id,
        "status": "queued",
        "message": f"Benchmark job queued under run {job_id} ({req.trials} trials, suite: {req.suite})",
    }


@router.get("/jobs/{job_id}", response_model=BackgroundJobStatus)
async def get_job_status_endpoint(job_id: str) -> BackgroundJobStatus:
    """Poll progress and outcome of background jobs."""
    job = ChannelService.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Background job '{job_id}' not found")
    return job


@router.get("/platform/info", response_model=PlatformInfoResponse)
async def get_platform_info_endpoint() -> PlatformInfoResponse:
    """Retrieve Platform A host telemetry, Platform B execution logs, and Platform D parameters."""
    return ChannelService.get_platform_info()


@router.get("/trust/info", response_model=TrustInfoResponse)
async def get_trust_info_endpoint() -> TrustInfoResponse:
    """Retrieve pinned trust store identity fingerprints, cipher suites, and transcript binding formula."""
    return ChannelService.get_trust_info()


@router.get("/results/files", response_model=List[ResultFileItem])
async def list_result_files_endpoint() -> List[ResultFileItem]:
    """Enumerate all real benchmark CSVs, JSON manifests, and figure assets."""
    return ChannelService.get_results_files()


@router.get("/results/download/{file_path:path}")
async def download_result_file(file_path: str):
    """Download a real result file (CSV, PNG, JSON, etc.) from the results directory."""
    clean_path = Path(file_path).name
    # Handle optional figures/ prefix
    if file_path.startswith("figures/") or file_path.startswith("figures\\"):
        full_path = RESULTS_DIR / "figures" / clean_path
    else:
        full_path = RESULTS_DIR / clean_path

    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail=f"File '{file_path}' not found in results directory")

    media_type = "image/png" if full_path.suffix == ".png" else "text/csv" if full_path.suffix == ".csv" else "application/octet-stream"
    return FileResponse(
        path=str(full_path),
        filename=full_path.name,
        media_type=media_type,
    )


@router.get("/report/text")
async def get_report_text():
    """Retrieve full markdown text of report.md for the embedded viewer."""
    rep_path = REPO_ROOT / "report.md"
    if not rep_path.exists():
        raise HTTPException(status_code=404, detail="report.md not found")
    return {"content": rep_path.read_text(encoding="utf-8")}


@router.get("/results/bundle")
async def download_results_bundle():
    """Download entire results directory as a zip bundle."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(RESULTS_DIR):
            for file in files:
                p = Path(root) / file
                rel = p.relative_to(RESULTS_DIR)
                zf.write(p, arcname=f"results/{rel}")
    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=qff26_p1_results_bundle.zip"},
    )


@router.get("/submission/verify", response_model=SubmissionVerificationResponse)
async def verify_submission_endpoint() -> SubmissionVerificationResponse:
    """Re-check every submission artifact against manifest.json and SHA256SUMS."""
    return ChannelService.verify_submission()

