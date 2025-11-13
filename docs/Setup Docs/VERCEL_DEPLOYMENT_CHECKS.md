# Vercel Deployment Checks Setup Guide

**Last Updated:** November 10, 2025  
**Status:** Ready for Configuration  
**Priority:** P0 - Critical for Production Safety

---

## 🎯 Overview

Deployment checks in Vercel prevent deployments from being promoted to production until specific conditions are met. This ensures code quality, performance standards, and prevents broken builds from reaching users.

---

## ✅ Recommended Deployment Checks

Based on your existing CI/CD setup, here are the checks you should configure:

### 1. **GitHub Actions - Lint & Type Check** ⭐ REQUIRED

**Status Check Name:** `Lint & Type Check`  
**Provider:** GitHub  
**Event/Status:** `lint` job from `ci-cd.yml` workflow

**Purpose:**
- Ensures code passes ESLint rules
- Verifies TypeScript type checking
- Catches syntax errors before deployment

**Configuration:**
- **Check Name:** `Lint & Type Check`
- **Provider:** GitHub
- **Repository:** Your GitHub repo
- **Workflow:** `CI/CD Pipeline` (or `ci-cd.yml`)
- **Job/Status:** `lint`
- **Required for Production:** ✅ Yes

---

### 2. **GitHub Actions - Build Verification** ⭐ REQUIRED

**Status Check Name:** `Build Application`  
**Provider:** GitHub  
**Event/Status:** `build` job from `ci-cd.yml` workflow

**Purpose:**
- Verifies the Next.js app builds successfully
- Ensures all dependencies are resolved
- Confirms build artifacts are generated

**Configuration:**
- **Check Name:** `Build Application`
- **Provider:** GitHub
- **Repository:** Your GitHub repo
- **Workflow:** `CI/CD Pipeline` (or `ci-cd.yml`)
- **Job/Status:** `build`
- **Required for Production:** ✅ Yes

---

### 3. **GitHub Actions - Performance Testing** ⭐ RECOMMENDED

**Status Check Name:** `Unlighthouse Performance Audit`  
**Provider:** GitHub  
**Event/Status:** `unlighthouse` job from `performance-testing.yml` workflow

**Purpose:**
- Enforces performance budgets (Performance ≥75, Accessibility ≥90, Best Practices ≥85, SEO ≥90)
- Prevents regressions in Lighthouse scores
- Ensures production-ready performance

**Configuration:**
- **Check Name:** `Performance Testing`
- **Provider:** GitHub
- **Repository:** Your GitHub repo
- **Workflow:** `Performance Testing` (or `performance-testing.yml`)
- **Job/Status:** `unlighthouse`
- **Required for Production:** ✅ Yes (Recommended)

**Note:** This check may take longer (5-10 minutes) but is valuable for maintaining quality.

---

### 4. **Vercel Build Check** ⭐ REQUIRED (Automatic)

**Status:** Automatically enabled by Vercel

**Purpose:**
- Verifies the build succeeds in Vercel's environment
- Ensures production environment variables are valid
- Confirms deployment is ready

**Configuration:**
- This is automatically configured by Vercel
- No manual setup required
- Will block production if build fails

---

## 📋 Step-by-Step Setup Instructions

### Step 1: Access Deployment Checks Settings

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **Digital-Grimoire** (or your project name)
3. Navigate to **Settings** → **Git**
4. Scroll down to **Deployment Checks** section
5. Click **"Add Checks"** button

---

### Step 2: Configure GitHub Actions Checks

For each check below, click **"+ Add Checks"** and configure:

#### Check 1: Lint & Type Check

```
Check Name: Lint & Type Check
Provider: GitHub
Repository: [Your GitHub repo]
Workflow: CI/CD Pipeline
Job/Status: lint
Required for Production: ✅ Yes
```

#### Check 2: Build Verification

```
Check Name: Build Application
Provider: GitHub
Repository: [Your GitHub repo]
Workflow: CI/CD Pipeline
Job/Status: build
Required for Production: ✅ Yes
```

#### Check 3: Performance Testing

```
Check Name: Performance Testing
Provider: GitHub
Repository: [Your GitHub repo]
Workflow: Performance Testing
Job/Status: unlighthouse
Required for Production: ✅ Yes (Recommended)
```

---

### Step 3: Verify Check Configuration

After adding checks, verify they appear in the **Deployment Checks** section:

- ✅ Lint & Type Check (Required)
- ✅ Build Application (Required)
- ✅ Performance Testing (Required)
- ✅ Vercel Build (Automatic)

---

## 🔍 How Deployment Checks Work

### Workflow

1. **Push to `main` branch** → Triggers GitHub Actions workflows
2. **GitHub Actions run** → Execute lint, build, and performance tests
3. **Status checks report** → GitHub reports status back to Vercel
4. **Vercel waits** → Deployment is blocked until all checks pass
5. **Checks pass** → Deployment proceeds to production
6. **Checks fail** → Deployment is blocked, you must fix issues

### Visual Flow

```
Push to main
    ↓
GitHub Actions Triggered
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│ Lint & Type     │ Build           │ Performance     │
│ Check           │ Verification    │ Testing         │
└─────────────────┴─────────────────┴─────────────────┘
    ↓                    ↓                    ↓
    └────────────────────┴────────────────────┘
                    ↓
            All Checks Pass?
                    ↓
            ┌───────┴───────┐
            │               │
          ✅ Yes          ❌ No
            │               │
            ↓               ↓
    Deploy to Prod    Block Deployment
```

