# Database Backup Setup Guide

**Last Updated:** November 10, 2025  
**Purpose:** Manual database backup system for Supabase Free Tier  
**Time Estimate:** 30-45 minutes initial setup

---

## Overview

This guide sets up a manual database backup system that works with Supabase Free Tier. The backup script can save backups to:
- **Local storage** (project `backups/` folder)
- **Cloudflare R2** (cloud storage)
- **NAS** (network-attached storage)

**Why Manual Backups?**
- Supabase Free Tier doesn't include automated daily backups
- Manual backups are free and sufficient for MVP/early launch
- Upgrade to Pro ($25/month) when you have paying customers

---

## Prerequisites

- ✅ Supabase project created
- ✅ Cloudflare R2 account (optional, for cloud backups)
- ✅ NAS access (optional, for network backups)
- ✅ PostgreSQL client tools (for `pg_dump`)

---

## Step 1: Install PostgreSQL Client Tools

The backup script uses `pg_dump` to create database backups.

### Windows Installation

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download the installer (recommended: latest stable version)
   - Or use portable version if preferred

2. **Install:**
   - Run the installer
   - **Important:** During installation, make sure to add PostgreSQL to PATH
   - Or manually add to PATH: `C:\Program Files\PostgreSQL\<version>\bin`

3. **Verify Installation:**
   ```powershell
   pg_dump --version
   ```
   Should output: `pg_dump (PostgreSQL) <version>`

### Alternative: Portable Version

If you prefer not to install PostgreSQL:

1. Download portable PostgreSQL from: https://www.enterprisedb.com/download-postgresql-binaries
2. Extract to a folder (e.g., `C:\tools\postgresql`)
3. Add `C:\tools\postgresql\bin` to your PATH

---

## Step 2: Get Database Password

You need your Supabase database password to create backups.

