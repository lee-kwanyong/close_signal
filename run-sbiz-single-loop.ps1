param(
    [string]$ProjectPath = "C:\work\close_signal",
    [int]$ResetStaleEveryMinutes = 10,
    [int]$RestartDelaySeconds = 5
)

$ErrorActionPreference = "Continue"

$lastReset = Get-Date

while ($true) {
    try {
        Set-Location $ProjectPath

        $now = Get-Date
        $elapsedMinutes = ($now - $lastReset).TotalMinutes

        if ($elapsedMinutes -ge $ResetStaleEveryMinutes) {
            Write-Host ""
            Write-Host "==================================================" -ForegroundColor Yellow
            Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') reset-stale start" -ForegroundColor Yellow
            Write-Host "==================================================" -ForegroundColor Yellow

            & npx tsx .\scripts\sbiz-ingest.ts --mode reset-stale

            $lastReset = Get-Date
        }

        Write-Host ""
        Write-Host "==================================================" -ForegroundColor Cyan
        Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') worker run start" -ForegroundColor Cyan
        Write-Host "==================================================" -ForegroundColor Cyan

        & npx tsx .\scripts\sbiz-ingest.ts --mode run

        Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') worker exited, restart after $RestartDelaySeconds sec" -ForegroundColor DarkYellow
    }
    catch {
        Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') worker error: $($_.Exception.Message)" -ForegroundColor Red
    }

    Start-Sleep -Seconds $RestartDelaySeconds
}