---

## ⚙️ Advanced Configuration

### Optional: Separate Checks for Preview vs Production

You can configure different checks for:
- **Preview Deployments** (PRs, branches): Lighter checks (lint + build)
- **Production Deployments** (main branch): All checks (lint + build + performance)

**Configuration:**
- In Vercel, you can set **"Required for Production"** toggle per check
- Preview deployments will still run checks but won't block if optional checks fail
- Production deployments require all checks marked as "Required"

---

### Optional: Custom Status Checks

If you want to add custom checks (e.g., security scanning, E2E tests), you can:

1. Create a new GitHub Actions workflow
2. Add a job that reports status
3. Configure it as a deployment check in Vercel

**Example:** Security scanning check

```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run security scan
        run: npm audit --audit-level=moderate
```

Then add this as a deployment check in Vercel.

---

## 🚨 Troubleshooting

### Check Not Appearing in Vercel

**Problem:** GitHub Actions check doesn't show up in Vercel

**Solutions:**
1. Verify the workflow file is in `.github/workflows/` directory
2. Ensure the workflow runs on `push` to `main` branch
3. Check that the job name matches exactly (case-sensitive)
4. Wait a few minutes for GitHub to report status
5. Verify Vercel has access to your GitHub repository

---

### Check Always Failing

**Problem:** Deployment check fails even when code is correct

**Solutions:**
1. Check GitHub Actions logs for the specific job
2. Verify environment variables are set in GitHub Secrets (if needed)
3. Ensure the workflow has proper permissions
4. Check for flaky tests (performance tests can be sensitive)

---

### Performance Check Too Slow

**Problem:** Performance testing takes too long and blocks deployments

**Solutions:**
1. Make performance check optional for preview deployments
2. Only require it for production deployments
3. Optimize the performance testing workflow
4. Consider running performance tests on a schedule instead of every push

---

### Check Passing But Deployment Blocked

**Problem:** GitHub shows check passed, but Vercel still blocks

**Solutions:**
1. Verify the check is configured correctly in Vercel
2. Check that the job name matches exactly
3. Ensure the workflow file name matches
4. Try removing and re-adding the check
5. Check Vercel logs for specific error messages

---

## 📊 Monitoring Check Status

### View Check Status

1. **In Vercel Dashboard:**
   - Go to **Deployments** tab
   - Click on a deployment
   - View **"Checks"** section

2. **In GitHub:**
   - Go to **Actions** tab
   - View workflow runs
   - Check individual job statuses

### Check Status Indicators

- ✅ **Passing** - Check completed successfully
- ❌ **Failing** - Check failed, deployment blocked
- ⏳ **Pending** - Check is running
- ⚠️ **Skipped** - Check was skipped (optional check)

---

## 🎯 Best Practices

### 1. Start with Essential Checks

Begin with:
- ✅ Lint & Type Check
- ✅ Build Verification
- ✅ Vercel Build (automatic)

Add performance testing once your workflow is stable.

### 2. Make Checks Fast

- Keep checks focused and fast
- Use caching in GitHub Actions
- Consider parallelizing checks

### 3. Monitor Check Performance

- Track how long checks take
- Optimize slow checks
- Consider making slow checks optional for previews

### 4. Document Check Failures

- Add clear error messages in workflows
- Link to documentation in failure messages
- Provide actionable feedback

---

## 📚 Reference

### Related Documentation

- **GitHub Actions Workflows:**
  - `.github/workflows/ci-cd.yml` - Main CI/CD pipeline
  - `.github/workflows/performance-testing.yml` - Performance testing

- **Vercel Documentation:**
  - [Deployment Checks](https://vercel.com/docs/deployments/checks)
  - [GitHub Integration](https://vercel.com/docs/deployments/git)

- **Project Documentation:**
  - `docs/Setup Docs/VERCEL_DEPLOYMENT_SETUP.md` - Domain & SSL setup
  - `docs/Setup Docs/VERCEL_PRODUCTION_SECRETS.md` - Environment variables
  - `docs/planning/NEXT_SPRINT_TO_GO_LIVE.md` - Production readiness checklist

---

## ✅ Verification Checklist

After setting up deployment checks, verify:

- [ ] Lint & Type Check is configured and required for production
- [ ] Build Application check is configured and required for production
- [ ] Performance Testing check is configured (optional: required for production)
- [ ] All checks appear in Vercel Deployment Checks settings
- [ ] Test by pushing a change to `main` branch
- [ ] Verify checks run and report status correctly
- [ ] Confirm deployment is blocked if a check fails
- [ ] Confirm deployment proceeds when all checks pass

---

## 🚀 Next Steps

1. ✅ Configure deployment checks in Vercel
2. ✅ Test with a small change to `main` branch
3. ✅ Verify all checks pass and deployment succeeds
4. ✅ Monitor check performance and optimize if needed
5. 📋 Continue with other production setup tasks from `NEXT_SPRINT_TO_GO_LIVE.md`

---

**Status:** Ready for configuration  
**Estimated Setup Time:** 10-15 minutes  
**Priority:** P0 - Critical for production safety

