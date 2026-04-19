param(
    [string]$EnvPath = ".\.env",
    [string]$OutputDir = ".\collected_raw",
    [double]$MinX = 126.97,
    [double]$MinY = 37.55,
    [double]$MaxX = 127.03,
    [double]$MaxY = 37.60,
    [int]$MaxPages = 3
)

$ErrorActionPreference = "Stop"

function Load-DotEnv {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw ".env 파일이 없습니다: $Path"
    }

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ([string]::IsNullOrWhiteSpace($line)) { return }
        if ($line.StartsWith("#")) { return }

        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { return }

        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()

        if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
            $val = $val.Substring(1, $val.Length - 2)
        }

        [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
}

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

Load-DotEnv -Path $EnvPath

$baseUrl = $env:SBIZ_API_BASE_URL
$endpoint = $env:SBIZ_ENDPOINT
$apiKey = $env:SBIZ_API_KEY
$pageSize = [int]$env:SBIZ_PAGE_SIZE
if (-not $pageSize) { $pageSize = 100 }

if ([string]::IsNullOrWhiteSpace($baseUrl)) { throw "SBIZ_API_BASE_URL 없음" }
if ([string]::IsNullOrWhiteSpace($endpoint)) { throw "SBIZ_ENDPOINT 없음" }
if ([string]::IsNullOrWhiteSpace($apiKey)) { throw "SBIZ_API_KEY 없음" }

Ensure-Dir -Path $OutputDir
$runStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$runDir = Join-Path $OutputDir $runStamp
Ensure-Dir -Path $runDir

$jsonlPath = Join-Path $runDir "raw_records.jsonl"
$rawPagesDir = Join-Path $runDir "pages"
Ensure-Dir -Path $rawPagesDir

$totalCount = 0

for ($pageNo = 1; $pageNo -le $MaxPages; $pageNo++) {
    $query = @{
        serviceKey = $apiKey
        pageNo     = $pageNo
        numOfRows  = $pageSize
        type       = "json"
        minx       = $MinX
        miny       = $MinY
        maxx       = $MaxX
        maxy       = $MaxY
    }

    $qs = ($query.GetEnumerator() | ForEach-Object {
        "{0}={1}" -f [uri]::EscapeDataString([string]$_.Key), [uri]::EscapeDataString([string]$_.Value)
    }) -join "&"

    $url = "$baseUrl/$endpoint`?$qs"
    Write-Host "Fetching page $pageNo ..."
    $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 60

    $pagePath = Join-Path $rawPagesDir ("page_{0}.json" -f $pageNo)
    $resp | ConvertTo-Json -Depth 30 | Set-Content -Path $pagePath -Encoding UTF8

    $items = @()

    if ($null -ne $resp.body.items) {
        if ($resp.body.items -is [System.Collections.IEnumerable] -and -not ($resp.body.items -is [string])) {
            foreach ($item in $resp.body.items) { $items += ,$item }
        } else {
            $items += ,$resp.body.items
        }
    }
    elseif ($null -ne $resp.items) {
        if ($resp.items -is [System.Collections.IEnumerable] -and -not ($resp.items -is [string])) {
            foreach ($item in $resp.items) { $items += ,$item }
        } else {
            $items += ,$resp.items
        }
    }

    if ($items.Count -eq 0) {
        Write-Host "No items on page $pageNo. Stop."
        break
    }

    foreach ($item in $items) {
        $externalId =
            if ($null -ne $item.bizesId) { [string]$item.bizesId }
            elseif ($null -ne $item.id) { [string]$item.id }
            else { Get-HashString -Text (($item | ConvertTo-Json -Depth 10 -Compress)) }

        $businessName =
            if ($null -ne $item.bizesNm) { [string]$item.bizesNm }
            elseif ($null -ne $item.bplcnm) { [string]$item.bplcnm }
            elseif ($null -ne $item.name) { [string]$item.name }
            else { "" }

        $categoryCode =
            if ($null -ne $item.indsLclsCd) { [string]$item.indsLclsCd }
            elseif ($null -ne $item.indsMclsCd) { [string]$item.indsMclsCd }
            else { "" }

        $categoryName =
            if ($null -ne $item.indsLclsNm) { [string]$item.indsLclsNm }
            elseif ($null -ne $item.indsMclsNm) { [string]$item.indsMclsNm }
            else { "" }

        $address =
            if ($null -ne $item.lnoAdr) { [string]$item.lnoAdr }
            elseif ($null -ne $item.rdnmAdr) { [string]$item.rdnmAdr }
            else { "" }

        $roadAddress =
            if ($null -ne $item.rdnmAdr) { [string]$item.rdnmAdr }
            else { "" }

        $lat =
            if ($null -ne $item.lat) { [string]$item.lat }
            elseif ($null -ne $item.y) { [string]$item.y }
            else { "" }

        $lng =
            if ($null -ne $item.lon) { [string]$item.lon }
            elseif ($null -ne $item.x) { [string]$item.x }
            else { "" }

        $record = [ordered]@{
            external_id     = $externalId
            business_name   = $businessName
            category_code   = $categoryCode
            category_name   = $categoryName
            address         = $address
            road_address    = $roadAddress
            lat             = $lat
            lng             = $lng
            observed_status = "open"
            collected_at    = (Get-Date).ToString("s")
            payload         = $item
        }

        Append-JsonLine -Path $jsonlPath -Data $record
        $totalCount++
    }

    Start-Sleep -Milliseconds 300
}

$summary = @{
    run_dir        = $runDir
    raw_jsonl_file = $jsonlPath
    collected_count = $totalCount
    minx = $MinX
    miny = $MinY
    maxx = $MaxX
    maxy = $MaxY
    max_pages = $MaxPages
}
$summary | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $runDir "summary.json") -Encoding UTF8

Write-Host ""
Write-Host "Done."
Write-Host "Run directory   : $runDir"
Write-Host "Collected count : $totalCount"
Write-Host "Raw JSONL       : $jsonlPath"
