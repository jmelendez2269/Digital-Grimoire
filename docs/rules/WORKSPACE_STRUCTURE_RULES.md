# Workspace Structure Rules

## Critical Path Information

### Workspace Root
**The actual workspace root contains a SPACE in the folder name:**
```
C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore
```
⚠️ **Note: "Grimore" not "Grimoire" - folder name has a SPACE**

### Application Directory
**The Next.js application is located inside a nested folder with a HYPHEN:**
```
C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app
```
⚠️ **Note: "Digital-Grimoire" with HYPHEN**

## Package Installation Rules

### Always Use Full Absolute Paths
When installing npm/pnpm packages, **ALWAYS** use the full absolute path to avoid confusion:

```powershell
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"
pnpm add <package-name>
```

### ❌ NEVER Use Relative Paths Like:
```powershell
cd "Digital-Grimoire/app"  # This will fail!
cd "Digital Grimore/app"   # This will also fail!
```

### PowerShell Command Syntax
Remember PowerShell uses semicolons, not `&&`:
```powershell
# ✅ CORRECT
cd "path"; command

# ❌ WRONG
cd "path" && command
```

## Directory Structure Overview

```
Digital Grimore/                          # Root (with space)
├── package.json                          # Root-level package.json
├── pnpm-lock.yaml
└── Digital-Grimoire/                     # Nested folder (with hyphen)
    ├── app/                              # Next.js application
    │   ├── package.json                  # Application package.json ⭐
    │   ├── pnpm-lock.yaml
    │   ├── src/
    │   │   ├── app/
    │   │   ├── components/
    │   │   ├── tiptap/
    │   │   └── ...
    │   └── ...
    ├── docs/
    ├── migrations/
    └── ...
```

## When Installing Dependencies

### Step 1: Verify Current Location
```powershell
pwd  # Check where you are
```

### Step 2: Navigate with Full Path
```powershell
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"
```

### Step 3: Install Package
```powershell
pnpm add <package-name>
```

### Step 4: Verify Installation
```powershell
pnpm list <package-name>
```

## Common Packages Installed

The following packages are installed in `Digital-Grimoire/app/`:
- All `@tiptap/*` packages (version 3.10.1+)
- `tippy.js` (for tooltip functionality)
- All Next.js and React dependencies
- All UI components (@radix-ui/*, lucide-react, etc.)

## Troubleshooting

### If a module is not found:
1. ✅ Verify you're installing in the correct location
2. ✅ Use the full absolute path
3. ✅ Check `Digital-Grimoire/app/package.json` for the dependency
4. ✅ Check `Digital-Grimoire/app/node_modules` for the package

### If path errors occur:
- Remember: Root folder has a **SPACE** ("Digital Grimore")
- App folder has a **HYPHEN** ("Digital-Grimoire")
- Always quote paths in PowerShell

## Quick Reference Commands

```powershell
# Navigate to app directory
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"

# Install a package
pnpm add <package-name>

# Update packages
pnpm update "<package-pattern>"

# List installed package
pnpm list <package-name>

# Run dev server
pnpm dev

# Build
pnpm build
```

---

**Last Updated:** October 31, 2025  
**Reason:** Resolved module resolution issues with @tiptap/suggestion and tippy.js

