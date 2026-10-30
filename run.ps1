<#
==============================================================================
 Q-SHIELD-PQC: Unified Application Launcher (Phase 1 + Phase 2)
==============================================================================
 Launches the unified full-stack environment from the repository root:
  - FastAPI Backend (Port 8000) serving Phase 1 hybrid exchange, quantum benchmarks,
    and Phase 2 Quantum-Safe Secure Communication Channel (Root-integrated Phase 2 Channel)
  - Vite Frontend (Port 5173) serving unified navigation for Phase 1 and Phase 2
==============================================================================
#>

param (
    [switch]$NoBrowser,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Usage: .\run.ps1 [-NoBrowser] [-Help]

Options:
  -NoBrowser   Do not automatically open the default web browser.
  -Help        Display this help message.
"@
    exit 0
}

$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
Set-Location $repoRoot

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  Q-SHIELD-PQC: Unified Full-Stack Environment Launcher" -ForegroundColor Cyan
Write-Host "  SRM University-AP · Qiskit Fall Fest 2026 (Track 5: PS-P1)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " Root Directory: $repoRoot" -ForegroundColor Gray

# ------------------------------------------------------------------------------
# 1. Dependency & Prerequisite Verification
# ------------------------------------------------------------------------------
Write-Host "`n[*] Verifying system prerequisites..." -ForegroundColor Yellow

# Verify Python
try {
    $pythonVersion = & python --version 2>&1
    Write-Host "  [OK] Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Python is not found in PATH. Please install Python 3.10+." -ForegroundColor Red
    exit 1
}

# Verify Node.js & npm
try {
    $nodeVersion = & node --version 2>&1
    $npmVersion = & npm --version 2>&1
    Write-Host "  [OK] Node.js: $nodeVersion | npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Node.js or npm is not found in PATH. Please install Node.js 18+." -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------------------------
# 2. Port Conflict Checks (8000 and 5173)
# ------------------------------------------------------------------------------
Write-Host "`n[*] Checking port availability..." -ForegroundColor Yellow

function Get-PortProcessId($port) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) { return $conn.OwningProcess }
    } catch {}
    return $null
}

$backendPid = Get-PortProcessId 8000
if ($backendPid) {
    Write-Host "  [!] Port 8000 is already in use by PID $backendPid." -ForegroundColor DarkYellow
    Write-Host "      Reusing existing Backend service or terminate PID $backendPid if necessary." -ForegroundColor Gray
} else {
    Write-Host "  [OK] Port 8000 is free (Backend API)." -ForegroundColor Green
}

$frontendPid = Get-PortProcessId 5173
if ($frontendPid) {
    Write-Host "  [!] Port 5173 is already in use by PID $frontendPid." -ForegroundColor DarkYellow
    Write-Host "      Reusing existing Frontend server or terminate PID $frontendPid if necessary." -ForegroundColor Gray
} else {
    Write-Host "  [OK] Port 5173 is free (Frontend UI)." -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 3. Start Backend Server (if not already running)
# ------------------------------------------------------------------------------
$backendProcess = $null
if (-not $backendPid) {
    Write-Host "`n[*] Starting unified FastAPI backend on http://127.0.0.1:8000..." -ForegroundColor Yellow
    
    # Configure environment with both phase1 and root in PYTHONPATH
    $env:PYTHONPATH = "$repoRoot\phase1;$repoRoot"
    
    $backendPsi = New-Object System.Diagnostics.ProcessStartInfo
    $backendPsi.FileName = "python"
    $backendPsi.Arguments = "-m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"
    $backendPsi.WorkingDirectory = "$repoRoot\phase1"
    $backendPsi.UseShellExecute = $true
    $backendPsi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal
    
    $backendProcess = [System.Diagnostics.Process]::Start($backendPsi)
    Write-Host "  [+] Spawned Backend process (PID: $($backendProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "  [*] Using existing Backend process (PID: $backendPid)" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 4. Wait for Backend Readiness (Polling /api/health)
# ------------------------------------------------------------------------------
Write-Host "[*] Waiting for Backend to respond..." -ForegroundColor Yellow
$backendReady = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Milliseconds 1000
    try {
        $res = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($res.status -eq "healthy") {
            $backendReady = $true
            break
        }
    } catch {}
}

if ($backendReady) {
    Write-Host "  [OK] Backend health check passed: http://127.0.0.1:8000/api/health" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Backend health check timed out. Server may still be starting." -ForegroundColor DarkYellow
}

# ------------------------------------------------------------------------------
# 5. Start Frontend Dev Server (if not already running)
# ------------------------------------------------------------------------------
$frontendProcess = $null
if (-not $frontendPid) {
    Write-Host "`n[*] Starting unified Vite frontend on http://localhost:5173..." -ForegroundColor Yellow
    
    $frontendPsi = New-Object System.Diagnostics.ProcessStartInfo
    $frontendPsi.FileName = "cmd.exe"
    $frontendPsi.Arguments = "/c npm run dev"
    $frontendPsi.WorkingDirectory = "$repoRoot\phase1\frontend"
    $frontendPsi.UseShellExecute = $true
    $frontendPsi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal
    
    $frontendProcess = [System.Diagnostics.Process]::Start($frontendPsi)
    Write-Host "  [+] Spawned Frontend process (PID: $($frontendProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "  [*] Using existing Frontend process (PID: $frontendPid)" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 6. Wait for Frontend Readiness
# ------------------------------------------------------------------------------
Write-Host "[*] Waiting for Frontend to respond..." -ForegroundColor Yellow
$frontendReady = $false
for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Milliseconds 1000
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($res.StatusCode -eq 200) {
            $frontendReady = $true
            break
        }
    } catch {}
}

