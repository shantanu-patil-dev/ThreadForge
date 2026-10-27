# ThreadForge Automated Setup Script (Windows PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Green
Write-Host " ThreadForge v2 Setup" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# 1. Virtual Environment
if (-not (Test-Path ".venv")) {
    Write-Host "[*] Creating Python virtual environment in .venv..." -ForegroundColor Cyan
    python -m venv .venv
}

# 2. Python Dependencies
Write-Host "[*] Installing Python backend dependencies..." -ForegroundColor Cyan
& .venv\Scripts\python.exe -m pip install --upgrade pip
& .venv\Scripts\python.exe -m pip install -r backend/requirements.txt

# 3. Node Dependencies
Write-Host "[*] Installing root and frontend npm dependencies..." -ForegroundColor Cyan
cmd /c npm install
Set-Location frontend
cmd /c npm install
Set-Location ..

Write-Host "[+] Setup complete! Run 'npm run dev' or 'start.bat'." -ForegroundColor Green
