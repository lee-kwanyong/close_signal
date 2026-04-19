param(
    [string]$WorkerScriptPath = "C:\work\close_signal\sbiz_tile_worker.ps1",
    [string]$PgHost = "aws-1-ap-south-1.pooler.supabase.com",
    [int]$PgPort = 5432,
    [string]$PgDatabase = "postgres",
    [string]$PgUser = "postgres.qirawfckozrblgpiwqyf",
    [string]$PgPassword = "dlrhksdyd1!!",
    [string]$SourceKey = "sbiz_store",
    [int]$ClaimCount = 3,
    [int]$IntervalSeconds = 10,
    [int]$StatusCheckSeconds = 5
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = New-Object System.Text.UTF8Encoding($false)

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host ("[{0}] [{1}] {2}" -f $timestamp, $Level, $Message)
}

function Invoke-PsqlRaw {
    param(
        [string]$Sql
    )

    $env:PGPASSWORD = $PgPassword
    $env:PGCLIENTENCODING = "UTF8"

    try {
        $arguments = @(
            "-h", $PgHost,
            "-p", $PgPort.ToString(),
            "-U", $PgUser,
            "-d", $PgDatabase,
            "-t",
            "-A",
            "-v", "ON_ERROR_STOP=1",
            "-c", $Sql
        )

        $output = & psql @arguments 2>&1
        $exitCode = $LASTEXITCODE

        if ($exitCode -ne 0) {
            throw (($output | Out-String).Trim())
        }

        return (($output | Out-String).Trim())
    }
    finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        Remove-Item Env:PGCLIENTENCODING -ErrorAction SilentlyContinue
    }
}

function Get-SbizCounts {
    $sql = @"
select coalesce(
  json_build_object(
    'queued',  coalesce(sum(case when status = 'queued' then tile_count else 0 end), 0),
    'retry',   coalesce(sum(case when status = 'retry' then tile_count else 0 end), 0),
    'success', coalesce(sum(case when status = 'success' then tile_count else 0 end), 0)
  )::text,
  '{"queued":0,"retry":0,"success":0}'
)
from public.v_collection_tiles_summary
where source_key = '$SourceKey';
"@

    $jsonText = Invoke-PsqlRaw -Sql $sql

    if ([string]::IsNullOrWhiteSpace($jsonText)) {
        return @{
            queued = 0
            retry = 0
            success = 0
        }
    }

    $obj = $jsonText | ConvertFrom-Json

    return @{
        queued = [int]$obj.queued
        retry = [int]$obj.retry
        success = [int]$obj.success
    }
}

if (-not (Test-Path $WorkerScriptPath)) {
    throw "Worker script not found: $WorkerScriptPath"
}

Write-Log "SBIZ until-done runner started"
Write-Log "WorkerScriptPath=$WorkerScriptPath SourceKey=$SourceKey ClaimCount=$ClaimCount IntervalSeconds=$IntervalSeconds StatusCheckSeconds=$StatusCheckSeconds"

while ($true) {
    $counts = Get-SbizCounts
    Write-Log ("Current counts: queued={0}, retry={1}, success={2}" -f $counts.queued, $counts.retry, $counts.success)

    if (($counts.queued -le 0) -and ($counts.retry -le 0)) {
        Write-Log "queued and retry are both 0. Stopping runner."
        break
    }

    Write-Log "Running worker once"
    powershell -ExecutionPolicy Bypass -File $WorkerScriptPath -RunOnce -ClaimCount $ClaimCount -IntervalSeconds $IntervalSeconds

    Write-Log ("Sleeping {0} seconds before recheck" -f $StatusCheckSeconds)
    Start-Sleep -Seconds $StatusCheckSeconds
}

Write-Log "SBIZ until-done runner finished"