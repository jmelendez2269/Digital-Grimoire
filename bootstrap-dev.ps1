param(
    [ValidateSet("staging", "local-supabase")]
    [string]$Profile = "staging",
    [switch]$Launch
)

$repoRoot = $PSScriptRoot
$appDir = Join-Path $repoRoot "app"
$currentEnv = Join-Path $appDir ".env.local"
$stagingEnv = Join-Path $appDir ".env.local.staging"
$localEnv = Join-Path $appDir ".env.local.local-supabase"
$stagingExample = Join-Path $appDir ".env.local.staging.example"
$localExample = Join-Path $appDir ".env.local.local-supabase.example"
$switchScript = Join-Path $appDir "scripts\switch-env.ps1"

function Write-Step($message) {
    Write-Host ""
    Write-Host $message -ForegroundColor Cyan
}

function Get-SupabaseMode([string]$envPath) {
    if (-not (Test-Path $envPath)) { return "missing" }
    $content = Get-Content $envPath -Raw
    if ($content -match 'NEXT_PUBLIC_SUPABASE_URL=http://127\.0\.0\.1:54321' -or $content -match 'NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321') {
        return "local"
    }
    if ($content -match 'NEXT_PUBLIC_SUPABASE_URL=https://.*\.supabase\.co') {
        return "remote"
    }
    return "unknown"
}

function Ensure-FromCurrentOrExample([string]$target, [string]$desiredMode, [string]$example) {
    if (Test-Path $target) {
        return
    }

    $currentMode = Get-SupabaseMode $currentEnv
    if ((Test-Path $currentEnv) -and $currentMode -eq $desiredMode) {
        Copy-Item -LiteralPath $currentEnv -Destination $target -Force
        Write-Host "Created $(Split-Path $target -Leaf) from current .env.local" -ForegroundColor Green
        return
    }

    if (Test-Path $example) {
        Copy-Item -LiteralPath $example -Destination $target -Force
        Write-Host "Created $(Split-Path $target -Leaf) from example template" -ForegroundColor Yellow
        return
    }

    Write-Host "Could not create $(Split-Path $target -Leaf)" -ForegroundColor Red
}

function FileHasPlaceholders([string]$envPath) {
    if (-not (Test-Path $envPath)) { return $true }
    $content = Get-Content $envPath -Raw
    return $content -match 'your-staging-project' -or $content -match 'your-staging-anon-key' -or $content -match 'your-local-anon-key'
}

Write-Host "=== Digital Grimoire Bootstrap ===" -ForegroundColor Cyan
Write-Host "Repo: $repoRoot" -ForegroundColor Gray
Write-Host "Requested profile: $Profile" -ForegroundColor Gray

Write-Step "[1/5] Checking Docker"
try {
    docker info | Out-Null
    Write-Host "Docker Desktop is available." -ForegroundColor Green
} catch {
    Write-Host "Docker does not appear to be available. Start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

Write-Step "[2/5] Preparing environment profiles"
Ensure-FromCurrentOrExample -target $localEnv -desiredMode "local" -example $localExample
Ensure-FromCurrentOrExample -target $stagingEnv -desiredMode "remote" -example $stagingExample

Write-Step "[3/5] Validating requested profile"
$requestedEnv = if ($Profile -eq "staging") { $stagingEnv } else { $localEnv }
if (-not (Test-Path $requestedEnv)) {
    Write-Host "Missing requested profile file: $requestedEnv" -ForegroundColor Red
    exit 1
}

if (FileHasPlaceholders $requestedEnv) {
    Write-Host "The requested profile still has placeholder values:" -ForegroundColor Yellow
    Write-Host "  $requestedEnv" -ForegroundColor Gray
    Write-Host "Fill in the real credentials, then rerun this script." -ForegroundColor Yellow
    exit 1
}

Write-Step "[4/5] Activating profile"
& $switchScript -Profile $Profile
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to activate profile." -ForegroundColor Red
    exit 1
}

Write-Step "[5/5] Bootstrap result"
Write-Host "Profiles are ready." -ForegroundColor Green
Write-Host "Active profile: $Profile" -ForegroundColor Green

if ($Launch) {
    Write-Host ""
    Write-Host "Starting Docker app..." -ForegroundColor Cyan
    docker compose up --build
} else {
    Write-Host "To start the app now, run:" -ForegroundColor Yellow
    Write-Host "  docker compose up --build" -ForegroundColor Gray
}
