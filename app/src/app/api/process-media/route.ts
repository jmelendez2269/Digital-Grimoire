import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getR2Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from '@/lib/storage/r2-client';
import { extractMediaMetadata, MediaFileInfo } from '@/lib/media-metadata';
import { scrapeAlbumArt } from '@/lib/media-cover-scraper';
import { extractVideoThumbnail } from '@/lib/video-thumbnail';
import { extractPhotoExif, generatePhotoSizes } from '@/lib/photo-processor';
import { generateTranscript } from '@/lib/transcript-generator';
import { generateBookCover } from '@/lib/getimg-cover';
import { logStorageUpload, logUserActivity } from '@/lib/usage-tracker';
import { findSimilarDocuments } from '@/lib/utils/similarity-check';

// Initialize R2 client for cleanup on error
const s3Client = getR2Client();

/**
 * Determine media type from MIME type
 */
function getMediaType(mimeType: string): 'audio' | 'video' | 'photo' | null {
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'photo';
  return null;
}

/**
 * Extract basic file metadata (duration, format, etc.)
 * This is a placeholder - in production, use libraries like music-metadata, ffprobe, etc.
 */
async function extractFileMetadata(
  fileKey: string,
  mimeType: string,
  fileSize: number
): Promise<MediaFileInfo> {
  // For MVP, return basic info
  // In production, use actual metadata extraction libraries:
  // - music-metadata for audio files
  // - ffprobe for video files
  // - exif-reader for photos
  
  const format = fileKey.split('.').pop()?.toLowerCase() || '';
  
  return {
    mimeType,
    format,
    // Duration, bitrate, resolution would be extracted here
  };
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

  const { key, userId } = body;
  
  if (!key) {
    return NextResponse.json(
      { 
        error: 'Missing required parameter: key',
        details: 'The file key is required to process the media'
      },
      { status: 400 }
    );
  }

  let newKey: string | null = null;
  let metadataKey: string | null = null;
  let rawAiOutput: string = '';
  
  try {
    const filename = key.split('/').pop() || 'media';
    const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
    
    // Get file from R2 to determine MIME type
    const bucketName = process.env.R2_BUCKET_NAME || 'convergence-library';
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    const fileResponse = await s3Client.send(getCommand);
    const mimeType = fileResponse.ContentType || 'application/octet-stream';
    const fileSize = fileResponse.ContentLength || 0;
    
    const mediaType = getMediaType(mimeType);
    if (!mediaType) {
      throw new Error(`Unsupported media type: ${mimeType}`);
    }
    
    console.log(`Starting ${mediaType} processing for: ${key}`);
    
    const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    
    // Step 1: Extract file metadata
    console.log('Step 1: Extracting file metadata...');
    const fileInfo = await extractFileMetadata(key, mimeType, fileSize);
    
    // Step 2: Content extraction based on media type
    console.log(`Step 2: Extracting content for ${mediaType}...`);
    let transcript = '';
    let transcriptSegments: any[] = [];
    let imageUrl = '';
    
    if (mediaType === 'audio' || mediaType === 'video') {
      // Generate transcript
      try {
        const transcriptResult = await generateTranscript(fileUrl);
        if (transcriptResult.success && transcriptResult.transcript) {
          transcript = transcriptResult.transcript;
          transcriptSegments = transcriptResult.segments || [];
          console.log(`Transcript generated: ${transcript.length} characters`);
        } else {
          console.warn(`Transcript generation failed: ${transcriptResult.error}`);
        }
      } catch (transcriptError) {
        console.error('Transcript generation error (non-blocking):', transcriptError);
      }
    } else if (mediaType === 'photo') {
      // Use image URL for vision analysis
      imageUrl = fileUrl;
    }
    
    // Step 3: AI Metadata Extraction
    console.log('Step 3: Extracting metadata with AI...');
    let metadata;
    try {
      const result = await extractMediaMetadata(
        mediaType,
        fileInfo,
        mediaType === 'photo' ? imageUrl : transcript,
        filename,
        userId
      );
      metadata = result.metadata;
      rawAiOutput = result.rawOutput;
      console.log('Metadata extracted:', metadata.title);
    } catch (metadataError) {
      console.error('Metadata extraction failed:', metadataError);
      throw new Error(`Metadata extraction failed: ${metadataError instanceof Error ? metadataError.message : 'Unknown error'}`);
    }
    
    // Step 4: Cover/Thumbnail Generation
    console.log('Step 4: Generating cover/thumbnail...');
    let coverResult: any = { success: false };
    let thumbnailUrl: string | null = null;
    let coverSource: 'scraped' | 'ai-generated' | 'extracted' | null = null;
    
    try {
      if (mediaType === 'audio') {
        // Try scraping album art
        coverResult = await scrapeAlbumArt(metadata.title, metadata.author || '');
        if (coverResult.success) {
          coverSource = 'scraped';
          thumbnailUrl = coverResult.imageUrl || null;
        } else {
          // Fallback to AI generation
          if (process.env.GETIMG_API_KEY && metadata.domain) {
            try {
              const aiResult = await generateBookCover(
                metadata.title,
                metadata.author || 'Unknown',
                metadata.domain,
                metadata.tags
              );
              if (aiResult.success) {
                coverResult = { success: true, imageUrl: aiResult.imageUrl };
                coverSource = 'ai-generated';
                thumbnailUrl = aiResult.imageUrl || null;
              }
            } catch (aiError) {
              console.error('AI cover generation error (non-blocking):', aiError);
            }
          }
        }
      } else if (mediaType === 'video') {
        // Extract video thumbnail
        const thumbnailResult = await extractVideoThumbnail(key, fileUrl);
        if (thumbnailResult.success && thumbnailResult.thumbnailUrl) {
          thumbnailUrl = thumbnailResult.thumbnailUrl;
          coverSource = 'extracted';
          coverResult = { success: true, imageUrl: thumbnailUrl };
        }
      } else if (mediaType === 'photo') {
        // Use photo itself as thumbnail, generate sizes
        const sizes = await generatePhotoSizes(key, fileUrl);
        thumbnailUrl = sizes.medium || fileUrl;
        coverResult = { success: true, imageUrl: thumbnailUrl };
        coverSource = 'extracted';
      }
    } catch (coverError) {
      console.error('Cover/thumbnail generation error (non-blocking):', coverError);
    }
    
    // Step 5: Check for similar documents
    console.log('Step 5: Checking for similar documents...');
    let similarDocuments: any[] = [];
    try {
      const supabaseForCheck = await createClient();
      similarDocuments = await findSimilarDocuments(
        supabaseForCheck,
        metadata.title,
        metadata.author,
        metadata.year,
        metadata.standardizedId,
        transcript || ''
      );
      if (similarDocuments.length > 0) {
        console.log(`⚠️ Found ${similarDocuments.length} similar document(s)`);
      }
    } catch (similarityError) {
      console.error('Similarity check failed (non-blocking):', similarityError);
    }
    
    // Step 6: Rename file in R2 based on metadata
    console.log('Step 6: Renaming file in R2 based on metadata...');
    const finalExtension = fileExtension || (mediaType === 'audio' ? 'mp3' : mediaType === 'video' ? 'mp4' : 'jpg');
    const desiredNewKey = `media/${mediaType}/${metadata.standardizedId}.${finalExtension}`;
    console.log(`Renaming: ${key} -> ${desiredNewKey}`);
    
    let renameSucceeded = false;
    
    try {
      // Get file content
      const getFileCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      
      const getFileResponse = await s3Client.send(getFileCommand);
      if (!getFileResponse.Body) {
        throw new Error('No file body returned from R2');
      }
      
      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const body = getFileResponse.Body;
      
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
        for await (const chunk of body as any) {
          chunks.push(chunk);
        }
      }
      
      const fileBuffer = Buffer.concat(chunks);
      
      // Upload to new location
      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: desiredNewKey,
        Body: fileBuffer,
        ContentType: mimeType,
      });
      
      await s3Client.send(putCommand);
      console.log('✅ File uploaded to new location');
      newKey = desiredNewKey;
      renameSucceeded = true;
      
      // Delete old file
      try {
        const deleteOldCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
        await s3Client.send(deleteOldCommand);
        console.log('✅ Old file deleted');
      } catch (deleteError) {
        console.error('Delete old file failed (non-fatal):', deleteError);
      }
    } catch (r2Error) {
      console.error('R2 file operations failed:', r2Error);
      // Continue with original key
      newKey = key;
      renameSucceeded = false;
    }
    
    // Step 7: Upload metadata JSON to R2
    console.log('Step 7: Uploading metadata to R2...');
    const metadataObject = {
      ...metadata,
      mediaInfo: {
        mediaType,
        format: fileInfo.format,
        duration: fileInfo.duration,
        bitrate: fileInfo.bitrate,
        resolution: fileInfo.resolution,
        exif: fileInfo.exif,
      },
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId,
    };
    
    metadataKey = `media/${mediaType}/${metadata.standardizedId}.metadata.json`;
    try {
      const putMetadataCommand = new PutObjectCommand({
        Bucket: bucketName,
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
    
    // Step 8: Save to Supabase
    console.log('Step 8: Saving to Supabase...');
    const supabase = await createClient();
    
    // Validate document type
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
    
    const { data: textRecord, error: dbError } = await supabase
      .from('texts')
      .insert({
        title: metadata.title,
        content: transcript || '', // Store transcript as content for audio/video
        summary: metadata.longSummary,
        short_summary: metadata.shortSummary,
        long_summary: metadata.longSummary,
        s3_key: newKey,
        type: sanitizedType,
        author: metadata.author,
        year: metadata.year,
        publisher: metadata.publisher,
        domain: metadata.domain,
        confidence: metadata.confidence,
        tags: metadata.tags,
        lenses: metadata.lenses,
        curator_note: metadata.curatorNote || null,
        cover_image_url: coverResult?.success ? coverResult.imageUrl : null,
        cover_source: coverSource,
        status: 'ready',
        uploaded_by: userId || null,
        mime_type: mimeType,
        file_size: fileSize,
        media_type: mediaType,
        duration: fileInfo.duration || null,
        transcript: transcript || null,
        thumbnail_url: thumbnailUrl,
        metadata: {
          standardizedId: metadata.standardizedId,
          metadataFileKey: metadataKey,
          format: fileInfo.format,
          bitrate: fileInfo.bitrate,
          resolution: fileInfo.resolution,
          exif: fileInfo.exif,
          transcriptSegments: transcriptSegments,
        },
      })
      .select()
      .single();
    
    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }
    
    console.log('Media processing complete! ID:', textRecord.id);
    
    // Log user activity
    if (userId) {
      await logUserActivity(userId, 'upload');
    }
    
    return NextResponse.json({
      success: true,
      documentId: textRecord.id,
      title: metadata.title,
      type: sanitizedType,
      mediaType,
      duration: fileInfo.duration,
      transcript: transcript || null,
      thumbnailUrl,
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
    });
    
  } catch (error) {
    console.error('Media processing failed:', error);
    
    // Clean up uploaded files from R2
    try {
      console.log('Cleaning up: Deleting files from R2...');
      const bucket = process.env.R2_BUCKET_NAME || 'convergence-library';
      
      if (newKey) {
        try {
          const deleteNewCommand = new DeleteObjectCommand({ Bucket: bucket, Key: newKey });
          await s3Client.send(deleteNewCommand);
          console.log(`Deleted renamed file: ${newKey}`);
        } catch (e) {
          console.error('Failed to delete renamed file:', e);
        }
      }
      
      if (metadataKey) {
        try {
          const deleteMetadataCommand = new DeleteObjectCommand({ Bucket: bucket, Key: metadataKey });
          await s3Client.send(deleteMetadataCommand);
          console.log(`Deleted metadata file: ${metadataKey}`);
        } catch (e) {
          console.error('Failed to delete metadata file:', e);
        }
      }
      
      // Delete original file
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
        error: error instanceof Error ? error.message : 'Failed to process media',
        details: 'The uploaded file has been removed. Please try again.'
      },
      { status: 500 }
    );
  }
}

