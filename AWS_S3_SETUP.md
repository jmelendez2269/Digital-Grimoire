# 📦 AWS S3 Setup for Document Uploads

## Quick Setup Steps

### 1. Configure CORS on Your S3 Bucket

The most common upload issue is missing CORS configuration. Follow these steps:

#### Using AWS Console:

1. Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Click on your bucket (the one specified in `AWS_S3_BUCKET` environment variable)
3. Go to the **Permissions** tab
4. Scroll down to **Cross-origin resource sharing (CORS)**
5. Click **Edit** and paste the following CORS configuration:

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
      "DELETE"
    ],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://yourdomain.com"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

**Important:** Replace `https://yourdomain.com` with your actual production domain when deploying!

6. Click **Save changes**

#### Using AWS CLI:

Create a file named `cors-config.json`:

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://yourdomain.com"
      ],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Then run:
```bash
aws s3api put-bucket-cors --bucket YOUR_BUCKET_NAME --cors-configuration file://cors-config.json
```

### 2. Verify Environment Variables

Make sure your `.env.local` file has these variables set:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET=your-bucket-name
```

### 3. Verify IAM Permissions

Your AWS IAM user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### 4. Test the Upload

1. Restart your Next.js dev server after updating environment variables
2. Navigate to `/admin/upload` in your app
3. Drag and drop a PDF file
4. Click "Upload"
5. Check the browser console for any errors

## Troubleshooting

### "Failed to fetch" Error
✅ **Solution:** Configure CORS on your S3 bucket (see step 1 above)

This is the most common issue. The browser blocks direct uploads to S3 unless the bucket explicitly allows requests from your domain.

### "SignatureDoesNotMatch" Error
- Check that `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are correct
- Verify the credentials have S3 permissions
- Ensure there are no extra spaces in the environment variables

### "Bucket does not exist" Error
- Verify `AWS_S3_BUCKET` environment variable matches your actual bucket name
- Check that `AWS_REGION` is correct for your bucket
- Ensure the bucket exists in your AWS account

### 403 Forbidden Error
- Check IAM permissions (see step 3 above)
- Verify bucket policy doesn't block uploads
- Ensure presigned URL hasn't expired (default: 1 hour)

### Still Having Issues?

Enable debug logging by checking the browser console and terminal for detailed error messages. The upload page now includes enhanced error reporting.

## Security Best Practices

1. **Never commit AWS credentials to git** - Always use `.env.local`
2. **Use IAM roles** when deploying (instead of access keys)
3. **Set appropriate bucket policies** - Don't make the bucket public
4. **Enable versioning** on your S3 bucket for backup
5. **Set up lifecycle policies** to manage storage costs
6. **Use CloudFront** for serving files if needed for production

## Next Steps

Once S3 is configured:
- [ ] Set up AWS Textract integration for OCR
- [ ] Configure Lambda functions for processing
- [ ] Set up CloudWatch alerts for failed uploads
- [ ] Configure backup/disaster recovery

## CORS Configuration Explained

- **AllowedHeaders: ["*"]** - Allows all headers (Content-Type, etc.)
- **AllowedMethods** - Permits GET (download), PUT (upload), POST, DELETE
- **AllowedOrigins** - Your app's domains (localhost for dev, your domain for prod)
- **ExposeHeaders: ["ETag"]** - Allows reading the ETag response header
- **MaxAgeSeconds: 3000** - Browser caches CORS preflight for 50 minutes

## Testing CORS Configuration

You can test if CORS is working using curl:

```bash
curl -X OPTIONS -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -i https://your-bucket.s3.amazonaws.com/
```

Look for these headers in the response:
- `Access-Control-Allow-Origin: http://localhost:3000`
- `Access-Control-Allow-Methods: PUT`


