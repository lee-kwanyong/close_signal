param(
    [string]$PgHost = "aws-1-ap-south-1.pooler.supabase.com",
    [int]$PgPort = 5432,
    [string]$PgDatabase = "postgres",
    [string]$PgUser = "postgres.qirawfckozrblgpiwqyf",
    [string]$PgPassword = "dlrhksdyd1!!",
    [string]$SqlFilePath = "C:\work\close_signal\sql\run_sbiz_jobs.sql",
    [string]$LogDir = "C:\work\close_signal\logs",
    [int]$IntervalSeconds = 2,
    [int]$MaxRetryCount = 3,
    [int]$RetryDelaySeconds = 20,
    [switch]$RunOnce
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }

    $logFile = Join-Path $LogDir ("sbiz_auto_" + (Get-Date -Format "yyyy-MM-dd") + ".log")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"

    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

function Test-RequiredFiles {
    if (-not (Test-Path $SqlFilePath)) {
        throw "SQL 파일이 없습니다: $SqlFilePath"
    }
}

function Invoke-SqlFile {
    $env:PGPASSWORD = $PgPassword

    try {
        $arguments = @(
            "-h", $PgHost,
            "-p", $PgPort.ToString(),
            "-U", $PgUser,
            "-d", $PgDatabase,
            "-v", "ON_ERROR_STOP=1",
            "-f", $SqlFilePath
        )

        Write-Log "SQL 실행 시작: $SqlFilePath"

        $output = & psql @arguments 2>&1
        $exitCode = $LASTEXITCODE

        if ($output) {
            foreach ($line in $output) {
                Write-Log "$line"
            }
        }

        if ($exitCode -ne 0) {
            throw "psql 종료 코드가 비정상입니다: $exitCode"
        }

        Write-Log "SQL 실행 성공"
        return $true
    }
    finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Invoke-WithRetry {
    $attempt = 1

    while ($attempt -le $MaxRetryCount) {
        try {
            Write-Log "실행 시도 $attempt / $MaxRetryCount"
            Invoke-SqlFile | Out-Null
            return $true
        }
        catch {
            Write-Log "실행 실패: $($_.Exception.Message)" "ERROR"

            if ($attempt -ge $MaxRetryCount) {
                Write-Log "최대 재시도 횟수 초과" "ERROR"
                return $false
            }

            Write-Log "$RetryDelaySeconds초 후 재시도"
            Start-Sleep -Seconds $RetryDelaySeconds
            $attempt++
        }
    }

    return $false
}

function Start-AutoRunner {
    Test-RequiredFiles

    Write-Log "자동 실행기 시작"
    Write-Log "Host=$PgHost Port=$PgPort Db=$PgDatabase User=$PgUser"
    Write-Log "SQL 파일=$SqlFilePath"
    Write-Log "실행 주기=${IntervalSeconds}초"

    do {
        $success = Invoke-WithRetry

        if ($success) {
            Write-Log "한 사이클 완료"
        }
        else {
            Write-Log "한 사이클 실패" "ERROR"
        }

        if ($RunOnce) {
            break
        }

        Write-Log "다음 실행까지 대기: ${IntervalSeconds}초"
        Start-Sleep -Seconds $IntervalSeconds
    } while ($true)

    Write-Log "자동 실행기 종료"
}

Start-AutoRunner
