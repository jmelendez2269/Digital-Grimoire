
import { NextRequest, NextResponse } from 'next/server';
import { getR2Client, GetObjectCommand } from '@/lib/storage/r2-client';
import { createClient } from '@/lib/supabase/server';
import path from 'path';

// Initialize R2 client
const s3Client = getR2Client();

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; path: string[] }> }
) {
    try {
        const resolvedParams = await params;
        const { id } = resolvedParams;
        const imagePath = resolvedParams.path; // This is an array, e.g. ['fig-1.png'] or ['subfolder', 'fig-1.png']

        console.log(`[Image Proxy] Request for doc ${id}, path: ${imagePath.join('/')}`);

        // Verify user is authenticated
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch document metadata to get the base path
        const { data: document, error: docError } = await supabase
            .from('texts')
            .select('s3_key')
            .eq('id', id)
            .single();

        if (docError || !document || !document.s3_key) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Construct the full S3 key for the image
        // Assume document.s3_key is like "path/to/doc.html"
        // We want "path/to/" + imagePath joined
        const docDir = path.dirname(document.s3_key);
        // If the image path was like "images/fig-1.png" in the URL, imagePath would be ['fig-1.png'] 
        // because the route is /images/[...path].
        // Wait, if the request is /library/[id]/images/fig-1.png, and the route is /library/[id]/images/[...path]
        // then path is ['fig-1.png'].
        // If the HTML at "path/to/doc.html" refers to "images/fig-1.png", then the browser requests ".../images/fig-1.png".
        // This route handles "images" segment explicitly.
        // So likely the file structure in S3 corresponds to the relative path.
        // However, if the HTML is "doc.html" and images are in "doc_files/image.png", we need to know the structure.

        // Assumption from plan: "images are stored in R2 relative to the HTML file's location".
        // If route is caught at /images/..., it effectively maps to the "images" folder relative to the doc.
        // But my route is `.../images/[...path]`.
        // So if I request `.../images/fig-1.png`, `path` is `['fig-1.png']`.
        // And I look for `docDir/images/fig-1.png`.
        // If I request `.../images/subdir/fig.png`, `path` is `['subdir', 'fig.png']`.
        // I look for `docDir/images/subdir/fig.png`.
        // This seems correct if the structure matches.

        // There is a case where the HTML refers to "fig-1.png" directly (no images folder), but the browser/nextjs routing
        // might not catch it unless I have a route for it.
        // But the user issue specifically mentioned "404 errors for images", and "HTMLViewer might be fetching HTML content with incorrect relative image paths".
        // If the URL being requested is indeed matching this route (contains /images/), then my logic holds:
        // Append "images" and the rest of the path to the doc's directory.

        const key = path.join(docDir, 'images', ...imagePath).replace(/\\/g, '/'); // Ensure forward slashes for S3

        console.log('[Image Proxy] Fetching from R2:', key);

        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || 'convergence-library',
            Key: key,
        });

        const response = await s3Client.send(command);

        if (!response.Body) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // Determine content type based on extension
        const ext = path.extname(key).toLowerCase();
        const contentType =
            ext === '.png' ? 'image/png' :
                ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                    ext === '.gif' ? 'image/gif' :
                        ext === '.svg' ? 'image/svg+xml' :
                            ext === '.webp' ? 'image/webp' :
                                'application/octet-stream';

        // Convert stream to Web Response body (or Buffer)
        // S3 SDK's response.Body is a ReadableStream or similar.
        // NextResponse can take a ReadableStream.
        // Note: TypeScript might complain about types incompatibility between AWS SDK stream and Web Standard stream.
        // Usually `response.Body.transformToByteArray()` works well to get a buffer.

        const imageBuffer = await response.Body.transformToByteArray();

        return new NextResponse(Buffer.from(imageBuffer), {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });

    } catch (error) {
        console.error('[Image Proxy] Error:', error);
        return NextResponse.json(
            { error: 'Failed to load image' },
            { status: 500 }
        );
    }
}
