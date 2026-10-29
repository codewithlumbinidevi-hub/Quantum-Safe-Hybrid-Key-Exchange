Write-Host "[*] Detected execution inside P1_secure_channel." -ForegroundColor Cyan
Write-Host "[*] Delegating to root-level unified launcher..." -ForegroundColor Cyan
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
& "$repoRoot\run.ps1" @args

