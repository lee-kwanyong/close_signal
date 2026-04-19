param(
    [string]$PgHost = "aws-1-ap-south-1.pooler.supabase.com",
    [int]$PgPort = 5432,
    [string]$PgDatabase = "postgres",
    [string]$PgUser = "postgres.qirawfckozrblgpiwqyf",
    [string]$PgPassword = "dlrhksdyd1!!",

    [string]$SourceKey = "sbiz_store",
    [int]$ClaimCount = 3,
    [int]$IntervalSeconds = 10,
    [string]$WorkerName = "powershell-sbiz-worker",
    [string]$LogDir = "C:\work\close_signal\logs",

    [string]$SeedExecutable = "powershell",
    [string]$SeedScriptPath = "C:\work\close_signal\crawl-sbiz-rectangle.ps1",
    [string]$EnvPath = "C:\work\close_signal\.env.local",
    [string]$CollectedRootDir = "C:\work\close_signal\collected_raw",
    [int]$MaxPages = 3,

    [switch]$DryRun,
    [switch]$RunOnce
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = New-Object System.Text.UTF8Encoding($false)

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }

    $logFile = Join-Path $LogDir ("sbiz_tile_worker_" + (Get-Date -Format "yyyy-MM-dd") + ".log")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"

    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

function Ensure-Dir {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Escape-SqlText {
    param(
        [AllowNull()]
        [string]$Value
    )

    if ($null -eq $Value) {
        return "NULL"
    }

    return "'" + $Value.Replace("'", "''") + "'"
}

function Invoke-PsqlQuery {
    param(
        [string]$Sql,
        [switch]$Raw
    )

    $env:PGPASSWORD = $PgPassword
    $env:PGCLIENTENCODING = "UTF8"

    try {
        $arguments = @(
            "-h", $PgHost,
            "-p", $PgPort.ToString(),
            "-U", $PgUser,
            "-d", $PgDatabase,
            "-v", "ON_ERROR_STOP=1"
        )

        if ($Raw) {
            $arguments += @("-t", "-A")
        }

        $arguments += @("-c", $Sql)

        $output = & psql @arguments 2>&1
        $exitCode = $LASTEXITCODE

        if ($exitCode -ne 0) {
            throw (($output | Out-String).Trim())
        }

        return $output
    }
    finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        Remove-Item Env:PGCLIENTENCODING -ErrorAction SilentlyContinue
    }
}

function Get-ClaimedTiles {
    $sql = @"
select coalesce(json_agg(t), '[]'::json)::text
from (
  select *
  from public.claim_collection_tiles(
    '$SourceKey',
    $ClaimCount,
    '$WorkerName'
  )
) t;
"@

    $raw = Invoke-PsqlQuery -Sql $sql -Raw
    $jsonText = (($raw | Out-String).Trim())

    if ([string]::IsNullOrWhiteSpace($jsonText)) {
        return @()
    }

    $tiles = $jsonText | ConvertFrom-Json

    if ($null -eq $tiles) {
        return @()
    }

    if ($tiles -isnot [System.Array]) {
        return @($tiles)
    }

    return $tiles
}

function Finish-CollectionTile {
    param(
        [long]$TileId,
        [string]$Status,
        [int]$FetchedCount = 0,
        [int]$IngestedCount = 0,
        [string]$ResultCode = $null,
        [string]$ResultMsg = $null,
        [string]$ErrorMessage = $null
    )

    $sql = @"
select public.finish_collection_tile(
  $TileId,
  $(Escape-SqlText $Status),
  $FetchedCount,
  $IngestedCount,
  $(Escape-SqlText $ResultCode),
  $(Escape-SqlText $ResultMsg),
  $(Escape-SqlText $ErrorMessage)
);
"@

    [void](Invoke-PsqlQuery -Sql $sql)
}

