@echo off
cd /d "%~dp0.."

where node >nul 2>&1
if errorlevel 1 (
  echo node not found in PATH.
  exit /b 1
)

if not exist "scripts\local-printer-worker.mjs" (
  echo Missing scripts\local-printer-worker.mjs
  exit /b 1
)

if not defined PRINTER_BASE_URL set "PRINTER_BASE_URL=http://www.shishapoint.site"
if not defined PRINTER_USERNAME set "PRINTER_USERNAME=printer"
if not defined PRINTER_PASSWORD set "PRINTER_PASSWORD=printer123"

echo Starting local printer worker for %PRINTER_BASE_URL% as %PRINTER_USERNAME%...
node scripts\local-printer-worker.mjs %*
