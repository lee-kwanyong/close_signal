param(
    [string]$OutputDir = ".\collected",
    [int]$DelayMs = 700
)

$ErrorActionPreference = "Stop"

function Ensure-Dir {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Write-JsonFile {
    param(
        [string]$Path,
        $Data
    )
    $json = $Data | ConvertTo-Json -Depth 20
    Set-Content -Path $Path -Value $json -Encoding UTF8
}

function Safe-FileName {
    param([string]$Text)
    $invalid = [System.IO.Path]::GetInvalidFileNameChars()
    $name = $Text
    foreach ($c in $invalid) {
        $name = $name.Replace($c, "_")
    }
    return $name
}

function Fetch-Json {
    param(
        [string]$Url,
        [hashtable]$Headers = @{}
    )

    try {
        $resp = Invoke-RestMethod -Uri $Url -Headers $Headers -Method Get -TimeoutSec 60
        return @{
            success = $true
            data    = $resp
            error   = $null
        }
    }
    catch {
        return @{
            success = $false
            data    = $null
            error   = $_.Exception.Message
        }
    }
}

function Fetch-Text {
    param(
        [string]$Url,
        [hashtable]$Headers = @{}
    )

    try {
        $resp = Invoke-WebRequest -Uri $Url -Headers $Headers -Method Get -TimeoutSec 60
        return @{
            success = $true
            data    = $resp.Content
            status  = $resp.StatusCode
            error   = $null
        }
    }
    catch {
        return @{
            success = $false
            data    = $null
            status  = $null
            error   = $_.Exception.Message
        }
    }
}

Ensure-Dir -Path $OutputDir

$today = Get-Date -Format "yyyyMMdd_HHmmss"
$runDir = Join-Path $OutputDir $today
Ensure-Dir -Path $runDir

$headers = @{
    "User-Agent" = "CloseSignalCollector/1.0"
    "Accept"     = "application/json, text/html;q=0.9, */*;q=0.8"
}

$targets = Import-Csv .\targets.csv

$results = @()
$failures = @()

foreach ($target in $targets) {
    Write-Host "Collecting [$($target.name)] $($target.url)..."

    $safeName = Safe-FileName $target.name

    if ($target.type -eq "json") {
        $result = Fetch-Json -Url $target.url -Headers $headers

        if ($result.success) {
            $outPath = Join-Path $runDir "$safeName.json"
            Write-JsonFile -Path $outPath -Data @{
                collected_at = (Get-Date).ToString("s")
                source_name  = $target.name
                source_url   = $target.url
                payload      = $result.data
            }

            $results += [pscustomobject]@{
                source_name  = $target.name
                source_url   = $target.url
                type         = $target.type
                status       = "success"
                output_file  = $outPath
                collected_at = Get-Date
            }
        }
        else {
            $failures += [pscustomobject]@{
                source_name  = $target.name
                source_url   = $target.url
                type         = $target.type
                error        = $result.error
                collected_at = Get-Date
            }
        }
    }
    elseif ($target.type -eq "html") {
        $result = Fetch-Text -Url $target.url -Headers $headers

        if ($result.success) {
            $outPath = Join-Path $runDir "$safeName.html"
            Set-Content -Path $outPath -Value $result.data -Encoding UTF8

            $results += [pscustomobject]@{
                source_name  = $target.name
                source_url   = $target.url
                type         = $target.type
                status       = "success"
                output_file  = $outPath
                collected_at = Get-Date
            }
        }
        else {
            $failures += [pscustomobject]@{
                source_name  = $target.name
                source_url   = $target.url
                type         = $target.type
                error        = $result.error
                collected_at = Get-Date
            }
        }
    }

    Start-Sleep -Milliseconds $DelayMs
}

$resultsPath = Join-Path $runDir "results.csv"
$failuresPath = Join-Path $runDir "failures.csv"
$summaryPath = Join-Path $runDir "summary.json"

if ($results.Count -gt 0) {
    $results | Export-Csv -Path $resultsPath -NoTypeInformation -Encoding UTF8
}

if ($failures.Count -gt 0) {
    $failures | Export-Csv -Path $failuresPath -NoTypeInformation -Encoding UTF8
}

$summary = @{
    run_at        = (Get-Date).ToString("s")
    run_dir       = $runDir
    success_count = $results.Count
    failure_count = $failures.Count
    results_file  = $resultsPath
    failures_file = $failuresPath
}

Write-JsonFile -Path $summaryPath -Data $summary

Write-Host ""
Write-Host "Done."
Write-Host "Run directory : $runDir"
Write-Host "Success count : $($results.Count)"
Write-Host "Failure count : $($failures.Count)"