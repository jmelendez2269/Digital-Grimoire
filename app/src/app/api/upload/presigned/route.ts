import { NextRequest, NextResponse } from 'next/server';

import { getR2Client, PutObjectCommand, getSignedUrl } from '@/lib/storage/r2-client';
import { createClient } from '@/lib/supabase/server';
import { rateLimitMiddleware, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    console.log('[PRESIGNED] Starting request processing');
    // Validate R2 configuration
    console.log('[PRESIGNED] Checking R2 configuration:', {
      hasEndpoint: !!process.env.R2_ENDPOINT,
      hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
      hasBucket: !!process.env.R2_BUCKET_NAME,
    });
    if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      console.error('[PRESIGNED] Missing R2 configuration');
      return NextResponse.json(
        { error: 'R2 storage is not configured. Please check environment variables.' },
        { status: 500 }
      );
    }

    // Initialize R2 client (compatible with S3 API) - after validation
    console.log('[PRESIGNED] Initializing R2 client');
    let s3Client;
    try {
      s3Client = getR2Client();
      console.log('[PRESIGNED] R2 client initialized successfully');
    } catch (r2Error) {
      console.error('[PRESIGNED] Failed to initialize R2 client:', r2Error);
      throw r2Error;
    }

    // Verify user is authenticated and is admin
    console.log('[PRESIGNED] Checking authentication');
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Apply rate limiting for file uploads (10 uploads per hour)
    const rateLimitResponse = await rateLimitMiddleware(
      request,
      RateLimitPresets.FILE_UPLOAD,
      user.id
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse request body
    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'Filename and file type are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      // Documents
      'application/pdf',
      'text/html',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      // Images
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      // Audio
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/flac',
      'audio/x-m4a',
      // Video
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
    ];

    // Also allow generic audio/*, video/*, image/* MIME types
    const isAllowedGenericType = 
      fileType.startsWith('audio/') ||
      fileType.startsWith('video/') ||
      fileType.startsWith('image/');

    if (!allowedTypes.includes(fileType) && !isAllowedGenericType) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, HTML, TXT, DOCX, images, audio, and video files' },
        { status: 400 }
      );
    }

    // Generate unique key for R2
    const timestamp = Date.now();
    const sanitizedFilename = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `uploads/${timestamp}-${sanitizedFilename}`;

    // Create presigned URL for R2
    const bucketName = process.env.R2_BUCKET_NAME || 'convergence-library';
    
    if (!bucketName) {
      return NextResponse.json(
        { error: 'R2 bucket name is not configured' },
        { status: 500 }
      );
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });

    try {
      console.log('[PRESIGNED] Generating presigned URL:', { bucketName, key, fileType });
      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600, // URL expires in 1 hour
      });
      console.log('[PRESIGNED] Presigned URL generated successfully');

      return NextResponse.json({
        presignedUrl,
        key,
      });
    } catch (urlError) {
      console.error('[PRESIGNED] Error generating presigned URL:', urlError);
      console.error('[PRESIGNED] Error details:', {
        name: urlError instanceof Error ? urlError.name : 'Unknown',
        message: urlError instanceof Error ? urlError.message : String(urlError),
        stack: urlError instanceof Error ? urlError.stack : null,
        code: (urlError as any)?.code,
      });
      throw new Error(`Failed to generate presigned URL: ${urlError instanceof Error ? urlError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('[PRESIGNED] Presigned URL generation error:', error);
    console.error('[PRESIGNED] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[PRESIGNED] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[PRESIGNED] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[PRESIGNED] Error code:', (error as any)?.code || 'N/A');
    
    // Provide more detailed error information
    let errorMessage = 'Failed to generate upload URL';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: (error as any)?.code,
        env: {
          hasEndpoint: !!process.env.R2_ENDPOINT,
          hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
          hasBucket: !!process.env.R2_BUCKET_NAME,
        }
      });
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code || 'UNKNOWN'
      },
      { status: 500 }
    );
  }
}

