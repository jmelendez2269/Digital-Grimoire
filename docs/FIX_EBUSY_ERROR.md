# Fix EBUSY Error (Resource Busy or Locked)

## Problem
Error: `EBUSY: resource busy or locked` when running `npm run dev`

This is a Next.js build cache issue, **NOT a database problem**.

## Quick Fix (Try these in order)

### Option 1: Clean Build Cache (Fastest)
```powershell
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"

# Stop the dev server (Ctrl+C if running)

# Delete the .next cache folder
Remove-Item -Recurse -Force .next

# Start fresh
npm run dev
```

### Option 2: OneDrive Exclusion (Recommended for Windows)
The issue often happens because OneDrive locks files in the `.next` folder.

1. **Right-click** the `.next` folder
2. Select **"Free up space"** or **"Always keep on this device"**
3. Or exclude the entire `Digital-Grimoire/app/.next` from OneDrive sync

**Better solution**: Add `.next` to OneDrive exclusions:
1. Right-click OneDrive icon in taskbar
2. Settings → Backup → Manage Backup
3. Exclude the `app/.next` folder

### Option 3: Full Clean (Nuclear Option)
```powershell
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"

# Stop all
taskkill /F /IM node.exe 2>$null

# Clean everything
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Reinstall
npm install

# Restart
npm run dev
```

## Prevention

### Add to `.gitignore` (Already there)
```
.next/
node_modules/
```

### Exclude from OneDrive
Create a `.nextignore` or configure OneDrive to skip:
- `app/.next/`
- `app/node_modules/`

These folders shouldn't be synced to cloud storage.

## Quick One-Liner Fix

Run this in PowerShell:
```powershell
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"; Remove-Item -Recurse -Force .next; npm run dev
```

## After the Fix

Once you run `npm run dev` successfully:
1. Go to `http://localhost:3000/journal`
2. Try creating a page again
3. The journal feature should work (assuming the database migration was run)

## Common Causes
- ✅ OneDrive syncing Next.js cache
- ✅ Corrupted build cache
- ✅ File permissions issue
- ✅ Antivirus locking files

## Not Related To
- ❌ Supabase database
- ❌ journal_pages table
- ❌ Authentication
- ❌ API routes

This is purely a local development environment issue.

