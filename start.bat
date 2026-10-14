@echo off
cd /d "%~dp0"
set EDGE_TTS_ALLOW_NETWORK=1
echo ============================================
echo   Voice Tool start ho raha hai...
echo   Browser 3 second me khud khul jayega.
echo   Server band karne ke liye is window ko band karein.
echo ============================================
start "" cmd /c "timeout /t 3 >nul & start http://127.0.0.1:8000"
".venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000
pause
