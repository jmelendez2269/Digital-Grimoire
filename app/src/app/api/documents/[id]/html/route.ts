import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { getR2Client, GetObjectCommand } from '@/lib/storage/r2-client';

const s3Client = getR2Client();

function rewriteRelativeImageSources(html: string, documentId: string): string {
  return html.replace(
    /(<img\b[^>]*\bsrc\s*=\s*["'])([^"']+)(["'][^>]*>)/gi,
    (match, prefix: string, src: string, suffix: string) => {
      const normalizedSrc = src.trim();

      // Leave absolute, protocol-relative, root-relative, data, blob, and fragment URLs unchanged.
      if (
        /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(normalizedSrc)
      ) {
        return match;
      }

      const cleanedSrc = normalizedSrc.replace(/^\.\/+/, '');
      return `${prefix}/library/${documentId}/images/${cleanedSrc}${suffix}`;
    }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: document, error: docError } = await supabase
      .from('texts')
      .select('id, s3_key, status, title, source_format')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!document.s3_key || document.status !== 'ready') {
      return NextResponse.json(
        { error: 'Document not available', status: document.status },
        { status: 400 }
      );
    }

    const ext = path.extname(document.s3_key).toLowerCase();
    const isHtmlFile =
      document.source_format === 'html' || ext === '.html' || ext === '.htm';

    if (!isHtmlFile) {
      return NextResponse.json(
        { error: 'Document is not an HTML file' },
        { status: 400 }
      );
    }

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'convergence-library',
      Key: document.s3_key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: 'HTML file not found' }, { status: 404 });
    }

    const html = await response.Body.transformToString();
    const rewrittenHtml = rewriteRelativeImageSources(html, id);

    return new NextResponse(rewrittenHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error loading HTML document:', error);
    return NextResponse.json(
      { error: 'Failed to load HTML document' },
      { status: 500 }
    );
  }
}
