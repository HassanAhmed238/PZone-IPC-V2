@echo off
echo ========================================
echo   PZone Control System - Dev Server
echo ========================================
echo.
cd /d "%~dp0"
call npm run dev
pause
