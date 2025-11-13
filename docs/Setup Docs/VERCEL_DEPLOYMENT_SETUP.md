# Vercel Deployment & Domain Configuration - Step-by-Step Guide

**Last Updated:** November 10, 2025  
**Domain:** convergencelibrary.com  
**Hosting Provider:** Vercel

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Vercel account created and active
- ✅ Domain registered (convergencelibrary.com)
- ✅ GitHub repository connected to Vercel
- ✅ Next.js application ready for deployment
- ✅ Access to domain DNS management

---

## 🎯 Overview

This guide covers:
1. **Vercel Project Setup** - Connecting your repository and configuring build settings
2. **Domain Configuration** - Adding and configuring your custom domain
3. **SSL Certificate Setup** - Automatic HTTPS with Vercel (free SSL)
4. **Environment Variables** - Setting production secrets in Vercel
5. **Deployment Verification** - Ensuring everything works correctly

**Estimated Time:** 1-2 hours (including DNS propagation wait time)

---

## 📝 Step 1: Vercel Project Setup

### 1.1 Connect GitHub Repository

1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Sign In"** and authenticate with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import your repository: `Digital-Grimoire`
5. Configure project settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `app` (if your Next.js app is in the `app` folder)
   - **Build Command:** `pnpm build` (or `npm run build`)
   - **Output Directory:** `.next` (default for Next.js)
   - **Install Command:** `pnpm install` (or `npm install`)

### 1.2 Configure Build Settings

1. In project settings, go to **"Settings"** → **"General"**
2. Verify Node.js version (18.x or 20.x recommended)
3. Set **"Install Command"** to `pnpm install` (if using pnpm)
4. Set **"Build Command"** to `pnpm build`
5. Set **"Output Directory"** to `.next` (Next.js default)

### 1.3 Initial Deployment

1. Click **"Deploy"** to trigger first deployment
2. Wait for build to complete (usually 2-5 minutes)
3. Vercel will provide a preview URL: `your-project.vercel.app`
4. Verify the deployment works correctly

---

## 🌐 Step 2: Add Custom Domain

### 2.1 Add Domain to Vercel Project

1. In your Vercel project, go to **"Settings"** → **"Domains"**
2. Click **"Add Domain"**
3. Enter your domain: `convergencelibrary.com`
4. Click **"Add"**

### 2.2 Configure DNS Records

Vercel will provide DNS configuration instructions. Follow these steps:

#### Option A: Root Domain (convergencelibrary.com)

1. **A Record Configuration:**
   - Go to your domain registrar's DNS management
   - Add an **A record**:
     - **Name/Host:** `@` (or leave blank for root domain)
     - **Value/Points to:** Vercel will provide an IP address (e.g., `76.76.21.21`)
     - **TTL:** `3600` (or default)

2. **Alternative: CNAME Record (Recommended):**
   - Vercel may provide a CNAME target like `cname.vercel-dns.com`
   - Add a **CNAME record**:
     - **Name/Host:** `@` (some registrars require `@` or blank)
     - **Value/Points to:** `cname.vercel-dns.com`
     - **TTL:** `3600`

**Note:** Some registrars don't support CNAME for root domain. Use A record in that case.

#### Option B: WWW Subdomain

1. Vercel automatically handles www subdomain
2. Add a **CNAME record**:
   - **Name/Host:** `www`
   - **Value/Points to:** `cname.vercel-dns.com`
   - **TTL:** `3600`

### 2.3 Verify Domain Ownership

1. After adding DNS records, Vercel will verify domain ownership
2. This usually takes 1-5 minutes after DNS propagation
3. You'll see a green checkmark when verification is complete

---

## 🔒 Step 3: SSL Certificate Configuration

### 3.1 Automatic SSL with Vercel

**Good News:** Vercel automatically provisions SSL certificates for all domains!

1. **Automatic Provisioning:**
   - Vercel uses Let's Encrypt for SSL certificates
   - Certificates are automatically issued when domain is added
   - Certificates auto-renew every 90 days
   - No manual configuration required

2. **Verify SSL Status:**
   - Go to **"Settings"** → **"Domains"**
   - Check your domain status
   - Should show: ✅ **"Valid"** or **"Active"**

### 3.2 Enable HTTPS Redirect

1. In **"Settings"** → **"Domains"**
2. Find your domain: `convergencelibrary.com`
3. Enable **"Redirect www to non-www"** (or vice versa, your preference)
4. HTTPS redirect is automatic - Vercel forces HTTPS for all domains

### 3.3 Verify SSL Certificate

1. Navigate to: `https://convergencelibrary.com`
2. Check the address bar:
   - ✅ Should show **padlock icon** 🔒
   - ✅ Should show **"Secure"** or **"Connection is secure"**
   - ✅ Should **NOT** show any security warnings

---

## ⏳ Step 4: Wait for DNS Propagation

### 4.1 Understanding DNS Propagation

- DNS changes can take **24-48 hours** to fully propagate worldwide
- However, most changes are visible within **2-6 hours**
- Some regions may see changes immediately

### 4.2 Check DNS Propagation Status

Use these tools to verify DNS propagation:

