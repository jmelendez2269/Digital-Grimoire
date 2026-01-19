import { NextRequest, NextResponse } from 'next/server';
import { getR2Client, GetObjectCommand } from '@/lib/storage/r2-client';
import { createClient } from '@/lib/supabase/server';

// Initialize R2 client (compatible with S3 API)
const s3Client = getR2Client();

/**
 * GET /api/documents/[id]/html
 * Proxies HTML content from R2 to avoid CORS issues
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[HTML Proxy] Starting request');
    // Await params in Next.js 15+
    const { id } = await params;
    console.log('[HTML Proxy] Document ID:', id);

    // Verify user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[HTML Proxy] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[HTML Proxy] User authenticated:', user.id);

    // Fetch document metadata from database
    const { data: document, error: docError } = await supabase
      .from('texts')
      .select('id, s3_key, status, source_format')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if document has an s3_key and is ready
    if (!document.s3_key || document.status !== 'ready') {
      return NextResponse.json(
        { error: 'Document not available', status: document.status },
        { status: 400 }
      );
    }

    // Only allow HTML files through this proxy
    // Check source_format, or fallback to file extension if source_format is null
    const isHtmlByFormat = document.source_format === 'html';
    const isHtmlByExtension = document.s3_key && (
      document.s3_key.toLowerCase().endsWith('.html') || 
      document.s3_key.toLowerCase().endsWith('.htm')
    );
    
    if (!isHtmlByFormat && !isHtmlByExtension) {
      return NextResponse.json(
        { error: 'This endpoint is only for HTML documents' },
        { status: 400 }
      );
    }

    // Fetch HTML content from R2
    console.log('[HTML Proxy] Fetching from R2, key:', document.s3_key);
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'convergence-library',
      Key: document.s3_key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      console.error('[HTML Proxy] No body in R2 response');
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }

    // Convert stream to text
    console.log('[HTML Proxy] Converting stream to text...');
    const htmlContent = await response.Body.transformToString();
    console.log('[HTML Proxy] HTML content loaded, length:', htmlContent.length);

    // Return HTML with proper headers
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error proxying HTML document:', error);
    return NextResponse.json(
      { error: 'Failed to load HTML document', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
