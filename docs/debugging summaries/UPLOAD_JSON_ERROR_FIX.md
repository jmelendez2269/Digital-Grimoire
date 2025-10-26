# Upload JSON Parsing Error Fix

## Problem
When uploading PDF files through the admin upload interface, users were encountering the error:
```
Unexpected token 'I', "Internal S"... is not valid JSON
```

This error occurred when the server returned a plain text error message (like "Internal Server Error") instead of JSON, and the client-side code attempted to parse it as JSON.

## Root Cause
1. **Client-side issue**: The upload page was calling `response.json()` on error responses without checking if the response was actually JSON
2. **Insufficient error handling**: The API routes could return non-JSON responses in certain edge cases (unhandled exceptions, middleware errors, etc.)
3. **Missing validation**: The process-document endpoint wasn't validating input parameters before processing

## Solution Implemented

### 1. Client-Side Error Handling (`src/app/admin/upload/page.tsx`)

Added try-catch blocks around JSON parsing for both API calls:

```typescript
// For presigned URL endpoint
if (!presignedResponse.ok) {
  let errorMessage = 'Failed to get upload URL';
  try {
    const error = await presignedResponse.json();
    errorMessage = error.error || errorMessage;
  } catch (e) {
    // Response wasn't JSON, use status text
    errorMessage = `${errorMessage}: ${presignedResponse.statusText}`;
  }
  throw new Error(errorMessage);
}

// For process-document endpoint
if (!processResponse.ok) {
  let errorMessage = 'Failed to process document';
  try {
    const error = await processResponse.json();
    errorMessage = error.error || errorMessage;
  } catch (e) {
    // Response wasn't JSON, use status text
    errorMessage = `${errorMessage}: ${processResponse.statusText}`;
  }
  throw new Error(errorMessage);
}
```

**Benefits**:
- Handles both JSON and non-JSON error responses gracefully
- Provides meaningful error messages to users in all cases
- Prevents "Unexpected token" JSON parsing errors

### 2. Server-Side Error Handling (`src/app/api/process-document/route.ts`)

Added comprehensive error handling for each processing step:

**A. Input Validation**
```typescript
let body;
try {
  body = await request.json();
} catch (error) {
  return NextResponse.json(
    { 
      error: 'Invalid JSON in request body',
      details: 'The request body must be valid JSON'
    },
    { status: 400 }
  );
}

const { key, userId } = body;

if (!key) {
  return NextResponse.json(
    { 
      error: 'Missing required parameter: key',
      details: 'The file key is required to process the document'
    },
    { status: 400 }
  );
}
```

**B. Step-by-Step Error Handling**
```typescript
// OCR Processing
try {
  ocrResult = await performOCR(fileUrl);
} catch (ocrError) {
  throw new Error(`OCR processing failed: ${ocrError.message}`);
}

// Metadata Extraction
try {
  const result = await extractMetadata(ocrResult.text, filename);
  metadata = result.metadata;
} catch (metadataError) {
  throw new Error(`Metadata extraction failed: ${metadataError.message}`);
}

// R2 File Operations
try {
  // Copy and delete operations
} catch (r2Error) {
  throw new Error(`Failed to rename file in storage: ${r2Error.message}`);
}

// Metadata Upload
try {
  await s3Client.send(putMetadataCommand);
} catch (metadataUploadError) {
  throw new Error(`Failed to upload metadata file: ${metadataUploadError.message}`);
}
```

**Benefits**:
- Each step has specific error messages identifying what failed
- All errors are caught and returned as valid JSON
- Better debugging with detailed console logs
- Proper cleanup of R2 files on failure (already existed)

## Testing

### Test Case 1: Valid Upload
1. Go to `/admin/upload`
2. Upload a valid PDF file
3. ✅ Should process successfully and show metadata

### Test Case 2: Invalid File Type
1. Try to upload a .txt file
2. ✅ Should show validation error immediately

### Test Case 3: Large File
1. Upload a PDF larger than 50MB
2. ✅ Should show size validation error

### Test Case 4: Network Error
1. Disconnect from internet during upload
2. ✅ Should show meaningful error message instead of JSON parse error

### Test Case 5: API Configuration Error
1. If Azure/OpenAI keys are missing/invalid
2. ✅ Should show "OCR processing failed: Azure credentials not configured" or similar

## Error Message Examples

Users will now see clear, actionable error messages:

- ✅ "Failed to get upload URL: Unauthorized"
- ✅ "Failed to process document: OCR processing failed: Azure credentials not configured"
- ✅ "Failed to process document: Metadata extraction failed: OpenAI API key not configured"
- ✅ "Failed to rename file in storage: Access denied"

Instead of:
- ❌ "Unexpected token 'I', 'Internal S'... is not valid JSON"

## Technical Details

### Error Response Format
All API endpoints now consistently return JSON errors:
```json
{
  "error": "Short error message",
  "details": "More detailed explanation (optional)"
}
```

### Status Codes Used
- `400` - Bad Request (validation errors, malformed JSON)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not admin)
- `500` - Internal Server Error (processing failures)

## Files Modified
- `src/app/admin/upload/page.tsx` - Client-side error handling
- `src/app/api/process-document/route.ts` - Server-side validation and error handling

## Related Documentation
- [Upload Pipeline Improvements](../guides/UPLOAD_PIPELINE_IMPROVEMENTS.md)
- [Testing Guide](../guides/TESTING_GUIDE.md)

## Future Improvements
1. Add retry logic for transient failures
2. Implement progress updates during OCR processing
3. Add webhook notifications for long-running uploads
4. Create admin dashboard for monitoring failed uploads

