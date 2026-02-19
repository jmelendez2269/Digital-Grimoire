# Script to clear git locks and OneDrive conflict files

$repoPath = $PSScriptRoot
$gitPath = Join-Path $repoPath ".git"

Write-Host "Checking for Git locks and OneDrive conflicts in: $gitPath"

if (-not (Test-Path $gitPath)) {
    Write-Host "Error: .git directory not found. Are you in the root of the repository?"
    exit 1
}

# 1. Clear Git index.lock
$indexLock = Join-Path $gitPath "index.lock"
if (Test-Path $indexLock) {
    Write-Host "Removing git index.lock..."
    Remove-Item $indexLock -Force
    Write-Host "Done: index.lock removed."
}
else {
    Write-Host "Info: No index.lock found."
}

# 2. Clear OneDrive conflict files in .git
Write-Host "Looking for OneDrive conflict files (e.g., *-DESKTOP-*)..."
$conflictFiles = Get-ChildItem -Path $gitPath -Filter "*-DESKTOP-*" -Recurse

if ($conflictFiles) {
    Write-Host "Warning: Found $($conflictFiles.Count) conflict files in .git folder."
    foreach ($file in $conflictFiles) {
        Write-Host "Deleting: $($file.FullName)"
        Remove-Item $file.FullName -Force
    }
    Write-Host "Done: Conflict files cleared."
}
else {
    Write-Host "Info: No OneDrive conflict files found in .git."
}

Write-Host "`nCleanup complete! You should be able to run git commands now."
