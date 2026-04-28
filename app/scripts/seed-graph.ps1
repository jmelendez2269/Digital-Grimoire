param(
    [ValidateSet("current", "staging", "local-supabase")]
    [string]$Profile = "current"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Split-Path -Parent $scriptDir

if ($Profile -ne "current") {
    & (Join-Path $scriptDir "switch-env.ps1") -Profile $Profile
}

Push-Location $appDir
try {
    & ".\node_modules\.bin\tsx.cmd" "scripts\seed-correspondences.ts"
    & ".\node_modules\.bin\tsx.cmd" "scripts\seed-convergence.ts"
}
finally {
    Pop-Location
}
