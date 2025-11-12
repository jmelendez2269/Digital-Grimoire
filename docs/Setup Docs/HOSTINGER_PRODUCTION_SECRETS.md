# Hostinger Production Secrets Storage Guide

**Last Updated:** November 10, 2025  
**Hosting Provider:** Hostinger  
**Application:** Digital Grimoire (Next.js)

---

## 🎯 Overview

This guide documents how production secrets and environment variables are stored and managed for the Digital Grimoire application on Hostinger hosting.

**Storage Method:** File-based (`.env.production` file)  
**Location:** Hostinger hPanel → File Manager → App root directory  
**Security:** File permissions set to 600 (owner read/write only)

---

## 📋 Prerequisites

Before setting up production secrets, ensure you have:
- ✅ Hostinger account access
- ✅ SSH access to your Hostinger server (recommended) OR File Manager access via hPanel
- ✅ All production API keys and credentials ready
- ✅ Access to password vault (1Password/LastPass/Bitwarden) for shared secrets

---

## 🔒 Method: File-Based Storage (`.env.production`)

### Why File-Based?

Hostinger's shared hosting typically uses file-based environment variables for Next.js applications. This is the standard approach for Node.js applications on traditional hosting.

### Step 1: Access Your Application Directory

#### Option A: Via SSH (Recommended)

1. **Get SSH credentials from Hostinger:**
   - Log in to Hostinger hPanel
   - Navigate to **Hosting** → **Manage**
   - Find **SSH Access** section
   - Note your SSH username, host, and port

2. **Connect via SSH:**
   ```bash
   ssh username@your-server.hostinger.com -p PORT
   ```

3. **Navigate to app directory:**
   ```bash
   cd ~/domains/convergencelibrary.com/public_html/app
   # Or wherever your Next.js app is located
   ```

#### Option B: Via File Manager

1. Log in to Hostinger hPanel
2. Navigate to **File Manager**
3. Browse to your application root directory (usually `public_html/app` or similar)

---

### Step 2: Create `.env.production` File

#### Via SSH (Recommended)

1. **Create the file:**
   ```bash
   touch .env.production
   ```

2. **Set secure permissions (600 = owner read/write only):**
   ```bash
   chmod 600 .env.production
   ```

3. **Edit the file:**
   ```bash
   nano .env.production
   # Or use vim: vim .env.production
   ```

#### Via File Manager

1. In File Manager, navigate to app root directory
2. Click **"New File"** or **"Create File"**
3. Name it `.env.production`
4. **Important:** After creating, you'll need SSH access to set permissions to 600

---

### Step 3: Add Production Environment Variables

Copy the following template and fill in your production values:

```env
# ============================================
# Production Environment Variables
# Digital Grimoire - convergencelibrary.com
# ============================================

# Node Environment
NODE_ENV=production

# ============================================
# Application URL
# ============================================
NEXT_PUBLIC_APP_URL=https://convergencelibrary.com

# ============================================
# Supabase (Database & Authentication)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# ============================================
# Cloudflare R2 (File Storage)
# ============================================
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_production_r2_access_key
R2_SECRET_ACCESS_KEY=your_production_r2_secret_key
R2_BUCKET_NAME=convergence-library
R2_PUBLIC_URL=https://pub-ACCOUNT_ID.r2.dev/convergence-library

# ============================================
# Azure Computer Vision (OCR)
# ============================================
AZURE_VISION_ENDPOINT=https://your-production-resource.cognitiveservices.azure.com/
AZURE_VISION_KEY=your_production_azure_vision_key

# ============================================
# Anthropic Claude API (Metadata Extraction)
# ============================================
ANTHROPIC_API_KEY=sk-ant-your_production_key_here

# ============================================
# Replicate (Book Cover Generation) - OPTIONAL
# ============================================
REPLICATE_API_TOKEN=your_production_replicate_token_here
```

**⚠️ Important Notes:**
- **SENDGRID_API_KEY** is stored in Supabase (not in this file) - see [SENDGRID_SETUP.md](./SENDGRID_SETUP.md)
- Use **production** credentials only (not development/test keys)
- Never commit this file to git (already in `.gitignore`)

---

### Step 4: Set File Permissions (Critical for Security)

**Via SSH:**
```bash
chmod 600 .env.production
```

**Verify permissions:**
```bash
ls -la .env.production
# Should show: -rw------- (600 permissions)
```

**What 600 means:**
- `6` (owner): read + write
- `0` (group): no access
- `0` (others): no access

This ensures only the file owner can read/write the file.

---

### Step 5: Verify Environment Variables Load Correctly

1. **Restart your Next.js application:**
   ```bash
   # If using PM2:
   pm2 restart digital-grimoire
   
   # If using systemd or other process manager:
   systemctl restart digital-grimoire
   ```

