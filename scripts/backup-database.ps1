#!/usr/bin/env pwsh
# Database Backup Script for Supabase
# Supports backup to NAS and/or Cloudflare R2

param(
    [string]$Destination = "both",  # "nas", "r2", or "both"
    [string]$NasPath = "",
    [string]$R2Bucket = "database-backups",
    [switch]$SkipUpload = $false
)

# Load environment variables from app/.env.local
$envPath = Join-Path $PSScriptRoot ".." "app" ".env.local"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Configuration
$BackupDir = Join-Path $PSScriptRoot ".." "backups"
$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$SupabasePassword = $env:SUPABASE_DB_PASSWORD  # You'll need to add this to .env.local

# R2 Configuration (from environment)
$R2Endpoint = $env:R2_ENDPOINT
$R2AccessKey = $env:R2_ACCESS_KEY_ID
$R2SecretKey = $env:R2_SECRET_ACCESS_KEY

# NAS Configuration (set via parameter or environment)
if (-not $NasPath) {
    $NasPath = $env:NAS_BACKUP_PATH  # e.g., "\\192.168.1.100\backups" or "Z:\backups"
}

Write-Host ""
Write-Host "🗄️  Supabase Database Backup Script" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Validate configuration
$errors = @()

if (-not $SupabaseUrl) {
    $errors += "NEXT_PUBLIC_SUPABASE_URL not found in environment"
}

if ($Destination -match "r2|both") {
    if (-not $R2Endpoint) { $errors += "R2_ENDPOINT not found in environment" }
    if (-not $R2AccessKey) { $errors += "R2_ACCESS_KEY_ID not found in environment" }
    if (-not $R2SecretKey) { $errors += "R2_SECRET_ACCESS_KEY not found in environment" }
}

if ($Destination -match "nas|both") {
    if (-not $NasPath) {
        $errors += "NAS path not specified. Use -NasPath parameter or set NAS_BACKUP_PATH environment variable"
    }
}

if ($errors.Count -gt 0) {
    Write-Host "❌ Configuration Errors:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   • $error" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "💡 Tip: Add SUPABASE_DB_PASSWORD to app/.env.local" -ForegroundColor Yellow
    Write-Host "   Format: SUPABASE_DB_PASSWORD=your-database-password" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📖 See: docs/Setup Docs/DATABASE_BACKUP_SETUP.md" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Create backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "📁 Created backup directory: $BackupDir" -ForegroundColor Green
}

# Generate timestamp and filename
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = Join-Path $BackupDir "supabase-backup-$timestamp.sql"
$backupFileName = "supabase-backup-$timestamp.sql"

Write-Host "📅 Backup Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host "📦 Backup File: $backupFileName" -ForegroundColor Yellow
Write-Host ""

# Step 1: Create backup using Supabase Dashboard API or pg_dump
Write-Host "1️⃣ Creating database backup..." -ForegroundColor Cyan

# Option A: Use pg_dump if available
if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
    Write-Host "   Using pg_dump..." -ForegroundColor Gray
    
    # Extract host from Supabase URL
    if ($SupabaseUrl -match 'https://([^.]+)\.supabase\.co') {
        $host = $matches[1] + ".supabase.co"
    } else {
        Write-Host "   ❌ Could not parse Supabase URL" -ForegroundColor Red
        exit 1
    }
    
    $connectionString = "postgresql://postgres.${host}:5432/postgres"
    
    try {
        $env:PGPASSWORD = $SupabasePassword
        pg_dump "$connectionString" `
            --username=postgres `
            --no-owner `
            --no-acl `
            --clean `
            --if-exists `
            --file=$backupFile 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Backup created successfully" -ForegroundColor Green
        } else {
            throw "pg_dump failed with exit code $LASTEXITCODE"
        }
    } catch {
        Write-Host "   ❌ pg_dump failed: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "   💡 Alternative: Use Supabase Dashboard → Settings → Database → Create backup" -ForegroundColor Yellow
        Write-Host "      Then download and place in: $BackupDir" -ForegroundColor Yellow
        exit 1
    } finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "   ⚠️  pg_dump not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Please install PostgreSQL client tools:" -ForegroundColor Yellow
    Write-Host "   https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Or create backup manually:" -ForegroundColor Yellow
    Write-Host "   1. Go to Supabase Dashboard → Settings → Database" -ForegroundColor Yellow
    Write-Host "   2. Click 'Create backup'" -ForegroundColor Yellow
    Write-Host "   3. Download and save to: $BackupDir" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Verify backup file exists and has content
if (-not (Test-Path $backupFile)) {
    Write-Host "   ❌ Backup file was not created" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $backupFile).Length
if ($fileSize -eq 0) {
    Write-Host "   ❌ Backup file is empty" -ForegroundColor Red
    Remove-Item $backupFile -Force
    exit 1
}

$fileSizeMB = [math]::Round($fileSize / 1MB, 2)
Write-Host "   📊 Backup size: $fileSizeMB MB" -ForegroundColor Green
Write-Host ""

