"""
Pydantic schemas for Quantum Processor Architecture Benchmark API endpoints.
"""
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class ProcessorBenchmarkRequest(BaseModel):
    circuit_id: str = Field(default="qft_5", description="Benchmark circuit ID: 'qft_5', 'ghz_5', or 'cross_conn_5'")
    shots: int = Field(default=4096, ge=100, le=100000, description="Measurement shots")
    optimization_level: int = Field(default=1, ge=0, le=3, description="Qiskit transpiler optimization level")
    seed: int = Field(default=42, description="Random seed for transpiler and simulation")
    save_csv: bool = Field(default=True, description="Save results to CSV")


class ProcessorData(BaseModel):
    topology: Dict[str, Any]
    metrics: Dict[str, Any]
    hellinger_fidelity: float
    tvd: float
    top_measured_states: Dict[str, int]


class ProcessorComparisonSummary(BaseModel):
    depth_reduction_b_vs_a_percent: float
    cx_reduction_b_vs_a_percent: float
    swap_overhead_diff: float
    fidelity_difference: float


class ProcessorBenchmarkResponse(BaseModel):
    timestamp: str
    circuit: Dict[str, Any]
    transpiler_settings: Dict[str, Any]
    noise_settings: Dict[str, Any]
    processor_a: ProcessorData
    processor_b: ProcessorData
    comparison_summary: ProcessorComparisonSummary
    scientific_disclaimer: str
    csv_file: Optional[str] = None
