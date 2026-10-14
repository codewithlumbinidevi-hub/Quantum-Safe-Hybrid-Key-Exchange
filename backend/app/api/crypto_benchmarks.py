"""
Cryptographic Benchmarks API.
Executes repeated trials, calculates statistical distributions, and serves CSV downloads.
"""
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from backend.app.schemas.crypto_schemas import CryptoBenchmarkRequest, CryptoBenchmarkResponse
from backend.app.services.crypto_benchmark_service import CryptoBenchmarkService
from backend.app.config import settings

router = APIRouter(prefix="/api/benchmarks/crypto", tags=["Cryptographic Benchmarks"])


@router.post("/run", response_model=CryptoBenchmarkResponse)
async def run_crypto_benchmark(request: CryptoBenchmarkRequest):
    """
    Execute cryptographic benchmark across specified iterations and platform profile.
    """
    try:
        result = CryptoBenchmarkService.run_benchmark(
            iterations=request.iterations,
            platform_profile=request.platform_profile,
            warmup_iterations=request.warmup_iterations,
            save_csv=request.save_csv,
            benchmark_mode=request.benchmark_mode,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cryptographic benchmark error: {str(e)}")


@router.get("/latest", response_model=CryptoBenchmarkResponse)
async def get_latest_crypto_benchmark():
    """Retrieve results of the most recent cryptographic benchmark run in this session."""
    latest = CryptoBenchmarkService.get_latest_result()
    if latest is None:
        raise HTTPException(status_code=404, detail="No cryptographic benchmark has been executed yet in this session.")
    return latest


@router.get("/export")
async def export_crypto_csv(target: str = Query("summary", pattern="^(summary|trials)$")):
    """
    Download benchmark CSV file.
    - 'summary': Summary statistics per operation.
    - 'trials': Individual raw measurement trials.
    """
    filename = "crypto_benchmark_summary.csv" if target == "summary" else "crypto_benchmark_trials.csv"
    file_path = settings.CRYPTO_RESULTS_DIR / filename
    if not file_path.exists():
        file_path = settings.RESULTS_DIR / filename

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"CSV file '{filename}' does not exist. Run the cryptographic benchmark first to generate data."
        )

    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="text/csv",
    )
