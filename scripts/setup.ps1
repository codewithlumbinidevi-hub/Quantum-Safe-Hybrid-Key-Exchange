# ==============================================================================
# Q-SHIELD-PQC: Automated Windows PowerShell Setup Script
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " Q-SHIELD-PQC: Environment Setup & Dependency Verification" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Verify Python
Write-Host "`n[*] Checking Python installation..." -ForegroundColor Yellow
try {
    $pyVersion = python --version
    Write-Host "  [+] Detected: $pyVersion" -ForegroundColor Green
} catch {
    Write-Host "  [-] Python not found in PATH! Please install Python 3.10+." -ForegroundColor Red
    exit 1
}

# 2. Verify Node.js & npm
Write-Host "`n[*] Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "  [+] Detected Node: $nodeVersion | npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  [-] Node.js/npm not found in PATH! Please install Node.js v18+." -ForegroundColor Red
    exit 1
}

# 3. Install Python Dependencies
Write-Host "`n[*] Installing Python backend and Qiskit dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [-] Failed to install Python dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "  [+] Python dependencies installed successfully." -ForegroundColor Green

# 4. Install Frontend Dependencies
Write-Host "`n[*] Installing React frontend dependencies..." -ForegroundColor Yellow
Push-Location frontend
cmd.exe /c "set NODE_TLS_REJECT_UNAUTHORIZED=0&& npm install --no-audit --no-fund"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [-] Failed to install frontend dependencies!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "  [+] Frontend dependencies installed successfully." -ForegroundColor Green

# 5. Execute Test Suite Verification
Write-Host "`n[*] Running automated test suite (pytest)..." -ForegroundColor Yellow
python -m pytest backend/tests processors/tests -v
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n==================================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] Q-SHIELD-PQC setup completed! All tests passed." -ForegroundColor Green
    Write-Host " Run 'powershell -ExecutionPolicy Bypass -File scripts\run_dev.ps1' to launch!" -ForegroundColor Cyan
    Write-Host "==================================================================" -ForegroundColor Green
} else {
    Write-Host "`n[-] Tests failed! Inspect test logs above." -ForegroundColor Red
    exit 1
}
