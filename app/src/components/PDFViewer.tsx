'use client';

import { useState, useCallback, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { highlightPlugin, RenderHighlightContentProps, RenderHighlightTargetProps, RenderHighlightsProps } from '@react-pdf-viewer/highlight';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import type { HighlightArea } from '@react-pdf-viewer/highlight';
import { TextPosition } from '@/lib/types';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import '@react-pdf-viewer/page-navigation/lib/styles/index.css';

interface Annotation {
  id: string;
  quote: string;
  note: string | null;
  highlight_color: 'yellow' | 'green' | 'blue' | 'pink' | 'red' | 'purple' | 'orange';
  position: {
    pageIndex: number;
    rects: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      pageNumber: number;
    }>;
  };
}

// Highlight color mapping
const HIGHLIGHT_COLOR_MAP: Record<Annotation['highlight_color'], string> = {
  yellow: 'rgba(234, 179, 8, 0.3)',
  green: 'rgba(34, 197, 94, 0.3)',
  blue: 'rgba(59, 130, 246, 0.3)',
  pink: 'rgba(236, 72, 153, 0.3)',
  red: 'rgba(239, 68, 68, 0.3)',
  purple: 'rgba(168, 85, 247, 0.3)',
  orange: 'rgba(249, 115, 22, 0.3)',
};

// Extended HighlightArea with annotation ID
interface ExtendedHighlightArea extends HighlightArea {
  id: string;
}

interface PDFViewerProps {
  fileUrl: string;
  fileName?: string;
  onDocumentLoad?: (numPages: number) => void;
  onPageChange?: (currentPage: number) => void;
  onTextSelected?: (selection: { text: string; position: TextPosition }) => void;
  annotations?: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
  onJumpToPageReady?: (jumpToPageFn: (pageNumber: number) => void) => void;
}

export interface PDFViewerRef {
  jumpToPage: (pageNumber: number) => void;
  getCurrentPage: () => number;
  getTotalPages: () => number | null;
}

