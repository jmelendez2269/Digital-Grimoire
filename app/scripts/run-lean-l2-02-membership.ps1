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
$migrationPath = Join-Path $repositoryDirectory "supabase\migrations\20260811200000_lean_l2_02_billing_memberships.sql"
$testPath = Join-Path $appDirectory "tests\sql\lean-l2-02-billing-memberships.sql"

foreach ($requiredPath in @($migrationPath, $testPath)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required LEAN-L2-02 SQL file was not found: $requiredPath"
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

Write-Host "LEAN-L2-02 local forward migration"
Invoke-LocalSql -Path $migrationPath | Out-Null

Write-Host "LEAN-L2-02 local schema and authorization verification"
$runId = [guid]::NewGuid().ToString()
$result = Invoke-LocalSql -Path $testPath -AdditionalVariables @(
  "--set=run_id=$runId"
)

if ($result -notmatch "local\s*\|\s*1\s*\|\s*1\s*\|\s*1\s*\|\s*1\s*\|\s*1\s*\|\s*1\s*\|\s*1\s*\|\s*1\s*\|\s*1\s*\|\s*PASS") {
  throw "LEAN-L2-02 PASS summary was not present."
}
if ($result -notmatch "cleanup_residue\s*(?:\r?\n)[-+]+(?:\r?\n)\s*0") {
  throw "LEAN-L2-02 did not prove zero fixture residue."
}

Write-Host "LEAN_L2_02_LOCAL_RESULT: PASS"
