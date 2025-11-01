# Folder Structure Issue Documentation

**Date:** October 31, 2025  
**Issue:** Nested folder structure causing package installation confusion

---

## The Problem

The project has an unintended nested folder structure:

```
Projects/
└── Digital Grimore/                      ← Outer folder (with SPACE)
    ├── package.json                      ← Root-level (not the main one)
    └── Digital-Grimoire/                ← Git repository root (with HYPHEN) 
        ├── app/                         ← ✅ Actual Next.js application
        │   ├── package.json             ← ✅ MAIN package.json
        │   └── node_modules/            ← ✅ All dependencies here
        ├── sprint_summaries/            ← ✅ 19 files (correct location)
        ├── docs/
        ├── migrations/
        └── Digital-Grimoire/            ← ❌ Duplicate nested folder
            └── sprint_summaries/        ← ❌ 1 file (wrong location)
```

### Why This Happened

1. **Git repository name:** `Digital-Grimoire` (with hyphen)
2. **Outer folder name:** "Digital Grimore" (with space - possibly a typo)
3. **Duplicate nesting:** A `Digital-Grimoire/Digital-Grimoire/` folder was created somehow

---

## Impact

### ❌ Problems This Causes:

1. **Confusing package installation paths**
   - Relative paths don't work reliably
   - Easy to install packages in the wrong location

2. **Duplicate sprint_summaries folders**
   - Main location: `Digital-Grimoire/sprint_summaries/` (19 files)
   - Wrong location: `Digital-Grimoire/Digital-Grimoire/sprint_summaries/` (1 file)

3. **Path references in documentation**
   - Sprint 1 docs reference `Digital-Grimoire/` as root
   - But actual structure has extra nesting

### ✅ What Works:

- Packages ARE installed correctly in `Digital Grimore/Digital-Grimoire/app/node_modules/`
- Git repository is correctly at `Digital-Grimoire/` level
- Build should work fine

---

## Current Solution

**Always use the FULL ABSOLUTE PATH for package installation:**

```powershell
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"
pnpm add <package>
```

**Never use relative paths like:**
```powershell
# ❌ These will fail:
cd "Digital-Grimoire/app"
cd "app"
```

---

## Recommended Actions

### Immediate (Done ✅)
- [x] Document the actual structure
- [x] Update `.cursorrules` to use full paths
- [x] Install missing packages (@tiptap/suggestion, tippy.js)

### Short Term (Optional)
- [ ] Move file from `Digital-Grimoire/Digital-Grimoire/sprint_summaries/` to correct location
- [ ] Delete the duplicate `Digital-Grimoire/Digital-Grimoire/` folder

### Long Term (Future Refactor)
Consider restructuring to:
```
Projects/
└── Digital-Grimoire/                    ← Single root (no nesting)
    ├── app/
    ├── sprint_summaries/
    ├── docs/
    └── ...
```

**Note:** This would require:
- Renaming outer folder
- Flattening structure
- Updating all path references
- **NOT URGENT** - current structure works fine

---

## Path Reference Guide

### For Package Installation:
```powershell
# ALWAYS use this:
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"
```

### For Documentation:
When referring to project structure in docs, clarify:
- **Workspace root:** `Digital Grimore/` (with space)
- **Git repository:** `Digital-Grimoire/` (with hyphen)  
- **Application:** `Digital-Grimoire/app/`

---

## Testing Package Installation

To verify packages are in the correct location:

```powershell
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"

# Check if package is installed
Test-Path "node_modules/<package-name>"

# List installed package
pnpm list <package-name>

# Check package.json
cat package.json | Select-String "<package-name>"
```

---

## History

### How We Discovered This:

1. **Build error:** `Module not found: Can't resolve '@tiptap/suggestion'`
2. **First installation attempt:** Used relative path, installed in wrong location
3. **User insight:** Noticed two `sprint_summaries` folders
4. **Investigation:** Checked Sprint 1 docs, found structure references
5. **Git check:** Repository is `Digital-Grimoire` but nested in `Digital Grimore`

### Lessons Learned:

- ✅ Always use FULL absolute paths for package operations
- ✅ Verify package location after installation  
- ✅ Watch for folder name discrepancies (space vs hyphen)
- ✅ Check for duplicate nested folders

---

## Related Documentation

- [`.cursorrules`](../../../.cursorrules) - Updated with correct paths
- [`WORKSPACE_STRUCTURE_RULES.md`](./WORKSPACE_STRUCTURE_RULES.md) - Package installation guide
- Sprint summaries in `Digital-Grimoire/sprint_summaries/` - Original project structure

---

**Status:** ✅ Issue documented and workaround in place  
**Build Status:** ✅ Working (packages installed correctly)  
**Future Action:** Optional restructuring when convenient

