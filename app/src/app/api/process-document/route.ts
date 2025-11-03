import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getR2Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from '@/lib/storage/r2-client';
import { performOCR } from '@/lib/azure-ocr';
import { extractMetadata } from '@/lib/claude-metadata';
import { scrapeCover } from '@/lib/cover-scraper';
import { generateBookCover } from '@/lib/nano-banana-cover';
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
    const filename = key.split('/').pop() || 'document';
    const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
    const isHtmlFile = fileExtension === 'html' || fileExtension === 'htm';
    
    console.log('Starting document processing for:', key, 'Type:', isHtmlFile ? 'HTML' : 'PDF/Image');
    
    let ocrResult;
    let extractedText = '';

    if (isHtmlFile) {
      // For HTML files: Extract text directly, skip OCR
      console.log('Step 1: Extracting text from HTML file...');
      
      try {
        // Fetch HTML file from R2
        const getCommand = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME || 'convergence-library',
          Key: key,
        });
        
        const response = await s3Client.send(getCommand);
        const htmlContent = await response.Body?.transformToString() || '';
        
        // Extract plain text from HTML (simple regex-based extraction)
        // Remove script and style content
        extractedText = htmlContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
          // Replace HTML tags with spaces
          .replace(/<[^>]+>/g, ' ')
          // Decode common HTML entities
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          // Clean up whitespace
          .replace(/\s+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        
        // Estimate page and line count for HTML (rough estimate)
        const estimatedLineCount = extractedText.split('\n').length;
        const estimatedPageCount = Math.max(1, Math.ceil(extractedText.length / 3000)); // ~3000 chars per page
        
        ocrResult = {
          text: extractedText,
          lineCount: estimatedLineCount,
          pageCount: estimatedPageCount,
        };
        
        console.log(`HTML text extraction complete: ${ocrResult.lineCount} lines, estimated ${ocrResult.pageCount} pages`);
      } catch (htmlError) {
        console.error('HTML text extraction failed:', htmlError);
        throw new Error(`HTML processing failed: ${htmlError instanceof Error ? htmlError.message : 'Unknown error'}`);
      }
    } else {
      // For PDF/Images: Perform OCR
      console.log('Step 1: Running Azure OCR...');
      const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
      
      try {
        ocrResult = await performOCR(fileUrl, userId);
        console.log(`OCR complete: ${ocrResult.lineCount} lines, ${ocrResult.pageCount} pages`);
      } catch (ocrError) {
        console.error('OCR failed:', ocrError);
        throw new Error(`OCR processing failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`);
      }
    }

    // Step 2: Extract metadata with OpenAI
    console.log('Step 2: Extracting metadata...');
    let metadata;
    try {
      const result = await extractMetadata(ocrResult.text, filename || 'document', userId);
      metadata = result.metadata;
      rawAiOutput = result.rawOutput; // Store for response
      console.log('Metadata extracted:', metadata.title);
    } catch (metadataError) {
      console.error('Metadata extraction failed:', metadataError);
      throw new Error(`Metadata extraction failed: ${metadataError instanceof Error ? metadataError.message : 'Unknown error'}`);
    }

    // Step 2.5: Scrape book cover (non-blocking)
    console.log('Step 2.5: Scraping book cover...');
    let coverResult;
    let coverSource: 'scraped' | 'ai-generated' | null = null; // Track database source value
    try {
      coverResult = await scrapeCover(metadata.title, metadata.author || '');
      if (coverResult.success) {
        console.log(`✅ Cover scraped successfully: ${coverResult.imageUrl} (source: ${coverResult.source})`);
        coverSource = 'scraped';
      } else {
        console.log(`⚠️ Cover scraping failed: ${coverResult.error}`);
        
        // Step 2.6: Fallback to AI generation if scraping failed (and API key is configured)
        if (!coverResult.success && process.env.NANO_BANANA_API_KEY && metadata.domain) {
          console.log('Step 2.6: Attempting AI cover generation as fallback...');
          try {
            const aiResult = await generateBookCover(
              metadata.title,
              metadata.author || 'Unknown',
              metadata.domain,
              metadata.tags
            );
            
            if (aiResult.success) {
              console.log(`✅ AI cover generated successfully: ${aiResult.imageUrl}`);
              coverResult = {
                success: true,
                imageUrl: aiResult.imageUrl,
              };
              coverSource = 'ai-generated';
            } else {
              console.log(`⚠️ AI cover generation failed: ${aiResult.error}`);
            }
          } catch (aiError) {
            console.error('AI cover generation error (non-blocking):', aiError);
            // Continue processing even if AI generation fails
          }
        } else if (!coverResult.success && !process.env.NANO_BANANA_API_KEY) {
          console.log('⚠️ Skipping AI generation: NANO_BANANA_API_KEY not configured');
        } else if (!coverResult.success && !metadata.domain) {
          console.log('⚠️ Skipping AI generation: document domain not available');
        }
      }
    } catch (coverError) {
      console.error('Cover scraping error (non-blocking):', coverError);
      // Continue processing even if cover scraping fails
      coverResult = { success: false, error: String(coverError) };
    }

    // Step 3: Validate and sanitize document type before storing in R2 and database
    const validTypes = [
      'book_esoteric', 'book_spiritual', 'book_psychology', 'book_science',
      'article_scholarly', 'anthropology', 'reference_table', 'historical',
      'mythology', 'medical_overview', 'commentary', 'webpage', 'dictionary',
      'astrology', 'ritual_guide', 'diagram', 'transcript', 'summary',
      'speculative', 'misc'
    ];
    
    const sanitizedType = validTypes.includes(metadata.type) 
      ? metadata.type 
      : 'misc';
    
    if (sanitizedType !== metadata.type) {
      console.warn(`⚠️ Invalid document type "${metadata.type}" received from AI, defaulting to "misc"`);
    }

    // Step 3.5: Rename file in R2 based on metadata
    // For HTML files, we can skip renaming if it fails (non-critical)
    console.log('Step 3.5: Renaming file in R2 based on metadata...');
    const finalExtension = isHtmlFile ? (fileExtension || 'html') : (fileExtension || 'pdf');
    const desiredNewKey = `library/${metadata.standardizedId}.${finalExtension}`;
    console.log(`Renaming: ${key} -> ${desiredNewKey}`);
    
    // Try to rename, but for HTML files we can continue with original key if rename fails
    let renameSucceeded = false;

    try {
      const bucketName = process.env.R2_BUCKET_NAME || 'convergence-library';
      
      console.log(`Getting file from R2: ${bucketName}/${key}`);
      
      // For Cloudflare R2, use GetObject + PutObject instead of CopyObject to avoid signature issues
      // First, get the file content
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      
      let getResponse;
      try {
        getResponse = await s3Client.send(getCommand);
      } catch (getError) {
        console.error('GetObjectCommand failed:', getError);
        throw new Error(`Failed to retrieve file from R2: ${getError instanceof Error ? getError.message : 'Unknown error'}`);
      }
      
      if (!getResponse.Body) {
        throw new Error('No file body returned from R2');
      }

      console.log('Reading file stream...');
      // Convert stream to buffer for R2 compatibility
      const chunks: Uint8Array[] = [];
      const body = getResponse.Body;
      
      // Handle different body types (ReadableStream, Readable, etc.)
      try {
        if (body instanceof ReadableStream) {
          const reader = body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
        } else if (body && typeof (body as any).on === 'function') {
          // Node.js Readable stream
          for await (const chunk of body as any) {
            chunks.push(chunk);
          }
        } else if (body instanceof Uint8Array) {
          chunks.push(body);
        } else {
          // Fallback: try to read as stream
          const stream = body as any;
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
        }
      } catch (readError) {
        console.error('Error reading stream:', readError);
        throw new Error(`Failed to read file stream: ${readError instanceof Error ? readError.message : 'Unknown error'}`);
      }
      
      const fileBuffer = Buffer.concat(chunks);
      console.log(`File buffer size: ${fileBuffer.length} bytes`);

      // Prepare metadata - R2 requires lowercase keys and may have restrictions
      const r2Metadata: Record<string, string> = {};
      if (metadata.title) r2Metadata['title'] = metadata.title.substring(0, 1024); // R2 metadata value limit
      if (metadata.author) r2Metadata['author'] = metadata.author.substring(0, 1024);
      if (metadata.year) r2Metadata['year'] = metadata.year.toString();
      if (sanitizedType) r2Metadata['type'] = sanitizedType;
      if (metadata.domain) r2Metadata['domain'] = metadata.domain.substring(0, 1024);
      if (metadata.tags.length > 0) r2Metadata['tags'] = metadata.tags.join(',').substring(0, 1024);
      if (metadata.confidence) r2Metadata['confidence'] = metadata.confidence;
      if (metadata.standardizedId) r2Metadata['standardized-id'] = metadata.standardizedId;

      console.log(`Uploading to new location: ${bucketName}/${desiredNewKey}`);
      // Upload to new location with custom metadata
      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: desiredNewKey,
        Body: fileBuffer,
        ContentType: getResponse.ContentType || (isHtmlFile ? 'text/html' : 'application/pdf'),
        Metadata: r2Metadata,
      });
      
      try {
        await s3Client.send(putCommand);
        console.log('✅ File uploaded to new location');
        newKey = desiredNewKey;
        renameSucceeded = true;
      } catch (putError) {
        console.error('PutObjectCommand failed:', putError);
        console.error('Error details:', JSON.stringify(putError, null, 2));
        
        // For HTML files, allow processing to continue with original key
        if (isHtmlFile) {
          console.warn('⚠️ Failed to rename HTML file, continuing with original key');
          newKey = key; // Keep original key
          renameSucceeded = false;
        } else {
          throw new Error(`Failed to upload file to new location: ${putError instanceof Error ? putError.message : 'Unknown error'}`);
        }
      }

      // Delete old file only after successful copy
      if (renameSucceeded) {
        console.log(`Deleting old file: ${bucketName}/${key}`);
        try {
          const deleteOldCommand = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
          });
          await s3Client.send(deleteOldCommand);
          console.log('✅ Old file deleted');
        } catch (deleteError) {
          console.error('DeleteObjectCommand failed (non-fatal):', deleteError);
          // Don't throw - the file was copied successfully, deletion failure is non-critical
        }
        console.log('✅ File renamed successfully');
      } else {
        console.log('⚠️ Skipping file rename (using original key)');
      }
    } catch (r2Error) {
      console.error('R2 file operations failed:', r2Error);
      console.error('Error stack:', r2Error instanceof Error ? r2Error.stack : 'No stack trace');
      console.error('Error name:', r2Error instanceof Error ? r2Error.name : 'Unknown');
      
      // For HTML files, skip rename and continue with original key
      if (isHtmlFile) {
        console.warn('⚠️ R2 rename failed for HTML file, continuing with original key');
        newKey = key; // Use original key
        renameSucceeded = false;
      } else {
        // For other file types, throw error
        throw new Error(`Failed to rename file in storage: ${r2Error instanceof Error ? r2Error.message : 'Unknown error'}`);
      }
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
        type: sanitizedType,
        author: metadata.author,
        year: metadata.year,
        publisher: metadata.publisher,
        domain: metadata.domain,
        confidence: metadata.confidence,
        tags: metadata.tags,
        lenses: metadata.lenses, // The 7 Convergence Machine lenses
        curator_note: metadata.curatorNote || null,
        cover_image_url: coverResult?.success ? coverResult.imageUrl : null,
        cover_source: coverSource,
        status: 'ready',
        uploaded_by: userId || null,
        source_format: isHtmlFile ? 'html' : null, // Set source format for HTML files
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
      type: sanitizedType,
      pageCount: ocrResult.pageCount,
      lineCount: ocrResult.lineCount,
      metadata: {
        title: metadata.title,
        author: metadata.author,
        year: metadata.year,
        publisher: metadata.publisher,
        type: sanitizedType,
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