# Step 2: Upload to Cloudflare R2
if (($Destination -match "r2|both") -and -not $SkipUpload) {
    Write-Host "2️⃣ Uploading to Cloudflare R2..." -ForegroundColor Cyan
    
    try {
        # Check if AWS SDK is available (via Node.js)
        $nodeAvailable = Get-Command node -ErrorAction SilentlyContinue
        $npmAvailable = Get-Command npm -ErrorAction SilentlyContinue
        
        if ($nodeAvailable -and $npmAvailable) {
            # Create temporary upload script
            $uploadScript = @"
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

async function uploadBackup() {
  const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const backupFile = process.argv[2];
  const bucketName = process.argv[3];
  const fileName = path.basename(backupFile);

  const fileContent = fs.readFileSync(backupFile);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: \`database-backups/\${fileName}\`,
    Body: fileContent,
    ContentType: 'application/sql',
  });

  await client.send(command);
  console.log(\`✅ Uploaded to R2: database-backups/\${fileName}\`);
}

uploadBackup().catch(console.error);
"@
            
            $tempScript = Join-Path $env:TEMP "upload-backup-$(Get-Random).js"
            $uploadScript | Out-File -FilePath $tempScript -Encoding UTF8
            
            # Set environment variables for Node script
            $env:R2_ENDPOINT = $R2Endpoint
            $env:R2_ACCESS_KEY_ID = $R2AccessKey
            $env:R2_SECRET_ACCESS_KEY = $R2SecretKey
            
            # Run upload script
            $uploadOutput = node $tempScript $backupFile $R2Bucket 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Uploaded to Cloudflare R2" -ForegroundColor Green
                Write-Host "   📍 Location: r2://$R2Bucket/database-backups/$backupFileName" -ForegroundColor Gray
            } else {
                throw "Upload failed: $uploadOutput"
            }
            
            # Cleanup
            Remove-Item $tempScript -ErrorAction SilentlyContinue
        } else {
            Write-Host "   ⚠️  Node.js not found - skipping R2 upload" -ForegroundColor Yellow
            Write-Host "   💡 Install Node.js to enable R2 uploads" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ❌ R2 upload failed: $_" -ForegroundColor Red
        Write-Host "   💡 Backup saved locally at: $backupFile" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Step 3: Copy to NAS
if (($Destination -match "nas|both") -and -not $SkipUpload) {
    Write-Host "3️⃣ Copying to NAS..." -ForegroundColor Cyan
    
    try {
        # Test NAS connection
        if (-not (Test-Path $NasPath)) {
            Write-Host "   ⚠️  NAS path not accessible: $NasPath" -ForegroundColor Yellow
            Write-Host "   💡 Check network connection and path" -ForegroundColor Yellow
        } else {
            # Create backup subdirectory on NAS if it doesn't exist
            $nasBackupDir = Join-Path $NasPath "supabase-backups"
            if (-not (Test-Path $nasBackupDir)) {
                New-Item -ItemType Directory -Path $nasBackupDir -Force | Out-Null
            }
            
            $nasBackupFile = Join-Path $nasBackupDir $backupFileName
            
            # Copy file
            Copy-Item -Path $backupFile -Destination $nasBackupFile -Force
            
            if (Test-Path $nasBackupFile) {
                Write-Host "   ✅ Copied to NAS" -ForegroundColor Green
                Write-Host "   📍 Location: $nasBackupFile" -ForegroundColor Gray
            } else {
                throw "File copy verification failed"
            }
        }
    } catch {
        Write-Host "   ❌ NAS copy failed: $_" -ForegroundColor Red
        Write-Host "   💡 Backup saved locally at: $backupFile" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Step 4: Cleanup old local backups (keep last 7 days)
Write-Host "4️⃣ Cleaning up old backups..." -ForegroundColor Cyan

try {
    $cutoffDate = (Get-Date).AddDays(-7)
    $oldBackups = Get-ChildItem -Path $BackupDir -Filter "supabase-backup-*.sql" | 
        Where-Object { $_.LastWriteTime -lt $cutoffDate }
    
    if ($oldBackups.Count -gt 0) {
        $oldBackups | Remove-Item -Force
        Write-Host "   ✅ Removed $($oldBackups.Count) backup(s) older than 7 days" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  No old backups to clean up" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  Cleanup failed: $_" -ForegroundColor Yellow
}

Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Backup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Local Backup: $backupFile" -ForegroundColor Yellow
Write-Host "📊 Size: $fileSizeMB MB" -ForegroundColor Yellow
Write-Host ""

if ($Destination -match "r2|both") {
    Write-Host "☁️  Cloudflare R2: r2://$R2Bucket/database-backups/$backupFileName" -ForegroundColor Cyan
}

if ($Destination -match "nas|both") {
    Write-Host "💾 NAS: $nasBackupFile" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "   • Test restore capability monthly" -ForegroundColor Gray
Write-Host "   • Keep backups for at least 30 days" -ForegroundColor Gray
Write-Host "   • Upgrade to Supabase Pro for automated backups when ready" -ForegroundColor Gray
Write-Host ""







