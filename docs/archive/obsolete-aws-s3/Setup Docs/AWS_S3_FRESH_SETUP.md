# 🆕 AWS S3 Fresh Bucket Setup

## The Problem
Your current bucket is returning 500 Internal Server Error on OPTIONS requests, which indicates a bucket configuration issue that's hard to fix. Starting fresh is faster than debugging AWS gremlins.

## ✅ Step-by-Step: Create New Bucket (5 minutes)

### Step 1: Create New Bucket

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/s3/)
2. Click **Create bucket**
3. **Bucket name:** `digital-grimoire-texts-2025` (must be globally unique)
4. **AWS Region:** `us-east-1` (or your preferred region)
5. **Object Ownership:** Keep default (ACLs disabled)
6. **Block Public Access settings:** ⚠️ **UNCHECK "Block all public access"**
   - **Uncheck the main checkbox**
   - This will uncheck all 4 sub-options automatically
7. Acknowledge the warning (we'll use presigned URLs, not public access)
8. **Bucket Versioning:** Keep disabled for now
9. **Tags:** (optional) Add `Project: Digital-Grimoire`
10. **Encryption:** Keep default (SSE-S3)
11. Click **Create bucket**

### Step 2: Configure CORS Immediately

**Important:** Do this right after creating the bucket!

1. Click on your new bucket name
2. Go to **Permissions** tab
3. Scroll down to **Cross-origin resource sharing (CORS)**
4. Click **Edit**
5. Paste this EXACT configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:3000"
        ],
        "ExposeHeaders": [
            "ETag",
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

6. Click **Save changes**

### Step 3: Add Bucket Policy

1. Still in **Permissions** tab
2. Scroll to **Bucket policy**
3. Click **Edit**
4. Paste this policy (⚠️ **replace bucket name** with yours):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowPresignedUploads",
            "Effect": "Allow",
            "Principal": "*",
            "Action": [
                "s3:PutObject",
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::digital-grimoire-texts-2025/*"
        }
    ]
}
```

5. Click **Save changes**

### Step 4: Verify CORS is Working

Open PowerShell and test:

```powershell
curl.exe -X OPTIONS `
  -H "Origin: http://localhost:3000" `
  -H "Access-Control-Request-Method: PUT" `
  -H "Access-Control-Request-Headers: content-type" `
  -i `
  https://digital-grimoire-texts-2025.s3.us-east-1.amazonaws.com/test.pdf
```

**Expected output:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: PUT
```

**If you see those headers:** ✅ Success! Continue to Step 5.

**If you still get 500 error:** There might be an AWS account issue. Contact AWS support or try a different region.

### Step 5: Update Your Environment Variables

Update your `.env.local`:

```bash
# OLD (comment out or delete)
# AWS_S3_BUCKET=digital-grimoire-library

# NEW
AWS_S3_BUCKET=digital-grimoire-texts-2025
AWS_REGION=us-east-1
```

### Step 6: Restart Dev Server

```bash
# Stop your dev server (Ctrl+C)
cd Digital-Grimoire/app
pnpm dev
```

### Step 7: Test Upload

1. Go to http://localhost:3000/admin/upload
2. Drag and drop your PDF
3. Click Upload
4. Watch the console - you should see detailed error messages if something's wrong

---

## 🎯 If It Still Doesn't Work

### Check IAM Permissions

Make sure your IAM user can access the NEW bucket:

1. Go to **IAM** → **Users** → Your user
2. **Permissions** tab
3. If you have `AmazonS3FullAccess` policy, you're good
4. If you have a custom policy, update the `Resource` to include the new bucket:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::digital-grimoire-texts-2025",
                "arn:aws:s3:::digital-grimoire-texts-2025/*"
            ]
        }
    ]
}
```

---

## 🗑️ Delete Old Bucket (Optional)

Once the new bucket works:

1. Go to old bucket `digital-grimoire-library`
2. If it has files, **Empty bucket** first
3. Then **Delete bucket**

This cleans up and avoids confusion.

---

## 📝 What We Learned

**Why the old bucket failed:**
- S3 returning 500 on OPTIONS requests = bucket config corruption
- Could be from:
  - Conflicting policies applied in wrong order
  - AWS console glitches during initial setup
  - Regional replication issues
  - Cached configuration conflicts

**Why fresh bucket works:**
- Clean slate with Block Public Access disabled from the start
- CORS configured immediately after creation
- No conflicting policies

---

## ✅ Success Checklist

- [ ] New bucket created with public access blocks disabled
- [ ] CORS configuration saved
- [ ] Bucket policy added
- [ ] curl test returns 200 with CORS headers
- [ ] `.env.local` updated with new bucket name
- [ ] Dev server restarted
- [ ] Upload test successful

---

**Need help?** Share the curl output if you're still seeing errors.

