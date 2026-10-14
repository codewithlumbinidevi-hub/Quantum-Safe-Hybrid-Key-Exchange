# ==============================================================================
# Q-SHIELD-PQC: Run Cryptographic Benchmark from PowerShell CLI
# ==============================================================================
param (
    [int]$Iterations = 100,
    [string]$Profile = "platform_a", # "platform_a" (standard) or "platform_b" (constrained)
    [int]$Warmup = 5
)

$scriptPath = Join-Path $PSScriptRoot "run_crypto_benchmark.py"
python $scriptPath --iterations $Iterations --profile $Profile --warmup $Warmup
