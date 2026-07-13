$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $repoRoot '.dev-pids.json'

function Test-ProcessAlive([int]$processId) {
    if (-not $processId) { return $false }
    return [bool](Get-Process -Id $processId -ErrorAction SilentlyContinue)
}

$backendAlive = $false
$frontendAlive = $false
$savedPids = $null

if (Test-Path $pidFile) {
    $savedPids = Get-Content $pidFile -Raw | ConvertFrom-Json
    $backendAlive = Test-ProcessAlive $savedPids.backend
    $frontendAlive = Test-ProcessAlive $savedPids.frontend
}

if ($backendAlive -or $frontendAlive) {
    Write-Host "A3TAXI is running -- shutting it down..." -ForegroundColor Yellow
    if ($backendAlive) { taskkill /PID $savedPids.backend /T /F | Out-Null }
    if ($frontendAlive) { taskkill /PID $savedPids.frontend /T /F | Out-Null }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Write-Host "A3TAXI is now OFF." -ForegroundColor Green
}
else {
    Write-Host "Starting A3TAXI..." -ForegroundColor Yellow

    $backendProc = Start-Process powershell -WindowStyle Minimized -PassThru -ArgumentList @(
        '-NoExit', '-Command',
        "Set-Location '$repoRoot\backend'; npm run dev"
    )
    $frontendProc = Start-Process powershell -WindowStyle Minimized -PassThru -ArgumentList @(
        '-NoExit', '-Command',
        "Set-Location '$repoRoot\frontend'; npm run dev"
    )

    @{ backend = $backendProc.Id; frontend = $frontendProc.Id } |
        ConvertTo-Json | Set-Content $pidFile

    Write-Host "Waiting for servers to come up..."
    Start-Sleep -Seconds 4
    Start-Process "http://localhost:5173"
    Write-Host "A3TAXI is now ON. Opening http://localhost:5173 in your browser." -ForegroundColor Green
    Write-Host "(Backend and frontend are running in two minimized PowerShell windows -- don't close them by hand, just run this file again to stop.)"
}

Write-Host ""
Write-Host "Press any key to close this window..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