2. **Check application logs:**
   ```bash
   # PM2 logs:
   pm2 logs digital-grimoire
   
   # Or check application logs in Hostinger
   ```

3. **Test the application:**
   - Visit https://convergencelibrary.com
   - Check that features requiring API keys work correctly
   - Verify no "environment variable not found" errors in logs

---

## 🔐 Security Best Practices

### ✅ DO:

1. **Use production-specific credentials:**
   - Separate Supabase project for production
   - Separate Cloudflare R2 bucket for production
   - Production API keys (not development keys)

2. **Set proper file permissions:**
   - Always use `600` permissions for `.env.production`
   - Never use `644` or `755` (would allow others to read)

3. **Store secrets in password vault:**
   - Keep backup copies in 1Password/LastPass/Bitwarden
   - Share vault access with team members
   - Document vault location in `docs/SECRETS_MANAGEMENT.md`

4. **Rotate credentials regularly:**
   - Rotate API keys every 90 days
   - Update `.env.production` when rotating
   - Document rotation dates

5. **Use SSH for file management:**
   - More secure than File Manager
   - Allows proper permission setting
   - Better for troubleshooting

### ❌ DON'T:

1. **Never commit `.env.production` to git:**
   - Already in `.gitignore`, but double-check
   - Never force-add with `git add -f`

2. **Never share `.env.production` file:**
   - Share via password vault instead
   - Use secure channels for temporary sharing if needed

3. **Never use development credentials in production:**
   - Always use separate production keys
   - Test credentials in staging environment first

4. **Never set permissions to 644 or 755:**
   - Would allow group/others to read secrets
   - Always use 600

---

## 🔄 Alternative: Hostinger Environment Variable Management

**Note:** Hostinger's shared hosting may not have built-in environment variable management like Vercel or Heroku. However, if you're using:

- **VPS Hosting:** You can use systemd environment files
- **Dedicated Server:** You can use systemd or Docker environment files

### If Hostinger Offers Environment Variable Management:

1. Check Hostinger hPanel for **"Environment Variables"** or **"App Settings"** section
2. If available, add variables there instead of `.env.production` file
3. Document the location and method in this guide
4. Update `SECURITY_VERIFICATION_REPORT.md` with the actual method used

**Current Status:** Using file-based method (`.env.production`)

---

## 📝 Secrets Stored Elsewhere

Some secrets are stored in other secure locations:

### Supabase Vault
- **SENDGRID_API_KEY** - Stored in Supabase project settings
- **Google OAuth Client Secret** - Stored in Supabase Auth settings

**Why:** These are configured directly in Supabase dashboard and don't need to be in environment files.

**Documentation:**
- SendGrid: `docs/Setup Docs/SENDGRID_SETUP.md`
- Google OAuth: `docs/Setup Docs/GOOGLE_OAUTH_SETUP.md`

---

## 🚨 Emergency Access

If you need to access production secrets in an emergency:

1. **Via SSH:**
   ```bash
   ssh username@server.hostinger.com
   cd ~/domains/convergencelibrary.com/public_html/app
   cat .env.production
   ```

2. **Via Password Vault:**
   - Access team 1Password/LastPass/Bitwarden vault
   - Look for "Digital Grimoire Production Secrets" entry

3. **Via Hostinger File Manager:**
   - Log in to hPanel
   - Navigate to File Manager
   - Open `.env.production` file
   - **Note:** May require SSH to view if permissions are 600

**See:** `docs/EMERGENCY_ACCESS_PROCEDURES.md` for detailed procedures

---

## ✅ Verification Checklist

Before going to production, verify:

- [ ] `.env.production` file created in app root directory
- [ ] File permissions set to 600 (owner read/write only)
- [ ] All production environment variables added
- [ ] Production credentials used (not development keys)
- [ ] Application restarted and loading variables correctly
- [ ] No errors in application logs
- [ ] Secrets backed up in password vault
- [ ] Team members have vault access
- [ ] `.env.production` is in `.gitignore` (verify with `git check-ignore .env.production`)

---

## 📚 Related Documentation

- **Environment Variables Reference:** `docs/Setup Docs/ENVIRONMENT_VARIABLES.md`
- **Security Verification:** `docs/SECURITY_VERIFICATION_REPORT.md`
- **Production Deployment:** `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **Secrets Management:** `docs/SECRETS_MANAGEMENT.md` (to be created)
- **Emergency Procedures:** `docs/EMERGENCY_ACCESS_PROCEDURES.md` (to be created)

---

## 🔄 Updates

**Last Updated:** November 10, 2025  
**Next Review:** Before production launch

**Change Log:**
- 2025-11-10: Initial documentation created
- Documented file-based storage method for Hostinger
- Added security best practices
- Added verification checklist

---

**⚠️ Remember:** Production secrets are critical for application security. Always follow security best practices and never commit secrets to version control.