const PDFViewer = forwardRef<PDFViewerRef, PDFViewerProps>(({
  fileUrl,
  fileName,
  onDocumentLoad,
  onPageChange,
  onTextSelected,
  annotations = [],
  onAnnotationClick,
  onJumpToPageReady,
}, ref) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  // Convert annotations to highlight areas for rendering
  const convertToHighlightAreas = useCallback((): ExtendedHighlightArea[] => {
    return annotations.map((annotation) => ({
      id: annotation.id,
      pageIndex: annotation.position?.pageIndex || 0,
      height: annotation.position?.rects?.[0]?.height || 1,
      width: annotation.position?.rects?.[0]?.width || 10,
      left: annotation.position?.rects?.[0]?.x || 0,
      top: annotation.position?.rects?.[0]?.y || 0,
    }));
  }, [annotations]);

  // Render custom highlight content (tooltip on hover)
  const renderHighlightContent = useCallback((props: RenderHighlightContentProps) => {
    const areas = props.highlightAreas as ExtendedHighlightArea[];
    const annotation = annotations.find((a) => a.id === areas[0]?.id);
    
    return (
      <div
        style={{
          background: 'rgba(217, 119, 6, 0.2)',
          border: '1px solid rgb(217, 119, 6)',
          borderRadius: '4px',
          padding: '8px',
          position: 'absolute',
          left: `${props.highlightAreas[0]?.left}%`,
          top: `${props.highlightAreas[0]?.top + props.highlightAreas[0]?.height}%`,
          zIndex: 1,
          maxWidth: '300px',
        }}
      >
        {annotation?.note && (
          <div style={{ color: '#fef3c7', fontSize: '12px', marginBottom: '4px' }}>
            <strong>Note:</strong> {annotation.note}
          </div>
        )}
        <div style={{ color: '#fcd34d', fontSize: '11px', fontStyle: 'italic' }}>
          "{annotation?.quote?.substring(0, 100)}..."
        </div>
      </div>
    );
  }, [annotations]);

  // Render highlight target (the actual highlighted area)
  const renderHighlightTarget = useCallback((props: RenderHighlightTargetProps) => {
    const areas = props.highlightAreas as ExtendedHighlightArea[];
    const annotation = annotations.find((a) => a.id === areas[0]?.id);
    const highlightColor = annotation?.highlight_color ? HIGHLIGHT_COLOR_MAP[annotation.highlight_color] : 'rgba(251, 191, 36, 0.3)';
    
    return (
      <div
        style={{
          background: highlightColor,
          cursor: 'pointer',
          opacity: props.selectedText ? 0.5 : 1,
        }}
        onClick={() => {
          if (annotation && onAnnotationClick) {
            onAnnotationClick(annotation);
          }
        }}
      />
    );
  }, [annotations, onAnnotationClick]);

  // Render all highlights on the page
  const renderHighlights = useCallback((props: RenderHighlightsProps) => {
    return (
      <div>
        {convertToHighlightAreas()
          .filter((area) => area.pageIndex === props.pageIndex)
          .map((area, idx) => {
            const annotation = annotations.find((a) => a.id === area.id);
            const highlightColor = annotation?.highlight_color ? HIGHLIGHT_COLOR_MAP[annotation.highlight_color] : 'rgba(251, 191, 36, 0.3)';
            const borderColor = annotation?.highlight_color ? highlightColor.replace('0.3', '0.5') : 'rgba(217, 119, 6, 0.5)';
            
            return (
              <div
                key={idx}
                className="highlight-area"
                style={{
                  background: highlightColor,
                  border: `1px solid ${borderColor}`,
                  position: 'absolute',
                  left: `${area.left}%`,
                  top: `${area.top}%`,
                  height: `${area.height}%`,
                  width: `${area.width}%`,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (annotation && onAnnotationClick) {
                    onAnnotationClick(annotation);
                  }
                }}
              />
            );
          })}
      </div>
    );
  }, [annotations, convertToHighlightAreas, onAnnotationClick]);

  // Handle text selection in PDF
  const handleTextSelection = useCallback((data: { selectedText: string; pageIndex: number; rects: any[] }) => {
    if (!data || !data.selectedText) return;

    // Extract position data
    const position = {
      pageIndex: data.pageIndex,
      rects: data.rects,
    };

    // Call parent callback with selected text and position
    if (onTextSelected) {
      onTextSelected({
        text: data.selectedText,
        position,
      });
    }
  }, [onTextSelected]);

  // Configure highlight plugin
  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget,
    renderHighlightContent,
    renderHighlights,
  });

  const { jumpToHighlightArea } = highlightPluginInstance;

  // Configure page navigation plugin for programmatic navigation
  const pageNavigationPluginInstance = pageNavigationPlugin();
  const { jumpToPage: jumpToPagePlugin } = pageNavigationPluginInstance;

  // Create the jumpToPage wrapper function
  const jumpToPageWrapper = useCallback((pageNumber: number) => {
    // pageNumber is 1-indexed, but jumpToPagePlugin expects 0-indexed
    console.log('[PDFViewer] jumpToPage called with page:', pageNumber, 'totalPages:', totalPages);
    
    // Basic validation - but allow the plugin to handle edge cases
    if (pageNumber < 1) {
      console.warn('[PDFViewer] Page number must be >= 1, got:', pageNumber);
      return;
    }
    
    if (totalPages && pageNumber > totalPages) {
      console.warn('[PDFViewer] Page number exceeds total pages:', pageNumber, '>', totalPages);
      return;
    }
    
    try {
      const targetPage = pageNumber - 1; // Convert to 0-indexed
      console.log('[PDFViewer] Calling jumpToPagePlugin with 0-indexed page:', targetPage);
      jumpToPagePlugin(targetPage);
      console.log('[PDFViewer] Successfully called jumpToPagePlugin');
    } catch (error) {
      console.error('[PDFViewer] Error calling jumpToPagePlugin:', error);
    }
  }, [jumpToPagePlugin, totalPages]);

  // Store the latest jumpToPageWrapper in a ref to avoid dependency issues
  const jumpToPageWrapperRef = useRef(jumpToPageWrapper);
  useEffect(() => {
    jumpToPageWrapperRef.current = jumpToPageWrapper;
  }, [jumpToPageWrapper]);

  // Expose jumpToPage function via callback (works better with dynamic imports)
  // Only call once when onJumpToPageReady prop is first provided
  const callbackCalledRef = useRef(false);
  useEffect(() => {
    if (onJumpToPageReady && !callbackCalledRef.current) {
      console.log('[PDFViewer] ========== SETTING UP CALLBACK ==========');
      console.log('[PDFViewer] Setting up jumpToPage callback');
      try {
        // Use the ref to get the latest version without causing re-renders
        onJumpToPageReady((pageNumber: number) => {
          jumpToPageWrapperRef.current(pageNumber);
        });
        callbackCalledRef.current = true;
        console.log('[PDFViewer] ✅ Callback set successfully');
      } catch (error) {
        console.error('[PDFViewer] ❌ Error setting callback:', error);
      }
    } else if (!onJumpToPageReady) {
      console.log('[PDFViewer] onJumpToPageReady prop is not provided');
    }
  }, [onJumpToPageReady]); // Only depend on onJumpToPageReady prop

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    jumpToPage: jumpToPageWrapper,
    getCurrentPage: () => currentPage,
    getTotalPages: () => totalPages,
  }), [currentPage, totalPages, jumpToPageWrapper]);

  // Configure default layout plugin (toolbar with all features)
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      defaultTabs[0], // Thumbnails
      defaultTabs[1], // Bookmarks
    ],
    toolbarPlugin: {
      fullScreenPlugin: {
        onEnterFullScreen: (zoom) => {
          zoom(1.5);
        },
      },
    },
  });

  const handleDocumentLoad = useCallback((e: any) => {
    const numPages = e.doc.numPages;
    console.log('[PDFViewer] ========== DOCUMENT LOADED ==========');
    console.log('[PDFViewer] Document loaded with', numPages, 'pages');
    setTotalPages(numPages);
    
    // Don't re-call the callback here - the useEffect will handle it when totalPages changes
    // The callback function will automatically use the updated totalPages via the ref
    
    if (onDocumentLoad) {
      onDocumentLoad(numPages);
    }
  }, [onDocumentLoad]);

  const handlePageChange = useCallback((e: any) => {
    const newPage = e.currentPage + 1; // Convert from 0-indexed to 1-indexed
    setCurrentPage(newPage);
    
    if (onPageChange) {
      onPageChange(newPage);
    }
  }, [onPageChange]);

  const renderError = (error: any) => {
    console.error('Error loading PDF:', error);
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 h-full bg-zinc-900/50">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-amber-100 mb-2">Error Loading PDF</h3>
          <p className="text-sm text-amber-100/60 mb-4">
            Failed to load PDF document. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="pdf-viewer-container h-full w-full bg-zinc-900/50 border border-amber-900/20 rounded-lg overflow-hidden">
      <Worker workerUrl="/pdf-worker/pdf.worker.min.js">
        <div
          className="h-full"
          onMouseUp={() => {
            // Small delay to ensure selection is captured
            setTimeout(() => {
              const selection = window.getSelection();
              const selectedText = selection?.toString().trim();
              
              if (selectedText && selectedText.length > 0) {
                // Get selection range and coordinates
                const range = selection?.getRangeAt(0);
                if (range) {
                  const rects = range.getClientRects();
                  const firstRect = rects[0];
                  
                  if (firstRect) {
                    handleTextSelection({
                      selectedText,
                      pageIndex: currentPage - 1, // Convert to 0-indexed
                      rects: Array.from(rects).map((rect) => ({
                        x: rect.left,
                        y: rect.top,
                        width: rect.width,
                        height: rect.height,
                        pageNumber: currentPage,
                      })),
                    });
                  }
                }
              }
            }, 100);
          }}
        >
          <Viewer
            fileUrl={fileUrl}
            plugins={[defaultLayoutPluginInstance, highlightPluginInstance, pageNavigationPluginInstance]}
            onDocumentLoad={handleDocumentLoad}
            onPageChange={handlePageChange}
            renderError={renderError}
            theme={{
              theme: 'dark',
            }}
          />
        </div>
        </Worker>

      {/* Custom dark theme styles */}
      <style jsx global>{`
        /* Dark theme for PDF viewer */
        .rpv-core__viewer {
          background-color: rgba(24, 24, 27, 0.5) !important;
          width: 100% !important;
          height: 100% !important;
        }

        .rpv-core__inner-pages {
          background-color: transparent !important;
          width: 100% !important;
        }

        .rpv-core__page-layer {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3) !important;
        }

        /* Fix layout issues with page navigation plugin */
        .rpv-core__viewer .rpv-core__inner-pages {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }

        /* Toolbar styling */
        .rpv-default-layout__toolbar {
          background-color: rgba(24, 24, 27, 0.95) !important;
          border-bottom: 1px solid rgba(217, 119, 6, 0.2) !important;
        }

        .rpv-default-layout__sidebar {
          background-color: rgba(24, 24, 27, 0.95) !important;
          border-right: 1px solid rgba(217, 119, 6, 0.2) !important;
        }

        .rpv-default-layout__sidebar-tabs {
          background-color: rgba(24, 24, 27, 0.8) !important;
        }

        /* Button styling */
        .rpv-core__minimal-button {
          color: #fef3c7 !important;
          background-color: transparent !important;
        }

        .rpv-core__minimal-button:hover {
          background-color: rgba(217, 119, 6, 0.2) !important;
          color: #fbbf24 !important;
        }

        /* Highlight styling */
        .rpv-highlight__area {
          background-color: rgba(251, 191, 36, 0.3) !important;
          border: 1px solid rgba(217, 119, 6, 0.5) !important;
        }

        .rpv-highlight__area:hover {
          background-color: rgba(251, 191, 36, 0.5) !important;
        }

        /* Search result highlighting */
        .rpv-search__highlight {
          background-color: rgba(251, 191, 36, 0.4) !important;
        }

        /* Input fields */
        .rpv-core__textbox,
        .rpv-search__input {
          background-color: rgba(39, 39, 42, 0.8) !important;
          border: 1px solid rgba(217, 119, 6, 0.3) !important;
          color: #fef3c7 !important;
        }

        .rpv-core__textbox:focus,
        .rpv-search__input:focus {
          border-color: rgba(217, 119, 6, 0.6) !important;
          outline: none !important;
        }

        /* Thumbnails */
        .rpv-thumbnail__container {
          border: 2px solid transparent !important;
        }

        .rpv-thumbnail__container--selected {
          border-color: rgb(217, 119, 6) !important;
        }

        /* Scrollbar styling */
        .rpv-core__inner-pages::-webkit-scrollbar {
          width: 8px;
        }

        .rpv-core__inner-pages::-webkit-scrollbar-track {
          background: rgba(24, 24, 27, 0.5);
        }

        .rpv-core__inner-pages::-webkit-scrollbar-thumb {
          background: rgba(217, 119, 6, 0.3);
          border-radius: 4px;
        }

        .rpv-core__inner-pages::-webkit-scrollbar-thumb:hover {
          background: rgba(217, 119, 6, 0.5);
        }

        /* Text selection color */
        .rpv-core__text-layer::selection {
          background-color: rgba(251, 191, 36, 0.4) !important;
        }

        /* Tooltip/popover styling */
        .rpv-core__popover {
          background-color: rgba(24, 24, 27, 0.98) !important;
          border: 1px solid rgba(217, 119, 6, 0.3) !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5) !important;
        }

        .rpv-core__popover-body {
          color: #fef3c7 !important;
        }

        /* Menu items */
        .rpv-core__menu-item {
          color: #fef3c7 !important;
        }

        .rpv-core__menu-item:hover {
          background-color: rgba(217, 119, 6, 0.2) !important;
        }

        /* Separator */
        .rpv-core__separator {
          background-color: rgba(217, 119, 6, 0.2) !important;
        }
      `}</style>
    </div>
  );
});

PDFViewer.displayName = 'PDFViewer';

export default PDFViewer;
