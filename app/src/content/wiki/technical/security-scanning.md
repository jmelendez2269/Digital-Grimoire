---
title: Security Scanning Guide
type: guide
status: stable
audience: developer
description: Procedures for security audits, vulnerability scanning, and pre-production checks.
---

# Security Scanning Guide

**Last Updated:** November 10, 2025  
**Status:** Pre-Production Security Checklist  
**Purpose:** Step-by-step guide for performing security scans before production launch

---

## Overview

This guide provides actionable steps to complete the security scanning requirements in the Production Deployment Checklist. All scans should be completed before launching to production.

---

## 🔍 1. Dependency Vulnerability Scanning

### Automated Scanning (Already Active)

✅ **Dependabot is configured** - See `docs/DEPENDABOT_SETUP.md`

- Weekly dependency updates
- Monthly dependency audit
- Automatic PR creation for updates

### Manual Pre-Launch Scan

**Step 1: Run npm/pnpm audit**

```powershell
# Navigate to app directory
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"

# Run audit
pnpm audit

# For detailed output
pnpm audit --json > security-audit.json
```

**Step 2: Review Results**

- **Critical/High vulnerabilities:** Fix immediately
- **Medium vulnerabilities:** Fix before launch
- **Low vulnerabilities:** Review and fix if time permits

**Step 3: Fix Vulnerabilities**

```powershell
# Update vulnerable packages
pnpm update <package-name>

# Or update all packages (be careful - test thoroughly)
pnpm update
```

**Step 4: Verify Fixes**

```powershell
# Re-run audit to confirm fixes
pnpm audit
```

### Optional: Snyk Integration

For more comprehensive scanning:

```powershell
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Monitor project (requires Snyk account)
snyk monitor
```

---

## 🛡️ 2. OWASP Security Audit

### OWASP Top 10 Checklist

Review each item below and verify your application is protected:

#### A01:2021 – Broken Access Control

- [ ] **RLS Policies Verified**
  - Test that users cannot access other users' data
  - Verify RLS policies are enabled on all tables
  - Test admin-only endpoints are protected

```sql
-- Example: Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

- [ ] **API Authorization Checks**
  - All API routes check user authentication
  - Admin routes verify admin role
  - Resource ownership verified before operations

#### A02:2021 – Cryptographic Failures

- [ ] **Sensitive Data Protection**
  - Passwords hashed (Supabase handles this)
  - API keys never exposed in client-side code
  - Environment variables encrypted in Vercel
  - HTTPS enforced (automatic with Vercel)

#### A03:2021 – Injection

- [ ] **SQL Injection Prevention**
  - All database queries use parameterized queries (Supabase client)
  - No raw SQL with user input
  - RLS policies prevent unauthorized access

- [ ] **XSS Prevention**
  - User-generated content sanitized with DOMPurify
  - React automatically escapes content
  - No `dangerouslySetInnerHTML` without sanitization

**Verify DOMPurify usage:**

```typescript
// Search codebase for dangerouslySetInnerHTML
// Ensure all instances use DOMPurify
```

#### A04:2021 – Insecure Design

- [ ] **Security by Design**
  - Authentication required for sensitive operations
  - Rate limiting implemented
  - Input validation on all user inputs
  - Error messages don't leak sensitive information

#### A05:2021 – Security Misconfiguration

- [ ] **Configuration Review**
  - Environment variables properly set
  - CORS configured correctly
  - Security headers configured (see Security Headers section)
  - Default credentials changed
  - Unnecessary features disabled

#### A06:2021 – Vulnerable and Outdated Components

- [ ] **Dependency Management**
  - All dependencies up to date (Dependabot active)
  - No known vulnerabilities (pnpm audit clean)
  - Regular updates scheduled

#### A07:2021 – Identification and Authentication Failures

- [ ] **Authentication Security**
  - Password reset flow secure
  - Session management secure (Supabase handles)
  - Multi-factor authentication considered (future)
  - Brute force protection (rate limiting)

#### A08:2021 – Software and Data Integrity Failures

- [ ] **Integrity Checks**
  - Dependencies from trusted sources (npm registry)
  - CI/CD pipeline secure
  - No unauthorized code changes

#### A09:2021 – Security Logging and Monitoring Failures

- [ ] **Monitoring Setup**
  - Sentry configured for error tracking
  - Vercel Analytics active
  - Security events logged
  - Alert thresholds set

#### A10:2021 – Server-Side Request Forgery (SSRF)

- [ ] **SSRF Prevention**
  - No user-controlled URLs fetched server-side
  - URL validation if external requests made
  - Whitelist allowed domains if needed

### OWASP ZAP Automated Scan

**Step 1: Install OWASP ZAP**

Download from: <https://www.zaproxy.org/download/>

**Step 2: Run Automated Scan**

1. Start ZAP
2. Set target URL: `https://projectparallax.xyz` (or staging URL)
3. Run "Quick Start" scan
4. Review results
5. Fix any critical/high issues found

