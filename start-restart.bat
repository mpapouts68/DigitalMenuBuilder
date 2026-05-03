@echo off
setlocal EnableExtensions

REM Run from this script's directory (project root).
cd /d "%~dp0"

if not exist "package.json" (
  echo [ERROR] package.json not found in:
  echo         %CD%
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not installed or not in PATH.
  exit /b 1
)

set "MODE=%~1"
set "SCRIPT=dev"

if /I "%MODE%"=="prod" set "SCRIPT=start"
if /I "%MODE%"=="production" set "SCRIPT=start"
if /I "%MODE%"=="dev" set "SCRIPT=dev"
if /I "%MODE%"=="development" set "SCRIPT=dev"

if /I "%SCRIPT%"=="start" (
  echo [INFO] Production mode selected - building before each start.
) else (
  echo [INFO] Development mode selected.
)

echo [INFO] Press Ctrl+C in this window to stop restart loop.
echo.

:loop
echo [%DATE% %TIME%] Ensuring port 5000 is free...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5000 .*LISTENING"') do (
  if not "%%P"=="0" (
    echo [%DATE% %TIME%] Killing process PID %%P on port 5000
    taskkill /PID %%P /F >nul 2>nul
  )
)

if /I "%SCRIPT%"=="start" (
  echo [%DATE% %TIME%] Running: npm run build
  call npm run build
  if errorlevel 1 (
    echo [%DATE% %TIME%] Build failed. Retrying in 5 seconds...
    timeout /t 5 /nobreak >nul
    goto loop
  )
)

echo [%DATE% %TIME%] Running: npm run %SCRIPT%
call npm run %SCRIPT%
set "EXIT_CODE=%ERRORLEVEL%"
echo [%DATE% %TIME%] Process exited with code %EXIT_CODE%. Restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
