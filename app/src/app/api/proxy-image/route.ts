import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    try {
        const url = new URL(imageUrl);

        // Safety check: Only proxy http/https
        if (!['http:', 'https:'].includes(url.protocol)) {
            return new NextResponse('Invalid protocol', { status: 400 });
        }

        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'DigitalGrimoire-Proxy/1.0',
            },
        });

        if (!response.ok) {
            return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type');

        // Safety check: Only proxy image content types
        if (!contentType || !contentType.startsWith('image/')) {
            return new NextResponse('URL did not return an image', { status: 400 });
        }

        const imageBuffer = await response.arrayBuffer();

        // Forward the image with caching headers
        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('[Proxy Image Error]:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
