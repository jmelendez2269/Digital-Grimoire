'use client';

/**
 * TextHighlight Component
 * Highlights text as it's being read aloud and auto-scrolls
 * Supports click-to-start-reading functionality
 */

import { useEffect, useRef, useState } from 'react';

export interface TextHighlightProps {
  text: string;
  currentCharIndex: number;
  highlightLength?: number;
  className?: string;
  onPositionClick?: (charIndex: number) => void;
  isPlaying?: boolean;
}

export default function TextHighlight({
  text,
  currentCharIndex,
  highlightLength = 50,
  className = '',
  onPositionClick,
  isPlaying = false,
}: TextHighlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [segments, setSegments] = useState<{ text: string; isHighlighted: boolean; startIndex: number }[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!text) {
      setSegments([]);
      return;
    }

    // Split text into segments for highlighting and click tracking
    const before = text.substring(0, currentCharIndex);
    const highlighted = text.substring(currentCharIndex, currentCharIndex + highlightLength);
    const after = text.substring(currentCharIndex + highlightLength);

    const newSegments = [];
    if (before) {
      newSegments.push({ text: before, isHighlighted: false, startIndex: 0 });
    }
    if (highlighted) {
      newSegments.push({ text: highlighted, isHighlighted: true, startIndex: currentCharIndex });
    }
    if (after) {
      newSegments.push({ text: after, isHighlighted: false, startIndex: currentCharIndex + highlightLength });
    }

    setSegments(newSegments);
  }, [text, currentCharIndex, highlightLength]);

  // Handle click on text to start reading from that position
  const handleTextClick = (event: React.MouseEvent<HTMLSpanElement>, segmentStartIndex: number, segmentText: string) => {
    if (!onPositionClick) return;

    // Get the exact character clicked within the segment
    const span = event.currentTarget;
    let offsetInSegment = 0;
    
    // Try different methods for browser compatibility
    if (typeof document.caretRangeFromPoint === 'function') {
      // Chrome, Safari
      const range = document.caretRangeFromPoint(event.clientX, event.clientY);
      if (range) {
        const textNode = range.startContainer;
        if (textNode.nodeType === Node.TEXT_NODE && textNode.parentNode === span) {
          offsetInSegment = range.startOffset;
        }
      }
    } else if (typeof (document as any).caretPositionFromPoint === 'function') {
      // Firefox
      const position = (document as any).caretPositionFromPoint(event.clientX, event.clientY);
      if (position) {
        const textNode = position.offsetNode;
        if (textNode.nodeType === Node.TEXT_NODE && textNode.parentNode === span) {
          offsetInSegment = position.offset;
        }
      }
    }
    
    const clickedCharIndex = segmentStartIndex + offsetInSegment;
    onPositionClick(clickedCharIndex);
  };

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
      {onPositionClick && (
        <div className="mb-3 flex items-center gap-2 text-xs text-amber-100/60 bg-zinc-800/50 px-3 py-2 rounded border border-amber-900/20">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <span>Click anywhere in the text below to start reading from that position</span>
        </div>
      )}
      <div className="whitespace-pre-wrap text-sm text-amber-100/80 leading-relaxed font-sans">
        {segments.map((segment, index) => (
          <span
            key={index}
            data-highlighted={segment.isHighlighted}
            onClick={(e) => onPositionClick && handleTextClick(e, segment.startIndex, segment.text)}
            onMouseEnter={() => onPositionClick && setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`
              ${segment.isHighlighted
                ? 'bg-amber-500/30 text-amber-100 px-1 rounded transition-colors duration-200'
                : ''
              }
              ${onPositionClick && !segment.isHighlighted
                ? 'cursor-pointer hover:bg-zinc-700/30 hover:text-amber-100 transition-colors duration-150'
                : ''
              }
              ${hoveredIndex === index && !segment.isHighlighted
                ? 'underline decoration-amber-600/30 decoration-dotted'
                : ''
              }
            `}
            style={onPositionClick ? { userSelect: 'text' } : undefined}
            title={onPositionClick ? 'Click to start reading from here' : undefined}
          >
            {segment.text}
          </span>
        ))}
      </div>
    </div>
  );
}

