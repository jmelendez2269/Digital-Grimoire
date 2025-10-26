import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
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
  const { key } = await request.json();
  
  try {
    // Build file URL for Azure OCR
    const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    
    console.log('Starting document processing for:', key);

    // Step 1: Perform OCR
    console.log('Step 1: Running Azure OCR...');
    const ocrResult = await performOCR(fileUrl);
    console.log(`OCR complete: ${ocrResult.lineCount} lines, ${ocrResult.pageCount} pages`);

    // Step 2: Extract metadata with Claude
    console.log('Step 2: Extracting metadata with Claude...');
    const metadata = await extractMetadata(ocrResult.text);
    console.log('Metadata extracted:', metadata.title);

    // Step 3: Save to Supabase
    console.log('Step 3: Saving to Supabase...');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: textRecord, error: dbError } = await supabase
      .from('texts')
      .insert({
        title: metadata.title,
        content: ocrResult.text,
        s3_key: key,
        type: metadata.type,
        author: metadata.author,
        year: metadata.year,
        publisher: metadata.publisher,
        domain: metadata.domain,
        confidence: metadata.confidence,
        tags: metadata.tags,
        status: 'ready',
        uploaded_by: user?.id,
        metadata: {
          standardizedId: metadata.standardizedId,
          pageCount: ocrResult.pageCount,
          lineCount: ocrResult.lineCount,
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
    });

  } catch (error) {
    console.error('Document processing failed:', error);

    // Delete the uploaded file from R2
    try {
      console.log('Cleaning up: Deleting file from R2...');
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || 'convergence-library',
        Key: key,
      });
      await s3Client.send(deleteCommand);
      console.log('File deleted from R2');
    } catch (deleteError) {
      console.error('Failed to delete file from R2:', deleteError);
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

