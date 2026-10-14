# ==============================================================================
# Q-SHIELD-PQC: Run Qiskit Processor A/B Benchmark from PowerShell CLI
# ==============================================================================
param (
    [string]$Circuit = "qft_5", # "qft_5", "ghz_5", or "cross_conn_5"
    [int]$Shots = 4096,
    [int]$OptimizationLevel = 1,
    [int]$Seed = 42
)

$scriptPath = Join-Path $PSScriptRoot "run_processor_benchmark.py"
python $scriptPath --circuit $Circuit --shots $Shots --opt $OptimizationLevel --seed $Seed
