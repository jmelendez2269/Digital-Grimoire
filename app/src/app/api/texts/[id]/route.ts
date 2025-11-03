import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Initialize R2 client (using S3-compatible API)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id: textId } = await params;

    // Get text metadata to find S3 key
    const { data: text, error: fetchError } = await supabase
      .from('texts')
      .select('s3_key, cover_image_url')
      .eq('id', textId)
      .single();

    if (fetchError || !text) {
      return NextResponse.json(
        { error: 'Text not found' },
        { status: 404 }
      );
    }

    // Delete from R2 storage
    if (text.s3_key) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: text.s3_key,
        });
        await r2Client.send(deleteCommand);
        console.log(`Deleted file from R2: ${text.s3_key}`);
      } catch (r2Error) {
        console.error('Error deleting from R2:', r2Error);
        // Continue with database deletion even if R2 delete fails
      }
    }

    // Delete cover image from R2 if it exists
    if (text.cover_image_url && text.cover_image_url.includes('r2.dev')) {
      try {
        // Extract key from URL
        const urlParts = text.cover_image_url.split('/');
        const coverKey = urlParts[urlParts.length - 1];
        
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: `covers/${coverKey}`,
        });
        await r2Client.send(deleteCommand);
        console.log(`Deleted cover image from R2: covers/${coverKey}`);
      } catch (r2Error) {
        console.error('Error deleting cover from R2:', r2Error);
        // Continue with database deletion
      }
    }

    // Delete from database (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('texts')
      .delete()
      .eq('id', textId);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete text from database', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Text deleted successfully',
    });
  } catch (error) {
    console.error('Unexpected error deleting text:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/texts/[id] - Fetch single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch document with all fields
    const { data: document, error: docError } = await supabase
      .from('texts')
      .select('*')
      .eq('id', id)
      .single();

    if (docError) {
      if (docError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }
      console.error('[API] Error fetching document:', docError);
      return NextResponse.json(
        { error: 'Failed to fetch document', details: docError.message },
        { status: 500 }
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('[API] Unexpected error fetching document:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

