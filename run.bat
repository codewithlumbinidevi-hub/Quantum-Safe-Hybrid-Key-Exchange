@echo off
title Q-SHIELD-PQC Root Launcher
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo ==================================================================
echo   Q-SHIELD-PQC: Unified Full-Stack Environment Launcher
echo   SRM University-AP · Qiskit Fall Fest 2026 (Track 5: PS-P1)
echo ==================================================================
echo  Root Directory: %~dp0
echo.

where powershell >nul 2>&1
if %ERRORLEVEL% equ 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*
    goto :eof
)

echo [!] PowerShell not detected. Running fallback batch launcher...
set PYTHONPATH=%~dp0phase1;%~dp0

echo [*] Starting FastAPI Backend on http://127.0.0.1:8000...
start "Q-SHIELD-PQC Backend" /d "%~dp0phase1" cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [*] Starting Vite Frontend on http://localhost:5173...
start "Q-SHIELD-PQC Frontend" /d "%~dp0phase1\frontend" cmd /k "npm run dev"

echo.
echo [+] Backend and Frontend started!
echo     - Unified Frontend: http://localhost:5173
echo     - Phase 2 Modules:  http://localhost:5173/channel/handshake
echo     - Backend API Docs: http://127.0.0.1:8000/docs
echo.
pause
