@echo off
TITLE ProTrackAI Master Launcher
echo ======================================================
echo           PROTRACK AI - INTELLIGENT PRODUCTIVITY
echo ======================================================
echo.
echo [1/3] Launching Backend Server (Auto-Spawns Agent)...
start "ProTrackAI Backend" cmd /k "cd backend && node server.js"

echo [2/3] Launching Frontend Dashboard...
start "ProTrackAI Frontend" cmd /k "cd frontend && npm run dev"

echo [3/3] Opening ProTrackAI in your Default Browser...
timeout /t 3 /nobreak > NUL
start http://localhost:5173

echo.
echo ======================================================
echo  ALL SYSTEMS GO! 🚀
echo  Minimize these windows, do NOT close them.
echo ======================================================
pause
