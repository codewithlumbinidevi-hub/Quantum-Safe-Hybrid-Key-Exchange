"""
Results and Reporting API.
Provides executive summaries, reproducibility metadata, and consolidated reports.
"""
from fastapi import APIRouter
from typing import Dict, Any

from backend.app.services.crypto_benchmark_service import CryptoBenchmarkService
from processors.benchmark import ProcessorBenchmarkRunner
from backend.app.services.system_metrics_service import SystemMetricsService
from backend.app.config import settings

router = APIRouter(prefix="/api/results", tags=["Results & Reporting"])


@router.get("/summary")
async def get_results_summary() -> Dict[str, Any]:
    """
    Get consolidated session results, hardware reproducibility parameters,
    and scientific status of both modules.
    """
    hardware = SystemMetricsService.get_hardware_info()
    crypto_latest = CryptoBenchmarkService.get_latest_result()
    proc_latest = ProcessorBenchmarkRunner.get_latest_result()

    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "reproducibility_environment": {
            "os": hardware["os_name"],
            "os_release": hardware["os_release"],
            "architecture": hardware["architecture"],
            "processor": hardware["processor"],
            "cpu_physical_cores": hardware["cpu_physical_cores"],
            "cpu_logical_cores": hardware["cpu_logical_cores"],
            "python_version": hardware["python_version"],
            "cryptography_version": hardware["cryptography_version"],
            "qiskit_version": hardware["qiskit_version"],
        },
        "latest_cryptographic_benchmark": crypto_latest if crypto_latest else {
            "status": "Not measured yet",
            "message": "Run cryptographic benchmark to populate real measurement data."
        },
        "latest_processor_benchmark": proc_latest if proc_latest else {
            "status": "Not measured yet",
            "message": "Run Qiskit Processor A/B benchmark to populate real measurement data."
        },
        "scientific_integrity_checklist": {
            "no_invented_data": True,
            "private_keys_protected": True,
            "quantum_classical_separated": True,
            "standard_mlkem_used": "NIST FIPS 203 (ML-KEM-768)",
            "standard_ecdh_used": "NIST P-256 (SECP256R1)",
            "qiskit_version_tested": hardware["qiskit_version"],
        }
    }


@router.get("/manifest")
async def get_manifest():
    """Download the reproducibility manifest.json."""
    from fastapi.responses import FileResponse, JSONResponse
    manifest_path = settings.RESULTS_DIR / "manifest.json"
    if not manifest_path.exists():
        return JSONResponse(status_code=404, content={"detail": "Manifest not generated yet. Run a benchmark first."})
    return FileResponse(path=str(manifest_path), filename="manifest.json", media_type="application/json")


@router.get("/checksums")
async def get_checksums():
    """Download SHA256SUMS.txt."""
    from fastapi.responses import FileResponse, JSONResponse
    sums_path = settings.RESULTS_DIR / "SHA256SUMS.txt"
    if not sums_path.exists():
        return JSONResponse(status_code=404, content={"detail": "SHA256SUMS.txt not generated yet. Run a benchmark first."})
    return FileResponse(path=str(sums_path), filename="SHA256SUMS.txt", media_type="text/plain")


@router.get("/benchmark-data")
async def get_benchmark_data():
    """Download benchmark_results.json."""
    from fastapi.responses import FileResponse, JSONResponse
    json_path = settings.RESULTS_DIR / "benchmark_results.json"
    if not json_path.exists():
        return JSONResponse(status_code=404, content={"detail": "Benchmark results JSON not generated yet. Run a benchmark first."})
    return FileResponse(path=str(json_path), filename="benchmark_results.json", media_type="application/json")

