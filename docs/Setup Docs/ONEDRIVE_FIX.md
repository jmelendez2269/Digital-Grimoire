# Fixing OneDrive Sync Issues with Next.js

## Problem

OneDrive can interfere with Next.js development by:
- Locking files in the `.next` directory during sync
- Causing "Unable to acquire lock" errors
- Slowing down build times
- Creating file conflicts

## Solution: Exclude .next from OneDrive Sync

### Method 1: Exclude Folder via OneDrive Settings (Recommended)

1. **Open OneDrive Settings**
   - Right-click the OneDrive icon in the system tray (bottom-right)
   - Click **Settings**

2. **Navigate to Sync Settings**
   - Go to **Sync and backup** tab
   - Click **Advanced settings**

3. **Exclude Folders**
   - Click **Exclude folders** or **Choose folders**
   - Navigate to: `Digital Grimore\Digital-Grimoire\app\.next`
   - Check the box to exclude it
   - Click **OK**

4. **Restart OneDrive** (optional but recommended)
   - Right-click OneDrive icon → **Settings** → **Account** → **Stop syncing** (temporarily)
   - Wait 5 seconds
   - Click **Start syncing** again

### Method 2: Use .onedriveignore File

Create a `.onedriveignore` file in your project root:

```powershell
# Navigate to project root
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire"

# Create .onedriveignore file
@"
app\.next
app\node_modules
.next
node_modules
"@ | Out-File -FilePath ".onedriveignore" -Encoding UTF8
```

Note: This method may not work on all OneDrive versions. Method 1 is more reliable.

### Method 3: Move Project Outside OneDrive (Best Long-term Solution)

If you continue having issues, consider moving your project:

1. **Move the project folder** to a location outside OneDrive:
   - Example: `C:\Projects\Digital-Grimoire`
   - Or: `C:\Users\Jen_a\Documents\Projects\Digital-Grimoire` (if Documents isn't synced)

2. **Update your workspace path** in Cursor/VS Code

3. **Keep OneDrive for backups only** - use Git for version control instead

## Quick Fix Scripts

### Clean and Start Dev Server

Use the provided PowerShell scripts:

```powershell
# Navigate to app directory
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"

# Run cleanup script
.\fix-dev-server.ps1

# Then start dev server
pnpm dev
```

Or use the automated start script:

```powershell
.\start-dev.ps1
```

## Temporary Workaround

If you need to work immediately and can't exclude the folder:

1. **Pause OneDrive sync temporarily**
   - Right-click OneDrive icon → **Pause syncing** → **2 hours**

2. **Run your dev server**
   ```powershell
   cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"
   .\fix-dev-server.ps1
   pnpm dev
   ```

3. **Resume OneDrive when done** (optional - it will resume automatically after 2 hours)

## Verification

After excluding `.next` from OneDrive:

1. Check that `.next` folder is not syncing:
   - Look for the OneDrive sync icon on the `.next` folder
   - It should NOT have a blue cloud or sync arrows

2. Test dev server:
   ```powershell
   cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"
   pnpm dev
   ```

3. You should no longer see lock file errors

## Additional Recommendations

### Also Exclude These Folders from OneDrive:

- `node_modules` - Large, changes frequently, not needed in cloud
- `.next` - Build cache, regenerated on each build
- `.git` - Already version controlled (optional - Git is better for this)

### What TO Sync:

- Source code (`src/` folder)
- Configuration files (`package.json`, `next.config.ts`, etc.)
- Documentation (`docs/` folder)
- Environment files (`.env.example` - NOT `.env.local`)

## Troubleshooting

### Still Getting Lock Errors?

1. **Check for multiple terminals**
   - Close ALL terminal windows
   - Open ONE fresh terminal
   - Run `pnpm dev`

2. **Check for background processes**
   ```powershell
   Get-Process node | Where-Object { $_.Path -notlike "*cursor*" }
   ```
   Kill any that aren't Cursor-related

3. **Verify OneDrive exclusion**
   - Check OneDrive settings again
   - Restart OneDrive if needed

4. **Nuclear option**: Move project outside OneDrive entirely

## References

- [OneDrive Sync Settings](https://support.microsoft.com/en-us/office/choose-which-onedrive-folders-to-sync-to-your-computer-98b8b011-8b94-490b-b313-14c70cead99a)
- Next.js Build Cache: `.next` folder should never be synced
- Node.js Best Practices: Exclude `node_modules` from sync

