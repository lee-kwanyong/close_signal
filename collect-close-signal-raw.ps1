param(
    [string]$OutputDir = ".\collected_raw",
    [int]$DelayMs = 700
)

$ErrorActionPreference = "Stop"

function Ensure-Dir {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Append-JsonLine {
    param(
        [string]$Path,
        $Data
    )
    $json = $Data | ConvertTo-Json -Depth 20 -Compress
    Add-Content -Path $Path -Value $json -Encoding UTF8
}

function Fetch-Json {
    param([string]$Url)

    try {
        $resp = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 60
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
    param([string]$Url)

    try {
        $resp = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 60
        return @{
            success = $true
            data    = $resp.Content
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

function Get-HashString {
    param([string]$Text)

    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
        $hash = $sha.ComputeHash($bytes)
        return ([System.BitConverter]::ToString($hash)).Replace("-", "").ToLower()
    }
    finally {
        $sha.Dispose()
    }
}

Ensure-Dir -Path $OutputDir

$runStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$runDir = Join-Path $OutputDir $runStamp
Ensure-Dir -Path $runDir

$targetsPath = ".\targets.csv"
if (-not (Test-Path $targetsPath)) {
    throw "targets.csv 파일이 없습니다. C:\work\close_signal\targets.csv 를 만들어주세요."
}

$targets = Import-Csv $targetsPath
$jsonlPath = Join-Path $runDir "raw_records.jsonl"
$resultsPath = Join-Path $runDir "results.csv"
$failuresPath = Join-Path $runDir "failures.csv"
$summaryPath = Join-Path $runDir "summary.json"

$results = @()
$failures = @()

foreach ($target in $targets) {
    $sourceName   = [string]$target.source_name
    $sourceType   = [string]$target.type
    $sourceUrl    = [string]$target.url
    $regionName   = [string]$target.region_name
    $regionCode   = [string]$target.region_code
    $categoryName = [string]$target.category_name
    $categoryCode = [string]$target.category_code

    Write-Host "Collecting [$sourceName] $sourceUrl ..."

    if ([string]::IsNullOrWhiteSpace($sourceName) -or
        [string]::IsNullOrWhiteSpace($sourceType) -or
        [string]::IsNullOrWhiteSpace($sourceUrl)) {

        $failures += [pscustomobject]@{
            source_name  = $sourceName
            source_url   = $sourceUrl
            type         = $sourceType
            error        = "필수 컬럼 누락"
            collected_at = (Get-Date).ToString("s")
        }
        continue
    }

    if ($sourceType -eq "json") {
        $result = Fetch-Json -Url $sourceUrl

        if (-not $result.success) {
            $failures += [pscustomobject]@{
                source_name  = $sourceName
                source_url   = $sourceUrl
                type         = $sourceType
                error        = $result.error
                collected_at = (Get-Date).ToString("s")
            }
            Start-Sleep -Milliseconds $DelayMs
            continue
        }

        $items = @()
        if ($result.data -is [System.Collections.IEnumerable] -and -not ($result.data -is [string])) {
            foreach ($item in $result.data) {
                $items += ,$item
            }
        } else {
            $items += ,$result.data
        }

        $count = 0

        foreach ($item in $items) {
            $title = ""
            if ($null -ne $item.title) { $title = [string]$item.title }
            elseif ($null -ne $item.name) { $title = [string]$item.name }

            $businessName = $sourceName
            if ($null -ne $item.business_name) { $businessName = [string]$item.business_name }
            elseif ($null -ne $item.name) { $businessName = [string]$item.name }
            elseif ($null -ne $item.title) { $businessName = [string]$item.title }

            $address = ""
            if ($null -ne $item.address) { $address = [string]$item.address }
            elseif ($null -ne $item.addr) { $address = [string]$item.addr }

            $seed = "$sourceName|$sourceUrl|$regionCode|$categoryCode|$businessName|$address|$title"
            $externalId = Get-HashString -Text $seed

            $record = [ordered]@{
                source_name    = $sourceName
                source_type    = $sourceType
                source_url     = $sourceUrl
                collected_at   = (Get-Date).ToString("s")
                collected_date = (Get-Date).ToString("yyyy-MM-dd")
                external_id    = $externalId
                region_name    = $regionName
                region_code    = $regionCode
                category_name  = $categoryName
                category_code  = $categoryCode
                business_name  = $businessName
                address        = $address
                title          = $title
                payload        = $item
            }

            Append-JsonLine -Path $jsonlPath -Data $record
            $count++
        }

        $results += [pscustomobject]@{
            source_name  = $sourceName
            source_url   = $sourceUrl
            type         = $sourceType
            status       = "success"
            item_count   = $count
            collected_at = (Get-Date).ToString("s")
        }
    }
    elseif ($sourceType -eq "html") {
        $result = Fetch-Text -Url $sourceUrl

        if (-not $result.success) {
            $failures += [pscustomobject]@{
                source_name  = $sourceName
                source_url   = $sourceUrl
                type         = $sourceType
                error        = $result.error
                collected_at = (Get-Date).ToString("s")
            }
            Start-Sleep -Milliseconds $DelayMs
            continue
        }

        $html = [string]$result.data
        $title = ""
        $m = [regex]::Match($html, "<title[^>]*>(.*?)</title>", "IgnoreCase, Singleline")
        if ($m.Success) {
            $title = ($m.Groups[1].Value -replace "\s+", " ").Trim()
        }

        $seed = "$sourceName|$sourceUrl|$regionCode|$categoryCode|$title"
        $externalId = Get-HashString -Text $seed

        $record = [ordered]@{
            source_name    = $sourceName
            source_type    = $sourceType
            source_url     = $sourceUrl
            collected_at   = (Get-Date).ToString("s")
            collected_date = (Get-Date).ToString("yyyy-MM-dd")
            external_id    = $externalId
            region_name    = $regionName
            region_code    = $regionCode
            category_name  = $categoryName
            category_code  = $categoryCode
            business_name  = $sourceName
            address        = ""
            title          = $title
            payload        = @{
                html_title = $title
                html_size  = $html.Length
            }
        }

        Append-JsonLine -Path $jsonlPath -Data $record

        $results += [pscustomobject]@{
            source_name  = $sourceName
            source_url   = $sourceUrl
            type         = $sourceType
            status       = "success"
            item_count   = 1
            collected_at = (Get-Date).ToString("s")
        }
    }
    else {
        $failures += [pscustomobject]@{
            source_name  = $sourceName
            source_url   = $sourceUrl
            type         = $sourceType
            error        = "지원하지 않는 type"
            collected_at = (Get-Date).ToString("s")
        }
    }

    Start-Sleep -Milliseconds $DelayMs
}

if ($results.Count -gt 0) {
    $results | Export-Csv -Path $resultsPath -NoTypeInformation -Encoding UTF8
}

if ($failures.Count -gt 0) {
    $failures | Export-Csv -Path $failuresPath -NoTypeInformation -Encoding UTF8
}

$summary = @{
    run_at         = (Get-Date).ToString("s")
    run_dir        = $runDir
    success_count  = $results.Count
    failure_count  = $failures.Count
    raw_jsonl_file = $jsonlPath
    results_file   = $resultsPath
    failures_file  = $failuresPath
}

$summary | ConvertTo-Json -Depth 10 | Set-Content -Path $summaryPath -Encoding UTF8

Write-Host ""
Write-Host "Done."
Write-Host "Run directory : $runDir"
Write-Host "Success count : $($results.Count)"
Write-Host "Failure count : $($failures.Count)"
Write-Host "Raw JSONL     : $jsonlPath"