if ($frontendReady) {
    Write-Host "  [OK] Frontend UI is reachable: http://localhost:5173" -ForegroundColor Green
} else {
    Write-Host "  [INFO] Frontend starting up on http://localhost:5173." -ForegroundColor Gray
}

# ------------------------------------------------------------------------------
# 7. Navigation & Access Directory
# ------------------------------------------------------------------------------
Write-Host "`n==================================================================" -ForegroundColor Green
Write-Host "  Q-SHIELD-PQC ENVIRONMENT IS RUNNING" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  [PHASE 2 - QUANTUM-SAFE SECURE CHANNEL (PS-P1)]" -ForegroundColor Cyan
Write-Host "   * Security Suite & Attack Lab (T1-T9): http://localhost:5173/channel/security" -ForegroundColor White
Write-Host "   * Live Handshake & Solution Design:   http://localhost:5173/channel/handshake" -ForegroundColor White
Write-Host "   * Performance Evaluation & Benchmarks:http://localhost:5173/channel/performance" -ForegroundColor White
Write-Host "   * Platform Telemetry (A, B, D):       http://localhost:5173/channel/platforms" -ForegroundColor White
Write-Host "   * Technical Analysis & Recommendations:http://localhost:5173/channel/analysis" -ForegroundColor White
Write-Host "   * Reproducibility & Submission Bundle: http://localhost:5173/channel/reproducibility" -ForegroundColor White
Write-Host ""
Write-Host "  [PHASE 1 - QUANTUM ARCHITECTURE & HYBRID PQC]" -ForegroundColor Cyan
Write-Host "   * Research Dashboard & Hybrid Lab:    http://localhost:5173/" -ForegroundColor White
Write-Host "   * Processor & Quantum Circuit Sim:    http://localhost:5173/ (under Processor Benchmark)" -ForegroundColor White
Write-Host ""
Write-Host "  [API DOCUMENTATION & BACKEND METRICS]" -ForegroundColor Cyan
Write-Host "   * Interactive OpenAPI (Swagger Docs): http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "   * Backend Health Endpoint:            http://127.0.0.1:8000/api/health" -ForegroundColor White
Write-Host "   * Secure Channel Status:              http://127.0.0.1:8000/api/channel/status" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Green

if (-not $NoBrowser) {
    try {
        Start-Process "http://localhost:5173"
    } catch {}
}

Write-Host "`nPress Ctrl+C in this terminal to stop all running services.`n" -ForegroundColor Yellow

# ------------------------------------------------------------------------------
# 8. Service Lifecycle Loop & Clean Shutdown
# ------------------------------------------------------------------------------
try {
    while ($true) {
        # Check if spawned backend crashed
        if ($backendProcess -and $backendProcess.HasExited) {
            Write-Host "`n[!] Backend process exited with code $($backendProcess.ExitCode)." -ForegroundColor Red
            break
        }
        # Check if spawned frontend crashed
        if ($frontendProcess -and $frontendProcess.HasExited) {
            Write-Host "`n[!] Frontend process exited with code $($frontendProcess.ExitCode)." -ForegroundColor Red
            break
        }
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host "`n[*] Shutting down services..." -ForegroundColor Yellow
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Write-Host "  [-] Stopping Backend process (PID: $($backendProcess.Id))..." -ForegroundColor Gray
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Write-Host "  [-] Stopping Frontend process (PID: $($frontendProcess.Id))..." -ForegroundColor Gray
        # Kill cmd and node children
        try {
            & taskkill /PID $frontendProcess.Id /T /F 2>$null
        } catch {
            Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "[+] All services stopped cleanly." -ForegroundColor Green
}

