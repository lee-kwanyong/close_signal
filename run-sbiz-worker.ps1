param(
    [int]$SleepSeconds = 2,
    [string]$ProjectDir = "C:\work\close_signal"
)

$ErrorActionPreference = "Continue"

Set-Location $ProjectDir

Write-Host ""
Write-Host "=========================================="
Write-Host " Close Signal SBIZ Worker Started"
Write-Host " ProjectDir   : $ProjectDir"
Write-Host " SleepSeconds : $SleepSeconds"
Write-Host " Stop         : Ctrl + C"
Write-Host "=========================================="
Write-Host ""

while ($true) {
    $startedAt = Get-Date
    Write-Host ""
    Write-Host ("[run:start] " + $startedAt.ToString("yyyy-MM-dd HH:mm:ss"))

    try {
        npx tsx .\scripts\sbiz-ingest.ts --mode run
        $exitCode = $LASTEXITCODE

        if ($exitCode -eq 0) {
            Write-Host ("[run:done]  " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss") + " exitCode=0")
        }
        else {
            Write-Host ("[run:error] " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss") + " exitCode=" + $exitCode)
        }
    }
    catch {
        Write-Host ("[run:exception] " + $_.Exception.Message)
    }

    Write-Host ("[sleep] " + $SleepSeconds + " seconds")
    Start-Sleep -Seconds $SleepSeconds
}
