# Next Sprint to Go Live - Production Readiness Checklist

**Last Updated:** November 10, 2025  
**Target Launch Date:** TBD  
**Status:** Pre-Production  
**Priority:** P0 - Critical for Launch

---

## 🎯 Sprint Goal

Complete all critical infrastructure and testing required for production launch. This sprint focuses on production readiness, not new features.

**Estimated Duration:** 1-2 weeks  
**Estimated Effort:** 20-30 hours

---

## 🚨 CRITICAL BLOCKERS (Must Complete Before Launch)

### 1. Email Infrastructure ✅ PARTIALLY COMPLETE

**Status:** 🟡 In Progress (SendGrid setup done, testing needed)  
**Time Estimate:** 2-3 hours remaining  
**Reference:** `docs/Setup Docs/SENDGRID_SETUP.md`

**Completed:**
- ✅ SendGrid account created and verified
- ✅ Domain authenticated (convergencelibrary.com)
- ✅ DNS records configured (SPF, DKIM, DMARC, link branding)
- ✅ Supabase SMTP configured with SendGrid

**Remaining Tasks:**
- [ ] **Email Delivery Testing** (2-3 hours)
  - [ ] Test password reset flow on Gmail
  - [ ] Test password reset flow on Outlook
  - [ ] Test password reset flow on Yahoo Mail
  - [ ] Test email verification flow
  - [ ] Verify emails arrive in inbox (not spam)
  - [ ] Test email rendering on mobile devices
  - [ ] Verify all email links work correctly

- [x] **Email Templates Customization** (1-2 hours) ✅ COMPLETE
  - [x] Customize password reset email with Convergence branding
  - [x] Customize email verification email
  - [x] Design welcome email
  - [x] Apply dark academia aesthetic to all templates
  - [ ] Test templates in light/dark mode (Ready for testing)

- [x] **Email Monitoring Setup** (30 minutes) ✅ COMPLETE
  - [x] Configure SendGrid webhooks (Documentation complete)
  - [x] Set up bounce rate monitoring (Documentation complete)
  - [x] Configure delivery rate tracking (Documentation complete)
  - [x] Set alert thresholds (>5% bounce rate) (Documentation complete)

---

### 2. Domain & SSL Configuration

**Status:** ⬜ Not Started  
**Time Estimate:** 1-2 hours  
**Priority:** P0 - Required for production  
**Hosting Provider:** Vercel

