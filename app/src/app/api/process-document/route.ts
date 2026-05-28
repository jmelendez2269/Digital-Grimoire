import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getR2Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from '@/lib/storage/r2-client';
import { performOCR } from '@/lib/ocr';
import { extractMetadata, type DocumentMetadata } from '@/lib/claude-metadata';
import { scrapeCover } from '@/lib/cover-scraper';
import { generateBookCover } from '@/lib/getimg-cover';
import { logStorageUpload, logUserActivity, logOcrUsage } from '@/lib/usage-tracker';
import { findSimilarDocuments, shouldWarnAboutDuplicate } from '@/lib/utils/similarity-check';
import { generateTextEmbeddings } from '@/lib/parallax/embeddings';
import { extractPdfTextLocally, isTextSubstantial } from '@/lib/utils/server-pdf-extractor';
import { performLocalImageOCR } from '@/lib/utils/local-ocr';

// Initialize R2 client for cleanup on error
const s3Client = getR2Client();

/**
 * Sanitizes a string for use in HTTP headers (S3/R2 metadata).
 * AWS S3/R2 metadata values can ONLY contain printable ASCII characters (32-126).
 * All other characters are removed or replaced.
 */
function sanitizeMetadataValue(value: string): string {
  return value
    // Only keep printable ASCII characters (32-126)
    // This includes: space, !, ", #, $, %, &, ', (, ), *, +, comma, -, ., /, 0-9, :, ;, <, =, >, ?, @, A-Z, [, \, ], ^, _, `, a-z, {, |, }, ~
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);
      // Only allow printable ASCII (32-126)
      if (code >= 32 && code <= 126) {
        return char;
      }
      // Replace non-ASCII with space
      return ' ';
    })
    .join('')
    // Collapse multiple spaces into one
    .replace(/\s+/g, ' ')
    .trim();
}

function createMinimalMetadata(filename: string, ocrText?: string): DocumentMetadata {
  const title = filename.replace(/\.[^/.]+$/, '') || 'Untitled Document';
  const baseId = title
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'untitled_document';
  const hasText = Boolean(ocrText?.trim());

  return {
    title,
    author: undefined,
    year: undefined,
    publisher: undefined,
    type: 'misc',
    domain: 'general',
    standardizedId: `doc_${baseId}_${Date.now()}`,
    tags: [],
    lenses: [],
    confidence: 'speculative',
    shortSummary: hasText
      ? 'Metadata extraction was temporarily unavailable. The document uploaded successfully and can be enriched later.'
      : 'The document uploaded successfully without extracted text. Metadata can be enriched later.',
    longSummary: hasText
      ? 'AI metadata extraction was temporarily unavailable during upload, so Prismarium saved this document with conservative filename-derived metadata. Use the admin edit screen to regenerate the title, summaries, tags, lenses, and curator note.'
      : 'Prismarium saved this document with conservative filename-derived metadata because no extracted text was available during upload. Use the admin edit screen to enrich the metadata later.',
  };
}

