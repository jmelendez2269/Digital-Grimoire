# Dependabot Automated Dependency Monitoring

This document explains the automated dependency monitoring system set up for the Digital Grimoire project.

## 🎯 Overview

We've implemented a comprehensive dependency monitoring system that:
- **Automatically checks for updates** to all project dependencies weekly
- **Creates pull requests** when new versions are available
- **Audits monthly** to ensure new dependency files are being monitored
- **Groups related updates** to reduce PR noise

## 📁 Files Created

### 1. `.github/dependabot.yml`
Main Dependabot configuration that monitors:
- **NPM packages** (`/app`) - Next.js, React, UI libraries, dev tools
- **Python packages** (`/lambda/textract-trigger` and `/lambda/textract-completion`) - boto3, supabase
- **GitHub Actions** - All workflow dependencies

### 2. `.github/workflows/dependabot-audit.yml`
Monthly audit workflow that:
- Scans the entire codebase for dependency files
- Checks if they're monitored by Dependabot
- Creates/updates a GitHub issue if unmonitored files are found
- Runs on the 1st of every month at 9 AM UTC

### 3. Lambda Requirements Files
- `lambda/textract-trigger/requirements.txt` - boto3==1.34.0
- `lambda/textract-completion/requirements.txt` - boto3==1.34.0, supabase==2.3.0

## 🔔 What to Expect

### Weekly Updates
Every Monday at 9 AM, Dependabot will:
- Check for new versions of all dependencies
- Create PRs for updates (grouped intelligently)
- Add appropriate labels for easy filtering

### Monthly Audit
On the 1st of each month at 9 AM, the audit will:
- Scan for new dependency files
- Create an issue if any are unmonitored
- Update existing issue if one is already open

### Special Handling

#### Grouped Updates
Minor and patch updates are grouped to reduce noise:
- **Development dependencies** - @types/\*, eslint\*, prettier\*
- **React ecosystem** - react, react-dom, next (patch only)
- **UI libraries** - @radix-ui/\*, lucide-react
- **GitHub Actions** - All action updates grouped

#### Individual PRs
Major version updates get separate PRs for careful review:
- Next.js 16.0.0 → 17.0.0
- React 19 → 20
- Any breaking changes

#### Ignored Updates
- Pre-release versions (canary, beta, rc) are automatically ignored

## 🚀 Activation

Once you push these files to GitHub:

1. **Dependabot activates automatically** - No setup required
2. **View status** - Go to Insights → Dependency graph → Dependabot
3. **Test the audit** - Go to Actions → Dependabot Configuration Audit → Run workflow

## 📝 Maintenance

### When You Add New Files
If you add new package.json, requirements.txt, or other dependency files:
- The monthly audit will detect them
- An issue will be created
- Update `.github/dependabot.yml` to monitor the new directory

### Customizing Settings
Edit `.github/dependabot.yml` to:
- Change update frequency (daily, weekly, monthly)
- Adjust PR limits
- Add/remove labels
- Modify grouping rules
- Add reviewers

## 🔍 Monitoring Next.js 16 Stable Release

When Next.js 16 stable is released:
1. Dependabot will create a PR automatically
2. You'll get a notification
3. Review the changelog in the PR
4. Merge when ready

The PR will be labeled:
- `dependencies`
- `npm`

## 📊 Benefits

✅ **Automatic security updates** - Stay protected from vulnerabilities  
✅ **Stay current** - Never fall behind on dependencies  
✅ **Reduced manual work** - No need to check for updates manually  
✅ **Scalable** - Automatically adapts as project grows  
✅ **Grouped updates** - Reduces PR spam  
✅ **Clear changelog** - Each PR includes release notes  

## 🔗 Resources

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Configuration Options](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Supported Ecosystems](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/about-dependabot-version-updates#supported-repositories-and-ecosystems)

---

*Setup completed: October 28, 2025*

