# Start Next.js Dev Server with OneDrive-safe cleanup
# This script ensures a clean start by handling OneDrive file locks

param(
    [switch]$Force
)

Write-Host "=== Starting Next.js Dev Server ===" -ForegroundColor Cyan

# Step 1: Kill all Node processes
Write-Host "`n[1/5] Stopping all Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -notlike "*cursor*" }
if ($nodeProcesses) {
    $nodeProcesses | ForEach-Object {
        Write-Host "  Killing process: PID $($_.Id)" -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 3
    Write-Host "  ✓ Stopped Node processes" -ForegroundColor Green
} else {
    Write-Host "  ✓ No Node processes found" -ForegroundColor Green
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
        Write-Host "  ✓ Freed port $port" -ForegroundColor Green
    }
}

# Step 3: Remove .next directory with retry logic (OneDrive can cause issues)
Write-Host "`n[3/5] Removing .next directory..." -ForegroundColor Yellow
if (Test-Path .next) {
    $maxRetries = 5
    $retryCount = 0
    $removed = $false
    
    while ($retryCount -lt $maxRetries -and -not $removed) {
        try {
            # Try to remove lock file first if it exists
            if (Test-Path ".next\dev\lock") {
                Remove-Item -Force ".next\dev\lock" -ErrorAction Stop
                Start-Sleep -Milliseconds 500
            }
            
            # Remove entire directory
            Remove-Item -Recurse -Force .next -ErrorAction Stop
            $removed = $true
            Write-Host "  ✓ Removed .next directory (attempt $($retryCount + 1))" -ForegroundColor Green
        } catch {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Write-Host "  Retry $retryCount/$maxRetries - OneDrive may be syncing, waiting..." -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            } else {
                Write-Host "  ⚠ Could not remove .next directory after $maxRetries attempts" -ForegroundColor Red
                Write-Host "  This may be due to OneDrive sync. Try pausing OneDrive sync temporarily." -ForegroundColor Yellow
                if (-not $Force) {
                    Write-Host "  Use -Force flag to continue anyway" -ForegroundColor Yellow
                    exit 1
                }
            }
        }
    }
} else {
    Write-Host "  ✓ No .next directory found" -ForegroundColor Green
}

# Step 4: Verify no lock files remain
Write-Host "`n[4/5] Verifying cleanup..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Write-Host "  ⚠ .next directory still exists" -ForegroundColor Red
} else {
    Write-Host "  ✓ Cleanup verified" -ForegroundColor Green
}

# Step 5: Start dev server
Write-Host "`n[5/5] Starting dev server..." -ForegroundColor Yellow
Write-Host "`n=== Starting Next.js ===" -ForegroundColor Cyan
Write-Host ""

# Start in background and capture output
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; pnpm dev" -WindowStyle Normal

Write-Host "`n✓ Dev server starting in new window" -ForegroundColor Green
Write-Host "`nTIP: If you continue to see lock file errors, pause OneDrive sync temporarily" -ForegroundColor Yellow
Write-Host "     or exclude the .next folder from OneDrive sync." -ForegroundColor Yellow

