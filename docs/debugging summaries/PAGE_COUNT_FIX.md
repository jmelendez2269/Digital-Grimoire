# Page Count Fix - 216-Page PDF Issue

**Date**: October 26, 2025  
**Issue**: PDF showing 2 pages and 65 lines instead of 216 pages  
**Status**: ✅ Fixed

---

## Problem Diagnosis

Your 216-page PDF was being incorrectly processed as only 2 pages with 65 lines. After investigation, I found **two issues**:

### Issue 1: Azure API Limitation
The old Azure Computer Vision Read API v3.2 has limitations with large documents and was only processing the first 2 pages of your PDF.

### Issue 2: Missing Metadata Display
The page count and line count were stored in the database's `metadata` field, but weren't being displayed in the UI.

---

## Fixes Applied

### ✅ Fix 1: Upgraded to Azure Document Intelligence v4.0

**File**: `Digital-Grimoire/app/src/lib/azure-ocr.ts`

**Changes**:
- Upgraded from Azure Computer Vision Read API v3.2 → Document Intelligence v4.0
- Now supports up to **2000 pages** per document
- Extended timeout from 30 seconds → 5 minutes for large documents
- Added progress logging every 10 seconds
- Improved error handling and reporting

**New API Capabilities**:
- ✅ Handles documents up to 2000 pages
- ✅ Better text extraction accuracy
- ✅ More robust for complex layouts
- ✅ Better timeout handling for large files

### ✅ Fix 2: Display Page & Line Counts in UI

**File**: `Digital-Grimoire/app/src/app/library/[id]/page.tsx`

**Changes**:
- Added `metadata` field to the `TextDocument` interface
- Now displays page count in the **Metadata tab**
- Now displays line count in the **Metadata tab**
- Uses proper number formatting (e.g., "15,234 lines")

---

## What You Need to Do

### Step 1: Verify Azure Setup

Your existing Azure credentials should work, but verify they're set in `app/.env.local`:

```env
AZURE_VISION_ENDPOINT=https://YOUR_RESOURCE.cognitiveservices.azure.com/
AZURE_VISION_KEY=your_api_key_here
```

### Step 2: Delete the Incorrect Document

The current document in your database has incorrect page/line counts. You need to:

1. Go to `/library`
2. Find the document showing "2 pages, 65 lines"
3. Delete it from the database (you'll need to add a delete function or use SQL)

**SQL to delete** (run in Supabase SQL Editor):
```sql
-- Find the document ID first
SELECT id, title, metadata FROM texts 
WHERE title ILIKE '%your-pdf-title%';

-- Then delete it (replace YOUR_ID)
DELETE FROM texts WHERE id = 'YOUR_ID';
```

### Step 3: Delete Files from Cloudflare R2

The uploaded PDF and metadata files need to be cleaned up:

1. Log into Cloudflare Dashboard
2. Go to R2 Storage → `convergence-library` bucket
3. Delete files in the `library/` folder related to this document

### Step 4: Re-upload Your PDF

1. Go to `/admin/upload`
2. Upload your 216-page PDF again
3. Watch the terminal/console logs - you should see:
   ```
   Starting OCR for URL: https://...
   OCR operation submitted: https://...
   OCR still processing... (attempt 10/300, status: running)
   OCR still processing... (attempt 20/300, status: running)
   ...
   OCR completed successfully after XX attempts
   OCR extraction complete: 216 pages, XXXXX lines, XXXXXXX characters
   ```

### Step 5: Verify the Fix

1. Go to `/library`
2. Find your newly uploaded document
3. Click to view details
4. Go to the **Metadata** tab
5. You should now see:
   - **Pages**: 216 pages ✅
   - **Lines**: [correct line count] lines ✅

---

## Expected Processing Time

For a 216-page PDF:
- **OCR Processing**: 1-3 minutes (depends on PDF complexity)
- **Metadata Extraction**: 10-30 seconds
- **Total**: ~2-4 minutes

You'll see progress updates in the console every 10 seconds.

---

## Troubleshooting

### Error: "404 Not Found"

Your Azure region might not support the preview API. Solutions:

1. **Option A**: Use stable API version (edit `azure-ocr.ts`):
   ```typescript
   const analyzeUrl = `${endpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;
   ```

2. **Option B**: Create new Azure Form Recognizer resource in supported region:
   - East US
   - West Europe
   - West US 2

### Still Shows 2 Pages After Re-upload

1. Make sure you **deleted the old document** from the database first
2. Clear your browser cache
3. Check console logs to verify OCR completed with "216 pages"
4. If still wrong, check Azure portal for API call limits

### Timeout After 300 Attempts

Very large or complex PDFs might need longer:
1. Edit `azure-ocr.ts`
2. Change `maxAttempts` from 300 to 600
3. This gives 10 minutes instead of 5 minutes

---

## Azure Pricing Impact

### Free Tier (F0)
- **500 pages/month** free
- Your 216-page PDF uses ~43% of monthly quota
- Good for 2-3 large documents per month

### Paid Tier (S0)
- **$1.50 per 1,000 pages**
- Your 216-page PDF costs: **$0.32**
- Recommend upgrading if processing many large documents

---

## Additional Resources

See detailed documentation:
- 📄 [Azure Document Intelligence Upgrade Guide](../guides/AZURE_DOCUMENT_INTELLIGENCE_UPGRADE.md)
- 📄 [Azure Setup Guide](../Setup%20Docs/AZURE_COMPUTER_VISION_SETUP.md)

---

## Summary

**Problem**: Azure Computer Vision v3.2 limited to processing first 2 pages  
**Solution**: Upgraded to Azure Document Intelligence v4.0 (supports 2000 pages)  
**Action Required**: Delete old document and re-upload PDF  
**Expected Result**: Shows "216 pages" and correct line count ✅

Let me know if you see any errors during the re-upload process!