**Option 1: Online DNS Checker**
1. Go to [https://www.whatsmydns.net](https://www.whatsmydns.net)
2. Enter `convergencelibrary.com`
3. Select **"A"** record type
4. Click **"Search"**
5. Check if servers worldwide show Vercel's IP or CNAME

**Option 2: Command Line**
```bash
# Check A record
dig convergencelibrary.com A

# Check CNAME record
dig www.convergencelibrary.com CNAME

# Check from specific DNS server
dig @8.8.8.8 convergencelibrary.com A
```

**Option 3: Online Tools**
- [https://dnschecker.org](https://dnschecker.org)
- [https://www.dnswatch.info](https://www.dnswatch.info)

### 4.3 What to Look For

- ✅ A record should point to Vercel's IP (if using A record)
- ✅ CNAME record should point to `cname.vercel-dns.com` (if using CNAME)
- ✅ All DNS servers should show consistent results (may take time)

---

## ✅ Step 5: Verify Deployment

### 5.1 Test Domain Access

Run through this complete checklist:

**Domain Access Tests:**
- [ ] `http://convergencelibrary.com` → Redirects to HTTPS ✅
- [ ] `https://convergencelibrary.com` → Loads correctly ✅
- [ ] `http://www.convergencelibrary.com` → Redirects to HTTPS ✅
- [ ] `https://www.convergencelibrary.com` → Redirects to HTTPS root ✅

### 5.2 SSL Certificate Tests

- [ ] Certificate is valid (no browser warnings) ✅
- [ ] Certificate covers root domain ✅
- [ ] Certificate covers www subdomain ✅
- [ ] SSL Labs test shows A or A+ rating ✅
- [ ] Certificate auto-renewal is enabled (automatic) ✅

### 5.3 Run SSL Labs Test

1. Go to [https://www.ssllabs.com/ssltest/](https://www.ssllabs.com/ssltest/)
2. Enter your domain: `convergencelibrary.com`
3. Click **"Submit"**
4. Wait for the test to complete (may take 1-2 minutes)
5. Review the results:
   - ✅ **Target Rating:** Should be **A** or **A+**
   - ✅ **Certificate:** Should show valid certificate
   - ✅ **Protocol Support:** Should show TLS 1.2 and TLS 1.3
   - ✅ **Key Exchange:** Should show strong cipher suites

**Target:** A+ rating (excellent security configuration)

---

## 🚨 Troubleshooting

### Problem: DNS Not Propagating

**Symptoms:** DNS checkers show old IP or no IP

**Solutions:**
1. Wait longer (can take up to 48 hours)
2. Clear DNS cache on your computer:
   ```powershell
   # Windows PowerShell
   ipconfig /flushdns
   ```
3. Try different DNS servers (8.8.8.8, 1.1.1.1)
4. Verify DNS records are correct in your registrar
5. Check Vercel domain settings for correct DNS instructions

### Problem: SSL Certificate Not Issuing

**Symptoms:** SSL shows as "Pending" or domain shows as "Invalid"

**Solutions:**
1. Ensure DNS is fully propagated first
2. Wait 24 hours after DNS propagation
3. Check Vercel domain status page
4. Verify DNS records match Vercel's requirements exactly
5. Contact Vercel support if issue persists

### Problem: HTTPS Redirect Not Working

**Symptoms:** HTTP doesn't redirect to HTTPS

**Solutions:**
1. Vercel automatically forces HTTPS - this should work automatically
2. Clear browser cache
3. Try incognito/private browsing mode
4. Check Vercel project settings → Domains → verify redirect settings

### Problem: Build Fails on Vercel

**Symptoms:** Deployment shows build error

**Solutions:**
1. Check build logs in Vercel dashboard
2. Verify `package.json` has correct scripts
3. Ensure all dependencies are listed in `package.json`
4. Check Node.js version compatibility
5. Verify environment variables are set (see next section)

---

## 📚 Additional Resources

### Vercel Documentation
- [Vercel Domain Configuration](https://vercel.com/docs/concepts/projects/domains)
- [Vercel DNS Configuration](https://vercel.com/docs/concepts/projects/domains/dns-records)
- [Vercel SSL Certificates](https://vercel.com/docs/concepts/projects/domains/ssl-certificates)

### External Tools
- **DNS Propagation Checker:** [whatsmydns.net](https://www.whatsmydns.net)
- **SSL Test:** [SSL Labs](https://www.ssllabs.com/ssltest/)
- **DNS Lookup:** [dnschecker.org](https://dnschecker.org)

### Next Steps
After completing Domain & SSL Configuration:
1. ✅ Set up Production Environment Variables (see `VERCEL_PRODUCTION_SECRETS.md`)
2. ✅ Configure production build settings
3. ✅ Test all functionality on production domain
4. ✅ Complete remaining P0 items from launch checklist

---

## ✅ Completion Checklist

Before moving to the next step, ensure:

- [ ] Vercel project created and connected to GitHub
- [ ] Initial deployment successful
- [ ] Custom domain added to Vercel project
- [ ] DNS A or CNAME record configured
- [ ] DNS CNAME record for www configured (if applicable)
- [ ] SSL certificate automatically provisioned and active
- [ ] HTTPS redirect working (automatic with Vercel)
- [ ] WWW redirect configured (if desired)
- [ ] DNS propagation verified (checked via DNS checker)
- [ ] SSL certificate tested (browser shows secure connection)
- [ ] SSL Labs test completed (A or A+ rating)
- [ ] All test URLs work correctly
- [ ] Certificate covers both root and www domains
- [ ] Auto-renewal confirmed (automatic with Vercel)

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

**Last Updated:** November 10, 2025  
**Next Step:** Production Environment Variables Setup (see `VERCEL_PRODUCTION_SECRETS.md`)

