'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
    FlaskConical,
    Brain,
    ScrollText,
    Church,
    History,
    Sparkles,
    SquareFunction
} from 'lucide-react';

interface ParallaxLoaderProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function ParallaxLoader({ className, size = 'md' }: ParallaxLoaderProps) {
    const sizeClasses = {
        sm: 'w-16 h-16',
        md: 'w-32 h-32',
        lg: 'w-48 h-48',
        xl: 'w-64 h-64',
    };

    const iconSize = {
        sm: 12,
        md: 16,
        lg: 20,
        xl: 24,
    }[size];

    // The 7 Parallax Lenses icons
    const lensIcons = [
        { icon: FlaskConical, color: 'text-blue-400', label: 'Scientific' },
        { icon: Brain, color: 'text-purple-400', label: 'Psychological' },
        { icon: ScrollText, color: 'text-amber-400', label: 'Philosophical' },
        { icon: Church, color: 'text-emerald-400', label: 'Religious' },
        { icon: History, color: 'text-orange-400', label: 'Historical' },
        { icon: Sparkles, color: 'text-zinc-400', label: 'Symbolic' },
        { icon: SquareFunction, color: 'text-cyan-400', label: 'Mathematical' },
    ];

    return (
        <div className={cn("relative flex items-center justify-center overflow-hidden", sizeClasses[size], className)}>
            <style jsx>{`
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(40%) rotate(0deg); }
          to { transform: rotate(360deg) translateX(40%) rotate(-360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        @keyframes eye-blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes eye-shift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(2px, -1px); }
          50% { transform: translate(-2px, 1px); }
          75% { transform: translate(1px, 2px); }
        }
        @keyframes lens-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        .orb {
          width: 40%;
          height: 40%;
          position: absolute;
        }
        .orb-0 { left: 10%; top: 20%; animation-delay: 0s; }
        .orb-1 { left: 30%; top: 50%; animation-delay: 1.3s; }
        .orb-2 { left: 50%; top: 20%; animation-delay: 2.6s; }

        .lens-orbit {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .lens-0 { animation: orbit 12s linear infinite; transform: rotate(0deg); }
        .lens-1 { animation: orbit 14s linear infinite reverse; transform: rotate(51.4deg); }
        .lens-2 { animation: orbit 16s linear infinite; transform: rotate(102.8deg); }
        .lens-3 { animation: orbit 18s linear infinite reverse; transform: rotate(154.2deg); }
        .lens-4 { animation: orbit 20s linear infinite; transform: rotate(205.7deg); }
        .lens-5 { animation: orbit 22s linear infinite reverse; transform: rotate(257.1deg); }
        .lens-6 { animation: orbit 24s linear infinite; transform: rotate(308.5deg); }
        
        .eye-blink { animation: eye-blink 5s ease-in-out infinite; }
        .eye-shift { animation: eye-shift 3s ease-in-out infinite; }
        .lens-pulse { animation: lens-pulse 4s ease-in-out infinite; }
        .float { animation: float 4s ease-in-out infinite; }
      `}</style>

            {/* Background Layer: Soft Orbs */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <div className="absolute w-full h-full bg-gradient-radial from-amber-500/20 to-transparent blur-2xl lens-pulse" />
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className={cn(
                            "absolute rounded-full bg-amber-400/10 blur-xl float orb",
                            `orb-${i}`
                        )}
                    />
                ))}
            </div>

            {/* Middle Layer: The 7 Lenses Orbiting */}
            <div className="absolute inset-0 pointer-events-none">
                {lensIcons.map(({ icon: Icon, color, label }, i) => (
                    <div
                        key={label}
                        className={cn(
                            "lens-orbit",
                            `lens-${i}`
                        )}
                    >
                        <div className={cn("p-1.5 rounded-full bg-zinc-900/80 border border-amber-900/20 shadow-lg", color)}>
                            <Icon size={iconSize} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Foreground Layer: The Central Eye/Lens */}
            <div className="relative z-10 flex items-center justify-center p-4 bg-zinc-900 rounded-full border-2 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <div className="relative w-12 h-12 flex items-center justify-center bg-zinc-800 rounded-full overflow-hidden border border-amber-500/50">
                    {/* Pupil/Aperture */}
                    <div className="absolute w-6 h-6 bg-amber-500 rounded-full eye-blink flex items-center justify-center shadow-inner">
                        <div className="w-2 h-2 bg-black rounded-full eye-shift" />
                    </div>

                    {/* Decorative Rings */}
                    <div className="absolute inset-0 border-4 border-amber-500/10 rounded-full animate-pulse" />
                    <div className="absolute inset-1 border border-amber-100/5 rounded-full" />
                </div>

                {/* Glow effect */}
                <div className="absolute inset-0 bg-amber-500/5 blur-md rounded-full -z-10 animate-pulse" />
            </div>

            <span className="sr-only">Accessing Parallax perspectives...</span>
        </div>
    );
}