**Step 3: Manual Testing with ZAP**

1. Authenticate in browser (ZAP proxy)
2. Navigate through application
3. ZAP will automatically test for vulnerabilities
4. Review findings

---

## 🔎 3. Static Code Analysis

### ESLint Security Rules

**Step 1: Run ESLint**

```powershell
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"
pnpm lint
```

**Step 2: Review Security-Related Warnings**

Look for:

- Unsafe eval usage
- Insecure random number generation
- Hardcoded secrets
- Unsafe regex patterns

### Secret Scanning

**Step 1: Install git-secrets (Optional)**

```powershell
# For Windows, use WSL or Git Bash
# Or use truffleHog instead (Python-based)
```

**Step 2: Scan for Secrets**

```powershell
# Using truffleHog (if installed)
trufflehog git file://. --json

# Or manually search for common patterns
# API keys, passwords, tokens, etc.
```

**Step 3: Manual Review**

Search codebase for:

- Hardcoded API keys
- Passwords in code
- Database connection strings
- AWS credentials

```powershell
# Search for common patterns
grep -r "api[_-]?key" --include="*.ts" --include="*.tsx"
grep -r "password\s*=" --include="*.ts" --include="*.tsx"
grep -r "secret" --include="*.ts" --include="*.tsx"
```

---

## 🧪 4. Runtime Security Testing

### Authentication Testing

**Test Cases:**

1. **Unauthenticated Access**
   - [ ] Try accessing protected routes without login
   - [ ] Verify redirect to login page
   - [ ] Verify no data exposed

2. **Authentication Bypass**
   - [ ] Try manipulating JWT tokens
   - [ ] Try accessing admin routes as regular user
   - [ ] Verify token expiration works

3. **Session Management**
   - [ ] Test session timeout
   - [ ] Test concurrent sessions
   - [ ] Test logout functionality

### Authorization Testing

**Test Cases:**

1. **Horizontal Privilege Escalation**
   - [ ] Try accessing another user's library items
   - [ ] Try accessing another user's annotations
   - [ ] Try accessing another user's journal entries
   - [ ] Verify all requests return 403/404

2. **Vertical Privilege Escalation**
   - [ ] Try accessing admin routes as regular user
   - [ ] Try performing admin actions
   - [ ] Verify admin checks work

### Input Validation Testing

**Test Cases:**

1. **File Upload Security**
   - [ ] Try uploading malicious file types
   - [ ] Try uploading oversized files
   - [ ] Try uploading files with malicious names
   - [ ] Verify file type validation
   - [ ] Verify file size limits

2. **SQL Injection Attempts**
   - [ ] Try SQL injection in search fields
   - [ ] Try SQL injection in form inputs
   - [ ] Verify parameterized queries work

3. **XSS Attempts**
   - [ ] Try XSS in text inputs
   - [ ] Try XSS in rich text editor
   - [ ] Verify DOMPurify sanitization

