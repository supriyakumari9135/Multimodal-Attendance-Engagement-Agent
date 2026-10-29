@echo off
echo ============================================================
echo   MULTIMODAL ATTENDANCE & ENGAGEMENT AGENT (OFFLINE FIRST)
echo ============================================================
echo Launching Backend (port 8000) and Frontend (port 3000)...

cd /d "%~dp0\.."

start "Multimodal Backend (FastAPI)" cmd /k ".\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 3 /nobreak > nul

start "Multimodal Frontend (Next.js)" cmd /k "cd frontend && npm run dev"

echo.
echo Application started!
echo Frontend: http://localhost:3000
echo Backend API & Docs: http://localhost:8000/api/docs
echo ============================================================
pause

