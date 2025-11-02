'use client';

import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

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

  const activeChapter = chapters.find(ch => ch.id === activeChapterId);

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
    // Split into paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
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
          <p key={index} className="my-4 text-amber-100/80 leading-relaxed pl-4">
            {trimmed}
          </p>
        );
      }
      
      // Regular paragraph
      return (
        <p key={index} className="my-4 text-amber-100/80 leading-relaxed text-justify">
          {trimmed}
        </p>
      );
    });
  };

  // Render content based on format
  const renderContent = () => {
    if (!activeChapter) return null;

    if (format === 'html') {
      return (
        <div 
          className="chapter-content prose prose-invert prose-amber max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
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
    return (
      <div className="chapter-content prose prose-invert prose-amber max-w-none">
        {formatContent(activeChapter.content)}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
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
          <article className="max-w-4xl mx-auto px-6 py-8">
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

