@echo off
setlocal enabledelayedexpansion

echo ====================================================================
echo   THREADFORGE v2: Concurrency & Race Condition Laboratory Launcher
echo ====================================================================

cd /d "%~dp0"

REM 1. Check or create virtual environment
if not exist ".venv\Scripts\python.exe" (
    echo [*] Initializing virtual environment in .venv...
    python -m venv .venv
    if errorlevel 1 (
        echo [-] Error: Python was not found on PATH. Please ensure Python 3.11+ is installed.
        pause
        exit /b 1
    )
)

REM 2. Install backend dependencies if needed
echo [*] Checking backend dependencies...
.venv\Scripts\python.exe -c "import fastapi, uvicorn, pydantic" 2>nul
if errorlevel 1 (
    echo [*] Installing backend packages...
    .venv\Scripts\python.exe -m pip install -r backend\requirements.txt
)

REM 3. Install frontend dependencies & build if dist is missing
if not exist "frontend\dist\index.html" (
    echo [*] Building frontend single-port production bundle...
    cd frontend
    if not exist "node_modules" (
        call npm install
    )
    call npm run build
    cd ..
)

REM 4. Open default browser to localhost:8000
echo [*] Opening browser to http://localhost:8000...
start http://localhost:8000

REM 5. Start unified single-port server
echo [*] Starting ThreadForge Production Server at http://localhost:8000...
echo [!] Press Ctrl+C to terminate the laboratory server.
echo ====================================================================

.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

pause
