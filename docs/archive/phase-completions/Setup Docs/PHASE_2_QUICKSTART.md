# Phase 2 Quick Start: Cloudflare R2 Setup

## 🎯 Goal
Set up Cloudflare R2 storage bucket for uploading and storing documents.

## ⏱️ Estimated Time
20-25 minutes

## 📋 Checklist

### Part 1: Cloudflare Account & Bucket (10 minutes)

- [ ] **1.1** Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign up/login
- [ ] **1.2** In left sidebar, click **"R2 Object Storage"**
- [ ] **1.3** Click **"Enable R2"** (if first time) or **"Get Started"**
- [ ] **1.4** Click **"Create bucket"**
- [ ] **1.5** Bucket settings:
  - Name: `convergence-library`
  - Location: Automatic
  - Storage Class: Standard
- [ ] **1.6** Click **"Create bucket"**

### Part 2: Generate API Tokens (5 minutes)

- [ ] **2.1** Click **"Manage R2 API Tokens"** (top right of R2 dashboard)
- [ ] **2.2** Click **"Create API Token"**
- [ ] **2.3** Configure token:
  - Name: `convergence-app-upload`
  - Permissions: **Object Read & Write** ✅
  - TTL: Never expire (or 1 year)
  - Apply to bucket: `convergence-library`
- [ ] **2.4** Click **"Create API Token"**
- [ ] **2.5** **COPY IMMEDIATELY** (you won't see these again!):
  - Access Key ID
  - Secret Access Key  
  - Endpoint URL (format: `https://[account_id].r2.cloudflarestorage.com`)

### Part 3: Optional - Enable Public Access (2 minutes)

- [ ] **3.1** Go to your `convergence-library` bucket
- [ ] **3.2** Click **"Settings"** tab
- [ ] **3.3** Under "R2.dev subdomain", click **"Allow Access"**
- [ ] **3.4** Copy the public URL (format: `https://pub-[hash].r2.dev`)

### Part 4: Add Credentials to .env.local (3 minutes)

- [ ] **4.1** Open `Digital-Grimoire/app/.env.local`
- [ ] **4.2** Add these lines (replace with your actual values):

```env
# Cloudflare R2 (Phase 2)
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_PUBLIC_URL=https://pub-your-hash.r2.dev/convergence-library
```

- [ ] **4.3** Save the file

### Part 5: Configure CORS (5 minutes)

**Option A: Install Wrangler CLI**

```powershell
npm install -g wrangler
wrangler login
```

**Option B: Skip for now** - We'll configure CORS in Phase 3 when testing uploads

### Part 6: Test R2 Connection (2 minutes)

```powershell
cd Digital-Grimoire
npx tsx test-r2-connection.ts
```

## ✅ Success Criteria

Phase 2 is complete when:
- ✅ R2 bucket is created
- ✅ API tokens are generated and saved
- ✅ Credentials are in `.env.local`
- ✅ (Optional) Public access is enabled
- ✅ Test script successfully connects to R2

## 🚨 Common Issues

### "R2 not available in your account"
**Solution:** Make sure you're on a Cloudflare account that supports R2 (all free accounts do). Try refreshing or logging out/in.

### "Access Denied" when testing
**Solution:** 
- Double-check your Access Key ID and Secret Key
- Ensure the API token has "Object Read & Write" permissions
- Verify the token is applied to the correct bucket

### "Bucket not found"
**Solution:** 
- Check the bucket name matches exactly (case-sensitive)
- Make sure you're using the correct endpoint URL
- Verify the bucket was created successfully

### Can't create API token
**Solution:**
- Make sure you have R2 enabled in your account
- Check that you're not at the token limit (20 tokens max)
- Try creating with fewer permissions first, then update

## 💰 Cost Tracking

**Phase 2 Cost:** $0/month (using free tier)
- 10GB storage included
- Unlimited egress (downloads) - **FREE FOREVER!**
- 1M uploads/month included
- Perfect for MVP and growth

## 📚 Reference Files

- **Detailed Setup Guide:** `docs/Setup Docs/CLOUDFLARE_R2_SETUP.md`
- **Test Script:** `test-r2-connection.ts` (we'll create this)
- **Full Plan:** `.cursor/plans/azure-ocr-integration-4b4ee156.plan.md`

## 🎉 What's Next?

Once Phase 2 is complete, you'll move to:
- **Phase 3:** Upload API implementation (presigned URLs)
- Build the admin upload UI with drag-and-drop
- Enable direct browser uploads to R2

---

**Important Notes:**
- Store your API keys securely - never commit them to git!
- The `.env.local` file is already in `.gitignore`
- Free tier is generous - you won't hit limits during development

**Ready to proceed?** Follow the checklist above! 🚀