**Note:** Vercel automatically provisions SSL certificates (Let's Encrypt) for all domains. DNS configuration is managed through your domain registrar.

**📖 Detailed Step-by-Step Guide:** See `docs/Setup Docs/VERCEL_DEPLOYMENT_SETUP.md` for complete instructions.

- [ ] **Vercel Project Setup**
  - [ ] Connect GitHub repository to Vercel
  - [ ] Configure build settings (Next.js, root directory: `app`)
  - [ ] Trigger initial deployment
  - [ ] Verify deployment works on preview URL

- [ ] **Domain DNS Configuration**
  - [ ] Add custom domain to Vercel project (Settings → Domains)
  - [ ] Configure A record or CNAME record as instructed by Vercel
  - [ ] Set up CNAME record for www subdomain (if applicable)
  - [ ] Verify DNS propagation (use tools like `dig` or online DNS checker)
  - [ ] Wait for DNS propagation (can take up to 48 hours, usually <24 hours)

- [ ] **SSL/TLS Certificate**
  - [ ] Verify SSL certificate is automatically provisioned by Vercel
  - [ ] Check SSL status in Vercel dashboard (Settings → Domains)
  - [ ] HTTPS redirect is automatic with Vercel
  - [ ] Verify certificate auto-renewal (automatic with Vercel)
  - [ ] Test SSL certificate validity (https://convergencelibrary.com)
  - [ ] Run SSL Labs test (target: A+ rating)
  - [ ] Verify certificate covers both root domain and www subdomain

---

### 3. Production Environment Variables

**Status:** ⬜ Not Started  
**Time Estimate:** 30-45 minutes  
**Priority:** P0 - Required for production  
**Hosting Provider:** Vercel

**📖 Detailed Step-by-Step Guide:** See `docs/Setup Docs/VERCEL_PRODUCTION_SECRETS.md` for complete instructions.

- [ ] **Vercel Production Environment Variables**
  - [ ] Access Vercel Dashboard → Project → Settings → Environment Variables
  - [ ] Add `NEXT_PUBLIC_SUPABASE_URL` (production instance, mark as Encrypted)
  - [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` (mark as Encrypted)
  - [ ] Add `SUPABASE_SERVICE_ROLE_KEY` (mark as Encrypted - never expose publicly)
  - [ ] Add `CLOUDFLARE_R2_ACCOUNT_ID` (mark as Encrypted)
  - [ ] Add `CLOUDFLARE_R2_ACCESS_KEY_ID` (mark as Encrypted)
  - [ ] Add `CLOUDFLARE_R2_SECRET_ACCESS_KEY` (mark as Encrypted)
  - [ ] Add `CLOUDFLARE_R2_BUCKET_NAME`
  - [ ] Add `AZURE_COMPUTER_VISION_KEY` (mark as Encrypted)
  - [ ] Add `AZURE_COMPUTER_VISION_ENDPOINT`
  - [ ] Add `OPENAI_API_KEY` (mark as Encrypted)
  - [ ] Add `NEXT_PUBLIC_APP_URL` (https://convergencelibrary.com)
  - [ ] Note: `SENDGRID_API_KEY` is stored in Supabase (not in Vercel)
  - [ ] Set environment to "Production" for all production variables
  - [ ] Redeploy application after adding variables

- [ ] **Secrets Security Verification**
  - [ ] Verify no secrets in git repository
  - [ ] Confirm `.env.local` in `.gitignore`
  - [ ] All production secrets stored in Vercel (encrypted)
  - [ ] Sensitive variables marked as "Encrypted" in Vercel
  - [ ] Document emergency access procedures

---

### 4. Database & Storage Production Setup

**Status:** ⬜ Not Started  
**Time Estimate:** 2 hours  
**Priority:** P0 - Required for production

- [ ] **Supabase Production Instance**
  - [ ] Verify current plan (Free tier OK for MVP)
  - [ ] Enable automated daily backups (if Pro plan)
  - [ ] Verify RLS policies are production-ready
  - [ ] Test database connection pooling
  - [ ] Verify all migrations applied to production

- [ ] **Cloudflare R2 Production Bucket**
  - [ ] Verify production bucket exists
  - [ ] Enable versioning (if needed)
  - [ ] Configure CORS for production domain
  - [ ] Verify bucket encryption enabled
  - [ ] Test file upload/download from production

---

### 5. Legal Pages & Compliance

**Status:** 🟡 Partial (pages exist, need content review)  
**Time Estimate:** 3-4 hours  
**Priority:** P0 - Required for launch

**Existing Pages:**
- ✅ `/privacy` - Privacy Policy page exists
- ✅ `/terms` - Terms of Service page exists
- ✅ `/cookies` - Cookie Policy page exists
- ✅ `/license` - License page exists

**Remaining Tasks:**
- [ ] **Content Review & Updates**
  - [ ] Review Privacy Policy content (GDPR/CCPA compliance)
  - [ ] Review Terms of Service content
  - [ ] Review Cookie Policy content
  - [ ] Add actual domain references (convergencelibrary.com)
  - [ ] Add contact information
  - [ ] Add effective dates

- [ ] **Footer Links Verification**
  - [ ] Verify all legal page links work
  - [ ] Test on mobile devices
  - [ ] Ensure pages are accessible

---

## ⚡ IMPORTANT (P1 - Should Complete Before Launch)

### 6. Google OAuth Configuration

**Status:** ⬜ Not Started  
**Time Estimate:** 30-45 minutes  
**Priority:** P1 - Important for launch (enhances user experience)

**Reference:** `docs/Setup Docs/GOOGLE_OAUTH_SETUP.md`

- [ ] **Google Cloud Console Setup** (15-20 minutes)
  - [ ] Create/select Google Cloud project
  - [ ] Configure OAuth consent screen
  - [ ] Create OAuth client ID
  - [ ] Add authorized JavaScript origins (localhost + production domain)
  - [ ] Add authorized redirect URI (Supabase callback URL)
  - [ ] Copy Client ID and Client Secret

- [ ] **Supabase Configuration** (10-15 minutes)
  - [ ] Enable Google provider in Supabase
  - [ ] Configure OAuth credentials (Client ID and Secret)
  - [ ] Add redirect URLs (localhost + production domain)
  - [ ] Verify configuration saved

- [ ] **Testing** (10 minutes)
  - [ ] Test Google sign-in from login page (localhost)
  - [ ] Test Google sign-in from register page (localhost)
  - [ ] Verify user profile creation
  - [ ] Verify redirect to dashboard works
  - [ ] Test error handling (user cancellation)

- [ ] **Production Setup** (5-10 minutes)
  - [ ] Publish OAuth consent screen in Google Cloud Console
  - [ ] Verify production domain added to authorized origins
  - [ ] Verify production redirect URL configured in Supabase
  - [ ] Test Google sign-in on production domain

---

### 7. Content Seeding

**Status:** ⬜ Not Started  
**Time Estimate:** 6-8 hours  
**Priority:** P1 - Important for launch

- [ ] **Library Content Seeding**
  - [ ] Upload 20-50 public domain texts
  - [ ] Verify OCR quality
  - [ ] Verify metadata accuracy
  - [ ] Test document viewer functionality
  - [ ] Verify search functionality works

**Content Strategy:**
- 15 Esoteric texts (Hermetic, Alchemical, Qabalistic)
- 15 Religious texts (Bible, Upanishads, Tao Te Ching)
- 10 Philosophical works (Plato, Plotinus, Marcus Aurelius)
- 10 Scientific/Psychology (Jung, consciousness studies)

---

### 8. Testing & QA

**Status:** ⬜ Not Started  
**Time Estimate:** 8-10 hours  
**Priority:** P1 - Important for launch

- [ ] **Functional Testing**
  - [ ] Test user registration flow
  - [ ] Test login/logout
  - [ ] Test password reset flow
  - [ ] Test email verification
  - [ ] Test document upload (admin)
  - [ ] Test document viewing
  - [ ] Test search functionality
  - [ ] Test journal creation/editing
  - [ ] Test bookmark functionality
  - [ ] Test annotation creation

- [ ] **Cross-Browser Testing**
  - [ ] Chrome (desktop & mobile)
  - [ ] Firefox (desktop & mobile)
  - [ ] Safari (desktop & mobile)
  - [ ] Edge (desktop)

- [ ] **Performance Testing**
  - [ ] Lighthouse score >90 (all pages)
  - [ ] Page load time <2s
  - [ ] Search latency <500ms
  - [ ] Image optimization verified

- [ ] **Accessibility Testing**
  - [ ] Keyboard navigation works
  - [ ] Screen reader compatibility
  - [ ] WCAG 2.1 AA compliance check
  - [ ] Color contrast verification

---

### 9. Monitoring & Error Tracking

**Status:** ⬜ Not Started  
**Time Estimate:** 2-3 hours  
**Priority:** P1 - Important for launch

- [ ] **Error Tracking Setup**
  - [ ] Create Sentry project (or alternative)
  - [ ] Integrate Sentry SDK in Next.js
  - [ ] Configure alert rules
  - [ ] Test error reporting

- [ ] **Application Monitoring**
  - [ ] Set up analytics (Plausible/Google Analytics or Vercel Analytics)
  - [ ] Set up uptime monitoring (Pingdom/UptimeRobot)
  - [ ] Configure budget alerts (if using paid services)
  - [ ] Set up cost threshold notifications
  - [ ] Monitor Vercel usage and limits

---

### 10. SEO & Analytics

**Status:** ⬜ Not Started  
**Time Estimate:** 2-3 hours  
**Priority:** P1 - Important for launch

- [ ] **SEO Configuration**
  - [ ] Configure `robots.txt`
  - [ ] Generate `sitemap.xml`
  - [ ] Optimize meta tags (all pages)
  - [ ] Add Open Graph images
  - [ ] Add structured data (JSON-LD)

- [ ] **Analytics Setup**
  - [ ] Choose analytics provider (Plausible recommended)
  - [ ] Configure privacy-respecting analytics
  - [ ] Set up conversion tracking
  - [ ] Test analytics integration

---

## 📋 LAUNCH DAY CHECKLIST

**Execute in order on launch day:**

1. [ ] Final smoke test on production domain
2. [ ] Verify all critical paths work (signup, login, password reset)
3. [ ] Test email delivery (password reset, verification)
4. [ ] Confirm monitoring dashboards are working
5. [ ] Verify SSL certificate is active
6. [ ] Test document upload/viewing
7. [ ] Test search functionality
8. [ ] Team standby for first 24 hours
9. [ ] Announce launch (social media, Product Hunt, etc.)
10. [ ] Monitor error rates closely
11. [ ] Be ready to rollback if critical issues arise

---

## 📊 Progress Tracking

### Critical Blockers (P0)
- [ ] Email Infrastructure (🟡 85% complete - Templates & monitoring docs done, testing pending)
- [ ] Domain & SSL Configuration (⬜ 0% complete)
- [ ] Production Environment Variables (⬜ 0% complete)
- [ ] Database & Storage Setup (⬜ 0% complete)
- [ ] Legal Pages & Compliance (🟡 50% complete)

**Total P0 Progress:** ~27% complete

### Important Items (P1)
- [ ] Google OAuth Configuration (⬜ 0% complete)
- [ ] Content Seeding (⬜ 0% complete)
- [ ] Testing & QA (⬜ 0% complete)
- [ ] Monitoring & Error Tracking (⬜ 0% complete)
- [ ] SEO & Analytics (⬜ 0% complete)

**Total P1 Progress:** 0% complete

---

## 🎯 Success Criteria

**Ready for Launch When:**
- ✅ All P0 items completed
- ✅ Email delivery tested and working
- ✅ Domain configured with SSL
- ✅ Production environment variables set
- ✅ Legal pages published and reviewed
- ✅ At least 20 documents in library
- ✅ Basic testing completed
- ✅ Monitoring configured

---

## 📚 Reference Documentation

- **Domain & SSL Setup:** `docs/Setup Docs/VERCEL_DEPLOYMENT_SETUP.md` ⭐ **NEW - Step-by-step guide**
- **Production Secrets:** `docs/Setup Docs/VERCEL_PRODUCTION_SECRETS.md` ⭐ **NEW - Step-by-step guide**
- **Google OAuth Setup:** `docs/Setup Docs/GOOGLE_OAUTH_SETUP.md` ⭐ **NEW - Step-by-step guide**
- **Email Setup:** `docs/Setup Docs/SENDGRID_SETUP.md`
- **Email Templates:** `docs/Setup Docs/EMAIL_TEMPLATES_COMPLETE.md`
- **Email Monitoring:** `docs/Setup Docs/EMAIL_MONITORING_SETUP.md`
- **Welcome Email:** `docs/Setup Docs/WELCOME_EMAIL_IMPLEMENTATION.md`
- **Password Reset:** `docs/Setup Docs/SUPABASE_PASSWORD_RESET_SETUP.md`
- **Production Checklist:** `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **Master Plan:** `docs/planning/MASTER_DEVELOPMENT_PLAN.md`
- **Feature Backlog:** `docs/planning/FEATURE_BACKLOG.md`

---

**Next Steps:**
1. Complete email delivery testing
2. Configure domain and SSL
3. Set up production environment variables
4. Seed initial library content
5. Complete testing and QA
6. Launch! 🚀

