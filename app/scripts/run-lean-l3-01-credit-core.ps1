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
$dependencyMigrationPath = Join-Path $repositoryDirectory "supabase\migrations\20260811200000_lean_l2_02_billing_memberships.sql"
$migrationPath = Join-Path $repositoryDirectory "supabase\migrations\20260812000000_lean_l3_01_credit_core_schema.sql"
$testPath = Join-Path $appDirectory "tests\sql\lean-l3-01-credit-core-schema.sql"

foreach ($requiredPath in @($dependencyMigrationPath, $migrationPath, $testPath)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required LEAN-L3-01 SQL file was not found: $requiredPath"
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

Write-Host "LEAN-L3-01 local L2-02 dependency migration"
Invoke-LocalSql -Path $dependencyMigrationPath | Out-Null

Write-Host "LEAN-L3-01 local forward migration"
Invoke-LocalSql -Path $migrationPath | Out-Null

Write-Host "LEAN-L3-01 local forward migration idempotency rerun"
Invoke-LocalSql -Path $migrationPath | Out-Null

Write-Host "LEAN-L3-01 local schema, authorization, idempotency, and accounting verification"
$runId = [guid]::NewGuid().ToString()
$result = Invoke-LocalSql -Path $testPath -AdditionalVariables @(
  "--set=run_id=$runId"
)

if ($result -notmatch "LEAN_L3_01_LOCAL_BOUNDARIES:\s*18/18 PASS") {
  throw "LEAN-L3-01 boundary summary was not present."
}
if ($result -notmatch "cleanup_residue\s*(?:\r?\n)[-+]+(?:\r?\n)\s*0") {
  throw "LEAN-L3-01 did not prove zero fixture residue."
}

Write-Host "LEAN_L3_01_LOCAL_RESULT: PASS"
