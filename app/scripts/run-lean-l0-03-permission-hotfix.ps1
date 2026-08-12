param(
  [ValidateSet("local")]
  [string]$Target = "local"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($Target -ne "local") {
  throw "This runner is intentionally local-only."
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDirectory = Split-Path -Parent $scriptDirectory
$repositoryDirectory = Split-Path -Parent $appDirectory
$baselinePath = Join-Path $appDirectory "tests\sql\lean-l0-02-authorization-baseline.sql"
$acceptancePath = Join-Path $appDirectory "tests\sql\lean-l0-03-permission-hotfix.sql"
$rollbackPath = Join-Path $repositoryDirectory "supabase\snippets\lean_l0_03_permission_hotfix_rollback.sql"
$forwardPath = Join-Path $repositoryDirectory "supabase\migrations\20260810210000_lean_l0_03_permission_hotfix.sql"

foreach ($requiredPath in @($baselinePath, $acceptancePath, $rollbackPath, $forwardPath)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required LEAN-L0-03 SQL file was not found: $requiredPath"
  }
}

$databaseContainers = @(
  docker ps --format "{{.Names}}" |
    Where-Object { $_ -like "supabase_db_*" }
)

if ($LASTEXITCODE -ne 0) {
  throw "Docker is unavailable. Start Docker Desktop and the local Supabase stack first."
}

if ($databaseContainers.Count -ne 1) {
  throw "Expected exactly one running local Supabase database container; found $($databaseContainers.Count)."
}

function Invoke-LocalSql {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [string[]]$AdditionalVariables = @()
  )

  $arguments = @(
    "exec", "-i", $databaseContainers[0], "psql",
    "-U", "postgres",
    "-d", "postgres",
    "--set=ON_ERROR_STOP=1",
    "--set=prismarium_target=local"
  ) + $AdditionalVariables

  $sql = Get-Content -Raw -LiteralPath $Path
  $output = @($sql | docker @arguments 2>&1)
  if ($LASTEXITCODE -ne 0) {
    $output | ForEach-Object { Write-Host $_ }
    throw "Local SQL execution failed: $Path"
  }

  $output | ForEach-Object { Write-Host $_ }
  return ($output -join "`n")
}

function Assert-BaselineSummary {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Output,
    [Parameter(Mandatory = $true)]
    [int]$ExpectedFailures
  )

  $summaryPattern = "local\s*\|\s*(?<probes>\d+)\s*\|\s*(?<passes>\d+)\s*\|\s*(?<failures>\d+)\s*\|\s*0"
  if ($Output -notmatch $summaryPattern) {
    throw "Authorization baseline summary was not present."
  }

  $probeCount = [int]$Matches.probes
  $passCount = [int]$Matches.passes
  $failureCount = [int]$Matches.failures
  if ($probeCount -lt 48) {
    throw "Authorization baseline reported fewer than the accepted 48 probes."
  }
  if ($failureCount -ne $ExpectedFailures) {
    throw "Authorization baseline reported $failureCount failures; expected $ExpectedFailures."
  }
  if ($ExpectedFailures -eq 0 -and $passCount -ne $probeCount) {
    throw "Authorization baseline did not report every probe as a secure pass."
  }
  if ($ExpectedFailures -gt 0 -and $passCount -ne ($probeCount - $ExpectedFailures)) {
    throw "Authorization baseline pass/failure counts do not add up to the probe count."
  }

  if ($Output -notmatch "cleanup_residue\s*(?:\r?\n)[-+]+(?:\r?\n)\s*0") {
    throw "Authorization baseline did not prove zero fixture residue."
  }
}

Write-Host "LEAN-L0-03 forward authorization verification"
$forwardBaseline = Invoke-LocalSql -Path $baselinePath
Assert-BaselineSummary -Output $forwardBaseline -ExpectedFailures 0

$acceptance = Invoke-LocalSql -Path $acceptancePath
if ($acceptance -notmatch "local\s*\|\s*11\s*\|\s*7\s*\|\s*[6-7]\s*\|\s*4\s*\|\s*PASS") {
  throw "LEAN-L0-03 acceptance summary was not present."
}
if ($acceptance -notmatch "cleanup_residue\s*(?:\r?\n)[-+]+(?:\r?\n)\s*0") {
  throw "LEAN-L0-03 acceptance test did not prove zero fixture residue."
}

Write-Host "LEAN-L0-03 local reversal verification"
Invoke-LocalSql -Path $rollbackPath -AdditionalVariables @(
  "--set=prismarium_confirm_rollback=REVERSE-LEAN-L0-03"
) | Out-Null
$reversedBaseline = Invoke-LocalSql -Path $baselinePath
Assert-BaselineSummary -Output $reversedBaseline -ExpectedFailures 37

Write-Host "LEAN-L0-03 local forward restoration"
Invoke-LocalSql -Path $forwardPath | Out-Null
$restoredBaseline = Invoke-LocalSql -Path $baselinePath
Assert-BaselineSummary -Output $restoredBaseline -ExpectedFailures 0

Write-Host "LEAN-L0-03_LOCAL_RESULT: PASS"
