$ErrorActionPreference = 'Stop'

$runtimeDir = Join-Path $PSScriptRoot '.runtime'

function Write-Step([string]$Message) {
  Write-Host "==> $Message" -ForegroundColor Yellow
}

function Stop-FromPidFile([string]$Name) {
  $pidFile = Join-Path $runtimeDir "$Name.pid"
  if (-not (Test-Path -LiteralPath $pidFile)) { return }

  $pidValue = (Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($pidValue -match '^\d+$') {
    Stop-Process -Id ([int]$pidValue) -Force -ErrorAction SilentlyContinue
  }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

Write-Step 'Stopping tracked demo1 processes'
Stop-FromPidFile 'web-dev'
Stop-FromPidFile 'ngrok'

Write-Step 'Stopping any process listening on port 5173'
Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

Write-Step 'Stopping ngrok'
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host 'demo1 background processes stopped.' -ForegroundColor Green