### Rate Limiting Testing

**Test Cases:**

1. **API Rate Limits**
   - [ ] Make rapid API requests
   - [ ] Verify rate limiting kicks in
   - [ ] Verify appropriate error messages

2. **Authentication Rate Limits**
   - [ ] Try multiple failed login attempts
   - [ ] Verify account lockout (if implemented)
   - [ ] Verify rate limiting on password reset

---

## 🏗️ 5. Infrastructure Security

### Vercel Security Settings

**Checklist:**

- [ ] Environment variables marked as "Encrypted"
- [ ] Production environment variables separate from preview
- [ ] No sensitive data in build logs
- [ ] Function timeout limits set appropriately
- [ ] Edge network security enabled

**Verification:**

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Verify all sensitive variables are marked "Encrypted"
3. Review deployment logs for any exposed secrets

### Supabase Security

**Checklist:**

- [ ] RLS policies enabled on all tables
- [ ] Service role key never exposed to client
- [ ] Database backups enabled
- [ ] Connection pooling configured
- [ ] API rate limits configured

**Verification:**

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Review RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### Cloudflare R2 Security

**Checklist:**

- [ ] Bucket permissions reviewed
- [ ] CORS configured for production domain only
- [ ] Public access restricted where appropriate
- [ ] Signed URLs used for private content
- [ ] Encryption enabled

---

## 🎯 6. Penetration Testing

### Self-Audit (Free)

**Basic Penetration Test Steps:**

1. **Reconnaissance**
   - [ ] Map all public endpoints
   - [ ] Identify technologies used
   - [ ] Check for exposed sensitive files

2. **Vulnerability Scanning**
   - [ ] Run OWASP ZAP automated scan
   - [ ] Test for common vulnerabilities
   - [ ] Review findings

3. **Manual Testing**
   - [ ] Test authentication flows
   - [ ] Test authorization boundaries
   - [ ] Test input validation
   - [ ] Test business logic flaws

### Professional Penetration Test (Paid)

**Consider if:**

- Handling sensitive financial data
- Processing PII at scale
- Required by compliance (HIPAA, PCI-DSS, etc.)
- Budget allows ($5,000 - $50,000+)

**Options:**

- HackerOne (bug bounty platform)
- Synack (crowdsourced security)
- Local security firms
- Freelance penetration testers

---

## 📋 Security Scan Checklist Summary

### Before Production Launch

- [ ] **Dependency Scan:** `pnpm audit` clean (no critical/high)
- [ ] **OWASP Top 10:** All items reviewed and addressed
- [ ] **Static Analysis:** ESLint clean, no secrets in code
- [ ] **Runtime Testing:** Authentication, authorization, input validation tested
- [ ] **Infrastructure:** Vercel, Supabase, R2 security verified
- [ ] **Penetration Test:** Basic self-audit completed (or professional scheduled)

### Tools Used

- ✅ **Dependabot** - Automated dependency updates
- ✅ **pnpm audit** - Dependency vulnerability scanning
- ⬜ **OWASP ZAP** - Web application security testing
- ⬜ **ESLint** - Static code analysis
- ⬜ **Manual Testing** - Runtime security testing

---

## 📚 Related Documentation

- **Production Deployment Checklist:** `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **Security Verification Report:** `docs/SECURITY_VERIFICATION_REPORT.md`
- **Dependabot Setup:** `docs/DEPENDABOT_SETUP.md`
- **OWASP Top 10:** <https://owasp.org/www-project-top-ten/>

---

## 🚨 Critical Findings Process

If critical security issues are found:

1. **Document the issue** immediately
2. **Assess severity** (Critical/High/Medium/Low)
3. **Fix immediately** if Critical/High
4. **Test the fix** thoroughly
5. **Re-scan** to verify fix
6. **Document resolution** in security log

---

**Version:** 1.0  
**Last Review:** November 10, 2025  
**Next Review:** Before Production Launch
