#!/usr/bin/env pwsh
# Quick fix for EBUSY error in Next.js

Write-Host "🔧 Fixing EBUSY Error..." -ForegroundColor Cyan
Write-Host ""

$appPath = Join-Path $PSScriptRoot "app"

if (-not (Test-Path $appPath)) {
    Write-Host "❌ Error: app folder not found at $appPath" -ForegroundColor Red
    exit 1
}

Set-Location $appPath

Write-Host "📍 Working directory: $appPath" -ForegroundColor Yellow
Write-Host ""

# Step 1: Stop any running node processes
Write-Host "1️⃣ Stopping Node.js processes..." -ForegroundColor Cyan
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   Found $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
    Write-Host "   ✅ Stopped Node.js processes" -ForegroundColor Green
} else {
    Write-Host "   No Node.js processes running" -ForegroundColor Gray
}

Write-Host ""

# Step 2: Delete .next cache
Write-Host "2️⃣ Deleting .next cache folder..." -ForegroundColor Cyan
$nextPath = Join-Path $appPath ".next"

if (Test-Path $nextPath) {
    try {
        Remove-Item -Path $nextPath -Recurse -Force -ErrorAction Stop
        Write-Host "   ✅ Deleted .next cache" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Could not delete .next folder: $_" -ForegroundColor Yellow
        Write-Host "   Try closing any file explorers or editors with files open" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Manual fix: Delete this folder manually:" -ForegroundColor Yellow
        Write-Host "   $nextPath" -ForegroundColor White
        exit 1
    }
} else {
    Write-Host "   .next folder doesn't exist (already clean)" -ForegroundColor Gray
}

Write-Host ""

# Step 3: Start dev server
Write-Host "3️⃣ Starting development server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if npm is available
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm run dev
} else {
    Write-Host "❌ npm not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

