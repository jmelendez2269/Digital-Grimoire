'use client';

import { cn } from '@/lib/utils';

type OrbState = 'speaking' | 'listening' | 'thinking';
type OrbSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface StelloquyOrbProps {
  state?: OrbState;
  size?: OrbSize;
  className?: string;
  label?: boolean;
}

const SIZE_PX: Record<OrbSize, number> = {
  xs: 24,
  sm: 40,
  md: 96,
  lg: 160,
  xl: 240,
};

const STATE_LABEL: Record<OrbState, string> = {
  speaking: 'Stelloquy speaking',
  listening: 'Stelloquy listening',
  thinking: 'Stelloquy thinking',
};

export default function StelloquyOrb({
  state = 'listening',
  size = 'md',
  className,
  label = false,
}: StelloquyOrbProps) {
  const px = SIZE_PX[size];
  const glowOuter = px * 0.75;
  const glowInner = px * 0.4;

  const background: Record<OrbState, string> = {
    speaking:
      'radial-gradient(circle at 50% 38%, #ffffff 0%, #c8a8ff 14%, #9966FF 42%, #4EE7FD 78%, transparent 100%)',
    listening:
      'radial-gradient(circle at 50% 38%, #ffffff 0%, #a8f5ff 14%, #4EE7FD 45%, #1A6AE8 82%, transparent 100%)',
    thinking:
      'radial-gradient(circle at 50% 38%, #ffffff 0%, #ffd090 14%, #FF9B2B 45%, #cc5500 82%, transparent 100%)',
  };

  const shadow: Record<OrbState, string> = {
    speaking: `0 0 ${glowInner}px rgba(153,102,255,0.5), 0 0 ${glowOuter}px rgba(78,231,253,0.2)`,
    listening: `0 0 ${glowInner}px rgba(78,231,253,0.4), 0 0 ${glowOuter}px rgba(26,106,232,0.2)`,
    thinking: `0 0 ${glowInner}px rgba(255,155,43,0.4), 0 0 ${glowOuter}px rgba(153,102,255,0.15)`,
  };

  const animation: Record<OrbState, string> = {
    speaking: 'stelloquy-pulse 5s ease-in-out infinite',
    listening: 'stelloquy-breathe 6s ease-in-out infinite',
    thinking: 'stelloquy-think 4s ease-in-out infinite',
  };

  return (
    <div
      className={cn('inline-flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-label={STATE_LABEL[state]}
    >
      <style jsx>{`
        @keyframes stelloquy-pulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.07); filter: brightness(1.12); }
        }
        @keyframes stelloquy-breathe {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(0.95); filter: brightness(0.92); }
        }
        @keyframes stelloquy-think {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          33% { transform: scale(1.04); }
          66% { transform: scale(0.97); }
        }
        .stelloquy-orb {
          width: ${px}px;
          height: ${px}px;
          border-radius: 50%;
          background: ${background[state]};
          box-shadow: ${shadow[state]};
          animation: ${animation[state]};
          will-change: transform, filter;
        }
      `}</style>
      <div className="stelloquy-orb" aria-hidden="true" />
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
          {state}
        </span>
      )}
      <span className="sr-only">{STATE_LABEL[state]}</span>
    </div>
  );
}
