@echo off
title PZone IPC V2
echo.
echo   ╔══════════════════════════════════════════╗
echo   ║      PZone IPC V2 - Starting...          ║
echo   ║      Internet connection required         ║
echo   ╚══════════════════════════════════════════╝
echo.
"%~dp0node.exe" "%~dp0server.cjs"
pause
