param(
    [ValidateSet("current", "staging", "local-supabase")]
    [string]$Profile = "current",
    [string]$Output = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Split-Path -Parent $scriptDir

if ($Profile -ne "current") {
    & (Join-Path $scriptDir "switch-env.ps1") -Profile $Profile
}

Push-Location $appDir
try {
    $args = @("scripts\export-graph.ts")
    if ($Output) {
        $args += @("--output", $Output)
    }
    & ".\node_modules\.bin\tsx.cmd" @args
}
finally {
    Pop-Location
}
