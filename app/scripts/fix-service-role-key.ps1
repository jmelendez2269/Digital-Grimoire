# Script to fix Supabase Service Role Key mismatch
# This script helps update the service role key to match the correct project

Write-Host "🔧 Supabase Service Role Key Fix Script" -ForegroundColor Cyan
Write-Host ""

# Read current .env.local
$envPath = Join-Path $PSScriptRoot "..\.env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ Error: .env.local file not found at $envPath" -ForegroundColor Red
    exit 1
}

$content = Get-Content $envPath -Raw

# Extract current values
$urlMatch = if ($content -match 'NEXT_PUBLIC_SUPABASE_URL=(.+)') { $matches[1].Trim() } else { $null }
$anonKeyMatch = if ($content -match 'NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)') { $matches[1].Trim() -replace '\s+','' } else { $null }
$serviceKeyMatch = if ($content -match 'SUPABASE_SERVICE_ROLE_KEY=(.+)') { $matches[1].Trim() -replace '\s+','' } else { $null }

# Decode project refs
function Get-ProjectRef {
    param($jwt)
    if (-not $jwt) { return $null }
    $parts = $jwt -split '\.'
    if ($parts.Length -lt 2) { return $null }
    try {
        $payload = $parts[1]
        # Add padding if needed
        $padding = (4 - ($payload.Length % 4)) % 4
        $payload += '=' * $padding
        $payloadBytes = [System.Convert]::FromBase64String($payload)
        $payloadJson = [System.Text.Encoding]::UTF8.GetString($payloadBytes)
        $json = $payloadJson | ConvertFrom-Json
        return $json.ref
    } catch {
        return $null
    }
}

$urlRef = if ($urlMatch) { ($urlMatch -match 'https://([^.]+)\.supabase\.co') ? $matches[1] : $null } else { $null }
$anonRef = Get-ProjectRef $anonKeyMatch
$serviceRef = Get-ProjectRef $serviceKeyMatch

Write-Host "Current Configuration:" -ForegroundColor Yellow
Write-Host "  URL Project:        $urlRef"
Write-Host "  Anon Key Project:  $anonRef"
Write-Host "  Service Key Project: $serviceRef"
Write-Host ""

if ($urlRef -eq $anonRef -and $urlRef -eq $serviceRef) {
    Write-Host "✅ All keys match! No fix needed." -ForegroundColor Green
    exit 0
}

if ($urlRef -ne $serviceRef) {
    Write-Host "⚠️  MISMATCH DETECTED!" -ForegroundColor Red
    Write-Host "  URL/Anon Key: $urlRef"
    Write-Host "  Service Key:  $serviceRef"
    Write-Host ""
    Write-Host "To fix this:" -ForegroundColor Yellow
    Write-Host "1. Go to https://supabase.com/dashboard"
    Write-Host "2. Select project: $urlRef"
    Write-Host "3. Go to Settings -> API"
    Write-Host "4. Copy the service_role key (secret)"
    Write-Host ""
    Write-Host "Then run this script with the new key:" -ForegroundColor Cyan
    Write-Host "  .\fix-service-role-key.ps1 -NewKey `"your-service-role-key-here`""
    Write-Host ""
    
    if ($args.Count -gt 0 -or $PSBoundParameters.ContainsKey("NewKey")) {
        $newKey = if ($PSBoundParameters.ContainsKey("NewKey")) { $PSBoundParameters.NewKey } else { $args[0] }
        
        if (-not $newKey) {
            Write-Host "❌ Error: No new key provided" -ForegroundColor Red
            exit 1
        }
        
        $newKeyRef = Get-ProjectRef $newKey
        if ($newKeyRef -ne $urlRef) {
            Write-Host "❌ Error: New key is from project $newKeyRef, but URL is from $urlRef" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ New key matches URL project!" -ForegroundColor Green
        Write-Host "Updating .env.local..." -ForegroundColor Yellow
        
        # Update the service role key
        $lines = $content -split "`n"
        $newLines = @()
        foreach ($line in $lines) {
            if ($line.StartsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
                $newLines += "SUPABASE_SERVICE_ROLE_KEY=$newKey"
            } else {
                $newLines += $line
            }
        }
        $newContent = $newLines -join "`n"
        $newContent | Set-Content $envPath -NoNewline
        
        Write-Host "✅ Updated .env.local successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Restart your dev server for changes to take effect:" -ForegroundColor Yellow
        Write-Host "   1. Stop the server (Ctrl+C)"
        Write-Host "   2. Run: pnpm dev"
    }
}

