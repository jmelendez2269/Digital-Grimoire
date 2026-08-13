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
$migrationPath = Join-Path $repositoryDirectory "supabase\migrations\20260812040000_lean_l4_01_metering_foundation.sql"
$testPath = Join-Path $appDirectory "tests\sql\lean-l4-01-metering-foundation.sql"
$concurrencySetupPath = Join-Path $appDirectory "tests\sql\lean-l4-01-concurrency-setup.sql"
$concurrencyVerifyPath = Join-Path $appDirectory "tests\sql\lean-l4-01-concurrency-verify.sql"
$concurrencyCleanupPath = Join-Path $appDirectory "tests\sql\lean-l4-01-concurrency-cleanup.sql"

foreach ($requiredPath in @(
  $membershipMigrationPath,
  $webhookMigrationPath,
  $creditSchemaMigrationPath,
  $grantMigrationPath,
  $reservationMigrationPath,
  $migrationPath,
  $testPath,
  $concurrencySetupPath,
  $concurrencyVerifyPath,
  $concurrencyCleanupPath
)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required LEAN-L4-01 SQL file was not found: $requiredPath"
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

Write-Host "LEAN-L4-01 local L2-02 membership dependency"
Invoke-LocalSql -Path $membershipMigrationPath | Out-Null

if (-not (Test-LocalColumn `
  -TableName "billing_memberships" `
  -ColumnName "last_stripe_event_id")) {
  Write-Host "LEAN-L4-01 local L2-05 verified-event dependency"
  Invoke-LocalSql -Path $webhookMigrationPath | Out-Null
} else {
  Write-Host "LEAN-L4-01 local L2-05 verified-event dependency already present"
}

Write-Host "LEAN-L4-01 local L3 credit dependencies"
Invoke-LocalSql -Path $creditSchemaMigrationPath | Out-Null
Invoke-LocalSql -Path $grantMigrationPath | Out-Null
Invoke-LocalSql -Path $reservationMigrationPath | Out-Null

Write-Host "LEAN-L4-01 local forward migration"
Invoke-LocalSql -Path $migrationPath | Out-Null
Write-Host "LEAN-L4-01 local forward migration idempotency rerun"
Invoke-LocalSql -Path $migrationPath | Out-Null

Write-Host "LEAN-L4-01 local control, privacy, accounting, and authorization verification"
$runId = [guid]::NewGuid().ToString()
$result = Invoke-LocalSql -Path $testPath -AdditionalVariables @(
  "--set=run_id=$runId"
)
if ($result -notmatch "LEAN_L4_01_LOCAL_BOUNDARIES:\s*21/21 PASS") {
  throw "LEAN-L4-01 boundary summary was not present."
}
if ($result -notmatch "cleanup_residue\s*(?:\r?\n)[-+]+(?:\r?\n)\s*0") {
  throw "LEAN-L4-01 verification did not prove zero residue."
}

Write-Host "LEAN-L4-01 two-session atomic Reader breaker verification"
$actorAId = [guid]::NewGuid().ToString()
$actorBId = [guid]::NewGuid().ToString()
$seedRequestId = [guid]::NewGuid().ToString()
$requestAId = [guid]::NewGuid().ToString()
$requestBId = [guid]::NewGuid().ToString()
$actorAEmail = "lean-l4-01-concurrency-a-$($actorAId.Replace('-', ''))@example.invalid"
$actorBEmail = "lean-l4-01-concurrency-b-$($actorBId.Replace('-', ''))@example.invalid"
$concurrencyVariables = @(
  "--set=actor_a_id=$actorAId",
  "--set=actor_b_id=$actorBId",
  "--set=actor_a_email=$actorAEmail",
  "--set=actor_b_email=$actorBEmail",
  "--set=seed_request_id=$seedRequestId"
)
Invoke-LocalSql `
  -Path $concurrencySetupPath `
  -AdditionalVariables $concurrencyVariables | Out-Null

$jobs = @()
$concurrencySucceeded = $false
try {
  $attempts = @(
    @{ ActorId = $actorAId; RequestId = $requestAId; Fingerprint = "a" },
    @{ ActorId = $actorBId; RequestId = $requestBId; Fingerprint = "b" }
  )
  foreach ($attempt in $attempts) {
    $fingerprint = $attempt.Fingerprint * 64
    $sql = "set role service_role; select result_code from public.begin_ai_metering_request_v1('$($attempt.ActorId)'::uuid, '$($attempt.RequestId)'::uuid, '$fingerprint', 'working.generate', 'lean-launch-v1', 1, 'shadow', 'reader', 0.05, 'lean-reader-guardrail-v1', 10, 100, 600, 300, 50, '2026-08-16 12:00:02+00'::timestamptz);"
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
  $startedCount = @($outcomes | Where-Object { $_ -eq "started" }).Count
  $blockedCount = @(
    $outcomes | Where-Object { $_ -eq "reader_budget_exceeded" }
  ).Count
  if ($outcomes.Count -ne 2 -or $startedCount -ne 1 -or $blockedCount -ne 1) {
    throw "Concurrent Reader outcomes were unexpected: total=$($outcomes.Count), started=$startedCount, blocked=$blockedCount."
  }

  $verifyResult = Invoke-LocalSql `
    -Path $concurrencyVerifyPath `
    -AdditionalVariables @(
      "--set=actor_a_id=$actorAId",
      "--set=actor_b_id=$actorBId",
      "--set=request_a_id=$requestAId",
      "--set=request_b_id=$requestBId"
    )
  if ($verifyResult -notmatch "LEAN_L4_01_CONCURRENCY_VERIFY:\s*PASS") {
    throw "LEAN-L4-01 concurrency verification summary was not present."
  }
  $concurrencySucceeded = $true
  Write-Host "LEAN_L4_01_CONCURRENCY: 2/2 PASS (1 started, 1 safely paused)"
} finally {
  if ($jobs.Count -gt 0) {
    $jobs | Remove-Job -Force -ErrorAction SilentlyContinue
  }
  $cleanupResult = Invoke-LocalSql `
    -Path $concurrencyCleanupPath `
    -AdditionalVariables @(
      "--set=actor_a_id=$actorAId",
      "--set=actor_b_id=$actorBId"
    )
  if ($cleanupResult -notmatch "concurrency_cleanup_residue\s*(?:\r?\n)[-+]+(?:\r?\n)\s*0") {
    throw "LEAN-L4-01 concurrency cleanup did not prove zero residue."
  }
}

if (-not $concurrencySucceeded) {
  throw "LEAN-L4-01 concurrency verification did not complete."
}

Write-Host "LEAN_L4_01_LOCAL_BOUNDARIES: 22/22 PASS"
Write-Host "LEAN_L4_01_LOCAL_RESULT: PASS"
