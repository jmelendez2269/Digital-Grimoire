# Start Next.js Dev Server with OneDrive-safe cleanup
# This script ensures a clean start by handling OneDrive file locks

param(
    [switch]$Force,
    [ValidateSet("current", "staging", "local-supabase")]
    [string]$Profile = "current"
)

Write-Host "=== Starting Next.js Dev Server ===" -ForegroundColor Cyan

$appDir = $PSScriptRoot
Set-Location -LiteralPath $appDir

if ($Profile -ne "current") {
    $switchScript = Join-Path $appDir "scripts\switch-env.ps1"
    if (Test-Path $switchScript) {
        Write-Host "`n[0/5] Switching environment profile to '$Profile'..." -ForegroundColor Yellow
        & $switchScript -Profile $Profile
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Failed to switch environment profile." -ForegroundColor Red
            exit 1
        }
    }
}

# Step 1: Kill all Node processes
Write-Host "`n[1/5] Stopping all Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -notlike "*cursor*" }
if ($nodeProcesses) {
    $nodeProcesses | ForEach-Object {
        Write-Host "  Killing process: PID $($_.Id)" -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 3
    Write-Host "  OK Stopped Node processes" -ForegroundColor Green
} else {
    Write-Host "  OK No Node processes found" -ForegroundColor Green
}

# Step 2: Free port 3000 and 3001
Write-Host "`n[2/5] Checking ports..." -ForegroundColor Yellow
@(3000, 3001) | ForEach-Object {
    $port = $_
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "  Port $port is in use by PID: $($connection.OwningProcess)" -ForegroundColor Red
        Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        Write-Host "  OK Freed port $port" -ForegroundColor Green
    }
}

# Step 3: Remove .next directory with retry logic
Write-Host "`n[3/5] Removing .next directory..." -ForegroundColor Yellow
if (Test-Path ".next") {
    $maxRetries = 5
    $retryCount = 0
    $removed = $false

    while ($retryCount -lt $maxRetries -and -not $removed) {
        try {
            if (Test-Path ".next\dev\lock") {
                Remove-Item -LiteralPath ".next\dev\lock" -Force -ErrorAction Stop
                Start-Sleep -Milliseconds 500
            }

            Remove-Item -LiteralPath ".next" -Recurse -Force -ErrorAction Stop
            $removed = $true
            Write-Host "  OK Removed .next directory (attempt $($retryCount + 1))" -ForegroundColor Green
        } catch {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Write-Host "  Retry $retryCount/$maxRetries - waiting for file locks to clear..." -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            } else {
                Write-Host "  Could not remove .next directory after $maxRetries attempts" -ForegroundColor Red
                Write-Host "  This may be due to OneDrive sync. Try pausing OneDrive sync temporarily." -ForegroundColor Yellow
                if (-not $Force) {
                    Write-Host "  Use -Force to continue anyway" -ForegroundColor Yellow
                    exit 1
                }
            }
        }
    }
} else {
    Write-Host "  OK No .next directory found" -ForegroundColor Green
}

# Step 4: Verify no lock files remain
Write-Host "`n[4/5] Verifying cleanup..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Write-Host "  Warning: .next directory still exists" -ForegroundColor Red
} else {
    Write-Host "  OK Cleanup verified" -ForegroundColor Green
}

# Step 5: Start dev server
Write-Host "`n[5/5] Starting dev server..." -ForegroundColor Yellow
Write-Host "`n=== Starting Next.js ===" -ForegroundColor Cyan
Write-Host ""

# Launch through cmd.exe so we avoid PowerShell execution-policy and quoting issues
# in the child window as well.
$command = "/k cd /d `"$appDir`" && pnpm.cmd dev"
Start-Process -FilePath "cmd.exe" -ArgumentList $command -WindowStyle Normal

Write-Host "`nOK Dev server starting in new window" -ForegroundColor Green
Write-Host "`nTIP: If you continue to see lock file errors, pause OneDrive sync temporarily" -ForegroundColor Yellow
Write-Host "     or exclude the .next folder from OneDrive sync." -ForegroundColor Yellow