1. **Go to Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Get Connection String:**
   - Go to **Settings** → **Database**
   - Scroll to **Connection string** section
   - Click **"Reveal"** next to the password
   - Copy the password (you'll need this in the next step)

3. **Save Password Securely:**
   - Add to `app/.env.local` (see Step 3)

---

## Step 3: Configure Environment Variables

Add the database password to your environment file.

### Add to `app/.env.local`

Open `Digital-Grimoire/app/.env.local` and add:

```env
# Database Backup Configuration
# Get password from: Supabase Dashboard → Settings → Database → Connection string
SUPABASE_DB_PASSWORD=your-database-password-here
```

**Security Note:** The `.env.local` file is already in `.gitignore`, so your password won't be committed to git.

### Verify Existing Variables

Make sure these are already in `app/.env.local` (from previous setup):

```env
# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Cloudflare R2 (for R2 backups - should already exist)
R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
```

---

## Step 4: Configure NAS Path (Optional)

If you want to backup to a NAS, configure the path.

### Option A: Environment Variable (Recommended)

Add to `app/.env.local`:

```env
# NAS Backup Path (Windows network share)
NAS_BACKUP_PATH=\\192.168.1.100\backups
# Or use mapped drive:
# NAS_BACKUP_PATH=Z:\backups
```

### Option B: Script Parameter

You can also specify the NAS path when running the script (see Usage section).

### NAS Path Formats

- **Network Share:** `\\192.168.1.100\backups` or `\\nas-server\backups`
- **Mapped Drive:** `Z:\backups` (if you've mapped the NAS to a drive letter)
- **UNC Path:** `\\server-name\share-name\folder`

**Note:** Make sure the NAS is accessible from your computer and you have write permissions.

---

## Step 5: Create R2 Backup Bucket (Optional)

If you want to backup to Cloudflare R2, create a dedicated bucket.

1. **Go to Cloudflare Dashboard:**
   - Navigate to: https://dash.cloudflare.com
   - Click **R2 Object Storage**

2. **Create Bucket:**
   - Click **Create bucket**
   - Name: `database-backups` (or your preferred name)
   - Location: **Automatic** (recommended)
   - Click **Create bucket**

3. **Verify R2 Credentials:**
   - Your R2 credentials should already be in `app/.env.local`
   - If not, see: `docs/Setup Docs/CLOUDFLARE_R2_SETUP.md`

**Note:** The script uses the bucket name `database-backups` by default. You can change it with the `-R2Bucket` parameter.

---

## Step 6: Test the Backup Script

Run a test backup to verify everything works.

### Basic Test (Local Only)

```powershell
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire"
.\scripts\backup-database.ps1 -SkipUpload
```

This creates a local backup without uploading anywhere.

### Test with R2 Upload

```powershell
.\scripts\backup-database.ps1 -Destination r2
```

### Test with NAS Copy

```powershell
.\scripts\backup-database.ps1 -Destination nas -NasPath "\\192.168.1.100\backups"
```

### Test with Both

```powershell
.\scripts\backup-database.ps1 -Destination both
```

**Expected Output:**
```
🗄️  Supabase Database Backup Script
═══════════════════════════════════════════════════

📅 Backup Date: 2025-11-10 20:00:00
📦 Backup File: supabase-backup-2025-11-10_20-00-00.sql

1️⃣ Creating database backup...
   Using pg_dump...
   ✅ Backup created successfully
   📊 Backup size: 2.45 MB

2️⃣ Uploading to Cloudflare R2...
   ✅ Uploaded to Cloudflare R2
   📍 Location: r2://database-backups/database-backups/supabase-backup-2025-11-10_20-00-00.sql

3️⃣ Copying to NAS...
   ✅ Copied to NAS
   📍 Location: \\192.168.1.100\backups\supabase-backups\supabase-backup-2025-11-10_20-00-00.sql

4️⃣ Cleaning up old backups...
   ℹ️  No old backups to clean up

═══════════════════════════════════════════════════
✅ Backup Complete!
```

---

## Usage

### Command-Line Options

```powershell
.\scripts\backup-database.ps1 [options]
```

**Parameters:**

- `-Destination` - Where to save backup: `"nas"`, `"r2"`, or `"both"` (default: `"both"`)
- `-NasPath` - NAS path (overrides `NAS_BACKUP_PATH` environment variable)
- `-R2Bucket` - R2 bucket name (default: `"database-backups"`)
- `-SkipUpload` - Create backup locally only, skip all uploads

### Examples

**Backup to both NAS and R2:**
```powershell
.\scripts\backup-database.ps1 -Destination both
```

**Backup to NAS only:**
```powershell
.\scripts\backup-database.ps1 -Destination nas
```

**Backup to R2 only:**
```powershell
.\scripts\backup-database.ps1 -Destination r2
```

**Backup with custom NAS path:**
```powershell
.\scripts\backup-database.ps1 -Destination both -NasPath "\\192.168.1.100\backups"
```

**Local backup only (no uploads):**
```powershell
.\scripts\backup-database.ps1 -SkipUpload
```

---

## Automated Weekly Backups

Set up Windows Task Scheduler to run backups automatically.

### Create Scheduled Task

1. **Open Task Scheduler:**
   - Press `Win + R`
   - Type: `taskschd.msc`
   - Press Enter

2. **Create Basic Task:**
   - Click **Create Basic Task** (right sidebar)
   - Name: `Supabase Database Backup`
   - Description: `Weekly database backup to NAS and R2`
   - Click **Next**

3. **Set Trigger:**
   - Trigger: **Weekly**
   - Start: Choose a time (e.g., Sunday 8:00 PM)
   - Recur every: **1 weeks**
   - Click **Next**

4. **Set Action:**
   - Action: **Start a program**
   - Program/script: `powershell.exe`
   - Add arguments:
     ```powershell
     -File "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\scripts\backup-database.ps1" -Destination both
     ```
   - Start in:
     ```powershell
     "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire"
     ```
   - Click **Next**

5. **Finish:**
   - Review settings
   - Check **"Open the Properties dialog for this task when I click Finish"**
   - Click **Finish**

6. **Configure Task Properties:**
   - **General Tab:**
     - Check **"Run whether user is logged on or not"**
     - Check **"Run with highest privileges"**
   - **Conditions Tab:**
     - Uncheck **"Start the task only if the computer is on AC power"** (if you want backups on battery)
   - Click **OK**

7. **Test the Task:**
   - Right-click the task → **Run**
   - Check that backup was created successfully

### Manual Task Execution

You can also run the scheduled task manually:
- Task Scheduler → Find your task → Right-click → **Run**

---

## Backup Storage Locations

### Local Backups

- **Location:** `Digital-Grimoire/backups/`
- **Retention:** 7 days (automatically cleaned up)
- **Format:** `supabase-backup-YYYY-MM-DD_HH-mm-ss.sql`

### Cloudflare R2 Backups

- **Location:** `r2://database-backups/database-backups/`
- **Retention:** Manual (you control via R2 lifecycle rules)
- **Access:** Cloudflare Dashboard → R2 → database-backups bucket

### NAS Backups

- **Location:** `\\nas-server\backups\supabase-backups\` (or your configured path)
- **Retention:** Manual (depends on NAS storage capacity)
- **Access:** Network share or mapped drive

---

## Restoring from Backup

### Test Restore (Monthly Verification)

It's important to test that your backups can be restored.

1. **Create Test Supabase Project:**
   - Go to Supabase Dashboard
   - Create a new test project (or use a temporary one)

2. **Restore Backup:**
   - Download backup from R2 or NAS
   - Go to test project → SQL Editor
   - Run the SQL backup file (or use `psql` to restore)

3. **Verify Data:**
   - Check that tables exist
   - Verify sample data is present
   - Test a few queries

4. **Delete Test Project:**
   - Clean up the test project after verification

### Emergency Restore

If you need to restore production:

1. **Download Latest Backup:**
   - From R2: Cloudflare Dashboard → R2 → Download
   - From NAS: Copy from network share
   - From Local: Use file from `backups/` folder

2. **Restore to Supabase:**
   - **Option A:** Supabase Dashboard → SQL Editor → Paste and run SQL
   - **Option B:** Use `psql` command-line tool:
     ```powershell
     psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f backup-file.sql
     ```

3. **Verify Restore:**
   - Check critical tables
   - Test application functionality
   - Verify user data integrity

---

## Troubleshooting

### Error: "pg_dump not found"

**Solution:**
- Install PostgreSQL client tools (see Step 1)
- Verify `pg_dump` is in PATH: `pg_dump --version`
- Restart PowerShell after installation

### Error: "SUPABASE_DB_PASSWORD not found"

**Solution:**
- Add `SUPABASE_DB_PASSWORD` to `app/.env.local`
- Get password from Supabase Dashboard → Settings → Database
- Restart PowerShell after adding variable

### Error: "NAS path not accessible"

**Solutions:**
- Verify NAS is powered on and accessible
- Check network connection
- Test NAS path manually: `Test-Path "\\nas-server\backups"`
- Verify you have write permissions on NAS
- Try mapping NAS to a drive letter first

### Error: "R2 upload failed"

**Solutions:**
- Verify R2 credentials in `app/.env.local`
- Check R2 bucket exists: `database-backups`
- Verify R2 API token has write permissions
- Check internet connection
- Verify Node.js is installed (required for R2 upload)

### Error: "Could not parse Supabase URL"

**Solution:**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is in correct format
- Should be: `https://xxxxx.supabase.co`
- Check for typos in environment variable

### Backup File is Empty

**Solutions:**
- Verify database password is correct
- Check Supabase project is active
- Verify network connection to Supabase
- Try creating backup manually via Supabase Dashboard first

---

## Backup Schedule Recommendations

### Before Launch

- **Daily:** For the week before launch
- **Before any migration:** Always backup first
- **Before major changes:** Always backup first

### After Launch

- **Weekly:** Every Sunday evening (automated via Task Scheduler)
- **Before migrations:** Always backup first
- **Before major updates:** Always backup first

### Monthly Verification

- **Test restore:** Once per month, restore a backup to a test project
- **Verify integrity:** Check that data is correct after restore
- **Document issues:** Note any problems with backup/restore process

---

## Cost Considerations

### Free Tier (Current Setup)

- **PostgreSQL Client Tools:** Free
- **Local Storage:** Free (uses your disk space)
- **Cloudflare R2:** Free tier (10GB storage, 1M operations/month)
- **NAS:** Free (uses your existing NAS)
- **Total Cost:** $0/month

### When to Upgrade to Supabase Pro

Upgrade to Pro ($25/month) when:
- ✅ You have 10-15 paying customers
- ✅ Database size > 500MB
- ✅ You need automated daily backups
- ✅ You need point-in-time recovery
- ✅ You need longer backup retention

**Benefits of Pro:**
- Automated daily backups
- 7-day point-in-time recovery
- Longer backup retention
- More database connections
- Priority support

---

## Security Best Practices

1. **Password Security:**
   - Never commit `app/.env.local` to git (already in `.gitignore`)
   - Store database password securely
   - Rotate password periodically

2. **Backup Storage:**
   - R2 backups are encrypted at rest
   - NAS backups should be on encrypted storage
   - Local backups should be in secure location

3. **Access Control:**
   - Limit who can access backup files
   - Use strong passwords for NAS access
   - Rotate R2 API keys periodically

4. **Backup Verification:**
   - Test restore capability monthly
   - Verify backup file integrity
   - Keep multiple backup copies

---

## Maintenance

### Weekly Tasks

- ✅ Verify scheduled backup ran successfully
- ✅ Check backup file sizes (should be consistent)
- ✅ Verify R2 uploads succeeded
- ✅ Verify NAS copies succeeded

### Monthly Tasks

- ✅ Test restore from backup
- ✅ Review backup storage usage
- ✅ Clean up old backups (if needed)
- ✅ Verify backup script still works

### Quarterly Tasks

- ✅ Review backup strategy
- ✅ Update documentation if needed
- ✅ Test disaster recovery procedure
- ✅ Consider upgrading to Pro if revenue justifies

---

## Reference

### Related Documentation

- **Cloudflare R2 Setup:** `docs/Setup Docs/CLOUDFLARE_R2_SETUP.md`
- **Production Checklist:** `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **Next Sprint:** `docs/planning/NEXT_SPRINT_TO_GO_LIVE.md`

### Script Location

- **Backup Script:** `scripts/backup-database.ps1`
- **Backup Storage:** `backups/` (local), R2 bucket, NAS

### Support

If you encounter issues:
1. Check Troubleshooting section above
2. Review script output for error messages
3. Verify all prerequisites are installed
4. Test each component individually (pg_dump, R2, NAS)

---

**Last Updated:** November 10, 2025  
**Version:** 1.0  
**Status:** ✅ Ready for Production Use









