# 🚨 Quick Fix: Upload "Failed to fetch" Error

## The Problem
You're seeing **"Failed to fetch"** when uploading PDFs because your AWS S3 bucket doesn't have CORS configured.

## The 5-Minute Fix

### Step 1: Log into AWS Console
1. Go to https://console.aws.amazon.com/s3/
2. Click on your bucket (check your `.env.local` for `AWS_S3_BUCKET` name)

### Step 2: Add CORS Configuration
1. Click the **Permissions** tab
2. Scroll down to **Cross-origin resource sharing (CORS)**
3. Click **Edit**
4. Paste this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

5. Click **Save changes**

### Step 3: Test Again
1. Go back to your app at `http://localhost:3000/admin/upload`
2. Try uploading your PDF again
3. It should work now! ✅

## Why This Fixes It

The browser blocks direct uploads to S3 for security reasons unless S3 explicitly says "this domain is allowed to upload files." The CORS configuration tells S3 to accept uploads from your localhost development server.

## For Production

When you deploy your app, add your production domain to the `AllowedOrigins` list:

```json
"AllowedOrigins": [
  "http://localhost:3000",
  "https://yourdomain.com"
]
```

## Still Not Working?

Check these:
- [ ] Did you click "Save changes" after pasting the CORS config?
- [ ] Are your AWS credentials in `.env.local` correct?
- [ ] Is the bucket name in `.env.local` correct?
- [ ] Did you restart your dev server after changing `.env.local`?

Open the browser console (F12) - you should now see a more helpful error message that points to this fix!

See **AWS_S3_SETUP.md** for the complete setup guide.

