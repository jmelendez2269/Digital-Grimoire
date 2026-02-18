import React from 'react';
import { cn } from '@/lib/utils';
import StatusLoader from './StatusLoader';
import ParallaxLoader from './ParallaxLoader';

interface AppLoaderProps {
    fullScreen?: boolean;
    className?: string;
    message?: string;
    subtext?: string;
}

export default function AppLoader({ fullScreen = false, className, message, subtext }: AppLoaderProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-8",
                fullScreen && "fixed inset-0 z-50 bg-black/90 backdrop-blur-sm",
                className
            )}
        >
            <ParallaxLoader size="lg" />

            <div className="flex flex-col items-center gap-2">
                <StatusLoader message={message} className="text-amber-100/50" />
                {subtext && (
                    <span className="text-[10px] font-mono text-cyan-500/40 uppercase tracking-[0.2em] animate-pulse">
                        {subtext}
                    </span>
                )}
            </div>
        </div>
    );
}
