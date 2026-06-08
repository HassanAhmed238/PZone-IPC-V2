@echo off
title PZone V2 - Water Technology ERP
color 0B
echo.
echo  ============================================
echo       PZone V2 - Starting Application...
echo  ============================================
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo  [*] First run detected - Installing dependencies...
    echo  [*] This may take a few minutes...
    echo.
    call npm install
    echo.
    echo  [OK] Dependencies installed successfully!
    echo.
)

echo  [*] Starting PZone V2 development server...
echo  [*] The browser will open automatically...
echo.

:: Start the dev server and open in browser
start "" cmd /c "npm run dev"

:: Wait for server to start
timeout /t 4 /nobreak >nul

:: Open in default browser
start http://localhost:8081

echo.
echo  ============================================
echo    PZone V2 is running at http://localhost:8081
echo    Close this window to stop the server.
echo  ============================================
echo.
pause
