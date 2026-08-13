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
$membershipMigrationPath = Join-Path $repositoryDirectory "supabase\migrations\20260811200000_lean_l2_02_billing_memberships.sql"
$webhookMigrationPath = Join-Path $repositoryDirectory "supabase\migrations\20260811220000_lean_l2_05_webhook_inbox_projector.sql"
$creditSchemaMigrationPath = Join-Path $repositoryDirectory "supabase\migrations\20260812000000_lean_l3_01_credit_core_schema.sql"
$migrationPath = Join-Path $repositoryDirectory "supabase\migrations\20260812010000_lean_l3_02_monthly_grants.sql"
$testPath = Join-Path $appDirectory "tests\sql\lean-l3-02-monthly-grants.sql"

foreach ($requiredPath in @(
  $membershipMigrationPath,
  $webhookMigrationPath,
  $creditSchemaMigrationPath,
  $migrationPath,
  $testPath
)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required LEAN-L3-02 SQL file was not found: $requiredPath"
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

function Test-LocalColumn {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TableName,
    [Parameter(Mandatory = $true)]
    [string]$ColumnName
  )

  $query = "select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = '$TableName' and column_name = '$ColumnName');"
  $output = @(
    docker exec $databaseContainers[0] psql `
      -U postgres -d postgres -tA -v ON_ERROR_STOP=1 -c $query 2>&1
  )
  if ($LASTEXITCODE -ne 0) {
    $output | ForEach-Object { Write-Host $_ }
    throw "Local prerequisite inspection failed."
  }

  return (($output -join "").Trim() -eq "t")
}

Write-Host "LEAN-L3-02 local L2-02 membership dependency"
Invoke-LocalSql -Path $membershipMigrationPath | Out-Null

# A fresh local database needs L2-05's verified-event fields. A database that
# already has L2-06 must not have its projector wrapper overwritten by blindly
# replaying L2-05, so only apply the dependency when the column is absent.
if (-not (Test-LocalColumn `
  -TableName "billing_memberships" `
  -ColumnName "last_stripe_event_id")) {
  Write-Host "LEAN-L3-02 local L2-05 verified-event dependency"
  Invoke-LocalSql -Path $webhookMigrationPath | Out-Null
} else {
  Write-Host "LEAN-L3-02 local L2-05 verified-event dependency already present"
}

Write-Host "LEAN-L3-02 local L3-01 credit schema dependency"
Invoke-LocalSql -Path $creditSchemaMigrationPath | Out-Null

Write-Host "LEAN-L3-02 local forward migration"
Invoke-LocalSql -Path $migrationPath | Out-Null

Write-Host "LEAN-L3-02 local forward migration idempotency rerun"
Invoke-LocalSql -Path $migrationPath | Out-Null

Write-Host "LEAN-L3-02 local grant lifecycle, replay, and boundary verification"
$runId = [guid]::NewGuid().ToString()
$result = Invoke-LocalSql -Path $testPath -AdditionalVariables @(
  "--set=run_id=$runId"
)

if ($result -notmatch "LEAN_L3_02_LOCAL_BOUNDARIES:\s*18/18 PASS") {
  throw "LEAN-L3-02 boundary summary was not present."
}
if ($result -notmatch "cleanup_residue\s*(?:\r?\n)[-+]+(?:\r?\n)\s*0") {
  throw "LEAN-L3-02 did not prove zero fixture residue."
}

Write-Host "LEAN_L3_02_LOCAL_RESULT: PASS"
