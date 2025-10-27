import { NextRequest, NextResponse } from 'next/server';
import { getR2Client, GetObjectCommand, getSignedUrl } from '@/lib/storage/r2-client';
import { createClient } from '@/lib/supabase/server';

// Initialize R2 client (compatible with S3 API)
const s3Client = getR2Client();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { id } = await params;

    // Verify user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch document metadata from database
    const { data: document, error: docError } = await supabase
      .from('texts')
      .select('id, s3_key, status, title')
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

    // Generate presigned URL for R2
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'convergence-library',
      Key: document.s3_key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL expires in 1 hour
    });

    return NextResponse.json({
      url: signedUrl,
      title: document.title,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating document URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate document URL' },
      { status: 500 }
    );
  }
}

