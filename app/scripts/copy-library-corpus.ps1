param(
    [Parameter(Mandatory = $true)]
    [string]$SourceEnv,
    [int]$Limit = 0,
    [switch]$DryRun,
    [switch]$SkipFiles,
    [switch]$OnlyMissing
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Split-Path -Parent $scriptDir

Push-Location $appDir
try {
    $args = @("scripts\copy-library-corpus.ts", "--source-env", $SourceEnv)

    if ($Limit -gt 0) {
        $args += @("--limit", $Limit)
    }

    if ($DryRun) {
        $args += "--dry-run"
    }

    if ($SkipFiles) {
        $args += "--skip-files"
    }

    if ($OnlyMissing) {
        $args += "--only-missing"
    }

    & ".\node_modules\.bin\tsx.cmd" @args
}
finally {
    Pop-Location
}