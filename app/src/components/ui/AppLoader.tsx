import React from 'react';
import ArcaneLoader from './ArcaneLoader';
import StatusLoader from './StatusLoader';
import { cn } from '@/lib/utils';

interface AppLoaderProps {
    fullScreen?: boolean;
    className?: string;
    message?: string;
}

export default function AppLoader({ fullScreen = false, className, message }: AppLoaderProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-6",
                fullScreen && "fixed inset-0 z-50 bg-black/90 backdrop-blur-sm",
                className
            )}
        >
            <ArcaneLoader size="xl" />

            <div className="flex flex-col items-center gap-2">
                <StatusLoader message={message} className="text-amber-100/50" />
            </div>
        </div>
    );
}
