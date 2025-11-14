# Fix Next.js Dev Server Lock File Issue
# Run this script to clean up and restart the dev server

Write-Host "=== Fixing Next.js Dev Server ===" -ForegroundColor Cyan

# Step 1: Kill all Node processes (except Cursor)
Write-Host "`n[1/4] Stopping all Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -notlike "*cursor*" } | ForEach-Object {
    Write-Host "  Killing process: PID $($_.Id)" -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

# Step 2: Remove .next directory
Write-Host "`n[2/4] Removing .next directory..." -ForegroundColor Yellow
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Write-Host "  ✓ Removed .next directory" -ForegroundColor Green
} else {
    Write-Host "  ✓ No .next directory found" -ForegroundColor Green
}

# Step 3: Remove any lock files
Write-Host "`n[3/4] Removing lock files..." -ForegroundColor Yellow
if (Test-Path ".next\dev\lock") {
    Remove-Item -Force ".next\dev\lock" -ErrorAction SilentlyContinue
    Write-Host "  ✓ Removed lock file" -ForegroundColor Green
}

# Step 4: Check port 3000
Write-Host "`n[4/4] Checking port 3000..." -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "  Port 3000 is in use by PID: $($port.OwningProcess)" -ForegroundColor Red
    Stop-Process -Id $port.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "  ✓ Killed process using port 3000" -ForegroundColor Green
} else {
    Write-Host "  ✓ Port 3000 is free" -ForegroundColor Green
}

Write-Host "`n=== Cleanup Complete ===" -ForegroundColor Cyan
Write-Host "You can now run: pnpm dev" -ForegroundColor Green
Write-Host "`nIMPORTANT: Make sure you only have ONE terminal running pnpm dev at a time!" -ForegroundColor Yellow

