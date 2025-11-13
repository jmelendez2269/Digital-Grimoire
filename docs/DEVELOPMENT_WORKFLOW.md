# Development Workflow Guide

**Last Updated:** November 2025  
**Status:** Active Production Workflow  
**Domain:** convergencelibrary.com

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

## 🚀 How to Work with Branches

### Starting Development

**Always start from `develop`:**

```powershell
# Navigate to repo
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire"

# Switch to develop branch
git checkout develop

# Pull latest changes
git pull origin develop

# Create feature branch (optional, or work directly on develop)
git checkout -b feature/your-feature-name
```

### Committing to Development

**When you want to commit your work to the development branch:**

Just say to the AI:
- ✅ **"Commit this to develop"**
- ✅ **"Commit to dev branch"**
- ✅ **"Save this to develop"**

The AI will:
1. Stage your changes
2. Commit to `develop` branch
3. Push to `origin/develop`
4. Trigger Vercel preview deployment automatically

**Manual command:**
```powershell
git add .
git commit -m "feat: your description"
git push origin develop
```

### Deploying to Production

**When you're ready to deploy to production (convergencelibrary.com):**

Just say to the AI:
- ✅ **"Push develop to main"**
- ✅ **"Deploy to production"**
- ✅ **"Merge and deploy"**
- ✅ **"Merge develop to main"**

The AI will:
1. Switch to `main` branch
2. Merge `develop` into `main`
3. Push to `origin/main`
4. Vercel automatically deploys to production

**Manual command:**
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
Your Code → Git Push → GitHub → Vercel Webhook → Build → Deploy → Live
```

**No manual steps needed!** Vercel handles everything automatically.

---

## 📋 Common Workflow Scenarios

### Scenario 1: Daily Development

```powershell
# 1. Start your day
git checkout develop
git pull origin develop

# 2. Make your changes
# ... edit files ...

# 3. Commit to develop (tell AI: "commit to develop")
git add .
git commit -m "feat: added new feature"
git push origin develop

# 4. Vercel creates preview URL automatically
# Check Vercel dashboard for preview link
```

### Scenario 2: Ready for Production

```powershell
# 1. Make sure develop is tested and working
# Test on Vercel preview URL first!

# 2. Deploy to production (tell AI: "deploy to production")
git checkout main
git pull origin main
git merge develop
git push origin main

# 3. Vercel automatically deploys to convergencelibrary.com
# Monitor Vercel dashboard for deployment status
```

### Scenario 3: Hotfix (Urgent Production Fix)

```powershell
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Fix the issue
# ... make changes ...

# 3. Commit and merge directly to main
git add .
git commit -m "fix: critical bug fix"
git checkout main
git merge hotfix/critical-bug
git push origin main

# 4. Also merge back to develop
git checkout develop
git merge main
git push origin develop
```

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

### ✅ DO:

- ✅ Always work on `develop` for daily development
- ✅ Test on Vercel preview before merging to `main`
- ✅ Write clear commit messages: `feat:`, `fix:`, `docs:`, etc.
- ✅ Pull latest changes before starting work
- ✅ Keep commits focused and logical

### ❌ DON'T:

- ❌ Don't push directly to `main` (except hotfixes)
- ❌ Don't skip testing on preview
- ❌ Don't commit broken code to `develop`
- ❌ Don't forget to pull before pushing
- ❌ Don't merge to `main` without testing

---

## 🔍 Checking Current Status

### See Current Branch

```powershell
git branch
# Shows: * develop (current branch)
```

### See What Changed

```powershell
git status
# Shows modified files
```

### See Recent Commits

```powershell
git log --oneline -10
# Shows last 10 commits
```

### See Branch Differences

```powershell
# See what's in develop but not in main
git log main..develop

# See what's in main but not in develop
git log develop..main
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

## 📞 Quick Reference

### AI Commands

| What You Want | What to Say |
|---------------|-------------|
| Commit to development | "Commit this to develop" |
| Deploy to production | "Deploy to production" or "Push develop to main" |
| Check current branch | "What branch am I on?" |
| See what changed | "What files have changed?" |

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

## 📝 Notes

- **Vercel automatically handles:** Building, deploying, SSL certificates, CDN
- **No manual deployment needed** - just push to the right branch
- **Preview URLs** are created automatically for `develop` branch
- **Production deploys** happen automatically when you push to `main`
- **Monitor deployments** in Vercel dashboard for status

---

**Version:** 1.0  
**Last Updated:** November 2025  
**Maintained By:** Development Team

