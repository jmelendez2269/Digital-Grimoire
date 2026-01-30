import React from 'react';
import { cn } from '@/lib/utils'; // Assuming utils alias is set up based on existing code

interface ArcaneLoaderProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export default function ArcaneLoader({ size = 'md', className }: ArcaneLoaderProps) {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-12 h-12',
        lg: 'w-24 h-24',
        xl: 'w-64 h-64',
    };

    return (
        <div className={cn('relative flex items-center justify-center', sizeClasses[size], className)} role="status">
            <style jsx>{`
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        .animate-spin-slow {
          animation: spin 12s linear infinite;
        }
        .animate-spin-reverse-medium {
          animation: spin-reverse 8s linear infinite;
        }
        .animate-pulse-core {
          animation: pulse-glow 3s ease-in-out infinite;
        }
      `}</style>

            {/* Outer Ring: Runes/Sigils - Rotating Clockwise Slowly */}
            <svg
                className="absolute inset-0 w-full h-full text-amber-500/80 animate-spin-slow"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" />
                <path d="M50 2 A48 48 0 0 1 98 50" stroke="currentColor" strokeWidth="1" className="text-amber-400/90" />
                <path d="M50 98 A48 48 0 0 1 2 50" stroke="currentColor" strokeWidth="1" className="text-amber-400/90" />

                {/* Simple geometric runes on the edge */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                    <g key={i} transform={`rotate(${angle} 50 50)`}>
                        <circle cx="50" cy="4" r="1.5" fill="currentColor" />
                        <path d="M49 8 L51 8 L50 12 Z" fill="currentColor" />
                    </g>
                ))}
            </svg>

            {/* Middle Ring: Geometry - Rotating Counter-Clockwise */}
            <svg
                className="absolute inset-[15%] w-[70%] h-[70%] text-cyan-500/80 animate-spin-reverse-medium"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1" />
                {/* Triangle / Hexagram hint */}
                <path d="M50 2 L91.5 74 H8.5 L50 2 Z" stroke="currentColor" strokeWidth="1" opacity="0.7" />
                <path d="M50 98 L8.5 26 H91.5 L50 98 Z" stroke="currentColor" strokeWidth="1" opacity="0.7" />
            </svg>

            {/* Inner Core: Pulsing Light */}
            <div className="absolute inset-[35%] w-[30%] h-[30%] bg-amber-500/10 rounded-full blur-sm animate-pulse-core flex items-center justify-center">
                <div className="w-2 h-2 bg-amber-100 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
            </div>

            <span className="sr-only">Loading...</span>
        </div>
    );
}
