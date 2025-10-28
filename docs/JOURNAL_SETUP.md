# Study Journal Setup Guide

## Quick Fix for "Failed to create new page" Error

The Study Journal feature requires the `journal_pages` table in your Supabase database.

### Step-by-Step Setup

1. **Open Supabase Dashboard**
   - Go to [app.supabase.com](https://app.supabase.com)
   - Select your Digital Grimoire project

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Run the Migration**
   - Open the file: `migrations/015_add_journal_pages_SAFE.sql` (recommended)
     - This version includes all dependencies and uses `IF NOT EXISTS` checks
     - Safe to run multiple times
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **RUN** (or press Cmd/Ctrl + Enter)

4. **Verify Success**
   - You should see "Success. No rows returned"
   - The `journal_pages` table is now created!

5. **Test the Feature**
   - Go back to `localhost:3000/journal`
   - Click "Create First Page"
   - It should now work! ✨

## What This Migration Does

The migration creates:
- **journal_pages table** - Stores journal entries with rich text content
- **Indexes** - For fast queries (by user, date, parent page)
- **RLS Policies** - Ensures users can only access their own pages
- **Auto-update trigger** - Automatically updates `updated_at` timestamps

## Features Enabled

Once the migration is run, you'll have access to:
- ✅ Create journal pages with rich text editing
- ✅ Search through your pages
- ✅ Archive/unarchive pages
- ✅ Delete pages
- ✅ Custom emoji icons for each page
- ✅ Automatic timestamps (created/updated)

## Troubleshooting

### Error: "EBUSY: resource busy or locked"
This is a **Next.js build cache issue**, not a database problem!

**Quick Fix:**
```powershell
cd "Digital-Grimoire"
.\fix-ebusy.ps1
```

Or manually:
```powershell
cd app
Remove-Item -Recurse -Force .next
npm run dev
```

**Why it happens:**
- OneDrive syncing `.next` folder (common on Windows)
- Corrupted build cache
- Multiple dev servers running

See `docs/FIX_EBUSY_ERROR.md` for detailed instructions.

### Error: "relation 'journal_pages' already exists"
This means the table is already created. The feature should work!

### Error: "function update_updated_at_column() does not exist"
Run an earlier migration that creates this function. It should be in one of the migrations numbered 002-014.

### Still Getting "Failed to create new page"
1. Check browser console (F12) for detailed error messages
2. Verify you're logged in
3. Check Supabase logs in Dashboard → Logs → API
4. Run the diagnostic: `http://localhost:3000/journal/test`

## Migration Files

### Recommended (Safe Version)
```
Digital-Grimoire/migrations/015_add_journal_pages_SAFE.sql
```
- Includes all dependencies
- Uses `IF NOT EXISTS` for safety
- Safe to re-run multiple times

### Original Version
```
Digital-Grimoire/migrations/015_add_journal_pages.sql
```
- Minimal version
- Assumes helper functions already exist

## Next Steps After Setup

Once the migration is complete, you can:
1. Start creating journal pages
2. Organize your study notes
3. Link pages together (hierarchical structure coming soon)
4. Archive old pages to keep your workspace clean

Happy journaling! 📖✨