function shouldFallbackToMinimalMetadata(error: unknown): boolean {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status?: number }).status)
    : undefined;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return status === 429 ||
    status === 503 ||
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('provider returned error') ||
    message.includes('openrouter') ||
    message.includes('empty response');
}

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

  const { key, userId, skipOCR } = body;

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

    // Get file from R2 to check actual MIME type (more reliable than extension)
    const bucketName = process.env.R2_BUCKET_NAME || 'convergence-library';
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const fileResponse = await s3Client.send(getCommand);
    const mimeType = fileResponse.ContentType || 'application/octet-stream';
    const fileSize = fileResponse.ContentLength || 0;

    if (!fileResponse.Body) {
      throw new Error('No file body returned from R2');
    }

    console.log('Reading file stream into memory...');
    const chunks: Uint8Array[] = [];
    const body = fileResponse.Body;

    try {
      if (body instanceof ReadableStream) {
        const reader = body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      } else if (body && typeof (body as any).on === 'function') {
        for await (const chunk of body as any) {
          chunks.push(chunk);
        }
      } else if (body instanceof Uint8Array) {
        chunks.push(body);
      } else {
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

    // Determine if it's HTML based on MIME type AND extension (both must match)
    const isHtmlByExtension = fileExtension === 'html' || fileExtension === 'htm';
    const isHtmlByMimeType = mimeType === 'text/html' || mimeType === 'application/xhtml+xml';
    const isHtmlFile = isHtmlByExtension && isHtmlByMimeType;

    // Plain text — either by extension or MIME type is enough
    const isPlainTextFile =
      fileExtension === 'txt' || mimeType === 'text/plain';

    console.log('Starting document processing for:', key);
    console.log('File extension:', fileExtension);
    console.log('MIME type:', mimeType);
    console.log('Detected type:', isHtmlFile ? 'HTML' : isPlainTextFile ? 'TXT' : 'PDF/Image');

    // If extension says HTML but MIME type says PDF, it's likely a misnamed file - use OCR
    if (isHtmlByExtension && !isHtmlByMimeType && mimeType === 'application/pdf') {
      console.warn('⚠️ File has .html extension but MIME type is PDF. Treating as PDF and using OCR.');
    }

    let ocrResult = {
      text: '',
      lineCount: 0,
      pageCount: 0
    };
    let extractedText = '';

    if (isHtmlFile) {
      // For HTML files: Extract text directly, skip OCR
      console.log('Step 1: Extracting text from HTML file...');

      try {
        // Use the buffer we've already loaded
        const htmlContent = fileBuffer.toString('utf-8');

        // Extract plain text from HTML (improved extraction)
        // Remove script and style content first
        let cleanedHtml = htmlContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
          .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
          .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
          .replace(/<embed[^>]*>[\s\S]*?<\/embed>/gi, '');

        // Replace HTML tags with spaces (multiple passes to catch nested tags)
        cleanedHtml = cleanedHtml.replace(/<[^>]+>/g, ' ');

        // Decode HTML entities (comprehensive list)
        extractedText = cleanedHtml
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&apos;/g, "'")
          .replace(/&mdash;/g, '—')
          .replace(/&ndash;/g, '–')
          .replace(/&hellip;/g, '…')
          .replace(/&copy;/g, '©')
          .replace(/&reg;/g, '®')
          .replace(/&trade;/g, '™')
          // Decode numeric entities (&#123; and &#x1F;)
          .replace(/&#(\d+);/g, (_, num) => {
            try {
              return String.fromCharCode(parseInt(num, 10));
            } catch {
              return ' ';
            }
          })
          .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
            try {
              return String.fromCharCode(parseInt(hex, 16));
            } catch {
              return ' ';
            }
          })
          // Remove any remaining entities
          .replace(/&[#\w]+;/g, ' ')
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
    } else if (isPlainTextFile) {
      // For .txt files: Decode buffer as UTF-8 — no OCR, no tag stripping
      console.log('Step 1: Reading plain text file...');
      try {
        // Strip a UTF-8 BOM if present
        extractedText = fileBuffer.toString('utf-8').replace(/^﻿/, '');

        const lineCount = extractedText.split(/\r?\n/).length;
        const pageCount = Math.max(1, Math.ceil(extractedText.length / 3000));

        ocrResult = {
          text: extractedText,
          lineCount,
          pageCount,
        };

        console.log(`TXT extraction complete: ${ocrResult.lineCount} lines, estimated ${ocrResult.pageCount} pages`);
      } catch (txtError) {
        console.error('TXT extraction failed:', txtError);
        throw new Error(`TXT processing failed: ${txtError instanceof Error ? txtError.message : 'Unknown error'}`);
      }
    } else {
      // For PDF/Images: Perform OCR (unless skipped)
      if (skipOCR) {
        console.log('Step 1: Skipping OCR as requested by user');
        // Create minimal OCR result for documents without OCR
        ocrResult = {
          text: '', // No text extracted
          lineCount: 0,
          pageCount: 0,
        };
        console.log('OCR skipped - document will be uploaded without text extraction');
      } else {
        console.log('Step 1: Attempting text extraction/OCR...');
        const fileSizeMB = fileBuffer.length / (1024 * 1024);
        const isPDF = mimeType === 'application/pdf';
        
        let localPdfSucceeded = false;
        
        // 1. Try local PDF parsing (bypasses Azure completely for digital PDFs)
        if (isPDF) {
          try {
            const localResult = await extractPdfTextLocally(fileBuffer);
            if (isTextSubstantial(localResult.text, localResult.pageCount)) {
              ocrResult = {
                text: localResult.text,
                lineCount: localResult.text.split('\n').length,
                pageCount: localResult.pageCount
              };
              localPdfSucceeded = true;
              console.log('✅ Used local PDF extraction successfully. Bypassing image OCR.');
            } else {
              console.log('⚠️ Local PDF extraction returned insufficient text (likely a scanned PDF). Falling back to Tesseract OCR.');
            }
          } catch (e) {
            console.error('⚠️ Local PDF extraction failed. Falling back to Tesseract OCR:', e);
          }
        }
        
        if (!localPdfSucceeded) {
          const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

          console.log(`File size: ${fileSizeMB.toFixed(2)}MB, MIME type: ${mimeType}`);

          // 2. Try image OCR (Tesseract via performOCR for image URLs; throws for scanned PDFs)
          try {
            console.log('Step 1.5: Running Tesseract OCR...');
            ocrResult = await performOCR(fileUrl, userId);
            console.log(`OCR complete: ${ocrResult.lineCount} lines, ${ocrResult.pageCount} pages`);
          } catch (ocrError) {
            console.error('⚠️ Tesseract OCR failed:', ocrError);

            // 3. Direct-buffer Tesseract fallback for images (skips the URL fetch)
            const isImage = mimeType.startsWith('image/');
            if (isImage) {
               console.log('Step 1.6: Attempting direct-buffer Tesseract fallback for image...');
               try {
                   const localImageResult = await performLocalImageOCR(fileBuffer);
                   ocrResult = {
                       text: localImageResult.text,
                       lineCount: localImageResult.text.split('\n').length,
                       pageCount: 1
                   };
                   console.log('✅ Direct-buffer Tesseract fallback successful.');
               } catch (localOcrError) {
                   console.error('Direct-buffer Tesseract failed:', localOcrError);
                   throw new Error(`OCR failed. URL OCR: ${ocrError instanceof Error ? ocrError.message : 'Unknown'}. Buffer OCR: ${localOcrError instanceof Error ? localOcrError.message : 'Unknown'}`);
               }
               // Cannot use tesseract fallback for PDFs easily without canvas/ghostscript
               console.error(`OCR processing failed and local fallback is not supported for PDFs. Error: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`);
               console.log('⚠️ Gracefully skipping OCR text extraction for this PDF so the upload can continue.');
               ocrResult = {
                 text: '',
                 lineCount: 0,
                 pageCount: 0
               };
            }
          }
        }
      }
    }

    // Step 2: Extract metadata with OpenAI (or create minimal metadata if OCR was skipped)
    console.log('Step 2: Extracting metadata...');
    let metadata;
    try {
      if (skipOCR && !ocrResult.text) {
        // If OCR was skipped, create minimal metadata from filename
        console.log('Creating minimal metadata from filename (OCR was skipped)');
        metadata = createMinimalMetadata(filename, ocrResult.text);
        rawAiOutput = 'Metadata created from filename (OCR skipped)';
        console.log('Minimal metadata created:', metadata.title);
      } else {
        const result = await extractMetadata(ocrResult.text, filename || 'document', userId);
        metadata = result.metadata;
        rawAiOutput = result.rawOutput; // Store for response
        console.log('Metadata extracted:', metadata.title);
      }
    } catch (metadataError) {
      console.error('Metadata extraction failed:', metadataError);
      // OpenRouter free providers can temporarily rate-limit. Keep the upload usable.
      if (skipOCR || shouldFallbackToMinimalMetadata(metadataError)) {
        console.log('Metadata extraction failed, creating minimal metadata from filename');
        metadata = createMinimalMetadata(filename, ocrResult.text);
        rawAiOutput = `Metadata created from filename because AI extraction failed: ${metadataError instanceof Error ? metadataError.message : 'Unknown error'}`;
      } else {
        throw new Error(`Metadata extraction failed: ${metadataError instanceof Error ? metadataError.message : 'Unknown error'}`);
      }
    }

    // Step 2.25: Check for similar/duplicate documents
    console.log('Step 2.25: Checking for similar documents...');
    let similarDocuments: any[] = [];
    try {
      const supabaseForCheck = await createClient();
      similarDocuments = await findSimilarDocuments(
        supabaseForCheck,
        metadata.title,
        metadata.author,
        metadata.year,
        metadata.standardizedId,
        ocrResult.text
      );

      if (similarDocuments.length > 0) {
        console.log(`⚠️ Found ${similarDocuments.length} similar document(s):`, similarDocuments.map(d => d.title));
      } else {
        console.log('✅ No similar documents found');
      }
    } catch (similarityError) {
      console.error('Similarity check failed (non-blocking):', similarityError);
      // Continue processing even if similarity check fails
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
        if (!coverResult.success && process.env.GETIMG_API_KEY && metadata.domain) {
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
        } else if (!coverResult.success && !process.env.GETIMG_API_KEY) {
          console.log('⚠️ Skipping AI generation: GETIMG_API_KEY not configured');
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
    const finalExtension = isHtmlFile
      ? (fileExtension || 'html')
      : isPlainTextFile
        ? 'txt'
        : (fileExtension || 'pdf');
    const desiredNewKey = `library/${metadata.standardizedId}.${finalExtension}`;
    console.log(`Renaming: ${key} -> ${desiredNewKey}`);

    // Try to rename, but for HTML files we can continue with original key if rename fails
    let renameSucceeded = false;

    try {
      const bucketName = process.env.R2_BUCKET_NAME || 'convergence-library';

      // We already loaded the file in `fileBuffer` earlier!

      // Prepare metadata - R2 requires lowercase keys and may have restrictions
      // HTTP headers cannot contain control characters, newlines, or certain special characters
      // AWS S3/R2 metadata values can ONLY contain printable ASCII (32-126)
      const r2Metadata: Record<string, string> = {};
      if (metadata.title) {
        const originalTitle = metadata.title;
        const sanitizedTitle = sanitizeMetadataValue(originalTitle).substring(0, 1024);
        if (sanitizedTitle) {
          r2Metadata['title'] = sanitizedTitle;
          if (originalTitle !== sanitizedTitle) {
            console.log(`⚠️ Title sanitized: "${originalTitle}" -> "${sanitizedTitle}"`);
          }
        }
      }
      if (metadata.author) {
        const sanitized = sanitizeMetadataValue(metadata.author).substring(0, 1024);
        if (sanitized) r2Metadata['author'] = sanitized;
      }
      if (metadata.year) {
        const sanitized = sanitizeMetadataValue(metadata.year.toString());
        if (sanitized) r2Metadata['year'] = sanitized;
      }
      if (sanitizedType) {
        const sanitized = sanitizeMetadataValue(sanitizedType);
        if (sanitized) r2Metadata['type'] = sanitized;
      }
      if (metadata.domain) {
        const sanitized = sanitizeMetadataValue(metadata.domain).substring(0, 1024);
        if (sanitized) r2Metadata['domain'] = sanitized;
      }
      if (metadata.tags?.length) {
        const sanitized = sanitizeMetadataValue(metadata.tags.join(',')).substring(0, 1024);
        if (sanitized) r2Metadata['tags'] = sanitized;
      }
      if (metadata.confidence) {
        const sanitized = sanitizeMetadataValue(metadata.confidence);
        if (sanitized) r2Metadata['confidence'] = sanitized;
      }
      if (metadata.standardizedId) {
        const sanitized = sanitizeMetadataValue(metadata.standardizedId);
        if (sanitized) r2Metadata['standardized-id'] = sanitized;
      }

      console.log(`Uploading to new location: ${bucketName}/${desiredNewKey}`);
      console.log(`Metadata being set:`, JSON.stringify(r2Metadata, null, 2));

      // Upload to new location with custom metadata
      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: desiredNewKey,
        Body: fileBuffer,
        ContentType: mimeType || (isHtmlFile ? 'text/html' : isPlainTextFile ? 'text/plain' : 'application/pdf'),
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

        // If error is related to metadata, try uploading without metadata
        const errorMessage = putError instanceof Error ? putError.message : String(putError);
        if (errorMessage.includes('header') || errorMessage.includes('metadata') || errorMessage.includes('Invalid character')) {
          console.warn('⚠️ Metadata caused upload failure, retrying without metadata...');
          try {
            const putCommandWithoutMetadata = new PutObjectCommand({
              Bucket: bucketName,
              Key: desiredNewKey,
              Body: fileBuffer,
              ContentType: mimeType || (isHtmlFile ? 'text/html' : isPlainTextFile ? 'text/plain' : 'application/pdf'),
              // No Metadata field
            });
            await s3Client.send(putCommandWithoutMetadata);
            console.log('✅ File uploaded to new location (without metadata)');
            newKey = desiredNewKey;
            renameSucceeded = true;
          } catch (retryError) {
            console.error('PutObjectCommand retry failed:', retryError);
            // Continue to original error handling
            if (isHtmlFile || isPlainTextFile) {
              console.warn('⚠️ Failed to rename text file, continuing with original key');
              newKey = key;
              renameSucceeded = false;
            } else {
              throw new Error(`Failed to upload file to new location: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
            }
          }
        } else {
          // For HTML/TXT files, allow processing to continue with original key
          if (isHtmlFile || isPlainTextFile) {
            console.warn('⚠️ Failed to rename text file, continuing with original key');
            newKey = key; // Keep original key
            renameSucceeded = false;
          } else {
            throw new Error(`Failed to upload file to new location: ${putError instanceof Error ? putError.message : 'Unknown error'}`);
          }
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

      // For HTML/TXT files, skip rename and continue with original key
      if (isHtmlFile || isPlainTextFile) {
        console.warn('⚠️ R2 rename failed for text file, continuing with original key');
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
        source_format: isHtmlFile ? 'html' : isPlainTextFile ? 'txt' : null, // Set source format for HTML/TXT files
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

    // Step 6: Generate embeddings (non-blocking or handled with error catching)
    let chunksCreated = 0;
    try {
      if (ocrResult.text) {
        console.log('Step 6: Generating embeddings for the processed text...');
        chunksCreated = await generateTextEmbeddings(textRecord.id, ocrResult.text);
        console.log(`✅ Generated ${chunksCreated} chunks for ${textRecord.id}`);
      }
    } catch (embeddingError) {
      console.error('Embedding generation failed (non-blocking):', embeddingError);
      // We don't fail the whole request because the document is already saved
    }

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
      similarDocuments: similarDocuments.length > 0 ? similarDocuments : undefined,
      hasDuplicates: shouldWarnAboutDuplicate(similarDocuments),
    });

  } catch (error) {
    console.error('Document processing failed:', error);

    // Log OCR failures to database even if they happen at the route level
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isOcrError = errorMessage.includes('OCR') || errorMessage.includes('Azure');

    if (isOcrError && userId) {
      try {
        await logOcrUsage({
          pages: 0,
          userId,
          documentId: undefined,
          success: false,
          errorMessage: `Route-level OCR error: ${errorMessage}`,
        });
      } catch (logError) {
        console.error('Failed to log OCR error:', logError);
      }
    }

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

