'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface StatusLoaderProps {
    message?: string;
    className?: string;
    pulsing?: boolean;
}

export default function StatusLoader({
    message = "Loading...",
    className,
    pulsing = true
}: StatusLoaderProps) {
    return (
        <div className={cn("flex items-center justify-center overflow-hidden", className)}>
            <p
                className={cn(
                    "text-sm font-medium text-amber-100/60 tracking-wider uppercase",
                    pulsing && "animate-pulse"
                )}
            >
                {message}
            </p>
        </div>
    );
}
