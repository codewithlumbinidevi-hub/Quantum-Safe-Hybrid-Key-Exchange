# ==============================================================================
# Q-SHIELD-PQC: Development Server Launcher (Backend + Frontend)
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " Launching Q-SHIELD-PQC Full-Stack Development Servers" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$root = $PSScriptRoot | Split-Path
$env:PYTHONPATH = "$root;$root\.."

Write-Host "`n[*] Starting FastAPI Backend at http://localhost:8000..." -ForegroundColor Yellow
$backendJob = Start-Process -FilePath "python" -ArgumentList "-m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload" -WorkingDirectory $root -PassThru

Write-Host "[*] Starting Vite Frontend at http://localhost:5173..." -ForegroundColor Yellow
$frontendJob = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd frontend && npm run dev" -WorkingDirectory $root -PassThru

Write-Host "`n[+] Both servers started!" -ForegroundColor Green
Write-Host "  Backend API:  http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/docs)" -ForegroundColor Cyan
Write-Host "  Frontend App: http://localhost:5173" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C or close this terminal to stop the servers." -ForegroundColor Yellow

# Wait for exit
try {
    while ($true) {
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host "`n[*] Stopping servers..." -ForegroundColor Yellow
    Stop-Process -Id $backendJob.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendJob.Id -ErrorAction SilentlyContinue
    Write-Host "[+] Stopped." -ForegroundColor Green
}
