import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getR2Client, DeleteObjectCommand, CopyObjectCommand, PutObjectCommand } from '@/lib/storage/r2-client';
import { performOCR } from '@/lib/azure-ocr';
import { extractMetadata } from '@/lib/claude-metadata';
import { logStorageUpload, logUserActivity } from '@/lib/usage-tracker';

// Initialize R2 client for cleanup on error
const s3Client = getR2Client();

export async function POST(request: NextRequest) {
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

  let newKey: string | null = null; // Track the renamed file for cleanup
  let metadataKey: string | null = null; // Track the metadata file for cleanup
  let rawAiOutput: string = ''; // Store raw AI response
  
  try {
    // Build file URL for Azure OCR
    const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    
    console.log('Starting document processing for:', key);

    // Step 1: Perform OCR
    console.log('Step 1: Running Azure OCR...');
    let ocrResult;
    try {
      ocrResult = await performOCR(fileUrl, userId);
      console.log(`OCR complete: ${ocrResult.lineCount} lines, ${ocrResult.pageCount} pages`);
    } catch (ocrError) {
      console.error('OCR failed:', ocrError);
      throw new Error(`OCR processing failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`);
    }

    // Step 2: Extract metadata with OpenAI
    console.log('Step 2: Extracting metadata...');
    const filename = key.split('/').pop() || 'document';
    let metadata;
    try {
      const result = await extractMetadata(ocrResult.text, filename, userId);
      metadata = result.metadata;
      rawAiOutput = result.rawOutput; // Store for response
      console.log('Metadata extracted:', metadata.title);
    } catch (metadataError) {
      console.error('Metadata extraction failed:', metadataError);
      throw new Error(`Metadata extraction failed: ${metadataError instanceof Error ? metadataError.message : 'Unknown error'}`);
    }

    // Step 3: Rename file in R2 based on metadata
    console.log('Step 3: Renaming file in R2 based on metadata...');
    const fileExtension = filename.split('.').pop() || 'pdf';
    newKey = `library/${metadata.standardizedId}.${fileExtension}`;
    console.log(`Renaming: ${key} -> ${newKey}`);

    try {
      // Copy to new location with custom metadata attached
      const copyCommand = new CopyObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || 'convergence-library',
        CopySource: `${process.env.R2_BUCKET_NAME || 'convergence-library'}/${key}`,
        Key: newKey,
        Metadata: {
          'title': metadata.title,
          'author': metadata.author || '',
          'year': metadata.year?.toString() || '',
          'type': metadata.type,
          'domain': metadata.domain || '',
          'tags': metadata.tags.join(','),
          'confidence': metadata.confidence,
          'standardized-id': metadata.standardizedId,
        },
        MetadataDirective: 'REPLACE',
      });
      await s3Client.send(copyCommand);

      // Delete old file
      const deleteOldCommand = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || 'convergence-library',
        Key: key,
      });
      await s3Client.send(deleteOldCommand);
      console.log('✅ File renamed successfully');
    } catch (r2Error) {
      console.error('R2 file operations failed:', r2Error);
      throw new Error(`Failed to rename file in storage: ${r2Error instanceof Error ? r2Error.message : 'Unknown error'}`);
    }

    // Step 4: Upload metadata JSON to R2
    console.log('Step 4: Uploading metadata to R2...');
    const metadataObject = {
      ...metadata,
      ocrInfo: {
        pageCount: ocrResult.pageCount,
        lineCount: ocrResult.lineCount,
      },
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId,
    };

    metadataKey = `library/${metadata.standardizedId}.metadata.json`;
    try {
      const putMetadataCommand = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || 'convergence-library',
        Key: metadataKey,
        Body: JSON.stringify(metadataObject, null, 2),
        ContentType: 'application/json',
      });
      await s3Client.send(putMetadataCommand);
      console.log(`✅ Metadata uploaded to: ${metadataKey}`);
    } catch (metadataUploadError) {
      console.error('Metadata upload to R2 failed:', metadataUploadError);
      throw new Error(`Failed to upload metadata file: ${metadataUploadError instanceof Error ? metadataUploadError.message : 'Unknown error'}`);
    }

    // Step 5: Save to Supabase (using regular authenticated client)
    console.log('Step 5: Saving to Supabase...');
    const supabase = await createClient();

    const { data: textRecord, error: dbError } = await supabase
      .from('texts')
      .insert({
        title: metadata.title,
        content: ocrResult.text,
        summary: metadata.longSummary,
        short_summary: metadata.shortSummary,
        long_summary: metadata.longSummary,
        s3_key: newKey, // Use the new renamed key
        type: metadata.type,
        author: metadata.author,
        year: metadata.year,
        publisher: metadata.publisher,
        domain: metadata.domain,
        confidence: metadata.confidence,
        tags: metadata.tags,
        lenses: metadata.lenses, // The 7 Convergence Machine lenses
        status: 'ready',
        uploaded_by: userId || null,
        metadata: {
          standardizedId: metadata.standardizedId,
          pageCount: ocrResult.pageCount,
          lineCount: ocrResult.lineCount,
          metadataFileKey: metadataKey, // Store reference to metadata file
        },
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('Document processing complete! ID:', textRecord.id);

    // Log user activity
    if (userId) {
      await logUserActivity(userId, 'upload');
    }

    return NextResponse.json({
      success: true,
      documentId: textRecord.id,
      title: metadata.title,
      type: metadata.type,
      pageCount: ocrResult.pageCount,
      lineCount: ocrResult.lineCount,
      metadata: {
        title: metadata.title,
        author: metadata.author,
        year: metadata.year,
        publisher: metadata.publisher,
        type: metadata.type,
        domain: metadata.domain,
        tags: metadata.tags,
        lenses: metadata.lenses,
        confidence: metadata.confidence,
        standardizedId: metadata.standardizedId,
      },
      shortSummary: metadata.shortSummary,
      longSummary: metadata.longSummary,
      rawAiOutput: rawAiOutput,
    });

  } catch (error) {
    console.error('Document processing failed:', error);

    // Clean up uploaded files from R2
    try {
      console.log('Cleaning up: Deleting files from R2...');
      const bucket = process.env.R2_BUCKET_NAME || 'convergence-library';
      
      // Delete the renamed file if it exists
      if (newKey) {
        try {
          const deleteNewCommand = new DeleteObjectCommand({ Bucket: bucket, Key: newKey });
          await s3Client.send(deleteNewCommand);
          console.log(`Deleted renamed file: ${newKey}`);
        } catch (e) {
          console.error('Failed to delete renamed file:', e);
        }
      }
      
      // Delete the metadata file if it exists
      if (metadataKey) {
        try {
          const deleteMetadataCommand = new DeleteObjectCommand({ Bucket: bucket, Key: metadataKey });
          await s3Client.send(deleteMetadataCommand);
          console.log(`Deleted metadata file: ${metadataKey}`);
        } catch (e) {
          console.error('Failed to delete metadata file:', e);
        }
      }
      
      // Delete the original file if it still exists (in case rename failed)
      try {
        const deleteCommand = new DeleteObjectCommand({ Bucket: bucket, Key: key });
        await s3Client.send(deleteCommand);
        console.log(`Deleted original file: ${key}`);
      } catch (e) {
        console.error('Failed to delete original file:', e);
      }
    } catch (deleteError) {
      console.error('Failed to clean up files from R2:', deleteError);
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process document',
        details: 'The uploaded file has been removed. Please try again.'
      },
      { status: 500 }
    );
  }
}

