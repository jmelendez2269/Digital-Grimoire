'use client';

import Image, { ImageProps } from 'next/image';
import { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface SafeImageProps extends Omit<ImageProps, 'src'> {
    src: string;
    fallbackIcon?: React.ReactNode;
}

// List of hostnames already configured in next.config.ts
const CONFIGURED_HOSTS = [
    'cloudflare.com',
    'covers.openlibrary.org',
    'archive.org',
    'www.gutenberg.org',
    'i.thriftbooks.com',
    'books.google.com',
    'www.mjppublishers.com',
    'enlightenmentmedianews.com',
    'images.gr-assets.com'
];

// Wildcard patterns
const CONFIGURED_WILDCARDS = [
    '.bing.com',
    '.mm.bing.net',
    '.bing.net',
    '.googleusercontent.com',
    '.media-amazon.com',
    '.ssl-images-amazon.com',
    '.googleapis.com',
    '.getimg.ai',
    '.gstatic.com'
];

export default function SafeImage({ src, alt, fallbackIcon, ...props }: SafeImageProps) {
    const [error, setError] = useState(false);
    const [displaySrc, setDisplaySrc] = useState(src);

    useEffect(() => {
        if (!src) return;

        try {
            const url = new URL(src);
            const hostname = url.hostname;

            const isSafe =
                CONFIGURED_HOSTS.some(host => hostname === host) ||
                CONFIGURED_WILDCARDS.some(wildcard => hostname.endsWith(wildcard));

            if (!isSafe) {
                // Use proxy for unconfigured hosts
                setDisplaySrc(`/api/proxy-image?url=${encodeURIComponent(src)}`);
            } else {
                setDisplaySrc(src);
            }
        } catch (e) {
            // If URL parsing fails, it might be a relative path or invalid
            if (!src.startsWith('/') && !src.startsWith('http')) {
                setError(true);
            } else {
                setDisplaySrc(src);
            }
        }
    }, [src]);

    if (error || !src) {
        return (
            <div className={`flex items-center justify-center bg-zinc-800/50 ${props.className || ''}`} style={{ minHeight: '100px' }}>
                {fallbackIcon || <ImageIcon className="w-8 h-8 text-zinc-500" />}
            </div>
        );
    }

    return (
        <Image
            {...props}
            src={displaySrc}
            alt={alt}
            onError={() => setError(true)}
            unoptimized={displaySrc.includes('/api/proxy-image')}
        />
    );
}
