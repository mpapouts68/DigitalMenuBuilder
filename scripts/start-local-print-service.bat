@echo off
cd /d "%~dp0.."

where node >nul 2>&1
if errorlevel 1 (
  echo node not found in PATH.
  exit /b 1
)

if not exist "scripts\local-printer-bridge.mjs" (
  echo Missing scripts\local-printer-bridge.mjs
  exit /b 1
)

rem Optional port as first argument (default 17354 is set inside the bridge)
if not "%~1"=="" set "LOCAL_PRINTER_BRIDGE_PORT=%~1"

echo Starting local printer bridge (Ctrl+C to stop)...
node scripts\local-printer-bridge.mjs
