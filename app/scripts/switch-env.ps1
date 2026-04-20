param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("staging", "local-supabase")]
    [string]$Profile
)

$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root ".env.local"
$source = Join-Path $root ".env.local.$Profile"
$example = Join-Path $root ".env.local.$Profile.example"

Write-Host "=== Switch Environment Profile ===" -ForegroundColor Cyan
Write-Host "Profile: $Profile" -ForegroundColor Yellow

if (-not (Test-Path $source)) {
    Write-Host ""
    Write-Host "Missing profile file: $source" -ForegroundColor Red
    if (Test-Path $example) {
        Write-Host "Create it from the example first:" -ForegroundColor Yellow
        Write-Host "  Copy-Item `"$example`" `"$source`"" -ForegroundColor Gray
    }
    exit 1
}

Copy-Item -LiteralPath $source -Destination $target -Force

$supabaseUrl = (Get-Content $target | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_URL=' }) -replace '^NEXT_PUBLIC_SUPABASE_URL=', ''
$appUrl = (Get-Content $target | Where-Object { $_ -match '^NEXT_PUBLIC_APP_URL=' }) -replace '^NEXT_PUBLIC_APP_URL=', ''

Write-Host ""
Write-Host "Updated app/.env.local" -ForegroundColor Green
if ($supabaseUrl) {
    Write-Host "Supabase URL: $supabaseUrl" -ForegroundColor Gray
}
if ($appUrl) {
    Write-Host "App URL: $appUrl" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Next step:" -ForegroundColor Cyan
Write-Host "  Restart your dev server so Next.js reloads the environment." -ForegroundColor Gray
