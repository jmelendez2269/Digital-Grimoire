# Pre-Migration Backup Guide

**Purpose:** Create a database backup before running Migration 027 (RLS policies)  
**Time:** 2-5 minutes  
**Difficulty:** Easy

---

## ⚠️ Important: Free Tier Limitation

**Free Plan does not include scheduled backups.** The Supabase Dashboard backup feature requires a Pro Plan upgrade.

However, we have alternative backup methods that work on Free tier:

---

## Option 1: Backup RLS Policies Only (Quick - 2 minutes)

This is the fastest option and perfect for this migration since we're only changing RLS policies.

### Steps:

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard
   - Select your "Digital Grimoire" project
   - Click **SQL Editor** → **New query**

2. **Run Backup Script**
   - Open: `migrations/027_backup_current_rls_policies.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**

3. **Save Results**
   - Right-click on the results → **Copy** (or Ctrl+C)
   - Create a new file: `backups/pre-migration-027-rls-backup-YYYY-MM-DD.txt`
   - Paste the results and save

**What this backs up:**
- ✅ Current RLS policy definitions for all 8 tables
- ✅ Current RLS enabled/disabled status
- ✅ All policy details (roles, operations, clauses)

**Limitations:**
- ❌ Does NOT backup table data
- ❌ Does NOT backup other database objects

**When to use:** Perfect for this migration since we're only changing RLS policies, not data.

---

## Option 2: Full Database Backup with pg_dump (Recommended for Full Backup)

If you have `pg_dump` installed and configured, you can use the existing backup script.

### Prerequisites:
- PostgreSQL client tools installed (`pg_dump` command available)
- `SUPABASE_DB_PASSWORD` in `app/.env.local`
- `NEXT_PUBLIC_SUPABASE_URL` in `app/.env.local`

### Steps:

1. **Verify Configuration**
   ```powershell
   # Check if pg_dump is available
   pg_dump --version
   ```

2. **Run Backup Script**
   ```powershell
   cd "Digital-Grimoire"
   .\scripts\backup-database.ps1 -Destination local
   ```

3. **Backup Location**
   - Local backup will be saved to: `Digital-Grimoire/backups/`
   - Filename format: `supabase-backup-YYYY-MM-DD_HH-mm-ss.sql`

---

## Option 3: Manual SQL Export (If pg_dump Not Available)

If you don't have `pg_dump` installed, you can manually export critical data:

1. **Export Critical Tables**
   - Go to Supabase Dashboard → Table Editor
   - For each important table, click the table → Export → CSV
   - Save to `backups/pre-migration-027-data/`

2. **Export Schema**
   - Go to SQL Editor
   - Run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
   - Note all table names for reference

**Note:** This is time-consuming and doesn't capture everything. Use Option 1 or 2 if possible.

---

## Restoring from Backup (If Needed)

If something goes wrong with the migration, you can restore:

### Restore RLS Policies (If using Option 1 backup)

If you backed up RLS policies and need to restore them:

1. **Review Your Backup File**
   - Open: `backups/pre-migration-027-rls-backup-YYYY-MM-DD.txt`
   - Review the policy definitions

2. **Recreate Policies Manually**
   - Use the backup file as reference
   - Recreate policies in SQL Editor using the saved definitions
   - Or contact support if you need help

**Note:** This only restores RLS policies, not table data. For full restore, use pg_dump backup.

### Restore from pg_dump Backup (If using Option 2)

If you created a backup using `pg_dump`:

1. **Restore Using psql**
   ```powershell
   # Set password
   $env:PGPASSWORD = "your-database-password"
   
   # Restore from backup
   psql "postgresql://postgres.your-project.supabase.co:5432/postgres" -U postgres -f "backups/supabase-backup-YYYY-MM-DD_HH-mm-ss.sql"
   ```

2. **Or Restore via SQL Editor**
   - Open your backup file
   - Copy entire contents
   - Paste into Supabase SQL Editor
   - Click **Run**

   **⚠️ Warning:** This will overwrite your current database state!

---

## What Gets Backed Up?

The backup includes:
- ✅ All table schemas
- ✅ All data in tables
- ✅ All RLS policies (current state)
- ✅ All indexes
- ✅ All functions and triggers
- ✅ All sequences

**Note:** The backup does NOT include:
- ❌ Supabase Auth users (stored separately)
- ❌ Storage buckets/files (stored separately)

---

## Recommended Backup Naming

For easy identification, name your backup:
- `pre-migration-027-rls-policies-YYYY-MM-DD.sql`
- Or use Supabase's automatic naming and note the timestamp

---

## After Migration

Once you've verified the migration worked:

1. ✅ Run verification script: `migrations/027_verify_rls_status.sql`
2. ✅ Check Security Advisor shows 0 RLS errors
3. ✅ Test your application to ensure everything works
4. ✅ Keep the backup for at least 7 days (or until you're confident)

---

## Quick Checklist

Before running Migration 027:

- [ ] **Option 1 (Recommended):** Ran `027_backup_current_rls_policies.sql` and saved results
- [ ] **OR Option 2:** Created full backup using `pg_dump` script
- [ ] Saved backup file to `backups/` folder
- [ ] Noted backup timestamp/date
- [ ] Ready to proceed with migration

## Which Backup Method Should I Use?

**For this migration (RLS policies only):**
- ✅ **Use Option 1** - Quick, lightweight, perfect for RLS policy changes

**For full database backup:**
- ✅ **Use Option 2** - Complete backup of all data and schema
- ⚠️ Requires `pg_dump` installation and configuration

---

## Need Help?

- **Backup failed?** See: `docs/Setup Docs/DATABASE_BACKUP_SETUP.md`
- **Can't find backup?** Check Supabase Dashboard → Settings → Database → Backups
- **Restore issues?** Contact Supabase support or check their documentation
