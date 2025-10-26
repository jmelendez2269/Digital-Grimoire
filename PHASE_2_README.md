# Phase 2: Cloudflare R2 Storage Setup

## 🚀 Quick Start

### 1. Create Cloudflare R2 Bucket (10 minutes)
Follow the guide: [`docs/Setup Docs/PHASE_2_QUICKSTART.md`](docs/Setup%20Docs/PHASE_2_QUICKSTART.md)

**Steps:**
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Navigate to "R2 Object Storage"
3. Create bucket: `convergence-library`
4. Generate API tokens
5. Copy credentials (you won't see them again!)

### 2. Add your credentials to `.env.local`

Open `Digital-Grimoire/app/.env.local` and add:

```env
# Cloudflare R2 (Phase 2)
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_PUBLIC_URL=https://pub-your-hash.r2.dev/convergence-library
```

### 3. Run the test

```powershell
cd Digital-Grimoire
npx tsx test-r2-connection.ts
```

## ✅ You're Done When...

You see this output:

```
🎉 All tests passed!
═══════════════════════════════════════════════════

Your R2 bucket is configured correctly and ready to use.
You can now proceed with Phase 3 of the integration plan.
```

## 🧪 What the Test Does

The test script will:
1. ✅ Verify your R2 credentials are valid
2. ✅ List your buckets
3. ✅ Upload a test file
4. ✅ Download the test file
5. ✅ Delete the test file (cleanup)

## 📁 Files Created for Phase 2

- ✅ `test-r2-connection.ts` - Test script for R2 connectivity
- ✅ `docs/Setup Docs/CLOUDFLARE_R2_SETUP.md` - Detailed setup guide
- ✅ `docs/Setup Docs/PHASE_2_QUICKSTART.md` - Quick start checklist
- ✅ `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` packages installed

## 💰 Why R2?

| Feature | Cloudflare R2 | AWS S3 |
|---------|---------------|--------|
| Storage | $0.015/GB | $0.023/GB |
| Downloads | **FREE** 🎉 | $0.09/GB |
| 100GB storage | $1.50/mo | $2.30/mo |
| 1TB downloads | **FREE** | **$92/mo** |

**For a document library with lots of downloads, R2 saves hundreds of dollars per month!**

## 🚨 Common Issues

### "Missing R2 credentials"
**Solution:** Make sure you added all three R2 variables to `app/.env.local`

### "NoSuchBucket" error
**Solution:** 
- Check the bucket name in `test-r2-connection.ts` (line 14)
- Default is `convergence-library` - update if you used a different name

### "InvalidAccessKeyId"
**Solution:** 
- Copy the Access Key ID exactly from Cloudflare
- No spaces or quotes around the value in `.env.local`

### "Endpoint not found"
**Solution:** 
- Check R2_ENDPOINT format: `https://[account_id].r2.cloudflarestorage.com`
- Make sure there's no trailing slash

## 🔐 Security Note

Your R2 credentials are protected in `.env.local` and will never be committed to git!

## Next Steps

Once testing succeeds, move to **Phase 3: Upload API Implementation** where we'll build:
- Presigned URL generation API route
- Admin upload page with drag-and-drop UI
- Direct browser uploads to R2
- Upload progress tracking

---

**Need help?** Check the detailed guide: [`docs/Setup Docs/CLOUDFLARE_R2_SETUP.md`](docs/Setup%20Docs/CLOUDFLARE_R2_SETUP.md)

