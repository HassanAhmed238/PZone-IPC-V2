@echo off
echo ========================================
echo   PZone Control System - Build
echo ========================================
echo.
cd /d "%~dp0"
call npm run build
echo.
echo Build complete!
pause
