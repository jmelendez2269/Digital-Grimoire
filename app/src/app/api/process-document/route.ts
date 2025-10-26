import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { S3Client, DeleteObjectCommand, CopyObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { performOCR } from '@/lib/azure-ocr';
import { extractMetadata } from '@/lib/claude-metadata';

// Initialize R2 client for cleanup on error
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  const { key, userId } = await request.json();
  let newKey: string | null = null; // Track the renamed file for cleanup
  let metadataKey: string | null = null; // Track the metadata file for cleanup
  let rawAiOutput: string = ''; // Store raw AI response
  
  try {
    // Build file URL for Azure OCR
    const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    
    console.log('Starting document processing for:', key);

    // Step 1: Perform OCR
    console.log('Step 1: Running Azure OCR...');
    const ocrResult = await performOCR(fileUrl);
    console.log(`OCR complete: ${ocrResult.lineCount} lines, ${ocrResult.pageCount} pages`);

    // Step 2: Extract metadata with Claude (or fallback to basic extraction)
    console.log('Step 2: Extracting metadata...');
    const filename = key.split('/').pop() || 'document';
    const { metadata, rawOutput } = await extractMetadata(ocrResult.text, filename);
    rawAiOutput = rawOutput; // Store for response
    console.log('Metadata extracted:', metadata.title);

    // Step 3: Rename file in R2 based on metadata
    console.log('Step 3: Renaming file in R2 based on metadata...');
    const fileExtension = filename.split('.').pop() || 'pdf';
    newKey = `library/${metadata.standardizedId}.${fileExtension}`;
    console.log(`Renaming: ${key} -> ${newKey}`);

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
    const putMetadataCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'convergence-library',
      Key: metadataKey,
      Body: JSON.stringify(metadataObject, null, 2),
      ContentType: 'application/json',
    });
    await s3Client.send(putMetadataCommand);
    console.log(`✅ Metadata uploaded to: ${metadataKey}`);

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

