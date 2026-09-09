$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$env:USE_PGLITE = '1'
$env:NODE_ENV = 'development'
$env:NODE_OPTIONS = '--expose-gc'
$env:LOCAL_DEV_AUTH = '1'
$env:QUIET_STARTUP = '1'
$env:FAST_STARTUP = '1'
$env:PORT = '5000'

$fastDbDir = Join-Path $env:LOCALAPPDATA 'WealthForge\pglite-fast'
$env:PGLITE_DATA_DIR = $fastDbDir
$env:DATABASE_URL = ''

if (-not (Test-Path $fastDbDir)) {
  New-Item -ItemType Directory -Path $fastDbDir -Force | Out-Null
}

$logDir = Join-Path $env:LOCALAPPDATA 'WealthForge'
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
$outLog = Join-Path $logDir 'launch.out.log'
$errLog = Join-Path $logDir 'launch.err.log'
$distIndex = Join-Path $PSScriptRoot 'dist\index.js'

function Test-Port {
  param([int]$Port = 5000)
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    return $client.ConnectAsync('127.0.0.1', $Port).Wait(1000)
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

if (Test-Port) {
  Start-Process 'http://127.0.0.1:5000'
  exit 0
}

Write-Host 'Starting WealthForge...'
Remove-Item $outLog, $errLog -Force -ErrorAction SilentlyContinue

if (-not (Test-Path $distIndex)) {
  Write-Host 'No production build found. Building once...'
  & npm run build | Out-Null
}

$cmd = Start-Process -PassThru -FilePath 'cmd.exe' -WorkingDirectory $PSScriptRoot -ArgumentList '/c', 'node dist/index.js' -RedirectStandardOutput $outLog -RedirectStandardError $errLog

$deadline = (Get-Date).AddSeconds(75)
while ((Get-Date) -lt $deadline) {
  if (Test-Port) {
    Write-Host 'WealthForge is ready. Opening browser...'
    Start-Process 'http://127.0.0.1:5000'
    exit 0
  }
  if ($cmd.HasExited) {
    break
  }
  Start-Sleep -Seconds 1
}

Write-Host 'WealthForge is still starting. Leave this window open and refresh http://127.0.0.1:5000 in a moment.'
exit 0
