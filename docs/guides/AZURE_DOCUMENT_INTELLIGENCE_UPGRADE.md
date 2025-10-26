# Azure Document Intelligence Upgrade Guide

## Overview

We've upgraded from **Azure Computer Vision Read API v3.2** to **Azure Document Intelligence (Form Recognizer) Read API v4.0** to properly handle large documents.

### Key Improvements

- **Page Limit**: Now supports up to **2000 pages** (vs. limited pages before)
- **Better Accuracy**: Improved OCR for complex documents
- **Timeout Handling**: Extended polling timeout to 5 minutes for large PDFs
- **Better Progress Tracking**: Console logs every 10 seconds during processing

---

## Setup Requirements

### Option 1: Use Existing Computer Vision Resource (Recommended)

If you already have an Azure Computer Vision resource, it likely supports Form Recognizer APIs as well:

1. **No changes needed** - Your existing credentials should work
2. The same endpoint and API key are used
3. Just re-upload your document to test

### Option 2: Create New Azure Form Recognizer Resource

If you get errors about the API not being available:

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for **"Form Recognizer"** or **"Document Intelligence"**
4. Fill in:
   - **Resource Group**: Use existing or create new
   - **Region**: Same as your Computer Vision resource
   - **Name**: `convergence-document-intelligence`
   - **Pricing Tier**: **F0 (Free)** - 500 pages/month free
5. Click "Review + Create"

### Update Environment Variables

Add to `app/.env.local`:

```env
# Azure Document Intelligence (same as Computer Vision if using the same resource)
AZURE_VISION_ENDPOINT=https://YOUR_RESOURCE.cognitiveservices.azure.com/
AZURE_VISION_KEY=your_api_key_here
```

---

## Testing the Upgrade

### Step 1: Re-upload Your Document

1. Go to `/admin/upload`
2. Upload your 216-page PDF
3. Watch the console logs in your terminal

### Step 2: Monitor Progress

You should see logs like:

```
Starting OCR for URL: https://...
OCR operation submitted: https://...
OCR still processing... (attempt 10/300, status: running)
OCR still processing... (attempt 20/300, status: running)
...
OCR completed successfully after 45 attempts
OCR extraction complete: 216 pages, 15234 lines, 1234567 characters
```

### Step 3: Verify Results

1. Go to `/library`
2. Find your document
3. Check the metadata - should now show **216 pages** and the correct line count

---

## API Comparison

### Old: Computer Vision Read API v3.2
```typescript
POST {endpoint}/vision/v3.2/read/analyze
```
- Limited page support
- Shorter timeouts
- Basic document handling

### New: Document Intelligence v4.0
```typescript
POST {endpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2024-02-29-preview
```
- Up to 2000 pages
- 5-minute timeout
- Advanced document intelligence
- Better text extraction

---

## Troubleshooting

### Error: "404 Not Found" or "Resource not found"

Your Azure region might not support the latest API version. Try:

1. Update to stable API version in `azure-ocr.ts`:
   ```typescript
   const analyzeUrl = `${endpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;
   ```

2. Or create a new Form Recognizer resource in a supported region:
   - East US
   - West Europe
   - West US 2

### Error: "401 Unauthorized"

- Your API key is incorrect or expired
- Regenerate the key in Azure Portal

### Error: "Timeout after 300 attempts"

For very large documents (500+ pages):
1. Increase `maxAttempts` in `azure-ocr.ts` to 600 (10 minutes)
2. Or consider splitting the document into smaller parts

### Still Shows Wrong Page Count

1. Delete the incorrectly processed document from the database
2. Delete the files from Cloudflare R2 storage
3. Re-upload with the new API

---

## Pricing

### Free Tier (F0)
- **500 pages/month** free
- Perfect for testing and small libraries

### Standard Tier (S0)
- **$1.50 per 1,000 pages**
- For 1,000 pages/month: ~$1.50/month
- For 10,000 pages/month: ~$15/month

### For Your 216-Page Document
- Free tier: Uses ~43% of monthly quota for one document
- Paid tier: Costs $0.32 to process

---

## Next Steps

1. ✅ Code updated
2. ⏳ Test with your 216-page PDF
3. ⏳ Verify correct page and line counts
4. ⏳ Consider upgrading to paid tier if processing many large documents

---

## Rollback Plan

If you need to revert to the old API:

```typescript
// In azure-ocr.ts, change back to:
const analyzeResponse = await axios.post(
  `${endpoint}/vision/v3.2/read/analyze`,
  { url: fileUrl },
  { headers: { 'Ocp-Apim-Subscription-Key': key } }
);
```

But the old API will still have the page limitation issue.