function Get-TileOutputDir {
    param(
        [pscustomobject]$Tile
    )

    $tileDir = Join-Path $CollectedRootDir ("tile_" + [string]$Tile.tile_id)
    Ensure-Dir -Path $tileDir
    return $tileDir
}

function Get-LatestJsonlPath {
    param(
        [string]$TileOutputDir
    )

    if (-not (Test-Path $TileOutputDir)) {
        return $null
    }

    $dirs = Get-ChildItem -Path $TileOutputDir -Directory | Sort-Object LastWriteTime -Descending
    foreach ($dir in $dirs) {
        $jsonl = Join-Path $dir.FullName "raw_records.jsonl"
        if (Test-Path $jsonl) {
            return $jsonl
        }
    }

    return $null
}

function Get-JsonlLineCount {
    param(
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return 0
    }

    if (-not (Test-Path $Path)) {
        return 0
    }

    $lines = Get-Content -Path $Path -Encoding UTF8 | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    if ($null -eq $lines) {
        return 0
    }

    return @($lines).Count
}

function Invoke-SbizFetch {
    param(
        [pscustomobject]$Tile
    )

    if ($DryRun) {
        return @{
            Success = $false
            FetchedCount = 0
            IngestedCount = 0
            ResultCode = "DRY_RUN"
            ResultMsg = "DryRun mode - fetch skipped"
            ErrorMessage = $null
        }
    }

    if (-not (Test-Path $SeedScriptPath)) {
        return @{
            Success = $false
            FetchedCount = 0
            IngestedCount = 0
            ResultCode = "SEED_SCRIPT_MISSING"
            ResultMsg = "Seed script not found"
            ErrorMessage = $SeedScriptPath
        }
    }

    if (-not (Test-Path $EnvPath)) {
        return @{
            Success = $false
            FetchedCount = 0
            IngestedCount = 0
            ResultCode = "ENV_MISSING"
            ResultMsg = "Env file not found"
            ErrorMessage = $EnvPath
        }
    }

    Ensure-Dir -Path $CollectedRootDir
    $tileOutputDir = Get-TileOutputDir -Tile $Tile

    $args = @(
        "-ExecutionPolicy", "Bypass",
        "-File", $SeedScriptPath,
        "-EnvPath", $EnvPath,
        "-OutputDir", $tileOutputDir,
        "-MinX", [string]$Tile.minx,
        "-MinY", [string]$Tile.miny,
        "-MaxX", [string]$Tile.maxx,
        "-MaxY", [string]$Tile.maxy,
        "-MaxPages", [string]$MaxPages
    )

    Write-Log "Seed exec: $SeedExecutable $($args -join ' ')"

    $stdoutFile = [System.IO.Path]::GetTempFileName()
    $stderrFile = [System.IO.Path]::GetTempFileName()

    try {
        $proc = Start-Process `
            -FilePath $SeedExecutable `
            -ArgumentList $args `
            -NoNewWindow `
            -Wait `
            -PassThru `
            -RedirectStandardOutput $stdoutFile `
            -RedirectStandardError $stderrFile

        $stdout = ""
        $stderr = ""

        if (Test-Path $stdoutFile) {
            $stdout = Get-Content $stdoutFile -Raw -Encoding UTF8
        }

        if (Test-Path $stderrFile) {
            $stderr = Get-Content $stderrFile -Raw -Encoding UTF8
        }

        $combined = (($stdout + "`n" + $stderr).Trim())

        if ($proc.ExitCode -ne 0) {
            return @{
                Success = $false
                FetchedCount = 0
                IngestedCount = 0
                ResultCode = "SEED_EXIT_NONZERO"
                ResultMsg = "Seed command failed"
                ErrorMessage = $combined
            }
        }

        $jsonlPath = Get-LatestJsonlPath -TileOutputDir $tileOutputDir
        $lineCount = Get-JsonlLineCount -Path $jsonlPath

        if ($lineCount -gt 0) {
            return @{
                Success = $true
                FetchedCount = [int]$lineCount
                IngestedCount = [int]$lineCount
                ResultCode = "OK"
                ResultMsg = "Rectangle crawl completed"
                ErrorMessage = $null
            }
        }

        return @{
            Success = $true
            FetchedCount = 0
            IngestedCount = 0
            ResultCode = "EMPTY"
            ResultMsg = "Rectangle crawl completed with no records"
            ErrorMessage = $null
        }
    }
    catch {
        return @{
            Success = $false
            FetchedCount = 0
            IngestedCount = 0
            ResultCode = "SEED_EXCEPTION"
            ResultMsg = "Seed command exception"
            ErrorMessage = $_.Exception.Message
        }
    }
    finally {
        Remove-Item $stdoutFile -ErrorAction SilentlyContinue
        Remove-Item $stderrFile -ErrorAction SilentlyContinue
    }
}

