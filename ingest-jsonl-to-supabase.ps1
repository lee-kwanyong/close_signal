param(
    [string]$EnvPath = ".\.env.local",
    [string]$InputPath
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

function Invoke-SupabaseRpc {
    param(
        [string]$BaseUrl,
        [string]$ServiceRoleKey,
        [string]$RpcName,
        $BodyObject
    )

    $uri = "$BaseUrl/rest/v1/rpc/$RpcName"
    $headers = @{
        "apikey"        = $ServiceRoleKey
        "Authorization" = "Bearer $ServiceRoleKey"
        "Content-Type"  = "application/json"
        "Prefer"        = "return=representation"
    }

    $bodyJson = $BodyObject | ConvertTo-Json -Depth 50 -Compress
    return Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $bodyJson -TimeoutSec 120
}

Load-DotEnv -Path $EnvPath

if ([string]::IsNullOrWhiteSpace($InputPath)) {
    throw "InputPath를 넣어주세요."
}

if (-not (Test-Path $InputPath)) {
    throw "입력 파일이 없습니다: $InputPath"
}

$baseUrl = $env:SUPABASE_URL
$serviceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY

if ([string]::IsNullOrWhiteSpace($baseUrl)) { throw "SUPABASE_URL 없음" }
if ([string]::IsNullOrWhiteSpace($serviceRoleKey)) { throw "SUPABASE_SERVICE_ROLE_KEY 없음" }

$lines = Get-Content $InputPath
$total = 0
$success = 0
$fail = 0

foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    $total++
    try {
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

        Invoke-SupabaseRpc -BaseUrl $baseUrl -ServiceRoleKey $serviceRoleKey -RpcName "ingest_sbiz_raw" -BodyObject @{ p_payload = $payload } | Out-Null
        $success++

        if (($success % 50) -eq 0) {
            Write-Host "ingested: $success / $total"
        }
    }
    catch {
        $fail++
        Write-Host "FAILED line $total : $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "Done."
Write-Host "Total   : $total"
Write-Host "Success : $success"
Write-Host "Fail    : $fail"
