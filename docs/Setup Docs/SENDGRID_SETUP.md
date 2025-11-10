# SendGrid Setup Guide

**Last Updated:** November 2025  
**Domain:** convergencelibrary.com  
**DNS Provider:** Namecheap  
**Status:** In Progress

---

## Overview

This guide documents the complete SendGrid setup process for Convergence Library, including domain authentication, link branding, and DNS configuration in Namecheap.

---

## Prerequisites

- [x] SendGrid account created and verified
- [ ] Domain authenticated in SendGrid
- [ ] DNS records added to Namecheap
- [ ] Domain verification completed
- [ ] Link branding configured
- [ ] API key generated

---

## Step 1: SendGrid Account Setup

### Account Creation

1. Sign up at https://sendgrid.com
2. Verify email address
3. Complete account verification process

### Account Verification Status

- [x] Email verified
- [ ] Phone verification (if required)
- [ ] Account details completed

---

## Step 2: Domain Authentication

### Domain Information

- **Domain:** `convergencelibrary.com`
- **DNS Provider:** Namecheap
- **Authentication Type:** Manual Setup

### DNS Records Required

SendGrid requires the following DNS records to be added to Namecheap:

#### 1. Link Branding (CNAME)

**Record 1:**
- **Type:** CNAME
- **Host:** `url1708`
- **Value:** `sendgrid.net`
- **Full Domain:** `url1708.convergencelibrary.com`

**Record 2:**
- **Type:** CNAME
- **Host:** `57219658`
- **Value:** `sendgrid.net`
- **Full Domain:** `57219658.convergencelibrary.com`

#### 2. Email Authentication (CNAME)

**Record 3:**
- **Type:** CNAME
- **Host:** `em2464`
- **Value:** `u57219658.wl159.sendgrid.net`
- **Full Domain:** `em2464.convergencelibrary.com`

#### 3. DKIM Records (CNAME)

**DKIM Record 1:**
- **Type:** CNAME
- **Host:** `s1._domainkey`
- **Value:** `s1.domainkey.u57219658.wl159.sendgrid.net`
- **Full Domain:** `s1._domainkey.convergencelibrary.com`

**DKIM Record 2:**
- **Type:** CNAME
- **Host:** `s2._domainkey`
- **Value:** `s2.domainkey.u57219658.wl159.sendgrid.net`
- **Full Domain:** `s2._domainkey.convergencelibrary.com`

#### 4. DMARC Policy (TXT)

**DMARC Record:**
- **Type:** TXT
- **Host:** `_dmarc`
- **Value:** `v=DMARC1; p=none;`
- **Full Domain:** `_dmarc.convergencelibrary.com`

**Note:** Start with `p=none` (monitoring only). After monitoring for a period, consider upgrading to `p=quarantine` or `p=reject`.

#### 5. SPF Record (TXT)

**SPF Record:**
- **Type:** TXT
- **Host:** `@` (or root domain)
- **Value:** `v=spf1 include:sendgrid.net ~all`
- **Full Domain:** `convergencelibrary.com`

**Note:** This record should already exist or needs to be added. If you have an existing SPF record, you'll need to modify it to include SendGrid.

---

## Step 3: Adding DNS Records in Namecheap

### Accessing DNS Management

1. Log in to Namecheap: https://www.namecheap.com
2. Go to **Domain List**
3. Click **Manage** next to `convergencelibrary.com`
4. Navigate to **Advanced DNS** tab

### Adding CNAME Records

For each CNAME record:

1. Click **Add New Record**
2. Select **CNAME Record** from Type dropdown
3. Enter the **Host** value (subdomain only, without `.convergencelibrary.com`)
4. Enter the **Value** exactly as provided by SendGrid
5. Set **TTL** to **Automatic** (or 30 min/1 hour)
6. Click the checkmark to save

**Example for Link Branding:**
```
Type: CNAME Record
Host: url1708
Value: sendgrid.net
TTL: Automatic
```

### Adding TXT Records

For DMARC and SPF records:

1. Click **Add New Record**
2. Select **TXT Record** from Type dropdown
3. Enter the **Host** value:
   - For DMARC: `_dmarc`
   - For SPF: `@` (or leave blank for root domain)
4. Enter the **Value** exactly as provided
5. Set **TTL** to **Automatic**
6. Click the checkmark to save

**Example for DMARC:**
```
Type: TXT Record
Host: _dmarc
Value: v=DMARC1; p=none;
TTL: Automatic
```

---

## Step 4: Link Branding Setup

### What is Link Branding?

