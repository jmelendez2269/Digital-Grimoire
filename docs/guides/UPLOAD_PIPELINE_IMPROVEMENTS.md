# Upload Pipeline Improvements

**Date:** October 26, 2025  
**Status:** ✅ Implemented

## Overview

This document describes the improvements made to the upload pipeline to address file naming and metadata storage issues.

## Problems Identified

1. **File Naming Issue**: Files were uploaded to Cloudflare R2 with timestamp-prefixed names (e.g., `uploads/1234567890-document.pdf`) and never renamed based on the extracted metadata.

2. **Metadata Visibility**: The LLM's metadata extraction output was only logged to the console, making it difficult to review what the AI generated.

3. **Metadata Not in Cloudflare**: Extracted metadata was only stored in Supabase database, not uploaded to Cloudflare R2 as a separate file.

## Solutions Implemented

### 1. Enhanced Metadata Logging

**File**: `app/src/lib/claude-metadata.ts`

Added detailed console logging to show the LLM's raw output and parsed metadata:

```typescript
console.log('📄 LLM Raw Output:');
console.log('='.repeat(80));
console.log(responseText);
console.log('='.repeat(80));

const metadata = JSON.parse(responseText);
console.log('📋 Parsed Metadata:', JSON.stringify(metadata, null, 2));
```

**Benefits:**
- Clear visibility into what the LLM generated
- Easy debugging of metadata extraction issues
- Formatted output for better readability

### 2. Automatic File Renaming

**File**: `app/src/app/api/process-document/route.ts`

After metadata extraction, the file is now automatically renamed based on the `standardizedId`:

```typescript
// Step 3: Rename file in R2 based on metadata
const fileExtension = filename.split('.').pop() || 'pdf';
const newKey = `library/${metadata.standardizedId}.${fileExtension}`;

// Copy to new location
await s3Client.send(new CopyObjectCommand({
  Bucket: 'convergence-library',
  CopySource: `convergence-library/${key}`,
  Key: newKey,
}));

// Delete old file
await s3Client.send(new DeleteObjectCommand({
  Bucket: 'convergence-library',
  Key: key,
}));
```

**Example:**
- **Before**: `uploads/1730000000000-TheSecretDoctrine.pdf`
- **After**: `library/book_esoteric_secret_doctrine_blavatsky_1888.pdf`

**Benefits:**
- Semantic file names that are human-readable
- Consistent naming convention across all documents
- Files organized in the `library/` folder instead of `uploads/`

### 3. Metadata Upload to Cloudflare R2

**File**: `app/src/app/api/process-document/route.ts`

A companion metadata JSON file is now uploaded alongside each document:

```typescript
// Step 4: Upload metadata JSON to R2
const metadataObject = {
  ...metadata,
  ocrInfo: {
    pageCount: ocrResult.pageCount,
    lineCount: ocrResult.lineCount,
  },
  uploadedAt: new Date().toISOString(),
  uploadedBy: userId,
};

const metadataKey = `library/${metadata.standardizedId}.metadata.json`;
await s3Client.send(new PutObjectCommand({
  Bucket: 'convergence-library',
  Key: metadataKey,
  Body: JSON.stringify(metadataObject, null, 2),
  ContentType: 'application/json',
}));
```

**Example Metadata File:**
```json
{
  "title": "The Secret Doctrine",
  "standardizedId": "book_esoteric_secret_doctrine_blavatsky_1888",
  "author": "Helena Blavatsky",
  "year": 1888,
  "publisher": "Theosophical Publishing Company",
  "type": "book_esoteric",
  "domain": "theosophy",
  "tags": ["cosmogenesis", "anthropogenesis", "occultism", "evolution"],
  "confidence": "established",
  "ocrInfo": {
    "pageCount": 420,
    "lineCount": 15234
  },
  "uploadedAt": "2025-10-26T12:34:56.789Z",
  "uploadedBy": "user-uuid-here"
}
```

**Benefits:**
- Metadata is stored directly with the document in R2
- Easy to retrieve and review metadata without database queries
- Can be downloaded and shared independently
- Backup of metadata in case of database issues

### 4. Improved Error Handling

**File**: `app/src/app/api/process-document/route.ts`

Enhanced cleanup logic to handle partial failures:

```typescript
// Clean up uploaded files from R2
try {
  // Delete the renamed file if it exists
  if (newKey) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: newKey }));
  }
  
  // Delete the metadata file if it exists
  if (metadataKey) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: metadataKey }));
  }
  
  // Delete the original file if it still exists
  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
} catch (deleteError) {
  console.error('Failed to clean up files from R2:', deleteError);
}
```

**Benefits:**
- No orphaned files left in R2 on failure
- Cleans up both original and renamed files
- Removes metadata files if upload fails

## Upload Pipeline Flow

### Updated Process

1. **Upload to R2** (temporary location)
   - File: `uploads/1730000000000-document.pdf`

2. **OCR Processing** (Azure Computer Vision)
   - Extracts text from document

3. **Metadata Extraction** (OpenAI GPT-4)
   - Analyzes OCR text
   - Generates structured metadata
   - Creates `standardizedId`
   - Logs output to console

