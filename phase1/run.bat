@echo off
title Q-SHIELD-PQC Launcher
echo ==================================================================
echo  Starting Q-SHIELD-PQC Full-Stack Environment
echo ==================================================================
echo.

echo [*] Starting FastAPI Backend on http://127.0.0.1:8000...
start "Q-SHIELD-PQC Backend (FastAPI)" cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [*] Starting Vite Frontend on http://localhost:5173...
cd frontend
start "Q-SHIELD-PQC Frontend (Vite)" cmd /k "npm run dev"
cd ..

echo.
echo [+] Backend and Frontend started in separate windows!
echo     - Frontend Dashboard: http://localhost:5173
echo     - Backend API Docs:   http://127.0.0.1:8000/docs
echo.
echo Press any key to exit this launcher window (servers will continue running).
pause > nul
