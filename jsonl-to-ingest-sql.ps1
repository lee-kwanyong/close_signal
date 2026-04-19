param(
    [string]$InputPath,
    [string]$OutputPath = ".\ingest_raw_records.sql"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($InputPath)) {
    throw "InputPath를 넣어주세요."
}

if (-not (Test-Path $InputPath)) {
    throw "입력 파일이 없습니다: $InputPath"
}

$lines = Get-Content $InputPath
$out = New-Object System.Collections.Generic.List[string]

$out.Add("begin;")

$count = 0

foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    $obj = $line | ConvertFrom-Json

    $payload = [ordered]@{
        external_id     = $obj.external_id
        business_name   = $obj.business_name
        category_code   = $obj.category_code
        category_name   = $obj.category_name
        address         = $obj.address
        road_address    = $obj.road_address
        lat             = $obj.lat
        lng             = $obj.lng
        observed_status = $(if ($null -ne $obj.observed_status) { $obj.observed_status } else { "open" })
        collected_at    = $(if ($null -ne $obj.collected_at) { $obj.collected_at } else { (Get-Date).ToString("s") })
        payload         = $obj.payload
    }

    $json = $payload | ConvertTo-Json -Depth 50 -Compress
    $jsonEscaped = $json.Replace("'", "''")

    $out.Add("select public.ingest_sbiz_raw('$jsonEscaped'::jsonb);")
    $count++
}

$out.Add("commit;")

Set-Content -Path $OutputPath -Value $out -Encoding UTF8

Write-Host ""
Write-Host "Done."
Write-Host "SQL file : $OutputPath"
Write-Host "Rows     : $count"
