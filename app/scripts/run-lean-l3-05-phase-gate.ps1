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
$grantMigrationPath = Join-Path $repositoryDirectory "supabase\migrations\20260812010000_lean_l3_02_monthly_grants.sql"
$reservationMigrationPath = Join-Path $repositoryDirectory "supabase\migrations\20260812020000_lean_l3_03_atomic_reservations.sql"
$walletMigrationPath = Join-Path $repositoryDirectory "supabase\migrations\20260812030000_lean_l3_04_safe_wallet.sql"
$gateTestPath = Join-Path $appDirectory "tests\sql\lean-l3-05-phase-gate.sql"
$concurrencySetupPath = Join-Path $appDirectory "tests\sql\lean-l3-05-concurrency-setup.sql"
$concurrencyVerifyPath = Join-Path $appDirectory "tests\sql\lean-l3-05-concurrency-verify.sql"
$concurrencySettlePath = Join-Path $appDirectory "tests\sql\lean-l3-05-concurrency-settle.sql"
$concurrencyCleanupPath = Join-Path $appDirectory "tests\sql\lean-l3-05-concurrency-cleanup.sql"

foreach ($requiredPath in @(
  $membershipMigrationPath,
  $webhookMigrationPath,
  $creditSchemaMigrationPath,
  $grantMigrationPath,
  $reservationMigrationPath,
  $walletMigrationPath,
  $gateTestPath,
  $concurrencySetupPath,
  $concurrencyVerifyPath,
  $concurrencySettlePath,
  $concurrencyCleanupPath
)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required LEAN-L3-05 file was not found: $requiredPath"
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
    "-U", "postgres", "-d", "postgres",
    "--set=ON_ERROR_STOP=1", "--set=prismarium_target=local"
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

Write-Host "LEAN-L3-05 local L2 membership dependency"
Invoke-LocalSql -Path $membershipMigrationPath | Out-Null
if (-not (Test-LocalColumn `
  -TableName "billing_memberships" `
  -ColumnName "last_stripe_event_id")) {
  Write-Host "LEAN-L3-05 local verified-event dependency"
  Invoke-LocalSql -Path $webhookMigrationPath | Out-Null
} else {
  Write-Host "LEAN-L3-05 local verified-event dependency already present"
}

Write-Host "LEAN-L3-05 reviewed L3-01 through L3-04 chain"
Invoke-LocalSql -Path $creditSchemaMigrationPath | Out-Null
Invoke-LocalSql -Path $grantMigrationPath | Out-Null
Invoke-LocalSql -Path $reservationMigrationPath | Out-Null
Invoke-LocalSql -Path $walletMigrationPath | Out-Null
Write-Host "LEAN-L3-05 latest migration idempotency rerun"
Invoke-LocalSql -Path $walletMigrationPath | Out-Null

Write-Host "LEAN-L3-05 authoritative invariant and adversarial RLS gate"
$runId = [guid]::NewGuid().ToString()
$gateResult = Invoke-LocalSql -Path $gateTestPath -AdditionalVariables @(
  "--set=run_id=$runId"
)
if ($gateResult -notmatch "LEAN_L3_05_LOCAL_BOUNDARIES:\s*16/16 PASS") {
  throw "LEAN-L3-05 invariant/RLS boundary summary was not present."
}
if ($gateResult -notmatch "cleanup_residue\s*(?:\r?\n)[-+]+(?:\r?\n)\s*0") {
  throw "LEAN-L3-05 invariant/RLS story did not prove zero residue."
}

Write-Host "LEAN-L3-05 twenty-session overspend and settlement gate"
$concurrencyActorId = [guid]::NewGuid().ToString()
$concurrencyEmail = "lean-l3-05-concurrency-$($concurrencyActorId.Replace('-', ''))@example.invalid"
$concurrencyVariables = @(
  "--set=actor_id=$concurrencyActorId",
  "--set=actor_email=$concurrencyEmail"
)
Invoke-LocalSql `
  -Path $concurrencySetupPath `
  -AdditionalVariables $concurrencyVariables | Out-Null

$jobs = @()
$concurrencySucceeded = $false
try {
  foreach ($attempt in 1..20) {
    $requestId = [guid]::NewGuid().ToString()
    $sql = "set role service_role; select result_code from public.reserve_credits_v1('$concurrencyActorId'::uuid, '$requestId'::uuid, repeat('e', 64), 'phase_gate.concurrent', 1, '2026-08-15 12:00:10+00'::timestamptz);"
    $jobs += Start-Job -ScriptBlock {
      param($ContainerName, $SqlStatement)
      $jobOutput = @(
        docker exec $ContainerName psql `
          -U postgres -d postgres -X -qAt -v ON_ERROR_STOP=1 `
          -c $SqlStatement 2>&1
      )
      if ($LASTEXITCODE -ne 0) {
        throw ($jobOutput -join "`n")
      }
      return (($jobOutput -join "`n").Trim())
    } -ArgumentList $databaseContainers[0], $sql
  }

  $null = Wait-Job -Job $jobs
  $outcomes = @(
    $jobs |
      Receive-Job -ErrorAction Stop |
      ForEach-Object { $_.ToString().Trim() } |
      Where-Object { $_ -ne "" }
  )

  $reservedCount = @($outcomes | Where-Object { $_ -eq "reserved" }).Count
  $insufficientCount = @(
    $outcomes | Where-Object { $_ -eq "insufficient_credits" }
  ).Count
  if ($outcomes.Count -ne 20 `
      -or $reservedCount -ne 10 `
      -or $insufficientCount -ne 10) {
    throw "Concurrent outcomes were unexpected: total=$($outcomes.Count), reserved=$reservedCount, insufficient=$insufficientCount."
  }

  $concurrencyResult = Invoke-LocalSql `
    -Path $concurrencyVerifyPath `
    -AdditionalVariables @("--set=actor_id=$concurrencyActorId")
  if ($concurrencyResult -notmatch "LEAN_L3_05_CONCURRENCY_VERIFY:\s*PASS") {
    throw "LEAN-L3-05 concurrency verification summary was not present."
  }

  $settlementResult = Invoke-LocalSql `
    -Path $concurrencySettlePath `
    -AdditionalVariables @("--set=actor_id=$concurrencyActorId")
  if ($settlementResult -notmatch "LEAN_L3_05_CONCURRENCY_SETTLE:\s*PASS") {
    throw "LEAN-L3-05 concurrency settlement summary was not present."
  }

  $concurrencySucceeded = $true
  Write-Host "LEAN_L3_05_CONCURRENCY: 20/20 PASS (10 reserved, 10 safely insufficient, 10 settled)"
} finally {
  if ($jobs.Count -gt 0) {
    $jobs | Remove-Job -Force -ErrorAction SilentlyContinue
  }
  $cleanupResult = Invoke-LocalSql `
    -Path $concurrencyCleanupPath `
    -AdditionalVariables @("--set=actor_id=$concurrencyActorId")
  if ($cleanupResult -notmatch "concurrency_cleanup_residue\s*(?:\r?\n)[-+]+(?:\r?\n)\s*0") {
    throw "LEAN-L3-05 concurrency cleanup did not prove zero residue."
  }
}

if (-not $concurrencySucceeded) {
  throw "LEAN-L3-05 concurrency verification did not complete."
}

Write-Host "LEAN_L3_05_LOCAL_BOUNDARIES: 20/20 PASS"
Write-Host "LEAN_L3_05_LOCAL_RESULT: PASS"
