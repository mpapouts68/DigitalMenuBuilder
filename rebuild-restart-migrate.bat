@echo off
setlocal EnableExtensions

cd /d "%~dp0"
if not exist "scripts\rebuild-restart-migrate.ps1" (
  echo [ERROR] scripts\rebuild-restart-migrate.ps1 not found
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\rebuild-restart-migrate.ps1" %*
set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Script failed with code %EXIT_CODE%
)
exit /b %EXIT_CODE%