Link branding rewrites SendGrid tracking links to use your domain instead of `sendgrid.net`. This improves:
- **Brand consistency** - Links show your domain
- **Deliverability** - Reduces spam flags
- **Trust** - Users see your domain, not a third party
- **Professional appearance** - Cleaner URLs

### Link Branding Records

The following CNAME records enable link branding:

1. `url1708.convergencelibrary.com` → `sendgrid.net`
2. `57219658.convergencelibrary.com` → `sendgrid.net`

### Verification

1. Wait 5-30 minutes for DNS propagation
2. In SendGrid Dashboard, go to **Settings** → **Sender Authentication** → **Link Branding**
3. Click **Verify** next to your link branding domain
4. Once verified, all tracking links will use your branded domain

**Before:** `https://sendgrid.net/ls/click?upn=...`  
**After:** `https://url1708.convergencelibrary.com/ls/click?upn=...`

---

## Step 5: Domain Verification

### Verifying DNS Records

1. Wait for DNS propagation (can take 5 minutes to 48 hours)
2. Use DNS checker tools:
   - https://dnschecker.org
   - https://www.whatsmydns.net
3. Search for each subdomain to verify records are propagating

### Verifying in SendGrid

1. Go to **Settings** → **Sender Authentication**
2. Find your domain (`convergencelibrary.com`)
3. Click **Verify** next to each record type
4. SendGrid will check:
   - [ ] SPF record
   - [ ] DKIM records (s1 and s2)
   - [ ] DMARC record
   - [ ] Link branding records

### Verification Status

- [ ] SPF verified
- [ ] DKIM 1 (s1._domainkey) verified
- [ ] DKIM 2 (s2._domainkey) verified
- [ ] DMARC verified
- [ ] Link branding verified
- [ ] Domain fully authenticated

---

## Step 6: Generate API Key

### Creating API Key

1. In SendGrid Dashboard, go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name the key (e.g., "Supabase SMTP" or "Production API Key")
4. Select permissions:
   - **Full Access** (recommended for SMTP)
   - OR **Mail Send** (minimum required)
5. Click **Create & View**
6. **IMPORTANT:** Copy the API key immediately (shown only once)

### Storing API Key Securely

- [ ] API key copied
- [ ] Stored in password manager (1Password, LastPass, Bitwarden)
- [ ] Stored in secure notes app
- [ ] **NOT** stored in code or committed to git
- [ ] Team has access to secure storage location

### API Key Details

- **Key Name:** [To be filled]
- **Created:** [Date]
- **Permissions:** Mail Send / Full Access
- **Status:** Active

---

## Step 7: Configure in Supabase

