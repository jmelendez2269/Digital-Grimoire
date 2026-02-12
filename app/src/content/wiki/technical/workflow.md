---
title: Development Workflow
type: architecture
status: stable
audience: developer
description: Standards and workflows for the Project Parallax development team.
---

# Development Workflow Guide

**Last Updated:** November 2025  
**Status:** Active Production Workflow  
**Domain:** convergencelibrary.com  
**Development Environment:** Cursor IDE

---

## 📁 Understanding Your Local Files & Git Sync

### What Are Your Local Files?

Your **local files** (in `C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\`) are:

- ✅ **Your working copy** - Where you edit code in Cursor
- ✅ **The source of truth** - Your actual project files
- ✅ **Synced to OneDrive** - Automatically backed up to cloud
- ✅ **Connected to Git** - Changes get committed and pushed to GitHub

### How Local Files Flow to Production

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LOCAL FILES (Cursor)                                      │
│    📁 Digital-Grimoire/app/src/...                          │
│    → You edit files here in Cursor                          │
│    → Files are on your computer + OneDrive backup           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ git add + git commit + git push
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. GIT REPOSITORY (Local)                                    │
│    📦 .git/ folder tracks changes                            │
│    → Git version control on your machine                    │
│    → Tracks what changed, when, and why                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ git push origin <branch>
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. GITHUB (Remote Repository)                                │
│    🌐 github.com/jmelendez2269/Digital-Grimoire             │
│    → Cloud backup of your code                              │
│    → Version history and collaboration                      │
│    → Triggers Vercel deployment automatically              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Automatic webhook
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. VERCEL (Live Deployment)                                  │
│    🚀 convergencelibrary.com (production)                   │
│    🧪 Preview URL (development)                              │
│    → Builds and deploys your code                           │
│    → Makes it accessible on the internet                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Points About Local Files

1. **Local files are where you work** - All editing happens in Cursor on your local machine
2. **Git tracks changes** - When you commit, Git saves a snapshot of your local files
3. **GitHub stores history** - Pushing to GitHub backs up your code and triggers deployments
4. **Vercel deploys from GitHub** - Vercel reads from GitHub, not your local files directly
5. **OneDrive provides backup** - Your files are also synced to OneDrive automatically

### What Happens When You Edit in Cursor?

1. **You edit a file** in Cursor → File changes on your local disk
2. **File is saved** → Saved to local disk + synced to OneDrive
3. **Git sees the change** → File shows as "modified" in git status
4. **You commit** → Git creates a snapshot of your local files
5. **You push** → Local Git sends changes to GitHub
6. **Vercel detects push** → Automatically builds and deploys from GitHub

**Important:** Your local files are the **source** - nothing deploys until you commit and push!

---

## 🌳 Branch Strategy

We use a **two-branch workflow** for safe production deployments:

```
main (production)     → Auto-deploys to convergencelibrary.com
  ↑
develop (development) → Auto-deploys to Vercel Preview URL
  ↑
feature/* (local)     → Your local feature branches
```

### Branch Purposes

| Branch | Purpose | Deploys To | When to Use |
|--------|---------|------------|-------------|
| **main** | Production-ready code | `convergencelibrary.com` | Only after testing on develop |
| **develop** | Active development | Vercel Preview URL | Daily development work |
| **feature/*** | New features | Local only | When building new features |

---

## 🚀 How to Work with Branches in Cursor

### Starting Development in Cursor

**Always start from `develop` branch:**

1. **Open Cursor** - Your workspace is already set to the project folder
2. **Check current branch** - Look at bottom status bar or ask AI: "What branch am I on?"
3. **Switch to develop** (if not already there):
   - Ask AI: "Switch to develop branch"
   - Or use terminal in Cursor: `git checkout develop`
4. **Pull latest changes**:
   - Ask AI: "Pull latest from develop"
   - Or: `git pull origin develop`

**Your local files in Cursor are now synced with the `develop` branch.**

### Working in Cursor

**Daily workflow:**

1. **Edit files** in Cursor - Make your changes normally
2. **Files save automatically** - Changes are on your local disk
3. **See changes** - Cursor shows modified files with indicators
4. **Test locally** - Run `pnpm dev` to test in browser
5. **Commit when ready** - Tell AI to commit your changes

---

## 🧪 Testing Workflow: Localhost → Preview → Production

### Recommended Testing Flow

**Always test in this order for best results:**

```
1. Test Locally (localhost:3000)
   ↓ (if it works)
2. Commit to develop → Vercel Preview
   ↓ (test preview)
3. Deploy to production → Live Site
```

### Step 1: Test Locally First (localhost:3000)

**Before committing, test your changes locally:**

```powershell
# In Cursor terminal, navigate to app directory
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"

# Start development server
pnpm dev
```

**What happens:**

- Opens at `http://localhost:3000`
- **Fast feedback** - See changes instantly (hot reload)
- **No deployment needed** - Test without pushing to GitHub
- **Catch bugs early** - Fix issues before they reach preview/production
- **Save build time** - Don't waste Vercel build minutes on broken code

**When to test locally:**

- ✅ **Always** for code changes
- ✅ **Always** for new features
- ✅ **Always** for bug fixes
- ✅ **Always** when unsure if it works
- ⚠️ **Optional** for simple text/documentation changes

**Benefits:**

- **Instant feedback** - No waiting for builds
- **Free** - No build minutes used
- **Private** - Only you see it
- **Fast iteration** - Make changes, see results immediately

### Step 2: Commit to Develop (Creates Preview)

**After localhost testing works, commit to create a preview:**

Tell AI: **"Commit this to develop"**

**What happens:**

1. Your local changes get committed to `develop` branch
2. Pushed to GitHub
3. **Vercel automatically creates a preview URL**
4. Check Vercel dashboard for the preview link

**Why test on preview:**

- ✅ **Production-like environment** - Closer to real deployment
- ✅ **Verify build works** - Ensures code builds correctly
- ✅ **Test on different devices** - See how it looks on mobile/tablet
- ✅ **Share with others** - Get feedback before production
- ✅ **Catch build issues** - Some issues only appear in production builds

### Step 3: Deploy to Production

**After preview testing looks good:**

Tell AI: **"Deploy to production"**

**What happens:**

1. Merges `develop` → `main`
2. Pushes to GitHub
3. Vercel automatically deploys to `convergencelibrary.com`
4. **Live for all users!**

---

### Quick Testing Checklist

**For every change:**

- [ ] **Test on localhost** (`pnpm dev` → `http://localhost:3000`)
  - Does it work?
  - Does it look right?
  - Any errors in console?
  
- [ ] **Commit to develop** (creates preview)
  - Check Vercel dashboard for preview URL
  - Test preview on different browsers/devices
  
- [ ] **Deploy to production** (only if preview is good)
  - Monitor Vercel deployment status
  - Verify live site works correctly

### When to Skip Localhost Testing

**You can skip localhost for:**

- Simple documentation updates
- Text-only changes
- Comments in code
- Changes you're 100% confident about

**But always test locally for:**

- Code changes
- New features
- Bug fixes
- Anything that could break functionality

---

### Committing to Development from Cursor

**When you want to save your local changes to the development branch:**

Just say to the AI in Cursor:

- ✅ **"Commit this to develop"**
- ✅ **"Commit to dev branch"**
- ✅ **"Save this to develop"**
- ✅ **"Commit and push to develop"**

The AI will:

1. Stage your **local file changes** (from Cursor)
2. Commit to `develop` branch (saves snapshot to local Git)
3. Push to `origin/develop` (sends to GitHub)
4. Trigger Vercel preview deployment automatically

**What this means:**

- Your **local files** in Cursor get committed to **local Git**
- Local Git pushes to **GitHub** (cloud backup)
- GitHub triggers **Vercel** to build and deploy

**Manual command (in Cursor terminal):**

```powershell
git add .
git commit -m "feat: your description"
git push origin develop
```

### Deploying to Production from Cursor

**When you're ready to deploy your local changes to production (convergencelibrary.com):**

**First, make sure your local changes are committed to `develop`:**

- If you have uncommitted changes, say: "Commit this to develop"
- Test on Vercel preview URL first!

**Then deploy to production:**

Just say to the AI in Cursor:

- ✅ **"Push develop to main"**
- ✅ **"Deploy to production"**
- ✅ **"Merge and deploy"**
- ✅ **"Merge develop to main"**

The AI will:

1. Switch your **local Git** to `main` branch
2. Merge `develop` into `main` (combines your local commits)
3. Push to `origin/main` (sends to GitHub)
4. Vercel automatically deploys to production

**What happens:**

- Your **local Git** merges branches
- Pushes merged code to **GitHub**
- **Vercel** detects the push and deploys to `convergencelibrary.com`
- Your **local files** in Cursor remain unchanged (still on `develop`)

**Manual command (in Cursor terminal):**

```powershell
git checkout main
git pull origin main
git merge develop
git push origin main
```

---

## 🔄 How Deployments Work

### Automatic Deployments

**Vercel is connected to your GitHub repository** and automatically deploys:

1. **Pushes to `main`** → Deploys to **Production** (`convergencelibrary.com`)
   - Builds the app
   - Runs production optimizations
   - Updates live site automatically
   - ⚠️ **This is LIVE - users see it immediately**

2. **Pushes to `develop`** → Deploys to **Preview** (random Vercel URL)
   - Builds the app
   - Creates preview deployment
   - You get a preview URL to test
   - ✅ **Safe to test - not visible to users**

### Deployment Process

```
Your Local Files (Cursor)
    ↓ (git add + commit)
Local Git Repository
    ↓ (git push)
GitHub (Remote Repository)
    ↓ (automatic webhook)
Vercel Build & Deploy
    ↓
Live Website (convergencelibrary.com)
```

**No manual steps needed!** Vercel handles everything automatically once you push to GitHub.

**Important:** Your local files in Cursor are the starting point - they must be committed and pushed to trigger deployments.

---

## 📋 Common Workflow Scenarios in Cursor

### Scenario 1: Daily Development in Cursor

**In Cursor IDE:**

1. **Start your day**
   - Open Cursor (project folder is already open)
   - Ask AI: "What branch am I on?" or check status bar
   - If not on `develop`, say: "Switch to develop branch"
   - Say: "Pull latest from develop"

2. **Make your changes**
   - Edit files normally in Cursor
   - Files save automatically to your local disk
   - **Test locally first** - Run `pnpm dev` and test at `http://localhost:3000`
   - Fix any issues before committing

3. **Commit your local changes** (after localhost testing)
   - Tell AI: **"Commit this to develop"**
   - AI stages, commits, and pushes your local files
   - Or manually in terminal:

     ```powershell
     git add .
     git commit -m "feat: added new feature"
     git push origin develop
     ```

4. **Vercel creates preview URL automatically**
   - Check Vercel dashboard for preview link
   - **Test your changes on the preview URL** (production-like environment)
   - Verify everything works correctly
   - Your local files are now backed up on GitHub and deployed!

### Scenario 2: Ready for Production from Cursor

**In Cursor IDE:**

1. **Make sure develop is tested and working**
   - Test on Vercel preview URL first!
   - Verify all your local changes work correctly
   - Ensure all local files are committed to `develop`

2. **Deploy to production**
   - Tell AI in Cursor: **"Deploy to production"** or **"Push develop to main"**
   - AI will merge your local `develop` branch into `main` and push
   - Or manually in terminal:

     ```powershell
     git checkout main
     git pull origin main
     git merge develop
     git push origin main
     ```

3. **Vercel automatically deploys**
   - Vercel detects the push to `main` on GitHub
   - Automatically builds and deploys to `convergencelibrary.com`
   - Monitor Vercel dashboard for deployment status
   - Your local files in Cursor stay on `develop` branch

### Scenario 3: Hotfix (Urgent Production Fix) in Cursor

**In Cursor IDE:**

1. **Create hotfix branch from main**
   - Tell AI: "Create hotfix branch from main"
   - Or manually:

     ```powershell
     git checkout main
     git pull origin main
     git checkout -b hotfix/critical-bug
     ```

2. **Fix the issue in Cursor**
   - Edit files normally in Cursor
   - Make the critical fix
   - Test locally if possible

3. **Commit and merge directly to main**
   - Tell AI: "Commit this hotfix and deploy to production"
   - Or manually:

     ```powershell
     git add .
     git commit -m "fix: critical bug fix"
     git checkout main
     git merge hotfix/critical-bug
     git push origin main
     ```

4. **Also merge back to develop**
   - Tell AI: "Merge main back to develop"
   - Or manually:

     ```powershell
     git checkout develop
     git merge main
     git push origin develop
     ```

**Your local files in Cursor are now synced across all branches.**

---

## ✅ CI/CD Pipeline

### Automated Checks

Every push triggers automated checks:

1. **Linting** - Code quality checks
2. **Type Checking** - TypeScript validation
3. **Build** - Ensures app builds successfully
4. **Performance Testing** - Lighthouse audits (on main/develop)

### Viewing Results

- **GitHub Actions:** Check the "Actions" tab in your GitHub repo
- **Vercel Deployments:** Check Vercel dashboard for deployment status
- **Performance Reports:** Available in GitHub Actions artifacts

---

## 🎯 Best Practices

### ✅ DO

- ✅ Always work on `develop` for daily development
- ✅ **Test on localhost first** (`pnpm dev`) before committing
- ✅ Test on Vercel preview before merging to `main`
- ✅ Write clear commit messages: `feat:`, `fix:`, `docs:`, etc.
- ✅ Pull latest changes before starting work
- ✅ Keep commits focused and logical

### ❌ DON'T

- ❌ Don't push directly to `main` (except hotfixes)
- ❌ Don't skip localhost testing for code changes
- ❌ Don't skip testing on preview
- ❌ Don't commit broken code to `develop`
- ❌ Don't forget to pull before pushing
- ❌ Don't merge to `main` without testing

---

## 🔍 Checking Current Status in Cursor

### See Current Branch

**In Cursor:**

- Check the status bar at bottom of Cursor window
- Or ask AI: **"What branch am I on?"**

**In terminal:**

```powershell
git branch
# Shows: * develop (current branch)
```

### See What Changed in Your Local Files

**In Cursor:**

- Modified files show with indicators in the file explorer
- Or ask AI: **"What files have changed?"**

**In terminal:**

```powershell
git status
# Shows modified files in your local workspace
```

### See Recent Commits

**In Cursor:**

- Ask AI: **"Show recent commits"**
- Or use Git extension in Cursor

**In terminal:**

```powershell
git log --oneline -10
# Shows last 10 commits
```

### See Branch Differences

**In Cursor terminal:**

```powershell
# See what's in develop but not in main
git log main..develop

# See what's in main but not in develop
git log develop..main
```

### Understanding Local vs Remote

**Check if local files are synced with GitHub:**

```powershell
# See if local branch is ahead/behind remote
git status
# Shows: "Your branch is ahead of 'origin/develop' by 1 commit"
# This means you have local commits not yet pushed to GitHub
```

---

## 🚨 Emergency Rollback

If something breaks in production:

### Option 1: Revert Last Commit

```powershell
git checkout main
git revert HEAD
git push origin main
# Vercel will redeploy automatically
```

### Option 2: Rollback to Previous Version

```powershell
git checkout main
git log --oneline  # Find the commit hash before the bad one
git reset --hard <commit-hash>
git push origin main --force  # ⚠️ Use with caution!
```

---

## 📞 Quick Reference for Cursor

### AI Commands in Cursor

| What You Want | What to Say to AI |
|---------------|-------------------|
| Commit local changes to development | "Commit this to develop" |
| Deploy to production | "Deploy to production" or "Push develop to main" |
| Check current branch | "What branch am I on?" |
| See what local files changed | "What files have changed?" |
| Switch to develop branch | "Switch to develop branch" |
| Pull latest from GitHub | "Pull latest from develop" |
| See uncommitted changes | "Show me uncommitted changes" |

### Git Commands

| Action | Command |
|--------|---------|
| Switch to develop | `git checkout develop` |
| Switch to main | `git checkout main` |
| Pull latest | `git pull origin <branch>` |
| See status | `git status` |
| See branches | `git branch -a` |

---

## 🔗 Related Documentation

- **Vercel Setup:** `docs/Setup Docs/VERCEL_DEPLOYMENT_SETUP.md`
- **Production Checklist:** `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **Security:** `docs/SECURITY_VERIFICATION_REPORT.md`

---

## 📝 Important Notes

### About Your Local Files

- **Your local files in Cursor** are where all development happens
- **Local files are synced to OneDrive** automatically (backup)
- **Git tracks changes** to your local files
- **GitHub stores history** - pushing backs up your code
- **Vercel deploys from GitHub** - not directly from your local files

### About Deployments

- **Vercel automatically handles:** Building, deploying, SSL certificates, CDN
- **No manual deployment needed** - just push to the right branch
- **Preview URLs** are created automatically for `develop` branch
- **Production deploys** happen automatically when you push to `main`
- **Monitor deployments** in Vercel dashboard for status

### Workflow Summary

1. **Edit in Cursor** → Changes saved to local files
2. **Test on localhost** → Run `pnpm dev` and test at `http://localhost:3000`
3. **Commit locally** → Git saves snapshot of your local files
4. **Push to GitHub** → Backs up code and triggers Vercel preview
5. **Test on preview** → Verify it works in production-like environment
6. **Deploy to production** → Merge to `main` and deploy to live site

**Remember:**

- Your local files in Cursor are the source - nothing deploys until you commit and push!
- **Always test locally first** - Catch bugs before they reach preview/production!

---

**Version:** 1.0  
**Last Updated:** November 2025  
**Maintained By:** Development Team