function Process-Tile {
    param(
        [pscustomobject]$Tile
    )

    Write-Log "Tile start: tile_id=$($Tile.tile_id), key=$($Tile.tile_key), bbox=[$($Tile.minx),$($Tile.miny),$($Tile.maxx),$($Tile.maxy)]"

    try {
        $result = Invoke-SbizFetch -Tile $Tile

        if ($result.Success) {
            Finish-CollectionTile `
                -TileId $Tile.tile_id `
                -Status "success" `
                -FetchedCount ([int]$result.FetchedCount) `
                -IngestedCount ([int]$result.IngestedCount) `
                -ResultCode $result.ResultCode `
                -ResultMsg $result.ResultMsg `
                -ErrorMessage $null

            Write-Log "Tile success: tile_id=$($Tile.tile_id), fetched=$($result.FetchedCount), ingested=$($result.IngestedCount), code=$($result.ResultCode)"
        }
        else {
            Finish-CollectionTile `
                -TileId $Tile.tile_id `
                -Status "retry" `
                -FetchedCount ([int]$result.FetchedCount) `
                -IngestedCount ([int]$result.IngestedCount) `
                -ResultCode $result.ResultCode `
                -ResultMsg $result.ResultMsg `
                -ErrorMessage $result.ErrorMessage

            Write-Log "Tile retry: tile_id=$($Tile.tile_id), code=$($result.ResultCode), msg=$($result.ResultMsg), err=$($result.ErrorMessage)" "ERROR"
        }
    }
    catch {
        $errorText = $_.Exception.Message

        Finish-CollectionTile `
            -TileId $Tile.tile_id `
            -Status "retry" `
            -FetchedCount 0 `
            -IngestedCount 0 `
            -ResultCode "WORKER_EXCEPTION" `
            -ResultMsg "PowerShell worker exception" `
            -ErrorMessage $errorText

        Write-Log "Tile exception: tile_id=$($Tile.tile_id), error=$errorText" "ERROR"
    }
}

function Start-Worker {
    Write-Log "SBIZ tile worker started"
    Write-Log "SourceKey=$SourceKey ClaimCount=$ClaimCount Interval=${IntervalSeconds}s WorkerName=$WorkerName DryRun=$DryRun"
    Write-Log "SeedExecutable=$SeedExecutable SeedScriptPath=$SeedScriptPath EnvPath=$EnvPath MaxPages=$MaxPages"

    do {
        try {
            $tiles = Get-ClaimedTiles

            if ($tiles.Count -eq 0) {
                Write-Log "No claimed tiles"
            }
            else {
                Write-Log "Claimed tile count: $($tiles.Count)"

                foreach ($tile in $tiles) {
                    Process-Tile -Tile $tile
                }
            }
        }
        catch {
            Write-Log "Worker loop failed: $($_.Exception.Message)" "ERROR"
        }

        if ($RunOnce) {
            break
        }

        Start-Sleep -Seconds $IntervalSeconds
    } while ($true)

    Write-Log "SBIZ tile worker finished"
}

Start-Worker