### SMTP Configuration

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Auth** → **SMTP Settings**
3. Enable **Custom SMTP**
4. Enter the following:

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP Username: apikey
SMTP Password: [Your SendGrid API Key from Step 6]
Sender Email: noreply@convergencelibrary.com
Sender Name: Convergence
```

5. Click **Save**
6. Send a test email to verify configuration

### Configuration Status

- [ ] Custom SMTP enabled
- [ ] SendGrid credentials configured
- [ ] Sender email set: `noreply@convergencelibrary.com`
- [ ] Sender name set: `Convergence`
- [ ] Test email sent successfully

---

## Step 8: Testing

### Email Delivery Testing

Test the following email flows:

- [ ] Password reset email
- [ ] Email verification email
- [ ] Welcome email (if configured)
- [ ] Test on Gmail
- [ ] Test on Outlook
- [ ] Test on Yahoo Mail
- [ ] Verify emails arrive in inbox (not spam)
- [ ] Verify links work correctly
- [ ] Verify link branding is active (links use your domain)

### Link Branding Verification

1. Send a test email through SendGrid
2. Check the email source/headers
3. Verify tracking links use `url1708.convergencelibrary.com` instead of `sendgrid.net`
4. Click links to ensure they redirect correctly

---

## DNS Records Summary

### Complete DNS Record List

| Type | Host | Value | Purpose |
|------|------|-------|---------|
| CNAME | `url1708` | `sendgrid.net` | Link branding |
| CNAME | `57219658` | `sendgrid.net` | Link branding |
| CNAME | `em2464` | `u57219658.wl159.sendgrid.net` | Email authentication |
| CNAME | `s1._domainkey` | `s1.domainkey.u57219658.wl159.sendgrid.net` | DKIM 1 |
| CNAME | `s2._domainkey` | `s2.domainkey.u57219658.wl159.sendgrid.net` | DKIM 2 |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | DMARC policy |
| TXT | `@` | `v=spf1 include:sendgrid.net ~all` | SPF record |

---

## Troubleshooting

### DNS Records Not Verifying

**Symptoms:**
- SendGrid shows records as "Not Verified"
- DNS checker shows records not propagating

**Solutions:**
1. Wait 24-48 hours for full DNS propagation
2. Verify records are entered exactly as shown (no typos)
3. Check TTL settings (lower TTL = faster propagation)
4. Use DNS checker tools to verify records globally
5. Ensure no conflicting records exist

### Link Branding Not Working

**Symptoms:**
- Links still show `sendgrid.net` domain
- Link branding verification fails

**Solutions:**
1. Verify both CNAME records are added correctly
2. Wait for DNS propagation
3. Clear browser cache
4. Verify in SendGrid that link branding is enabled
5. Check that emails are being sent through SendGrid (not Supabase default)

### Email Delivery Issues

**Symptoms:**
- Emails not arriving
- Emails going to spam

**Solutions:**
1. Verify all DNS records (SPF, DKIM, DMARC) are correct
2. Check SendGrid dashboard for bounce/complaint reports
3. Test email deliverability with https://www.mail-tester.com
4. Verify sender email is authenticated
5. Check Supabase SMTP configuration

### API Key Not Working

**Symptoms:**
- SMTP authentication fails
- "Invalid credentials" error

**Solutions:**
1. Verify API key is copied correctly (no extra spaces)
2. Ensure API key has "Mail Send" permissions
3. Check that API key is active (not revoked)
4. Verify SMTP username is exactly `apikey` (lowercase)
5. Regenerate API key if needed

---

## Security Best Practices

### API Key Security

- ✅ Never commit API keys to git
- ✅ Store in password manager
- ✅ Use environment variables in production
- ✅ Rotate keys periodically
- ✅ Use least privilege (Mail Send only, not Full Access if possible)

### DNS Security

- ✅ Keep DNS records private (don't share publicly)
- ✅ Monitor for unauthorized changes
- ✅ Use strong DNS provider account security
- ✅ Enable 2FA on Namecheap account

### Email Security

- ✅ Start with DMARC `p=none` (monitoring)
- ✅ Monitor DMARC reports
- ✅ Gradually increase DMARC policy strictness
- ✅ Monitor bounce and complaint rates
- ✅ Set up SendGrid webhooks for alerts

---

## Monitoring & Maintenance

### SendGrid Dashboard

Monitor the following metrics:

- [ ] Email delivery rates
- [ ] Bounce rates (should be <5%)
- [ ] Complaint rates (should be <0.1%)
- [ ] Open rates
- [ ] Click rates
- [ ] Domain reputation

### Webhooks (Optional)

Set up SendGrid webhooks for:
- Bounce events
- Complaint events
- Delivery events
- Open/click tracking

### Regular Maintenance

- [ ] Review email metrics weekly
- [ ] Check DNS records monthly
- [ ] Rotate API keys quarterly
- [ ] Review DMARC reports monthly
- [ ] Update DMARC policy as needed

---

## Cost Information

### SendGrid Pricing

- **Free Tier:** 100 emails/day (3,000/month) - Good for initial launch
- **Essentials:** $19.95/month for 50,000 emails
- **Pro:** $89.95/month for 100,000 emails

### Current Plan

- **Plan:** [To be filled]
- **Monthly Limit:** [To be filled]
- **Current Usage:** Monitor in SendGrid dashboard

---

## Reference Documentation

### SendGrid Resources

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [Domain Authentication Guide](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication)
- [Link Branding Guide](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-link-branding)
- [API Key Management](https://docs.sendgrid.com/ui/account-and-settings/api-keys)

### DNS Resources

- [Namecheap DNS Management](https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/)
- [DNS Checker](https://dnschecker.org)
- [MXToolbox](https://mxtoolbox.com/) - DNS/email diagnostics

### Testing Tools

- [Mail-Tester](https://www.mail-tester.com/) - Email deliverability testing
- [DKIM Validator](https://dkimvalidator.com/)
- [DMARC Analyzer](https://dmarcian.com/dmarc-xml/)

---

## Next Steps

After completing SendGrid setup:

1. ✅ Verify all DNS records
2. ✅ Complete domain authentication in SendGrid
3. ✅ Configure Supabase SMTP settings
4. ✅ Test email delivery
5. ✅ Customize email templates in Supabase
6. ✅ Set up monitoring and webhooks
7. ✅ Document any custom configurations

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| November 2025 | Initial setup documentation created | Development Team |

---

**Last Updated:** November 2025  
**Version:** 1.0.0  
**Domain:** convergencelibrary.com  
**Status:** In Progress

