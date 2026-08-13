param(
  [ValidateSet("local")]
  [string]$Target = "local"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($Target -ne "local") {
  throw "This runner is intentionally local-only. Use the documented direct staging psql command for staging."
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDirectory = Split-Path -Parent $scriptDirectory
$sqlPath = Join-Path $appDirectory "tests\sql\lean-l0-02-authorization-baseline.sql"

if (-not (Test-Path -LiteralPath $sqlPath -PathType Leaf)) {
  throw "Authorization baseline SQL file was not found."
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

$sql = Get-Content -Raw -LiteralPath $sqlPath
$sql | docker exec -i $databaseContainers[0] psql `
  -U postgres `
  -d postgres `
  --set=ON_ERROR_STOP=1 `
  --set=prismarium_target=local

if ($LASTEXITCODE -ne 0) {
  throw "LEAN-L0-02 local authorization baseline failed to execute."
}
