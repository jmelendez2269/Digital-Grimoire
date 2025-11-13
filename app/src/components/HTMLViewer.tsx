'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Maximize, Minimize, ZoomIn, ZoomOut, RotateCw, Loader2, AlertCircle } from 'lucide-react';
import DOMPurify from 'dompurify';
import { TextPosition } from '@/lib/types';

interface HTMLViewerProps {
  fileUrl: string;
  fileName?: string;
  onDocumentLoad?: () => void;
  onTextSelected?: (selection: { text: string; position: TextPosition }) => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.25;

export default function HTMLViewer({
  fileUrl,
  fileName,
  onDocumentLoad,
  onTextSelected,
}: HTMLViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Generate a slug from text for use as ID
  const generateSlug = (text: string, index: number): string => {
    const slug = text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
    return slug || `heading-${index}`;
  };

  // Load HTML content
  useEffect(() => {
    const loadHtml = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to load HTML: ${response.statusText}`);
        }
        
        const html = await response.text();
        
        // Sanitize HTML for security
        const sanitized = DOMPurify.sanitize(html, {
          ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'u', 'i', 'b', 'span', 'div',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'blockquote', 'pre', 'code',
            'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'hr', 'section', 'article', 'header', 'footer',
          ],
          ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
          ALLOW_DATA_ATTR: false,
        });
        
        // Add IDs to headings that don't have them
        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitized, 'text/html');
        const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const usedIds = new Set<string>();
        
        headings.forEach((heading, index) => {
          if (!heading.id) {
            const text = heading.textContent || '';
            let id = generateSlug(text, index);
            
            // Ensure uniqueness by appending counter if duplicate
            let uniqueId = id;
            let counter = 0;
            while (usedIds.has(uniqueId)) {
              counter++;
              uniqueId = `${id}-${counter}`;
            }
            heading.id = uniqueId;
            usedIds.add(uniqueId);
          } else {
            // Even if ID exists, ensure it's unique
            let uniqueId = heading.id;
            let counter = 0;
            while (usedIds.has(uniqueId)) {
              counter++;
              uniqueId = `${heading.id}-${counter}`;
            }
            heading.id = uniqueId;
            usedIds.add(uniqueId);
          }
        });
        
        // Get the body HTML (or root HTML if no body)
        const processedHtml = doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML;
        
        setHtmlContent(processedHtml);
        onDocumentLoad?.();
      } catch (err) {
        console.error('Error loading HTML:', err);
        setError(err instanceof Error ? err.message : 'Failed to load HTML content');
      } finally {
        setLoading(false);
      }
    };

    if (fileUrl) {
      loadHtml();
    }
  }, [fileUrl, onDocumentLoad]);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  // Handle reset zoom
  const handleResetZoom = useCallback(() => {
    setZoom(1.0);
  }, []);

  // Handle fullscreen toggle
  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      // Enter fullscreen
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).mozRequestFullScreen) {
        (containerRef.current as any).mozRequestFullScreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!document.fullscreenElement ||
        !!(document as any).webkitFullscreenElement ||
        !!(document as any).mozFullScreenElement ||
        !!(document as any).msFullscreenElement
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    if (!onTextSelected) return;

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    if (selectedText && selectedText.length > 0) {
      const range = selection?.getRangeAt(0);
      if (range && contentRef.current) {
        const rect = range.getBoundingClientRect();
        const containerRect = contentRef.current.getBoundingClientRect();
        
        onTextSelected({
          text: selectedText,
          position: {
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height,
          },
        });
      }
    }
  }, [onTextSelected]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-amber-100/60 text-sm">Loading HTML content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg">
        <div className="text-center p-6">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-semibold mb-2">Failed to load HTML</p>
          <p className="text-amber-100/60 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-zinc-900/50 border border-amber-900/20 rounded-lg overflow-hidden flex flex-col"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/80 border-b border-amber-900/20">
        <div className="flex items-center gap-2">
          <span className="text-amber-100/60 text-sm font-medium">{fileName || 'HTML Document'}</span>
          <span className="text-amber-100/40 text-xs">
            {(zoom * 100).toFixed(0)}%
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="p-2 hover:bg-zinc-700 rounded text-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleResetZoom}
            className="px-3 py-2 hover:bg-zinc-700 rounded text-amber-100 text-sm transition-colors"
            title="Reset Zoom"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="p-2 hover:bg-zinc-700 rounded text-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-amber-900/20 mx-1" />
          
          {/* Fullscreen toggle */}
          <button
            onClick={handleFullscreen}
            className="p-2 hover:bg-zinc-700 rounded text-amber-100 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto bg-zinc-950" style={{ scrollbarWidth: 'thin' }}>
        <div
          ref={contentRef}
          className="html-viewer-content min-h-full p-8 text-amber-100 prose prose-invert prose-amber max-w-none"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
            width: `${100 / zoom}%`,
          }}
          onMouseUp={handleTextSelection}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      {/* Custom styles for HTML content */}
      <style jsx global>{`
        .html-viewer-content {
          color: #fef3c7;
        }
        
        .html-viewer-content h1,
        .html-viewer-content h2,
        .html-viewer-content h3,
        .html-viewer-content h4,
        .html-viewer-content h5,
        .html-viewer-content h6 {
          color: #fbbf24;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        .html-viewer-content p {
          margin-bottom: 1em;
          line-height: 1.7;
        }
        
        .html-viewer-content a {
          color: #f59e0b;
          text-decoration: underline;
        }
        
        .html-viewer-content a:hover {
          color: #fbbf24;
        }
        
        .html-viewer-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
        }
        
        .html-viewer-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }
        
        .html-viewer-content table th,
        .html-viewer-content table td {
          border: 1px solid rgba(217, 119, 6, 0.3);
          padding: 0.5em;
        }
        
        .html-viewer-content table th {
          background-color: rgba(217, 119, 6, 0.1);
          color: #fbbf24;
        }
        
        .html-viewer-content blockquote {
          border-left: 3px solid rgba(217, 119, 6, 0.5);
          padding-left: 1em;
          margin: 1em 0;
          color: #fcd34d;
          font-style: italic;
        }
        
        .html-viewer-content code {
          background-color: rgba(217, 119, 6, 0.1);
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          color: #fcd34d;
        }
        
        .html-viewer-content pre {
          background-color: rgba(24, 24, 27, 0.8);
          border: 1px solid rgba(217, 119, 6, 0.3);
          padding: 1em;
          border-radius: 4px;
          overflow-x: auto;
        }
        
        .html-viewer-content pre code {
          background-color: transparent;
          padding: 0;
        }
      `}</style>
    </div>
  );
}

