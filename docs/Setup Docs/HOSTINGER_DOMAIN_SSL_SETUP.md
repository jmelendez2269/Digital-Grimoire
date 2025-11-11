# Hostinger Domain & SSL Configuration - Step-by-Step Guide

**Last Updated:** November 10, 2025  
**Domain:** convergencelibrary.com  
**Hosting Provider:** Hostinger

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Hostinger account created and active
- ✅ Domain registered (convergencelibrary.com)
- ✅ Access to Hostinger hPanel (control panel)
- ✅ Domain DNS management access
- ✅ Next.js application ready for deployment

---

## 🎯 Overview

This guide covers:
1. **Domain DNS Configuration** - Pointing your domain to Hostinger
2. **SSL Certificate Setup** - Enabling HTTPS with Hostinger's free Lifetime SSL
3. **WWW Redirect Configuration** - Setting up www → root domain redirect
4. **Verification & Testing** - Ensuring everything works correctly

**Estimated Time:** 2-3 hours (including DNS propagation wait time)

---

## 📝 Step 1: Access Hostinger hPanel

### 1.1 Login to Hostinger
1. Go to [https://www.hostinger.com](https://www.hostinger.com)
2. Click **"Log In"** in the top right corner
3. Enter your email and password
4. Click **"Log In"**

### 1.2 Navigate to hPanel
1. After logging in, you'll see your **hPanel dashboard**
2. Look for your domain **convergencelibrary.com** in the list
3. Click on the domain or find the **"Manage"** button

---

## 🌐 Step 2: Configure Domain DNS Records

### 2.1 Access DNS Zone Editor
1. In hPanel, look for **"Domains"** section in the left sidebar
2. Click on **"DNS Zone Editor"** or **"DNS Management"**
3. You should see a list of DNS records for your domain

### 2.2 Get Hostinger Server IP Address
1. In hPanel, navigate to **"Hosting"** → **"Manage"**
2. Look for your hosting plan details
3. Find the **Server IP Address** (usually shown as IPv4 address like `185.230.63.xxx`)
4. **Write this down** - you'll need it for the A record
5. If IPv6 is available, note that address as well

### 2.3 Configure A Record (IPv4)
1. In **DNS Zone Editor**, look for existing A record for the root domain (`@` or blank)
2. If it exists, click **"Edit"** or **"Modify"**
3. If it doesn't exist, click **"Add Record"** or **"Create Record"**
4. Configure as follows:
   - **Type:** `A`
   - **Name/Host:** `@` (or leave blank for root domain)
   - **Points to/Value:** `[Your Hostinger Server IP]` (e.g., `185.230.63.xxx`)
   - **TTL:** `3600` (or default)
5. Click **"Save"** or **"Add Record"**

### 2.4 Configure AAAA Record (IPv6 - Optional)
1. If Hostinger provided an IPv6 address, add an AAAA record:
2. Click **"Add Record"**
3. Configure as follows:
   - **Type:** `AAAA`
   - **Name/Host:** `@` (or leave blank)
   - **Points to/Value:** `[Your Hostinger IPv6 Address]`
   - **TTL:** `3600`
4. Click **"Save"**

### 2.5 Configure CNAME Record for WWW Subdomain
1. In **DNS Zone Editor**, look for existing CNAME record for `www`
2. If it exists, click **"Edit"**
3. If it doesn't exist, click **"Add Record"**
4. Configure as follows:
   - **Type:** `CNAME`
   - **Name/Host:** `www`
   - **Points to/Value:** `convergencelibrary.com` (or `@`)
   - **TTL:** `3600`
5. Click **"Save"**

### 2.6 Verify DNS Records
Your DNS Zone Editor should now show:
- ✅ **A record:** `@` → `[Hostinger IP]`
- ✅ **AAAA record:** `@` → `[Hostinger IPv6]` (if applicable)
- ✅ **CNAME record:** `www` → `convergencelibrary.com`

---

## 🔒 Step 3: SSL Certificate Configuration

### 3.1 Access SSL Management
1. In hPanel, navigate to **"SSL"** section (usually in left sidebar)
2. Or go to **"Domains"** → **"SSL"**
3. You should see your domain listed

### 3.2 Verify SSL Installation
1. Look for **convergencelibrary.com** in the SSL list
2. Check the status - it should show:
   - ✅ **"Active"** or **"Installed"**
   - ✅ **"Lifetime SSL"** or **"Free SSL"**
   - ✅ **"Auto-renewal: Enabled"**

### 3.3 Enable SSL for Domain
1. If SSL is not active, click **"Install SSL"** or **"Activate SSL"**
2. Select **"Free SSL"** or **"Lifetime SSL"** option
3. Click **"Install"** or **"Activate"**
4. Wait for installation (usually 1-5 minutes)
5. You should see a success message

### 3.4 Enable HTTPS Redirect
1. In hPanel, navigate to **"Domains"** → **"Redirects"** or **"URL Redirects"**
2. Click **"Add Redirect"** or **"Create Redirect"**
3. Configure as follows:
   - **From:** `http://convergencelibrary.com`
   - **To:** `https://convergencelibrary.com`
   - **Type:** `301 Permanent Redirect`
4. Click **"Save"** or **"Add Redirect"**
5. Repeat for www subdomain:
   - **From:** `http://www.convergencelibrary.com`
   - **To:** `https://convergencelibrary.com`
   - **Type:** `301 Permanent Redirect`

**Alternative Method (if available):**
- Look for **"Force HTTPS"** or **"HTTPS Redirect"** toggle in SSL settings
- Enable this option (this automatically redirects all HTTP to HTTPS)

---

## 🔄 Step 4: Configure WWW Redirect

### 4.1 Set Up WWW to Root Domain Redirect
1. In hPanel, go to **"Domains"** → **"Redirects"**
2. Click **"Add Redirect"**
3. Configure as follows:
   - **From:** `https://www.convergencelibrary.com`
   - **To:** `https://convergencelibrary.com`
   - **Type:** `301 Permanent Redirect`
4. Click **"Save"**

**Note:** This ensures all www traffic redirects to the root domain (SEO best practice)

---

## ⏳ Step 5: Wait for DNS Propagation

### 5.1 Understanding DNS Propagation
- DNS changes can take **24-48 hours** to fully propagate worldwide
- However, most changes are visible within **2-6 hours**
- Some regions may see changes immediately

### 5.2 Check DNS Propagation Status
Use these tools to verify DNS propagation:

**Option 1: Online DNS Checker**
1. Go to [https://www.whatsmydns.net](https://www.whatsmydns.net)
2. Enter `convergencelibrary.com`
3. Select **"A"** record type
4. Click **"Search"**
5. Check if servers worldwide show your Hostinger IP

**Option 2: Command Line (if you have access)**
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

### 5.3 What to Look For
- ✅ A record should point to your Hostinger IP
- ✅ CNAME record for www should point to convergencelibrary.com
- ✅ All DNS servers should show consistent results (may take time)

---

## ✅ Step 6: Verify SSL Certificate

### 6.1 Test SSL Certificate Installation
1. Open a web browser
2. Navigate to: `https://convergencelibrary.com`
3. Check the address bar:
   - ✅ Should show **padlock icon** 🔒
   - ✅ Should show **"Secure"** or **"Connection is secure"**
   - ✅ Should **NOT** show any security warnings

### 6.2 Test HTTPS Redirect
1. Navigate to: `http://convergencelibrary.com` (HTTP, not HTTPS)
2. Browser should automatically redirect to: `https://convergencelibrary.com`
3. Check the address bar - should show HTTPS

### 6.3 Test WWW Redirect
1. Navigate to: `https://www.convergencelibrary.com`
2. Should redirect to: `https://convergencelibrary.com`
3. Address bar should show root domain (no www)

### 6.4 Run SSL Labs Test
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

## 🔍 Step 7: Verify Certificate Details

### 7.1 Check Certificate Information
1. In your browser, navigate to `https://convergencelibrary.com`
2. Click the **padlock icon** in the address bar
3. Click **"Certificate"** or **"Connection is secure"** → **"Certificate"**
4. Verify:
   - ✅ **Issued to:** convergencelibrary.com
   - ✅ **Issued by:** Let's Encrypt or Hostinger SSL
   - ✅ **Valid from:** Current date
   - ✅ **Valid to:** Future date (usually 90 days, auto-renewed)
   - ✅ **Subject Alternative Names:** Should include both `convergencelibrary.com` and `www.convergencelibrary.com`

### 7.2 Verify Auto-Renewal
1. In Hostinger hPanel → **SSL** section
2. Check that **"Auto-renewal"** is **Enabled**
3. Hostinger Lifetime SSL automatically renews, so this should always be enabled

---

## 🧪 Step 8: Final Testing Checklist

Run through this complete checklist:

### 8.1 Domain Access Tests
- [ ] `http://convergencelibrary.com` → Redirects to HTTPS ✅
- [ ] `https://convergencelibrary.com` → Loads correctly ✅
- [ ] `http://www.convergencelibrary.com` → Redirects to HTTPS root ✅
- [ ] `https://www.convergencelibrary.com` → Redirects to HTTPS root ✅

### 8.2 SSL Certificate Tests
- [ ] Certificate is valid (no browser warnings) ✅
- [ ] Certificate covers root domain ✅
- [ ] Certificate covers www subdomain ✅
- [ ] SSL Labs test shows A or A+ rating ✅
- [ ] Certificate auto-renewal is enabled ✅

### 8.3 DNS Tests
- [ ] A record points to correct Hostinger IP ✅
- [ ] CNAME record for www is configured ✅
- [ ] DNS propagation is complete (checked via DNS checker) ✅

### 8.4 Security Tests
- [ ] HTTPS redirect works (HTTP → HTTPS) ✅
- [ ] WWW redirect works (www → root) ✅
- [ ] No mixed content warnings ✅
- [ ] Certificate chain is complete ✅

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
4. Verify DNS records are correct in hPanel

### Problem: SSL Certificate Not Installing
**Symptoms:** SSL shows as "Pending" or "Failed"
**Solutions:**
1. Ensure DNS is fully propagated first
2. Remove any existing SSL certificates
3. Wait 24 hours after DNS propagation
4. Try installing SSL again
5. Contact Hostinger support if issue persists

### Problem: HTTPS Redirect Not Working
**Symptoms:** HTTP doesn't redirect to HTTPS
**Solutions:**
1. Check redirect rules in hPanel → Redirects
2. Enable "Force HTTPS" option if available
3. Clear browser cache
4. Try incognito/private browsing mode
5. Verify redirect rules are set to 301 (Permanent)

### Problem: Certificate Doesn't Cover WWW
**Symptoms:** www subdomain shows certificate warning
**Solutions:**
1. Ensure CNAME record is configured correctly
2. Reinstall SSL certificate (should auto-include www)
3. Check certificate details - should list both domains
4. Contact Hostinger support to verify SSL configuration

### Problem: SSL Labs Shows Low Rating
**Symptoms:** Rating is B or lower
**Solutions:**
1. This is usually fine for MVP - A+ is ideal but not critical
2. Check SSL Labs recommendations
3. Ensure TLS 1.2 and TLS 1.3 are enabled (usually automatic)
4. Contact Hostinger if you need specific cipher suite configuration

---

## 📚 Additional Resources

### Hostinger Documentation
- [Hostinger DNS Management Guide](https://support.hostinger.com/en/articles/1583258-how-to-install-lifetime-ssl-at-hostinger)
- [Hostinger SSL Setup](https://support.hostinger.com/en/articles/1583785-how-to-install-a-custom-ssl)
- [Hostinger Domain Management](https://support.hostinger.com/en/articles/1583258)

### External Tools
- **DNS Propagation Checker:** [whatsmydns.net](https://www.whatsmydns.net)
- **SSL Test:** [SSL Labs](https://www.ssllabs.com/ssltest/)
- **DNS Lookup:** [dnschecker.org](https://dnschecker.org)

### Next Steps
After completing Domain & SSL Configuration:
1. ✅ Set up Production Environment Variables (see `NEXT_SPRINT_TO_GO_LIVE.md`)
2. ✅ Deploy Next.js application to Hostinger
3. ✅ Test all functionality on production domain
4. ✅ Complete remaining P0 items from launch checklist

---

## ✅ Completion Checklist

Before moving to the next step, ensure:

- [ ] DNS A record configured and pointing to Hostinger IP
- [ ] DNS CNAME record for www configured
- [ ] SSL certificate installed and active
- [ ] HTTPS redirect enabled and working
- [ ] WWW redirect configured and working
- [ ] DNS propagation verified (checked via DNS checker)
- [ ] SSL certificate tested (browser shows secure connection)
- [ ] SSL Labs test completed (A or A+ rating)
- [ ] All test URLs work correctly
- [ ] Certificate covers both root and www domains
- [ ] Auto-renewal confirmed enabled

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

**Last Updated:** November 10, 2025  
**Next Step:** Production Environment Variables Setup

