# Vercel Production Secrets Storage Guide

**Last Updated:** November 10, 2025  
**Hosting Provider:** Vercel  
**Application:** Digital Grimoire (Next.js)

---

## 🎯 Overview

This guide documents how production secrets and environment variables are stored and managed for the Digital Grimoire application on Vercel.

**Storage Method:** Vercel Environment Variables (built-in)  
**Location:** Vercel Dashboard → Project Settings → Environment Variables  
**Security:** Encrypted at rest, only accessible via Vercel dashboard or API

---

## 📋 Prerequisites

Before setting up production secrets, ensure you have:
- ✅ Vercel account access
- ✅ Project deployed on Vercel
- ✅ Admin access to Vercel project
- ✅ All production API keys and credentials ready
- ✅ Access to password vault (1Password/LastPass/Bitwarden) for backup

---

## 🔒 Method: Vercel Environment Variables

### Why Vercel Environment Variables?

Vercel provides a secure, built-in environment variable management system that:
- Encrypts secrets at rest
- Provides separate environments (Development, Preview, Production)
- Automatically injects variables during build and runtime
- Supports encrypted variables for sensitive data
- Integrates with Vercel CLI for local development

### Step 1: Access Environment Variables

1. **Log in to Vercel:**
   - Go to [https://vercel.com](https://vercel.com)
   - Sign in with your account

2. **Navigate to Project Settings:**
   - Select your project: `Digital-Grimoire`
   - Click **"Settings"** in the top navigation
   - Click **"Environment Variables"** in the left sidebar

### Step 2: Add Production Environment Variables

1. **Click "Add New"** button
2. **Enter variable details:**
   - **Key:** Variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value:** Variable value (your production secret)
   - **Environment:** Select **"Production"** (and optionally Preview/Development)

3. **For sensitive variables, use "Encrypted":**
   - Check the **"Encrypted"** checkbox for sensitive secrets
   - This ensures the value is encrypted at rest

4. **Click "Save"**

### Step 3: Add All Required Variables

Add the following production environment variables:

```env
# ============================================
# Application Configuration
# ============================================
NODE_ENV=production
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
# OpenAI API (AI Features)
# ============================================
OPENAI_API_KEY=sk-your_production_key_here

# ============================================
# Anthropic Claude API (Optional - AI Features)
# ============================================
ANTHROPIC_API_KEY=sk-ant-your_production_key_here

# ============================================
# Replicate (Book Cover Generation) - OPTIONAL
# ============================================
REPLICATE_API_TOKEN=your_production_replicate_token_here
```

**⚠️ Important Notes:**
- **SENDGRID_API_KEY** is stored in Supabase (not in Vercel) - see [SENDGRID_SETUP.md](./SENDGRID_SETUP.md)
- Use **production** credentials only (not development/test keys)
- Mark sensitive variables as **"Encrypted"** (SUPABASE_SERVICE_ROLE_KEY, API keys, etc.)
- Set environment to **"Production"** for all production variables

---

## 🔐 Security Best Practices

### ✅ DO:

1. **Use production-specific credentials:**
   - Separate Supabase project for production
   - Separate Cloudflare R2 bucket for production
   - Production API keys (not development keys)

2. **Encrypt sensitive variables:**
   - Always check **"Encrypted"** for sensitive secrets
   - This includes: API keys, service role keys, database credentials

3. **Use separate environments:**
   - Set variables for **"Production"** only when needed
   - Use **"Preview"** for staging/testing
   - Use **"Development"** for local development (optional)

4. **Store secrets in password vault:**
   - Keep backup copies in 1Password/LastPass/Bitwarden
   - Document vault location
   - Share vault access with team members (if applicable)

5. **Rotate credentials regularly:**
   - Rotate API keys every 90 days
   - Update Vercel environment variables when rotating
   - Document rotation dates

### ❌ DON'T:

1. **Never commit environment variables to git:**
   - Already in `.gitignore`, but double-check
   - Never force-add with `git add -f`
   - Never hardcode secrets in source code

2. **Never share environment variable values:**
   - Share via password vault instead
   - Use secure channels for temporary sharing if needed

3. **Never use development credentials in production:**
   - Always use separate production keys
   - Test credentials in staging environment first

4. **Never expose service role keys:**
   - Never add `SUPABASE_SERVICE_ROLE_KEY` to `NEXT_PUBLIC_*` variables
   - Service role keys should only be used server-side

---

## 🔄 Using Environment Variables in Code

### Accessing Variables

**Client-Side (Browser):**
```typescript
// Only variables prefixed with NEXT_PUBLIC_ are available client-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
```

**Server-Side (API Routes, Server Components):**
```typescript
// All environment variables are available server-side
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.OPENAI_API_KEY;
```

### Type Safety (Optional)

Create a type definition file:

```typescript
// src/types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    // ... other variables
  }
}
```

---

## 🚨 Emergency Access

If you need to access production secrets in an emergency:

1. **Via Vercel Dashboard:**
   - Log in to [vercel.com](https://vercel.com)
   - Navigate to Project → Settings → Environment Variables
   - View variable names (values are hidden for encrypted variables)
   - Click "Show" to reveal encrypted values (requires authentication)

2. **Via Vercel CLI:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login
   vercel login
   
   # Link project
   vercel link
   
   # Pull environment variables (creates .env.local)
   vercel env pull .env.local
   ```

3. **Via Password Vault:**
   - Access team 1Password/LastPass/Bitwarden vault
   - Look for "Digital Grimoire Production Secrets" entry

**See:** `docs/EMERGENCY_ACCESS_PROCEDURES.md` for detailed procedures

---

## 📝 Secrets Stored Elsewhere

Some secrets are stored in other secure locations:

### Supabase Vault
- **SENDGRID_API_KEY** - Stored in Supabase project settings
- **Google OAuth Client Secret** - Stored in Supabase Auth settings

**Why:** These are configured directly in Supabase dashboard and don't need to be in Vercel environment variables.

**Documentation:**
- SendGrid: `docs/Setup Docs/SENDGRID_SETUP.md`
- Google OAuth: `docs/Setup Docs/GOOGLE_OAUTH_SETUP.md`

---

## ✅ Verification Checklist

Before going to production, verify:

- [ ] All production environment variables added to Vercel
- [ ] Sensitive variables marked as "Encrypted"
- [ ] Environment set to "Production" for all production variables
- [ ] Production credentials used (not development keys)
- [ ] Application redeployed after adding variables
- [ ] No errors in application logs
- [ ] Secrets backed up in password vault
- [ ] Team members have vault access (if applicable)
- [ ] `.env.local` is in `.gitignore` (verify with `git check-ignore .env.local`)

---

## 🔄 Updating Environment Variables

### Adding a New Variable

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Click **"Add New"**
3. Enter key, value, and select environment
4. Click **"Save"**
5. **Redeploy** the application for changes to take effect

### Updating an Existing Variable

1. Find the variable in the list
2. Click **"Edit"** (pencil icon)
3. Update the value
4. Click **"Save"**
5. **Redeploy** the application

### Deleting a Variable

1. Find the variable in the list
2. Click **"Delete"** (trash icon)
3. Confirm deletion
4. **Redeploy** the application

**Note:** Always redeploy after changing environment variables for changes to take effect.

---

## 📚 Related Documentation

- **Environment Variables Reference:** `docs/Setup Docs/ENVIRONMENT_VARIABLES.md`
- **Security Verification:** `docs/SECURITY_VERIFICATION_REPORT.md`
- **Production Deployment:** `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **Vercel Deployment:** `docs/Setup Docs/VERCEL_DEPLOYMENT_SETUP.md`
- **Emergency Procedures:** `docs/EMERGENCY_ACCESS_PROCEDURES.md` (to be created)

---

## 🔄 Updates

**Last Updated:** November 10, 2025  
**Next Review:** Before production launch

**Change Log:**
- 2025-11-10: Initial documentation created
- Documented Vercel environment variable management
- Added security best practices
- Added verification checklist

---

**⚠️ Remember:** Production secrets are critical for application security. Always follow security best practices and never commit secrets to version control.

