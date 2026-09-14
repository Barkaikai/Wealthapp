# WealthForge: migrate off PGlite to real Postgres — cleanup + reinstall script.
# Run this yourself in PowerShell (one time). Takes ~3-5 minutes.
#
#   powershell -ExecutionPolicy Bypass -File fix-wealthforge.ps1
#
# What it does:
#   1. Stops the WealthForge node server (leaves PostgreSQL service alone — it must stay running)
#   2. Renames node_modules aside (OneDrive corrupted placeholder files inside it) and reinstalls clean
#   3. Removes the broken drizzle-kit/brocli temp copies
#   4. Pushes the schema to the wealth_automation Postgres DB
#   5. Rebuilds dist/ and starts the server on Postgres
#   6. Health-checks /api/tasks

$ErrorActionPreference = "Continue"
$wf = "C:\Users\Barkai Brinson\OneDrive\Desktop\WealthForge"
Set-Location $wf

Write-Host "== 1. Stop WealthForge server (node), keep PostgreSQL service =="
Get-Process node -ErrorAction SilentlyContinue | Where-Object {
  $_.Path -and ($_.CommandLine -match "dist.index.js")
} | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "== 2. Clean reinstall of node_modules (OneDrive placeholders are corrupt) =="
if (Test-Path node_modules) { Rename-Item node_modules "node_modules.corrupt-$(Get-Date -Format yyyyMMddHHmmss)" }
npm install --no-audit --no-fund 2>&1 | Select-Object -Last 3

Write-Host "== 3. Remove temp fix dirs =="
foreach ($d in @("node_modules\dkfix2", "node_modules\@drizzle-team\brocli_fix")) {
  if (Test-Path $d) { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
}

Write-Host "== 4. Push schema to Postgres =="
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/wealth_automation"
npx drizzle-kit push --force 2>&1 | Select-Object -Last 4

Write-Host "== 5. Rebuild and start =="
npm run build 2>&1 | Select-Object -Last 3
Start-Process -FilePath "cmd.exe" -ArgumentList "/c _start_wf.bat" -WorkingDirectory $wf -WindowStyle Hidden

Write-Host "== 6. Health check (waits up to 90s) =="
$ok = $false
foreach ($i in 1..18) {
  Start-Sleep -Seconds 5
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:5000/api/tasks" -UseBasicParsing -TimeoutSec 5
    if ($r.StatusCode -eq 200) { Write-Host "HEALTHY: /api/tasks -> 200"; $ok = $true; break }
  } catch {}
}
if (-not $ok) { Write-Host "STILL DOWN — check wf_server.log" }

Write-Host "DONE. Old modules kept as node_modules.corrupt-* if you want to diff; delete when confident."