4. **File Renaming** (Cloudflare R2)
   - Copies file to: `library/book_esoteric_secret_doctrine_blavatsky_1888.pdf`
   - Deletes original: `uploads/1730000000000-document.pdf`

5. **Metadata Upload** (Cloudflare R2)
   - Uploads: `library/book_esoteric_secret_doctrine_blavatsky_1888.metadata.json`

6. **Database Save** (Supabase)
   - Saves all metadata + content to `texts` table
   - References new file path in `s3_key`
   - References metadata file in `metadata.metadataFileKey`

## File Structure in Cloudflare R2

```
convergence-library/
├── library/
│   ├── book_esoteric_secret_doctrine_blavatsky_1888.pdf
│   ├── book_esoteric_secret_doctrine_blavatsky_1888.metadata.json
│   ├── book_spiritual_bhagavad_gita_vyasa_500.pdf
│   ├── book_spiritual_bhagavad_gita_vyasa_500.metadata.json
│   └── ...
└── uploads/
    └── (temporary files during upload)
```

## Testing the Changes

### 1. Upload a Document

1. Go to `/admin/upload`
2. Upload a PDF or image file
3. Watch the console logs

### 2. Console Output to Expect

```
Starting document processing for: uploads/1730000000000-document.pdf
Step 1: Running Azure OCR...
OCR complete: 15234 lines, 420 pages
Step 2: Extracting metadata...
🤖 Calling OpenAI GPT-4 for metadata extraction...
✅ OpenAI GPT-4 response received
📄 LLM Raw Output:
================================================================================
{
  "title": "The Secret Doctrine",
  "standardizedId": "book_esoteric_secret_doctrine_blavatsky_1888",
  ...
}
================================================================================
📋 Parsed Metadata: {
  "title": "The Secret Doctrine",
  "standardizedId": "book_esoteric_secret_doctrine_blavatsky_1888",
  ...
}
Metadata extracted: The Secret Doctrine
Step 3: Renaming file in R2 based on metadata...
Renaming: uploads/1730000000000-document.pdf -> library/book_esoteric_secret_doctrine_blavatsky_1888.pdf
✅ File renamed successfully
Step 4: Uploading metadata to R2...
✅ Metadata uploaded to: library/book_esoteric_secret_doctrine_blavatsky_1888.metadata.json
Step 5: Saving to Supabase...
Document processing complete! ID: 12345
```

### 3. Verify in Cloudflare R2

Check your R2 bucket for:
- The renamed PDF file in the `library/` folder
- The corresponding `.metadata.json` file

### 4. Verify in Supabase

Query the `texts` table:
```sql
SELECT 
  title, 
  s3_key, 
  metadata->>'metadataFileKey' as metadata_file
FROM texts 
ORDER BY created_at DESC 
LIMIT 1;
```

## Configuration

No new environment variables are required. The changes use existing configuration:

- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `OPENAI_API_KEY`

## Future Enhancements

### Potential Improvements

1. **Metadata API Endpoint**: Create an endpoint to retrieve metadata files from R2
2. **Bulk Metadata Download**: Allow downloading all metadata files as a zip
3. **Metadata Search**: Index metadata files for faster searching
4. **Version Control**: Keep track of metadata updates over time
5. **Metadata Validation**: Add schema validation for metadata structure

## Troubleshooting

### File Not Renamed

**Issue**: File stays in `uploads/` folder with timestamp prefix

**Possible Causes**:
- Metadata extraction failed
- `standardizedId` not generated
- R2 permissions issue

**Solution**:
- Check console logs for metadata extraction errors
- Verify R2 credentials have copy/delete permissions
- Check that OPENAI_API_KEY is configured

### Metadata File Not Created

**Issue**: `.metadata.json` file not appearing in R2

**Possible Causes**:
- Metadata upload step failed
- R2 permissions issue

**Solution**:
- Check console logs for "Step 4" errors
- Verify R2 credentials have write permissions
- Check that the file key doesn't exceed length limits

### LLM Output Not Visible

**Issue**: Can't see what the LLM generated

**Solution**:
- Check your terminal/console where the Next.js dev server is running
- Look for the `📄 LLM Raw Output:` section between the `====` lines
- If not visible, check that console.log is not being filtered

## Related Files

- `/app/src/app/api/process-document/route.ts` - Main processing pipeline
- `/app/src/lib/claude-metadata.ts` - Metadata extraction with OpenAI
- `/app/src/app/api/upload/presigned/route.ts` - Initial upload URL generation
- `/app/src/app/admin/upload/page.tsx` - Upload UI

## Rollback Plan

If issues arise, you can temporarily disable file renaming by modifying `process-document/route.ts`:

```typescript
// Comment out the rename step
// newKey = `library/${metadata.standardizedId}.${fileExtension}`;
// Use original key instead
const newKey = key; 
```

This will keep the old behavior while troubleshooting.

---

**Last Updated**: October 26, 2025  
**Tested**: ✅ Passed linting  
**Status**: Ready for testing

