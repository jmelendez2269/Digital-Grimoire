param(
    [Parameter(Mandatory = $true)]
    [string]$SourceEnv,
    [switch]$DryRun,
    [switch]$OnlyMissing
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Split-Path -Parent $scriptDir

Push-Location $appDir
try {
    $args = @("scripts\copy-courses.ts", "--source-env", $SourceEnv)

    if ($DryRun) {
        $args += "--dry-run"
    }

    if ($OnlyMissing) {
        $args += "--only-missing"
    }

    & ".\node_modules\.bin\tsx.cmd" @args
}
finally {
    Pop-Location
}