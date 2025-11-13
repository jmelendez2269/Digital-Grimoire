# Cloudflare R2 Setup Guide

This guide walks through setting up Cloudflare R2 for file storage in the Digital Grimoire project.

## Overview

Cloudflare R2 provides S3-compatible object storage with:
- **Zero egress fees** (unlike AWS S3)
- **Free tier**: 10GB storage
- **S3-compatible API** (works with AWS SDK)
- **Global CDN** for fast access

## Step 1: Create Cloudflare Account

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage** in the sidebar
3. Click **Purchase R2** (free tier requires payment method but won't charge for usage under limits)

## Step 2: Create R2 Bucket

1. Click **Create bucket**
2. Name: `convergence-library` (or your preferred name)
3. Location: **Automatic** (recommended)
4. Click **Create bucket**

## Step 3: Generate API Tokens

1. Go to **R2** → **Overview** → **Manage R2 API Tokens**
2. Click **Create API token**
3. Token name: `convergence-api-token`
4. Permissions: **Object Read & Write**
5. **TTL**: Never expire (or set expiration)
6. Click **Create API Token**

7. **Save these credentials** (they won't be shown again):
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - Account ID (visible in URL and dashboard)

## Step 4: Configure CORS

CORS must be configured to allow uploads from your web app.

1. Go to your bucket → **Settings** → **CORS Policy**
2. Click **Add CORS Policy**
3. Use this configuration:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://convergencelibrary.com",
      "https://www.convergencelibrary.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**Important Notes:**
- Default development port is `localhost:3000`
- Replace production domains with your actual domain
- CORS must be configured in Cloudflare R2 dashboard (not just in local config files)
- After updating CORS, it may take a few minutes to propagate

4. Replace production domains with your actual domain
5. Click **Save**

## Step 5: Enable Public Access (Optional)

If you want uploaded files to be publicly accessible:

1. Go to **Settings** → **Public Access**
2. Enable **Allow Access**
3. Your public URL will be: `https://pub-<ACCOUNT_ID>.r2.dev/<BUCKET_NAME>`

## Step 6: Configure Environment Variables

Add these to your `app/.env.local` file:

```env
# Cloudflare R2 Configuration
R2_ENDPOINT=https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key_id_from_step_3
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key_from_step_3
R2_BUCKET_NAME=convergence-library
R2_PUBLIC_URL=https://pub-<YOUR_ACCOUNT_ID>.r2.dev/convergence-library
```

**How to find your Account ID:**
- In the Cloudflare dashboard, it's in the URL: `dash.cloudflare.com/<ACCOUNT_ID>/r2`
- Or in the R2 overview page sidebar

## Step 7: Test the Connection

Run the test script to verify your R2 connection:

```bash
cd Digital-Grimoire
tsx test-r2-connection.ts
```

Expected output:
```
✓ Successfully connected to Cloudflare R2
✓ Bucket 'convergence-library' is accessible
```

## Troubleshooting

### Error: "Access Denied"
- Verify API token has correct permissions (Object Read & Write)
- Check that bucket name matches exactly
- Ensure endpoint URL uses your correct Account ID

### Error: "CORS Policy Blocked"
- **Most Common Issue**: CORS not configured in Cloudflare R2 dashboard
- Add your development/production URLs to CORS AllowedOrigins in R2 dashboard
- Default development URL is `http://localhost:3000`
- Ensure CORS policy includes GET, PUT, POST, DELETE, HEAD methods
- Verify the origin in the error matches exactly (including http vs https, port number)
- Clear browser cache and try again
- **Note**: CORS must be configured in Cloudflare R2 dashboard, not just in local config files

### Error: "Network Error"
- Check that R2_ENDPOINT is correct format
- Verify your internet connection
- Try regenerating API tokens

## Cost Estimate

**Free Tier Limits:**
- 10 GB storage/month
- 1 million Class A operations/month (write, list)
- 10 million Class B operations/month (read)
- No egress fees

**After Free Tier:**
- Storage: $0.015/GB/month
- Class A operations: $4.50 per million
- Class B operations: $0.36 per million

**Estimated cost for 100-500 documents:** $0/month (within free tier)

## Next Steps

After completing R2 setup:
1. ✅ Phase 3 complete - Upload API is ready
2. 📋 Continue to **Phase 4**: Document Processing Pipeline
3. 🔧 Set up Azure Computer Vision for OCR
4. 🤖 Configure Claude API for metadata extraction

## Security Best Practices

1. **Never commit** `.env.local` to git
2. **Rotate API tokens** every 90 days
3. **Use separate buckets** for dev/staging/production
4. **Enable versioning** for important files
5. **Set lifecycle policies** to auto-delete old files

## Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 API Compatibility](https://developers.cloudflare.com/r2/api/s3/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
