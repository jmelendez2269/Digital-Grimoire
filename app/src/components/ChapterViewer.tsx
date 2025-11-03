'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, BookOpen, ZoomIn, ZoomOut, RotateCw, Maximize, Minimize } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

interface Chapter {
  id: string;
  title: string;
  content: string;
}

interface ChapterViewerProps {
  chapters: Chapter[];
  documentTitle?: string;
  format?: 'html' | 'markdown' | 'plaintext';
}

export default function ChapterViewer({ chapters, documentTitle, format = 'plaintext' }: ChapterViewerProps) {
  const [activeChapterId, setActiveChapterId] = useState<string>(
    chapters[0]?.id || ''
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeChapter = chapters.find(ch => ch.id === activeChapterId);
  const isFirstChapter = chapters[0]?.id === activeChapterId; // Check if viewing first chapter (title/index page)

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

  // Sanitize HTML content
  const sanitizedHtml = useMemo(() => {
    if (format === 'html' && activeChapter) {
      return DOMPurify.sanitize(activeChapter.content, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 'i', 'b',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li',
          'blockquote', 'pre', 'code',
          'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'div', 'span',
        ],
        ALLOWED_ATTR: ['href', 'class'],
      });
    }
    return '';
  }, [format, activeChapter]);

  // Format content for display (simple markdown-like rendering for plaintext)
  const formatContent = (content: string) => {
    if (!content) return null;
    
    // Debug logging - always log to see if this is being called
    console.log('[ChapterViewer] formatContent called, format:', format, 'content length:', content.length);
    console.log('[ChapterViewer] First 300 chars:', content.substring(0, 300));
    
    // Normalize line breaks: handle different line break types
    let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    const hasLineBreaks = normalized.includes('\n');
    console.log('[ChapterViewer] Has line breaks:', hasLineBreaks);
    
    // If content has no line breaks, add paragraph breaks more aggressively
    if (!hasLineBreaks && normalized.length > 100) {
      console.log('[ChapterViewer] Adding paragraph breaks...');
      
      // Strategy 1: Split on sentence endings (more aggressive)
      normalized = normalized.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');
      
      // Strategy 2: Split on periods with quotes or emphasis
      normalized = normalized.replace(/(\.|!|\?)\s*["']\s*([A-Z])/g, '$1"$2');
      normalized = normalized.replace(/\.\s+["']([^"']+)["']\s+([A-Z])/g, '.\n\n"$1"\n\n$2');
      
      // Strategy 3: Split before common paragraph starters (case insensitive)
      const paragraphStarters = [
        'In the', 'It was', 'The ', 'This ', 'That ', 'These ', 'Those ',
        'However', 'Therefore', 'Moreover', 'Furthermore', 'Additionally',
        'First', 'Second', 'Third', 'Finally', 'Also', 'Another',
        'The Master', 'The student', 'The teacher', 'Hermetic', 'Kybalion'
      ];
      
      paragraphStarters.forEach(starter => {
        const regex = new RegExp(`\\s+(${starter})`, 'gi');
        normalized = normalized.replace(regex, '\n\n$1');
      });
      
      // Strategy 4: Split long paragraphs (every 300 chars after a sentence)
      // But only if no breaks were added above
      if (!normalized.includes('\n\n')) {
        normalized = normalized.replace(/([.!?])\s+([^.!?]{200,})/g, (match, punct, text) => {
          // Only add break if the following text is long enough
          if (text.length > 200) {
            return punct + '\n\n' + text;
          }
          return match;
        });
      }
      
      console.log('[ChapterViewer] After processing, has breaks:', normalized.includes('\n\n'));
    }
    
    // Split into paragraphs by double line breaks
    const paragraphs = normalized.split(/\n\n+/).filter(p => p.trim());
    console.log('[ChapterViewer] Paragraphs created:', paragraphs.length);
    
    return paragraphs.map((para, index) => {
      const trimmed = para.trim();
      
      // Check if it's an italicized quote (Kybalion maxim)
      if (trimmed.startsWith('_"') && trimmed.includes('—The Kybalion')) {
        return (
          <blockquote 
            key={index} 
            className="my-6 pl-6 border-l-4 border-amber-600/50 italic text-amber-200/90 text-lg leading-relaxed"
          >
            {trimmed.replace(/^_"|"_$/g, '"').replace('—The Kybalion', '').trim()}
            <cite className="block mt-2 text-sm not-italic text-amber-400/70">—The Kybalion</cite>
          </blockquote>
        );
      }
      
      // Check if it's a numbered list item
      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <p key={index} className="my-4 text-amber-100/80 leading-relaxed pl-4 whitespace-pre-line">
            {trimmed}
          </p>
        );
      }
      
      // Regular paragraph - manually render line breaks with <br /> tags
      // This ensures line breaks always display even if CSS fails
      const lines = trimmed.split('\n').filter(line => line.trim());
      
      return (
        <p key={index} className="my-4 text-amber-100/80 leading-relaxed text-justify">
          {lines.map((line, lineIndex) => (
            <span key={lineIndex}>
              {lineIndex > 0 && <br />}
              {line.trim()}
            </span>
          ))}
        </p>
      );
    });
  };

  // Render content based on format
  const renderContent = () => {
    if (!activeChapter) return null;
    
    console.log('[ChapterViewer] renderContent - format:', format, 'has content:', !!activeChapter.content);
    
    if (format === 'html') {
      // Use the sanitized HTML directly - it should already be well-formatted
      // from the parser's cleanHtml function
      let htmlToRender = sanitizedHtml;
      
      // Enhance the HTML structure if needed (client-side only)
      if (typeof window !== 'undefined' && htmlToRender && htmlToRender.trim().length > 0) {
        // If HTML lacks proper structure, try to fix it
        if (!htmlToRender.includes('<p>') && !htmlToRender.includes('<div>') && !htmlToRender.includes('<h1>')) {
          // Content might need paragraph wrapping
          // Try to extract text and wrap in paragraphs
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlToRender;
          const textContent = tempDiv.textContent || tempDiv.innerText || '';
          
          if (textContent.trim() && !htmlToRender.trim().startsWith('<')) {
            // It's likely plain text, wrap in paragraphs
            const paragraphs = textContent
              .split(/\n\n+/)
              .filter(p => p.trim())
              .map(p => `<p>${p.trim().replace(/\n/g, ' ')}</p>`)
              .join('\n');
            htmlToRender = paragraphs;
            
            // Re-sanitize after processing
            htmlToRender = DOMPurify.sanitize(htmlToRender, {
              ALLOWED_TAGS: [
                'p', 'br', 'strong', 'em', 'u', 'i', 'b',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li',
                'blockquote', 'pre', 'code',
                'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
                'div', 'span',
              ],
              ALLOWED_ATTR: ['href', 'class'],
            });
          }
        }
      }
      
      return (
        <>
          <div 
            className="chapter-html-content prose prose-invert prose-amber max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlToRender }}
          />
          {/* Comprehensive CSS styling similar to HTMLViewer */}
          <style jsx global>{`
            .chapter-html-content {
              color: #fef3c7;
              padding: 1rem 0;
            }
            
            .chapter-html-content h1,
            .chapter-html-content h2,
            .chapter-html-content h3,
            .chapter-html-content h4,
            .chapter-html-content h5,
            .chapter-html-content h6 {
              color: #fbbf24;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              font-weight: 600;
            }
            
            .chapter-html-content h1 {
              font-size: 2em;
              border-bottom: 2px solid rgba(217, 119, 6, 0.3);
              padding-bottom: 0.5em;
            }
            
            .chapter-html-content h2 {
              font-size: 1.5em;
            }
            
            .chapter-html-content h3 {
              font-size: 1.25em;
            }
            
            .chapter-html-content p {
              margin-bottom: 1em;
              line-height: 1.7;
              text-align: justify;
              color: #fef3c7;
            }
            
            .chapter-html-content p:first-child {
              margin-top: 0;
            }
            
            .chapter-html-content p:last-child {
              margin-bottom: 0;
            }
            
            .chapter-html-content a {
              color: #f59e0b;
              text-decoration: underline;
              transition: color 0.2s;
            }
            
            .chapter-html-content a:hover {
              color: #fbbf24;
            }
            
            .chapter-html-content img {
              max-width: 100%;
              height: auto;
              border-radius: 4px;
              margin: 1em 0;
            }
            
            .chapter-html-content table {
              width: 100%;
              border-collapse: collapse;
              margin: 1em 0;
            }
            
            .chapter-html-content table th,
            .chapter-html-content table td {
              border: 1px solid rgba(217, 119, 6, 0.3);
              padding: 0.5em;
            }
            
            .chapter-html-content table th {
              background-color: rgba(217, 119, 6, 0.1);
              color: #fbbf24;
              font-weight: 600;
            }
            
            .chapter-html-content blockquote {
              border-left: 3px solid rgba(217, 119, 6, 0.5);
              padding-left: 1em;
              margin: 1.5em 0;
              color: #fcd34d;
              font-style: italic;
            }
            
            .chapter-html-content code {
              background-color: rgba(217, 119, 6, 0.1);
              padding: 0.2em 0.4em;
              border-radius: 3px;
              font-family: 'Courier New', monospace;
              color: #fcd34d;
              font-size: 0.9em;
            }
            
            .chapter-html-content pre {
              background-color: rgba(24, 24, 27, 0.8);
              border: 1px solid rgba(217, 119, 6, 0.3);
              padding: 1em;
              border-radius: 4px;
              overflow-x: auto;
              margin: 1em 0;
            }
            
            .chapter-html-content pre code {
              background-color: transparent;
              padding: 0;
              color: #fcd34d;
            }
            
            .chapter-html-content ul,
            .chapter-html-content ol {
              margin: 1em 0;
              padding-left: 2em;
              color: #fef3c7;
            }
            
            .chapter-html-content li {
              margin: 0.5em 0;
              line-height: 1.6;
            }
            
            .chapter-html-content ul li {
              list-style-type: disc;
            }
            
            .chapter-html-content ol li {
              list-style-type: decimal;
            }
            
            .chapter-html-content strong,
            .chapter-html-content b {
              color: #fbbf24;
              font-weight: 600;
            }
            
            .chapter-html-content em,
            .chapter-html-content i {
              font-style: italic;
              color: #fcd34d;
            }
            
            .chapter-html-content hr {
              border: none;
              border-top: 1px solid rgba(217, 119, 6, 0.3);
              margin: 2em 0;
            }
            
            .chapter-html-content div {
              margin: 0.5em 0;
            }
          `}</style>
        </>
      );
    }

    if (format === 'markdown') {
      return (
        <div className="chapter-content prose prose-invert prose-amber max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p className="my-4 text-amber-100/80 leading-relaxed text-justify">
                  {children}
                </p>
              ),
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-amber-100 mt-8 mb-4">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-bold text-amber-100 mt-6 mb-3">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold text-amber-100 mt-4 mb-2">
                  {children}
                </h3>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-6 pl-6 border-l-4 border-amber-600/50 italic text-amber-200/90 text-lg leading-relaxed">
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => (
                <ul className="my-4 list-disc list-inside text-amber-100/80">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="my-4 list-decimal list-inside text-amber-100/80">
                  {children}
                </ol>
              ),
              code: ({ children }) => (
                <code className="px-2 py-1 bg-zinc-800 rounded text-amber-300 text-sm">
                  {children}
                </code>
              ),
              a: ({ href, children }) => (
                <a 
                  href={href} 
                  className="text-amber-400 hover:text-amber-300 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            }}
          >
            {activeChapter.content}
          </ReactMarkdown>
        </div>
      );
    }

    // Default: plaintext format
    console.log('[ChapterViewer] Using plaintext formatContent');
    return (
      <div className="chapter-content prose prose-invert prose-amber max-w-none">
        {formatContent(activeChapter.content)}
      </div>
    );
  };

  // Render Table of Contents component (only on first chapter/title page)
  const renderTableOfContents = () => {
    if (!isFirstChapter || chapters.length <= 1) return null;

    return (
      <div className="my-8 p-6 bg-zinc-800/50 border border-amber-900/30 rounded-lg">
        <h2 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-600" />
          Table of Contents
        </h2>
        <nav className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {chapters.map((chapter, index) => (
            <button
              key={chapter.id}
              onClick={() => {
                setActiveChapterId(chapter.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`text-left px-4 py-2 rounded-lg transition-colors ${
                chapter.id === activeChapterId
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                  : 'bg-zinc-900/50 text-amber-100/80 hover:bg-zinc-900/70 hover:text-amber-100 border border-transparent hover:border-amber-900/30'
              }`}
            >
              <span className="text-sm font-medium text-amber-100/50 mr-2">
                {index + 1}.
              </span>
              <span className="text-sm">
                {chapter.title.replace(/^Chapter\s+[IVX]+:\s*/i, '')}
              </span>
            </button>
          ))}
        </nav>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="h-full flex flex-col"
    >
      {/* Toolbar with zoom and fullscreen controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/80 border-b border-amber-900/20">
        <div className="flex items-center gap-2">
          <span className="text-amber-100/60 text-sm font-medium">
            {documentTitle || 'Document'}
          </span>
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

      {/* Desktop: Horizontal tabs */}
      <div className="hidden md:block border-b border-amber-900/20 bg-zinc-900/30 overflow-x-auto">
        <div className="flex gap-1 px-4 py-2 min-w-max">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => setActiveChapterId(chapter.id)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeChapterId === chapter.id
                  ? 'bg-zinc-900 text-amber-400 border-t border-x border-amber-900/20'
                  : 'text-amber-100/60 hover:text-amber-100 hover:bg-zinc-900/50'
              }`}
            >
              {chapter.title.replace(/^Chapter\s+[IVX]+:\s*/i, '')}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: Dropdown menu */}
      <div className="md:hidden border-b border-amber-900/20 bg-zinc-900/30">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-amber-100 hover:bg-zinc-900/50 transition-colors"
        >
          <span className="font-medium">
            {activeChapter?.title || 'Select Chapter'}
          </span>
          <ChevronDown 
            className={`w-5 h-5 transition-transform ${
              isMobileMenuOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>
        
        {isMobileMenuOpen && (
          <div className="border-t border-amber-900/20 max-h-[50vh] overflow-y-auto">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => {
                  setActiveChapterId(chapter.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                  activeChapterId === chapter.id
                    ? 'bg-amber-600/10 text-amber-400 border-l-4 border-amber-600'
                    : 'text-amber-100/70 hover:bg-zinc-900/50 hover:text-amber-100'
                }`}
              >
                {chapter.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chapter content */}
      <div className="flex-1 overflow-y-auto bg-zinc-900/50 border border-amber-900/20 rounded-b-lg">
        {activeChapter ? (
          <article 
            ref={contentRef}
            className="max-w-4xl mx-auto px-6 py-8"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease',
              width: `${100 / zoom}%`,
            }}
          >
            {/* Chapter title */}
            <header className="mb-8 pb-6 border-b border-amber-900/20">
              <h1 className="text-3xl font-bold text-amber-100 mb-2">
                {activeChapter.title}
              </h1>
              {documentTitle && (
                <p className="text-sm text-amber-100/50">
                  From <span className="italic">{documentTitle}</span>
                </p>
              )}
            </header>

            {/* Table of Contents - only show on first chapter/title page */}
            {renderTableOfContents()}

            {/* Chapter content with custom formatting */}
            {renderContent()}

            {/* Chapter navigation */}
            <footer className="mt-12 pt-6 border-t border-amber-900/20 flex justify-between items-center">
              <button
                onClick={() => {
                  const currentIndex = chapters.findIndex(ch => ch.id === activeChapterId);
                  if (currentIndex > 0) {
                    setActiveChapterId(chapters[currentIndex - 1].id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                disabled={chapters.findIndex(ch => ch.id === activeChapterId) === 0}
                className="px-4 py-2 text-sm font-medium text-amber-100/70 hover:text-amber-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              
              <span className="text-sm text-amber-100/50">
                {chapters.findIndex(ch => ch.id === activeChapterId) + 1} of {chapters.length}
              </span>
              
              <button
                onClick={() => {
                  const currentIndex = chapters.findIndex(ch => ch.id === activeChapterId);
                  if (currentIndex < chapters.length - 1) {
                    setActiveChapterId(chapters[currentIndex + 1].id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                disabled={chapters.findIndex(ch => ch.id === activeChapterId) === chapters.length - 1}
                className="px-4 py-2 text-sm font-medium text-amber-100/70 hover:text-amber-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </footer>
          </article>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-amber-100/50">No chapter selected</p>
          </div>
        )}
      </div>
    </div>
  );
}

