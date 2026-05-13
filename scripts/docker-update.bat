@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0.."

if not exist "docker-compose.yml" (
  echo docker-compose.yml not found.
  exit /b 1
)

set PRUNE=0

:parse
if "%~1"=="" goto rundocker
if /i "%~1"=="--git-pull" (
  if exist .git (
    echo ^>^>^> git pull
    git pull
    if errorlevel 1 exit /b 1
  ) else (
    echo No .git folder, skipping git pull.
  )
  shift
  goto parse
)
if /i "%~1"=="--prune" (
  set PRUNE=1
  shift
  goto parse
)
echo Unknown option: %~1
echo Use: docker-update.bat  [--git-pull]  [--prune]
exit /b 1

:rundocker
where docker >nul 2>&1
if errorlevel 1 (
  echo docker not found in PATH.
  exit /b 1
)

echo ^>^>^> docker compose build --pull
docker compose build --pull
if errorlevel 1 exit /b 1

echo ^>^>^> docker compose up -d --force-recreate
docker compose up -d --force-recreate
if errorlevel 1 exit /b 1

if "!PRUNE!"=="1" (
  echo ^>^>^> docker image prune -f
  docker image prune -f
)

echo ^>^>^> Done. Status:
docker compose ps
