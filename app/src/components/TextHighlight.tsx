'use client';

/**
 * TextHighlight Component
 * Highlights text as it's being read aloud and auto-scrolls
 */

import { useEffect, useRef, useState } from 'react';

export interface TextHighlightProps {
  text: string;
  currentCharIndex: number;
  highlightLength?: number;
  className?: string;
}

export default function TextHighlight({
  text,
  currentCharIndex,
  highlightLength = 50,
  className = '',
}: TextHighlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [segments, setSegments] = useState<{ text: string; isHighlighted: boolean }[]>([]);

  useEffect(() => {
    if (!text) {
      setSegments([]);
      return;
    }

    // Split text into segments for highlighting
    const before = text.substring(0, currentCharIndex);
    const highlighted = text.substring(currentCharIndex, currentCharIndex + highlightLength);
    const after = text.substring(currentCharIndex + highlightLength);

    const newSegments = [];
    if (before) {
      newSegments.push({ text: before, isHighlighted: false });
    }
    if (highlighted) {
      newSegments.push({ text: highlighted, isHighlighted: true });
    }
    if (after) {
      newSegments.push({ text: after, isHighlighted: false });
    }

    setSegments(newSegments);
  }, [text, currentCharIndex, highlightLength]);

  // Auto-scroll to keep highlighted text visible
  useEffect(() => {
    if (!containerRef.current) return;

    const highlightedElement = containerRef.current.querySelector('[data-highlighted="true"]');
    if (highlightedElement) {
      highlightedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentCharIndex]);

  return (
    <div ref={containerRef} className={`prose prose-invert prose-amber max-w-none ${className}`}>
      <div className="whitespace-pre-wrap text-sm text-amber-100/80 leading-relaxed font-sans">
        {segments.map((segment, index) => (
          <span
            key={index}
            data-highlighted={segment.isHighlighted}
            className={
              segment.isHighlighted
                ? 'bg-amber-500/30 text-amber-100 px-1 rounded transition-colors duration-200'
                : ''
            }
          >
            {segment.text}
          </span>
        ))}
      </div>
    </div>
  );
}

