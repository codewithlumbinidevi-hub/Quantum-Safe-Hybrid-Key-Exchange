"""
Processor Benchmarks API.
Executes Qiskit Processor A vs B architectural comparison and serves results and charts.
"""
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.app.schemas.processor_schemas import ProcessorBenchmarkRequest, ProcessorBenchmarkResponse
from processors.benchmark import ProcessorBenchmarkRunner
from processors.visualization import generate_processor_comparison_figure
from backend.app.config import settings

router = APIRouter(prefix="/api/benchmarks/processors", tags=["Processor Benchmarks"])


@router.post("/run", response_model=ProcessorBenchmarkResponse)
async def run_processor_benchmark(request: ProcessorBenchmarkRequest = ProcessorBenchmarkRequest()):
    """
    Execute Qiskit Phase 1 Architecture Benchmark comparing Processor A (5Q Linear)
    and Processor B (9Q Sparse Heavy-Hex) under identical transpilation and synthetic noise.
    """
    try:
        result = ProcessorBenchmarkRunner.run_ab_benchmark(
            circuit_id=request.circuit_id,
            shots=request.shots,
            optimization_level=request.optimization_level,
            seed=request.seed,
            save_csv=request.save_csv,
        )
        # Generate chart
        generate_processor_comparison_figure(result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processor benchmark execution error: {str(e)}")


@router.get("/latest", response_model=ProcessorBenchmarkResponse)
async def get_latest_processor_benchmark():
    """Retrieve results of the most recent quantum architecture benchmark run."""
    latest = ProcessorBenchmarkRunner.get_latest_result()
    if latest is None:
        raise HTTPException(status_code=404, detail="No processor benchmark has been executed yet in this session.")
    return latest


@router.get("/export")
async def export_processor_csv():
    """Download processor benchmark comparison CSV file."""
    file_path = settings.PROCESSORS_RESULTS_DIR / "processor_ab_results.csv"
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Processor benchmark CSV does not exist. Run the processor benchmark first."
        )
    return FileResponse(
        path=str(file_path),
        filename="processor_ab_results.csv",
        media_type="text/csv",
    )


@router.get("/chart")
async def get_processor_chart():
    """Download or view the generated architectural comparison figure (PNG)."""
    file_path = settings.FIGURES_DIR / "processor_ab_comparison.png"
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Comparison chart does not exist. Run the processor benchmark first."
        )
    return FileResponse(
        path=str(file_path),
        media_type="image/png",
        filename="processor_ab_comparison.png",
    )
