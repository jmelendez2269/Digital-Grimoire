# Fixing OneDrive Sync Issues with Next.js

## Problem
The `.next` directory is being synced by OneDrive, which causes file locks and prevents Next.js from deleting/rebuilding files during development.

## Solution: Exclude .next from OneDrive Sync

### Method 1: OneDrive Settings (Recommended)

1. **Open OneDrive Settings**
   - Click the OneDrive icon in the system tray
   - Click the gear icon ⚙️
   - Select "Settings"

2. **Navigate to Sync Settings**
   - Go to "Sync and backup" tab
   - Click "Advanced settings"

3. **Exclude Folders**
   - Look for "Files and folders" or "Exclude folders" option
   - Add the following path:
     ```
     Digital Grimore\Digital-Grimoire\app\.next
     ```
   - Or exclude the entire `.next` pattern if OneDrive supports wildcards

### Method 2: File Explorer (Quick Fix)

1. **Right-click the `.next` folder** in File Explorer
2. **Select "Always keep on this device"** (if available)
   - This prevents OneDrive from syncing it

### Method 3: Move Project Outside OneDrive (Best Long-term)

If you continue having issues, consider:
- Moving the project to a non-OneDrive location (e.g., `C:\Projects\Digital-Grimoire`)
- Using Git for version control instead of relying on OneDrive sync

## Temporary Workaround

If you need to run the dev server immediately:

1. **Pause OneDrive Sync Temporarily**
   - Right-click OneDrive icon in system tray
   - Select "Pause syncing" > "2 hours"
   - Run `.\fix-dev-server.ps1`
   - Run `pnpm dev`
   - Resume OneDrive sync after development session

2. **Manual Deletion**
   - Close all terminals running `pnpm dev`
   - Manually delete the `.next` folder in File Explorer
   - If it says "in use", restart your computer or pause OneDrive sync

## Why This Happens

- OneDrive syncs files in real-time
- When Next.js tries to delete/rebuild files, OneDrive may have them locked
- This is especially common with build artifacts like `.next`
- The `.next` folder should never be synced (it's already in `.gitignore`)

## Prevention

After fixing, the `.next` folder should be excluded from OneDrive sync permanently, preventing this issue from recurring.
