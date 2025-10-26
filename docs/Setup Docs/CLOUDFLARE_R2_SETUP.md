# Cloudflare R2 Setup Guide - Phase 2

## What is Cloudflare R2?

Cloudflare R2 is an object storage service similar to AWS S3, but with **zero egress fees**. This makes it perfect for serving files to users without worrying about data transfer costs.

### Why R2 vs AWS S3?

| Feature | Cloudflare R2 | AWS S3 |
|---------|---------------|--------|
| Storage | $0.015/GB/month | $0.023/GB/month |
| Egress (downloads) | **FREE** 🎉 | $0.09/GB |
| API calls (Class A) | $4.50/million | $5.00/million |
| Free tier | 10GB storage | 5GB storage |

**For a digital library serving many documents: R2 can save hundreds of dollars per month!**

---

## Phase 2.1: Create Cloudflare Account & R2 Bucket

### Step 1: Sign Up for Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign up for a free account (or log in if you have one)
3. **No credit card required** for the free tier!

### Step 2: Enable R2

1. In the Cloudflare dashboard, look in the left sidebar
2. Click **"R2 Object Storage"**
3. If prompted, click **"Enable R2"** or **"Get Started"**
4. Accept the terms of service

### Step 3: Create R2 Bucket

1. Click **"Create bucket"**
2. Fill in the details:
   - **Bucket Name**: `convergence-library` (or your preferred name)
   - **Location**: Automatic (Cloudflare chooses optimal location)
   - **Storage Class**: Standard
3. Click **"Create bucket"**

### Step 4: Enable Public Access (Optional for later)

For now, we'll use presigned URLs, but you can enable public access later:
1. Go to your bucket settings
2. Navigate to "Settings" tab
3. Under "Public Access" you can configure a custom domain

---

## Phase 2.2: Generate R2 API Tokens

### Step 1: Create API Token

1. In R2 dashboard, click **"Manage R2 API Tokens"** (top right)
2. Click **"Create API Token"**
3. Configure the token:
   - **Token Name**: `convergence-app-upload`
   - **Permissions**: 
     - ✅ **Object Read & Write** (select this)
     - Leave Admin permissions unchecked
   - **TTL**: Never expire (or set to 1 year for security)
   - **Bucket**: Select `convergence-library` (apply to specific bucket)
4. Click **"Create API Token"**

### Step 2: Save Your Credentials

You'll see three important values. **Copy these immediately** - you won't see them again!

1. **Access Key ID** → This is your `R2_ACCESS_KEY_ID`
2. **Secret Access Key** → This is your `R2_SECRET_ACCESS_KEY`
3. **Jurisdiction-specific Endpoint** → This is your `R2_ENDPOINT`
   - Format: `https://[account_id].r2.cloudflarestorage.com`

### Step 3: Get Public URL Endpoint (Optional)

For public access, you'll also need:
1. Go back to your bucket
2. Click on "Settings"
3. Under "Bucket Details" you'll see:
   - **S3 API**: This is your R2_ENDPOINT (same as above)
   - **Public R2.dev subdomain**: Enable this if you want public URLs
   - Format: `https://pub-[hash].r2.dev`

---

## Phase 2.3: Add Credentials to Environment

Add these to your `Digital-Grimoire/app/.env.local` file:

```env
# Cloudflare R2 (Phase 2)
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key_id_here
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key_here
R2_PUBLIC_URL=https://pub-your-hash.r2.dev/convergence-library
```

**Replace with your actual values:**
- `your-account-id` = from the endpoint URL
- `your_r2_access_key_id_here` = the Access Key ID you copied
- `your_r2_secret_access_key_here` = the Secret Access Key you copied
- `your-hash` = from the public R2.dev URL (if enabled)

---

## Phase 2.4: Configure CORS

CORS (Cross-Origin Resource Sharing) allows your Next.js app to upload files directly to R2 from the browser.

### Option A: Via Cloudflare Dashboard (Coming Soon)

Cloudflare is working on CORS UI. For now, use the API method below.

### Option B: Via Wrangler CLI (Recommended)

1. **Install Wrangler** (Cloudflare's CLI tool):
```bash
npm install -g wrangler
```

2. **Login to Cloudflare**:
```bash
wrangler login
```

3. **Create CORS rules file** `r2-cors.json`:
```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://yourdomain.com"
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
      "ETag",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

4. **Apply CORS rules**:
```bash
wrangler r2 bucket cors put convergence-library --rules ./r2-cors.json
```

5. **Verify CORS rules**:
```bash
wrangler r2 bucket cors get convergence-library
```

---

## Phase 2.5: Test R2 Connection

We'll create a test script similar to Phase 1 to verify R2 works.

---

## Troubleshooting

### Error: "Access Denied"
- Check that your API token has **Object Read & Write** permissions
- Verify the token is applied to the correct bucket
- Make sure Access Key ID and Secret Key are correct

### Error: "Bucket not found"
- Check the bucket name in your environment variables
- Bucket names are case-sensitive
- Make sure the endpoint URL is correct

### Error: "CORS policy blocked"
- Make sure CORS rules are applied to your bucket
- Check that your app's URL is in the `AllowedOrigins` list
- For localhost, use `http://localhost:3000` (not https)

### Can't find R2 in Cloudflare Dashboard
- R2 might not be available in all regions yet
- Make sure you're logged into the correct Cloudflare account
- Check if your account has R2 enabled (free tier includes it)

---

## Cost & Limits

### Free Tier (More than enough for MVP!)
- **10 GB storage per month** (FREE)
- **1 million Class A operations** (uploads) per month (FREE)
- **10 million Class B operations** (downloads) per month (FREE)
- **Unlimited egress** (FREE forever! 🎉)

### Paid Tier (After free tier)
- **Storage**: $0.015/GB/month (~$1.50 for 100GB)
- **Class A ops**: $4.50/million (uploads)
- **Class B ops**: $0.36/million (downloads)
- **Egress**: Still FREE!

**Example cost for 100 documents:**
- 100 PDFs × 5MB = 500MB storage = **$0.01/month**
- 1,000 downloads/month = **$0.00** (egress is free!)
- **Total: ~$0.01/month** vs AWS S3: ~$4/month

---

## Next Steps

Once you complete Phase 2:
1. ✅ Cloudflare account created
2. ✅ R2 bucket created
3. ✅ API tokens generated and saved
4. ✅ CORS configured
5. ✅ Credentials added to `.env.local`

Move to **Phase 3: Upload API Implementation** where we'll build:
- Presigned URL generation API route
- Admin upload page with drag-and-drop
- Direct browser uploads to R2

---

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)

