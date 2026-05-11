param(
  [switch]$FreshData,
  [switch]$FollowLogs,
  [int]$HealthTimeoutSeconds = 90
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-EnvValue {
  param(
    [string]$FilePath,
    [string]$Key
  )

  if (-not (Test-Path $FilePath)) {
    return $null
  }

  $line = Get-Content $FilePath | Where-Object { $_ -match "^\s*$Key\s*=" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  $value = ($line -replace "^\s*$Key\s*=\s*", "").Trim()
  if ($value.StartsWith('"') -and $value.EndsWith('"')) {
    $value = $value.Trim('"')
  }
  return $value
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

if (-not (Test-Path ".env")) {
  Write-Host "[setup] .env not found. Creating from .env.example"
  Copy-Item ".env.example" ".env"
}

$hostPort = Get-EnvValue -FilePath ".env" -Key "HOST_PORT"
if (-not $hostPort) {
  $hostPort = "5000"
}

Write-Host "[step] Stopping existing containers..."
if ($FreshData) {
  & docker compose --env-file .env down --remove-orphans --volumes
} else {
  & docker compose --env-file .env down --remove-orphans
}
if ($LASTEXITCODE -ne 0) {
  throw "docker compose down failed."
}

Write-Host "[step] Rebuilding and starting containers..."
& docker compose --env-file .env up -d --build
if ($LASTEXITCODE -ne 0) {
  throw "docker compose up failed."
}

Write-Host "[step] Waiting for /health (http://localhost:$hostPort/health)..."
$deadline = (Get-Date).AddSeconds($HealthTimeoutSeconds)
$healthy = $false

while ((Get-Date) -lt $deadline) {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:$hostPort/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
      $healthy = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

Write-Host "[step] Recent app logs:"
& docker compose --env-file .env logs app --tail 120
if ($LASTEXITCODE -ne 0) {
  throw "docker compose logs failed."
}

if (-not $healthy) {
  throw "Health endpoint did not become ready within $HealthTimeoutSeconds seconds."
}

$recentLogs = (& docker compose --env-file .env logs app --tail 200) -join "`n"
if ($recentLogs -match "Database initialization failed" -or $recentLogs -match "Failed to run the query") {
  throw "Migration/startup failure detected in logs."
}

Write-Host "[ok] Rebuild + restart + migration check completed successfully."

if ($FollowLogs) {
  Write-Host "[step] Following logs (Ctrl+C to stop)..."
  & docker compose --env-file .env logs -f app
}
