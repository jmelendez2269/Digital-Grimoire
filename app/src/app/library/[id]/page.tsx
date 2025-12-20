'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Tag, 
  BookOpen, 
  FileText,
  Loader2,
  AlertCircle,
  Highlighter,
  Sparkles,
  RefreshCw,
  Edit,
  Trash2,
  Dice6
} from 'lucide-react';
import BookmarkButton from '@/components/BookmarkButton';
import CollectionsPanel from '@/components/CollectionsPanel';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TableOfContents, { TOCItem } from '@/components/TableOfContents';
import { formatFileSize, formatDate } from '@/lib/utils/formatting';
import { useAuth } from '@/contexts/AuthContext';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFViewerRef } from '@/components/PDFViewer';

// Dynamically import PDFViewer to avoid SSR issues with canvas/pdfjs
// Use a wrapper to ensure refs and callbacks work properly
const PDFViewerDynamic = dynamic(() => import('@/components/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
    </div>
  ),
});

// Store jumpToPage function globally to avoid ref issues with dynamic imports
let globalJumpToPageFn: ((pageNumber: number) => void) | null = null;

// Wrapper component to capture the jumpToPage function
// Use React.memo and useCallback to prevent infinite loops
const PDFViewer = React.memo((props: React.ComponentProps<typeof PDFViewerDynamic> & { onJumpToPageReady?: (fn: (pageNumber: number) => void) => void }) => {
  const handleJumpToPageReadyRef = React.useRef<(fn: (pageNumber: number) => void) => void | null>(null);
  
  // Store the callback in a ref to avoid recreating it
  if (!handleJumpToPageReadyRef.current) {
    handleJumpToPageReadyRef.current = (fn: (pageNumber: number) => void) => {
      // Only log once to avoid spam
      if (!globalJumpToPageFn) {
        console.log('[PDFViewer Wrapper] ✅ onJumpToPageReady callback received in wrapper!');
      }
      globalJumpToPageFn = fn;
      // Don't call props.onJumpToPageReady here - it causes infinite loops
      // The global function is enough, and the parent can access it via polling
    };
  }
  
  return <PDFViewerDynamic {...props} onJumpToPageReady={handleJumpToPageReadyRef.current} />;
});
PDFViewer.displayName = 'PDFViewer';

// Lazy load AnnotationPanel - only needed when user switches to notes tab
const AnnotationPanelLazy = dynamic(() => import('@/components/AnnotationPanel'), {
  ssr: false,
  loading: () => (
    <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6 animate-pulse">
      <div className="h-40 bg-zinc-800/50 rounded" />
    </div>
  ),
});

// Dynamically import AudioPlayer to avoid SSR issues with Web Speech API
const AudioPlayer = dynamic(() => import('@/components/AudioPlayer'), {
  ssr: false,
  loading: () => null,
});

// FloatingAISearch will be loaded conditionally in the component

// Dynamically import ChapterViewer for structured text documents
const ChapterViewer = dynamic(() => import('@/components/ChapterViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
    </div>
  ),
});

// Dynamically import HTMLViewer for HTML files
const HTMLViewer = dynamic(() => import('@/components/HTMLViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
    </div>
  ),
});

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.js';
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  volume?: 'science' | 'religion';
  titleGenerated?: boolean;
}

interface TextDocument {
  id: string;
  title: string;
  author: string | null;
  year: number | null;
  type: string | null;
  domain: string | null;
  publisher: string | null;
  tags: string[] | null;
  lenses: string[] | null;
  summary: string | null;
  curator_note: string | null;
  content: string | null;
  s3_key: string | null;
  file_size: number | null;
  source_format: string | null;
  status: string;
  created_at: string;
  metadata?: {
    standardizedId?: string;
    pageCount?: number;
    lineCount?: number;
    metadataFileKey?: string;
    isStructuredText?: boolean;
    chapters?: Chapter[];
    format?: 'html' | 'markdown' | 'plaintext';
    sourceUrl?: string;
  };
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = params.id as string;
  const { isAdmin } = useAuth();

  const [document, setDocument] = useState<TextDocument | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'viewer' | 'metadata' | 'notes'>('viewer');
  const [numPages, setNumPages] = useState<number | null>(null);
  
  // Text selection and annotations state
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [annotationsRefreshTrigger, setAnnotationsRefreshTrigger] = useState(0);

  // Table of Contents state
  const [tocItems, setTocItems] = useState<TOCItem[]>([]);
  const [activeTOCItemId, setActiveTOCItemId] = useState<string | undefined>(undefined);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  // Chunk navigation state
  const [targetChunkId, setTargetChunkId] = useState<string | null>(null);
  const [targetChunkIndex, setTargetChunkIndex] = useState<number | null>(null);
  const [chunkContent, setChunkContent] = useState<string | null>(null);
  const [reimporting, setReimporting] = useState(false);
  const [reimportError, setReimportError] = useState<string | null>(null);
  const [reimportSuccess, setReimportSuccess] = useState(false);
  
  // Ref for PDFViewer to enable programmatic navigation
  const pdfViewerRef = useRef<PDFViewerRef>(null);
  // Alternative: callback function for jumpToPage (works better with dynamic imports)
  const [jumpToPageFn, setJumpToPageFn] = useState<((pageNumber: number) => void) | null>(null);
  // Track when ref is available
  const [refReady, setRefReady] = useState(false);
  
  // Dynamically load FloatingAISearch only when needed
  const [FloatingAISearchComponent, setFloatingAISearchComponent] = useState<React.ComponentType<{ defaultCollapsed?: boolean }> | null>(null);
  
  useEffect(() => {
    // Load FloatingAISearch after component mounts to avoid webpack resolution issues
    import('@/components/FloatingAISearch').then((mod) => {
      setFloatingAISearchComponent(() => mod.default);
    }).catch((error) => {
      console.error('Failed to load FloatingAISearch:', error);
    });
  }, []);

  const fetchDocument = useCallback(async () => {
    if (!documentId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('[DocumentDetailPage] Fetching document via API:', documentId);

      const response = await fetch(`/api/texts/${documentId}`);
      
      if (!response.ok) {
        let errorMessage = 'Failed to load document';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        console.error('[DocumentDetailPage] API error:', errorMessage);
        setError(errorMessage);
        return;
      }

      const { document: data } = await response.json();
      
      if (!data) {
        setError('Document not found');
        return;
      }

      console.log('[DocumentDetailPage] Document loaded:', data.title, 'Status:', data.status, 'Has S3 key:', !!data.s3_key, 'Source format:', data.source_format);
      setDocument(data as TextDocument);

      // Check if this is an HTML file (not structured text, source_format is html)
      const isHtmlFile = data.source_format === 'html' && !data.metadata?.isStructuredText;

      // If document has S3 key, fetch the signed URL from R2
      if (data.s3_key && data.status === 'ready') {
        console.log('[DocumentDetailPage] Fetching signed URL for document', isHtmlFile ? '(HTML)' : '(PDF)');
        try {
          const response = await fetch(`/api/documents/${documentId}`);
          
          if (response.ok) {
            const result = await response.json();
            console.log('[DocumentDetailPage] Signed URL received, length:', result.url?.length || 0);
            if (isHtmlFile) {
              setHtmlUrl(result.url);
            } else {
              setPdfUrl(result.url);
            }
          } else {
            // Handle error response - try to parse as JSON, fallback to status text
            let errorMessage = 'Failed to load document from storage';
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
              console.error('[DocumentDetailPage] API error response:', errorData);
            } catch (e) {
              // Response wasn't JSON, use status text
              errorMessage = `${errorMessage}: ${response.statusText}`;
              console.error('[DocumentDetailPage] Non-JSON error response:', response.statusText);
            }
            setError(errorMessage);
          }
        } catch (fetchError) {
          console.error('[DocumentDetailPage] Error fetching document URL:', fetchError);
          setError('Failed to connect to document service. Please try again.');
        }
      } else {
        console.log('[DocumentDetailPage] Document not ready for viewing:', {
          hasS3Key: !!data.s3_key,
          status: data.status
        });
      }
    } catch (err) {
      console.error('[DocumentDetailPage] Error fetching document:', err);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (documentId) {
      fetchDocument();
      fetchAnnotations();
    }
  }, [documentId, fetchDocument]);

  // Handle chunk navigation from URL params
  useEffect(() => {
    const chunkParam = searchParams.get('chunk');
    const chunkIndexParam = searchParams.get('chunkIndex');
    
    if (chunkParam) {
      setTargetChunkId(chunkParam);
      fetchChunkContent(chunkParam);
    } else if (chunkIndexParam) {
      const index = parseInt(chunkIndexParam, 10);
      if (!isNaN(index)) {
        setTargetChunkIndex(index);
        // For structured text, try to match chunk index to chapter
        if (document?.metadata?.isStructuredText && document.metadata.chapters) {
          // Approximate: chunk index might correspond to chapter index
          // This is a heuristic - actual mapping would require chunk-to-chapter mapping
          const chapterIndex = Math.min(index, document.metadata.chapters.length - 1);
          if (chapterIndex >= 0) {
            setActiveChapterId(document.metadata.chapters[chapterIndex].id);
          }
        }
      }
    }
  }, [searchParams, document]);

  // Fetch chunk content by chunk ID
  const fetchChunkContent = useCallback(async (chunkId: string) => {
    try {
      const response = await fetch(`/api/convergence/chunk/${chunkId}`);
      if (response.ok) {
        const data = await response.json();
        setChunkContent(data.chunk.content);
        
        // For structured text, try to find matching chapter
        if (document?.metadata?.isStructuredText && document.metadata.chapters) {
          // Search for chunk content in chapters
          const matchingChapter = document.metadata.chapters.find(ch => 
            ch.content.includes(data.chunk.content.substring(0, 100))
          );
          if (matchingChapter) {
            setActiveChapterId(matchingChapter.id);
          } else if (data.chunk.chunk_index !== undefined) {
            // Fallback: use chunk index as chapter index approximation
            const chapterIndex = Math.min(data.chunk.chunk_index, document.metadata.chapters.length - 1);
            if (chapterIndex >= 0) {
              setActiveChapterId(document.metadata.chapters[chapterIndex].id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching chunk content:', error);
    }
  }, [document]);

  // Refetch annotations when trigger changes
  useEffect(() => {
    if (documentId && annotationsRefreshTrigger > 0) {
      fetchAnnotations();
    }
  }, [annotationsRefreshTrigger, documentId]);

  // Fetch annotations for this document
  const fetchAnnotations = async () => {
    if (!documentId) return;
    
    try {
      const response = await fetch(`/api/annotations?text_id=${documentId}`);
      if (response.ok) {
        const data = await response.json();
        setAnnotations(data.annotations || []);
      }
    } catch (error) {
      console.error('Error fetching annotations:', error);
    }
  };

  // Handle text selection from PDF viewer
  const handleTextSelected = useCallback((selection: { text: string; position: any }) => {
    console.log('[DocumentDetailPage] Text selected:', selection.text.substring(0, 50) + '...');
    setSelectedText(selection.text);
    setSelectedPosition(selection.position);
    
    // Auto-switch to notes tab when text is selected
    setActiveTab('notes');
  }, []);

  // Clear text selection
  const handleSelectionCleared = useCallback(() => {
    setSelectedText(null);
    setSelectedPosition(null);
  }, []);

  // Handle re-import content
  const handleReimport = async () => {
    if (!documentId || !document) return;
    
    setReimporting(true);
    setReimportError(null);
    setReimportSuccess(false);
    
    try {
      const response = await fetch('/api/reimport-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ textId: documentId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to re-import content');
      }
      
      const data = await response.json();
      setReimportSuccess(true);
      
      // Refresh the document to show new content
      setTimeout(() => {
        fetchDocument();
        setReimportSuccess(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error re-importing content:', error);
      setReimportError(error instanceof Error ? error.message : 'Failed to re-import content');
    } finally {
      setReimporting(false);
    }
  };

  // Handle delete document
  const handleDelete = async () => {
    if (!document || !documentId) return;
    
    if (!confirm(`Are you sure you want to permanently delete "${document.title}"?\n\nThis will remove the document and all associated data (bookmarks, annotations, etc.). This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/texts/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Document deleted successfully');
        // Redirect to library after deletion
        router.push('/library');
      } else {
        const data = await response.json();
        alert(`Failed to delete document: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('An error occurred while deleting the document');
    }
  };

  // Handle annotation added
  const handleAnnotationAdded = useCallback(() => {
    // Refresh annotations in PDF viewer
    setAnnotationsRefreshTrigger(prev => prev + 1);
  }, []);

  // Handle annotation click from PDF viewer
  const handleAnnotationClick = useCallback((annotation: any) => {
    console.log('[DocumentDetailPage] Annotation clicked:', annotation.id);
    // Switch to notes tab to show the annotation
    setActiveTab('notes');
  }, []);

  // Handle PDF document load - MEMOIZED to prevent re-creation
  const handleDocumentLoad = useCallback((totalPages: number) => {
    console.log('[DocumentDetailPage] PDF loaded with', totalPages, 'pages');
    setNumPages(totalPages);
    // Ensure jumpToPageFn is set up after document loads
    setTimeout(() => {
      console.log('[DocumentDetailPage] PDF Viewer Ref after load:', pdfViewerRef.current);
      if (pdfViewerRef.current && !jumpToPageFn) {
        console.log('[DocumentDetailPage] Setting up jumpToPageFn after document load');
        setJumpToPageFn((pageNumber: number) => {
          console.log('[DocumentDetailPage] jumpToPageFn called with page:', pageNumber);
          if (pdfViewerRef.current) {
            pdfViewerRef.current.jumpToPage(pageNumber);
          } else {
            console.error('[DocumentDetailPage] pdfViewerRef.current is null in jumpToPageFn');
          }
        });
      }
    }, 500);
  }, [jumpToPageFn]);

  // Handle HTML document load - wrapper for HTMLViewer (no parameters)
  // This handler matches HTMLViewer's expected signature: () => void
  const handleHTMLDocumentLoad = useCallback(() => {
    console.log('[DocumentDetailPage] HTML document loaded');
    // HTML doesn't have pages, so we set it to 1
    setNumPages(1);
  }, []);

  // Extract TOC from structured text (chapters)
  const extractStructuredTextTOC = useCallback((chapters: Chapter[]): TOCItem[] => {
    return chapters.map((chapter, index) => ({
      id: chapter.id,
      title: chapter.title.replace(/^Chapter\s+[IVX]+:\s*/i, '').trim() || `Chapter ${index + 1}`,
      level: 1,
      volume: chapter.volume, // Preserve volume information
      titleGenerated: chapter.titleGenerated, // Preserve AI generation flag
    }));
  }, []);

  // Generate a slug from text for use as ID (must match HTMLViewer's implementation)
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

  // Extract TOC from HTML content
  const extractHTMLTOC = useCallback(async (htmlUrl: string): Promise<TOCItem[]> => {
    try {
      const response = await fetch(htmlUrl);
      if (!response.ok) return [];
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const headings: TOCItem[] = [];
      const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const usedIds = new Set<string>();
      
      headingElements.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        let id = heading.id;
        
        // Generate ID if missing (using same logic as HTMLViewer)
        if (!id) {
          const text = heading.textContent?.trim() || '';
          id = generateSlug(text, index);
          
          // Ensure uniqueness by appending index if duplicate
          let uniqueId = id;
          let counter = 0;
          while (usedIds.has(uniqueId)) {
            counter++;
            uniqueId = `${id}-${counter}`;
          }
          id = uniqueId;
        } else {
          // Even if ID exists, ensure it's unique in our list
          let uniqueId = id;
          let counter = 0;
          while (usedIds.has(uniqueId)) {
            counter++;
            uniqueId = `${id}-${counter}`;
          }
          id = uniqueId;
        }
        
        usedIds.add(id);
        
        const title = heading.textContent?.trim() || `Heading ${index + 1}`;
        if (title) {
          headings.push({ id, title, level });
        }
      });
      
      return headings;
    } catch (error) {
      console.error('Error extracting HTML TOC:', error);
      return [];
    }
  }, []);

  // Extract TOC from PDF outline
  const extractPDFTOC = useCallback(async (pdfUrl: string): Promise<TOCItem[]> => {
    try {
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      const outline = await pdf.getOutline();
      
      if (!outline || outline.length === 0) {
        return [];
      }

      const flattenOutline = async (items: any[], level: number = 1): Promise<TOCItem[]> => {
        const result: TOCItem[] = [];
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          // Get page number from destination
          let pageNumber: number | undefined;
          
          if (item.dest) {
            try {
              if (typeof item.dest === 'string') {
                // Named destination - resolve it
                const dest = await pdf.getDestination(item.dest);
                if (dest && Array.isArray(dest) && dest[0]) {
                  const pageIndex = await pdf.getPageIndex(dest[0]);
                  pageNumber = pageIndex + 1;
                }
              } else if (Array.isArray(item.dest) && item.dest[0]) {
                // Direct page reference
                const pageIndex = await pdf.getPageIndex(item.dest[0]);
                pageNumber = pageIndex + 1;
              }
            } catch (err) {
              console.warn('Error resolving PDF destination:', err);
            }
          }

          const id = `pdf-outline-${result.length}`;
          const title = item.title || `Section ${result.length + 1}`;
          
          result.push({
            id,
            title,
            level,
            pageNumber,
          });

          // Recursively process sub-items
          if (item.items && item.items.length > 0) {
            const subItems = await flattenOutline(item.items, level + 1);
            result.push(...subItems);
          }
        }
        
        return result;
      };

      return await flattenOutline(outline);
    } catch (error) {
      console.error('Error extracting PDF outline:', error);
      return [];
    }
  }, []);

  // Extract TOC based on document type
  useEffect(() => {
    const extractTOC = async () => {
      if (!document) {
        setTocItems([]);
        return;
      }

      // Structured text - extract from chapters
      if (document.metadata?.isStructuredText && document.metadata.chapters) {
        const items = extractStructuredTextTOC(document.metadata.chapters);
        setTocItems(items);
        if (items.length > 0) {
          setActiveChapterId(items[0].id);
          setActiveTOCItemId(items[0].id);
        }
        return;
      }

      // HTML document
      if (htmlUrl && document.status === 'ready') {
        const items = await extractHTMLTOC(htmlUrl);
        setTocItems(items);
        return;
      }

      // PDF document
      if (pdfUrl && document.status === 'ready') {
        const items = await extractPDFTOC(pdfUrl);
        setTocItems(items);
        return;
      }

      // No TOC available
      setTocItems([]);
    };

    extractTOC();
  }, [document, htmlUrl, pdfUrl, extractStructuredTextTOC, extractHTMLTOC, extractPDFTOC]);

  // Handle TOC items update (when admin saves chapter names)
  const handleTOCItemsUpdate = useCallback((updatedItems: TOCItem[]) => {
    // Update the sidebar TOC items
    setTocItems(updatedItems);
    
    // If admin saved, update the document metadata to reflect saved changes
    if (isAdmin && document?.metadata?.isStructuredText && document.metadata.chapters) {
      const updatedChapters = document.metadata.chapters.map((chapter) => {
        const updatedItem = updatedItems.find(item => item.id === chapter.id);
        if (updatedItem) {
          return {
            ...chapter,
            title: updatedItem.title,
            volume: updatedItem.volume || chapter.volume,
            titleGenerated: updatedItem.titleGenerated || false,
          };
        }
        return chapter;
      });
      
      // Update document with saved chapter titles
      setDocument({
        ...document,
        metadata: {
          ...document.metadata,
          chapters: updatedChapters,
        },
      });
      
      // Refresh the document to get the latest from database (with a small delay to avoid race conditions)
      setTimeout(() => {
        fetchDocument();
      }, 500);
    }
  }, [isAdmin, document, fetchDocument]);

  // Handle TOC item click
  const handleTOCItemClick = useCallback((item: TOCItem) => {
    setActiveTOCItemId(item.id);

    // Structured text - switch chapter
    if (document?.metadata?.isStructuredText && document.metadata.chapters) {
      setActiveChapterId(item.id);
      return;
    }

    // HTML - scroll to heading
    if (htmlUrl && document?.status === 'ready') {
      // Ensure we're in the browser environment
      if (typeof window === 'undefined') return;
      
      // Try to find the element in the HTML viewer's content
      // The HTML viewer renders content in a div with class 'html-viewer-content'
      setTimeout(() => {
        // Use window.document to avoid conflict with the 'document' state variable
        const domDocument = window.document;
        if (!domDocument) return;
        
        // Find the viewer content container
        const viewerContent = domDocument.querySelector('.html-viewer-content');
        if (viewerContent) {
          // Use attribute selector to handle IDs that start with numbers
          // IDs starting with numbers are invalid CSS selectors (#2-...) but valid HTML IDs
          let element: Element | null = null;
          
          try {
            // Try attribute selector first (handles special characters and numbers)
            element = viewerContent.querySelector(`[id="${CSS.escape(item.id)}"]`);
          } catch (e) {
            // Fallback: iterate through all elements with IDs
            const allElements = viewerContent.querySelectorAll('[id]');
            for (let i = 0; i < allElements.length; i++) {
              if (allElements[i].id === item.id) {
                element = allElements[i];
                break;
              }
            }
          }
          
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else {
          // Fallback: try in the main document
          let element: Element | null = null;
          
          try {
            element = domDocument.querySelector(`[id="${CSS.escape(item.id)}"]`) || 
                      domDocument.getElementById(item.id);
          } catch (e) {
            // If CSS.escape fails, use getElementById which handles any ID
            element = domDocument.getElementById(item.id);
          }
          
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 100);
      return;
    }

    // PDF - navigate to page (if pageNumber available)
    if (pdfUrl && item.pageNumber && document?.status === 'ready') {
      // PDF viewer navigation will be handled separately
      // For now, we'll rely on the PDF viewer's built-in navigation
      console.log('[DocumentDetailPage] Navigate to PDF page', item.pageNumber);
    }
  }, [document, htmlUrl, pdfUrl]);

  // Handle random page navigation (defined after handleTOCItemClick)
  const handleRandomPage = useCallback(() => {
    // Visible debugging - alert to confirm function is called
    console.log('[RandomPage] ========== BUTTON CLICKED ==========');
    console.log('[RandomPage] Button clicked');
    console.log('[RandomPage] Document:', document?.title, 'Status:', document?.status);
    console.log('[RandomPage] PDF URL:', pdfUrl, 'Num Pages:', numPages);
    console.log('[RandomPage] HTML URL:', htmlUrl, 'TOC Items:', tocItems.length);
    console.log('[RandomPage] PDF Viewer Ref:', pdfViewerRef.current);
    console.log('[RandomPage] jumpToPageFn:', jumpToPageFn);
    
    // Also log to window for easier debugging
    if (typeof window !== 'undefined') {
      (window as any).lastRandomPageClick = {
        timestamp: new Date().toISOString(),
        document: document?.title,
        status: document?.status,
        pdfUrl: !!pdfUrl,
        numPages,
        htmlUrl: !!htmlUrl,
        tocItemsCount: tocItems.length,
        hasRef: !!pdfViewerRef.current,
        hasCallback: !!jumpToPageFn
      };
    }
    
    if (!document || document.status !== 'ready') {
      console.log('[RandomPage] Document not ready');
      alert(`Document not ready. Status: ${document?.status || 'null'}`);
      return;
    }

    // Structured text - random chapter
    if (document.metadata?.isStructuredText && document.metadata.chapters) {
      const chapters = document.metadata.chapters;
      if (chapters.length === 0) {
        console.log('[RandomPage] No chapters available');
        return;
      }
      
      const randomIndex = Math.floor(Math.random() * chapters.length);
      const randomChapter = chapters[randomIndex];
      console.log('[RandomPage] Jumping to random chapter:', randomChapter.title);
      setActiveChapterId(randomChapter.id);
      setActiveTOCItemId(randomChapter.id);
      return;
    }

    // HTML document - random heading
    if (htmlUrl && tocItems.length > 0) {
      const randomIndex = Math.floor(Math.random() * tocItems.length);
      const randomItem = tocItems[randomIndex];
      console.log('[RandomPage] Jumping to random heading:', randomItem.title);
      handleTOCItemClick(randomItem);
      return;
    }

    // PDF document - random page
    if (pdfUrl && numPages && numPages > 0) {
      const randomPage = Math.floor(Math.random() * numPages) + 1; // 1-indexed
      console.log('[RandomPage] ========== PDF NAVIGATION ==========');
      console.log('[RandomPage] Jumping to random page:', randomPage, 'of', numPages);
      console.log('[RandomPage] jumpToPageFn available:', !!jumpToPageFn);
      console.log('[RandomPage] pdfViewerRef.current available:', !!pdfViewerRef.current);
      
      // Try global function first (most reliable with dynamic imports)
      if (globalJumpToPageFn) {
        console.log('[RandomPage] Calling jumpToPage via global function with page:', randomPage);
        try {
          globalJumpToPageFn(randomPage);
          console.log('[RandomPage] ✅ Global jumpToPageFn called successfully - jumping to page', randomPage);
          return;
        } catch (error) {
          console.error('[RandomPage] ❌ Error calling global jumpToPageFn:', error);
        }
      }
      
      // Try callback function (fallback)
      if (jumpToPageFn) {
        console.log('[RandomPage] Calling jumpToPage via callback with page:', randomPage);
        try {
          jumpToPageFn(randomPage);
          console.log('[RandomPage] ✅ jumpToPageFn called successfully - jumping to page', randomPage);
          return;
        } catch (error) {
          console.error('[RandomPage] ❌ Error calling jumpToPageFn:', error);
        }
      }
      
      // Fallback to ref - try to access it directly
      if (pdfViewerRef.current) {
        console.log('[RandomPage] Calling jumpToPage on ref with page:', randomPage);
        try {
          pdfViewerRef.current.jumpToPage(randomPage);
          console.log('[RandomPage] ✅ Ref jumpToPage called successfully - jumping to page', randomPage);
          return; // Success, exit early
        } catch (error) {
          console.error('[RandomPage] ❌ Error calling ref jumpToPage:', error);
          // Don't alert here, try to set up the function and retry
        }
      }
      
      // Last resort: try to set up the function now and retry
      if (pdfViewerRef.current && !jumpToPageFn) {
        console.log('[RandomPage] Setting up jumpToPageFn on-the-fly from ref');
        const fn = (pageNumber: number) => {
          if (pdfViewerRef.current) {
            pdfViewerRef.current.jumpToPage(pageNumber);
          }
        };
        setJumpToPageFn(() => fn);
        // Retry immediately
        try {
          fn(randomPage);
          console.log('[RandomPage] ✅ Successfully jumped after on-the-fly setup - jumping to page', randomPage);
          return;
        } catch (error) {
          console.error('[RandomPage] ❌ Error even after on-the-fly setup:', error);
        }
      }
      
      // If we get here, nothing worked
      console.error('[RandomPage] ❌ PDF Viewer ref is null and callback is not set!');
      console.error('[RandomPage] Available state:', {
        pdfUrl: !!pdfUrl,
        numPages,
        jumpToPageFn: !!jumpToPageFn,
        pdfViewerRef: !!pdfViewerRef.current,
        refReady
      });
      // Only show alert if it's been a while - otherwise the polling will catch it
      if (refReady) {
        alert(`Cannot jump: PDF Viewer not ready. Please wait a moment and try again.`);
      } else {
        console.log('[RandomPage] Waiting for PDF Viewer to be ready...');
      }
      return;
    }
    
    console.log('[RandomPage] No navigation path matched');
  }, [document, htmlUrl, pdfUrl, numPages, tocItems, handleTOCItemClick, jumpToPageFn]);

  // Set up jumpToPageFn - check both global function and ref
  useEffect(() => {
    if (!pdfUrl || !numPages) return;
    
    const checkAndSetup = () => {
      // First check global function (most reliable)
      if (globalJumpToPageFn && !jumpToPageFn) {
        console.log('[DocumentDetailPage] ✅ Global jumpToPageFn is available, setting up state');
        setJumpToPageFn(() => globalJumpToPageFn!);
        setRefReady(true);
        return true;
      }
      
      // Fallback: check ref
      if (pdfViewerRef.current) {
        if (typeof pdfViewerRef.current.jumpToPage === 'function') {
          if (!jumpToPageFn) {
            console.log('[DocumentDetailPage] ✅ PDF Viewer ref is available with jumpToPage method, setting up jumpToPageFn');
            setJumpToPageFn((pageNumber: number) => {
              if (pdfViewerRef.current && typeof pdfViewerRef.current.jumpToPage === 'function') {
                pdfViewerRef.current.jumpToPage(pageNumber);
              }
            });
            setRefReady(true);
          }
          return true;
        }
      }
      return false;
    };
    
    // Try immediately
    if (checkAndSetup()) return;
    
    // Poll every 200ms for up to 10 seconds
    let attempts = 0;
    const maxAttempts = 50;
    const intervalId = setInterval(() => {
      attempts++;
      if (checkAndSetup() || attempts >= maxAttempts) {
        clearInterval(intervalId);
        if (attempts >= maxAttempts && !globalJumpToPageFn && !pdfViewerRef.current) {
          console.warn('[DocumentDetailPage] ⚠️ PDF Viewer not available after 10 seconds');
        }
      }
    }, 200);
    
    return () => clearInterval(intervalId);
  }, [pdfUrl, numPages, jumpToPageFn]);

  // Update active TOC item when chapter changes (for structured text)
  useEffect(() => {
    if (document?.metadata?.isStructuredText && activeChapterId) {
      setActiveTOCItemId(activeChapterId);
    }
  }, [activeChapterId, document]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
          <p className="text-amber-100/60">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="max-w-md text-center px-4">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-amber-100 mb-2">Error</h2>
          <p className="text-amber-100/60 mb-6">{error || 'Document not found'}</p>
          <Link
            href="/library"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-zinc-950 text-amber-50">
          {/* Header */}
          <div className="border-b border-amber-900/20 bg-zinc-900/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/library"
              className="flex items-center gap-2 text-amber-100/60 hover:text-amber-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Library</span>
            </Link>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link
                  href={`/admin/edit/${documentId}`}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600/20 text-blue-300 border border-blue-600/30 hover:bg-blue-600/30 hover:border-blue-600/50 transition-colors"
                  title="Edit document metadata and content"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Link>
              )}
              {/* Re-import button for structured text with source URL */}
              {isAdmin && document.metadata?.isStructuredText && (document.metadata as any)?.sourceUrl && (
                <button
                  onClick={handleReimport}
                  disabled={reimporting}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600/20 text-amber-300 border border-amber-600/30 hover:bg-amber-600/30 hover:border-amber-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Re-fetch content from source URL"
                >
                  <RefreshCw className={`w-4 h-4 ${reimporting ? 'animate-spin' : ''}`} />
                  {reimporting ? 'Re-importing...' : 'Re-import Content'}
                </button>
              )}
              <BookmarkButton textId={documentId} size="md" showLabel />
              {/* Random Page Button - only show when viewing a ready document */}
              {activeTab === 'viewer' && document?.status === 'ready' && (
                <button
                  onClick={handleRandomPage}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-600/20 text-purple-300 border border-purple-600/30 hover:bg-purple-600/30 hover:border-purple-600/50 transition-colors"
                  title="Jump to a random page/section"
                >
                  <Dice6 className="w-4 h-4" />
                  Random Page
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600/20 text-red-300 border border-red-600/30 hover:bg-red-600/30 hover:border-red-600/50 transition-colors"
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-amber-100 mb-2">
            {document.title}
          </h1>

          {/* Re-import status messages */}
          {reimportSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
              Content successfully re-imported! The page will refresh shortly.
            </div>
          )}
          {reimportError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {reimportError}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('viewer')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'viewer'
                  ? 'bg-zinc-900 text-amber-400 border-t border-x border-amber-900/20'
                  : 'text-amber-100/60 hover:text-amber-100'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Viewer
            </button>
            <button
              onClick={() => setActiveTab('metadata')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'metadata'
                  ? 'bg-zinc-900 text-amber-400 border-t border-x border-amber-900/20'
                  : 'text-amber-100/60 hover:text-amber-100'
              }`}
            >
              <BookOpen className="w-4 h-4 inline mr-2" />
              Metadata
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'notes'
                  ? 'bg-zinc-900 text-amber-400 border-t border-x border-amber-900/20'
                  : 'text-amber-100/60 hover:text-amber-100'
              }`}
            >
              <Highlighter className="w-4 h-4 inline mr-2" />
              Notes
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {activeTab === 'viewer' && (
              <div className="h-[calc(100vh-250px)]">
                {/* Chunk Navigation Indicator */}
                {(targetChunkId || targetChunkIndex !== null) && (
                  <div className="mb-4 p-3 bg-purple-900/20 border border-purple-600/30 rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-medium text-purple-300">
                            Viewing section from Convergence Machine
                          </span>
                        </div>
                        {targetChunkIndex !== null && (
                          <p className="text-xs text-amber-100/70">
                            Section {targetChunkIndex + 1}
                          </p>
                        )}
                        {chunkContent && (
                          <p className="text-xs text-amber-100/60 mt-2 line-clamp-2">
                            {chunkContent.substring(0, 150)}...
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setTargetChunkId(null);
                          setTargetChunkIndex(null);
                          setChunkContent(null);
                          router.replace(`/library/${documentId}`, { scroll: false });
                        }}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
                {/* Show ChapterViewer for structured text documents */}
                {document.metadata?.isStructuredText && document.metadata.chapters ? (
                  <ChapterViewer 
                    chapters={document.metadata.chapters}
                    documentTitle={document.title}
                    format={document.metadata.format || 'plaintext'}
                    onTextSelected={handleTextSelected}
                    annotations={annotations}
                    onAnnotationClick={handleAnnotationClick}
                    externalChapterId={activeChapterId}
                    onChapterChange={(chapterId) => {
                      setActiveChapterId(chapterId);
                    }}
                  />
                ) : htmlUrl && document.status === 'ready' ? (
                  <HTMLViewer 
                    fileUrl={htmlUrl} 
                    fileName={document.title}
                    onDocumentLoad={handleHTMLDocumentLoad}
                    onTextSelected={handleTextSelected}
                  />
                ) : pdfUrl && document.status === 'ready' ? (
                  <PDFViewer 
                    ref={pdfViewerRef}
                    fileUrl={pdfUrl} 
                    fileName={document.title}
                    onDocumentLoad={handleDocumentLoad}
                    onTextSelected={handleTextSelected}
                    annotations={annotations}
                    onAnnotationClick={handleAnnotationClick}
                    // Don't pass onJumpToPageReady - the wrapper handles it globally to avoid infinite loops
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg">
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-amber-100/20 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-amber-100 mb-2">
                        {document.status === 'processing' ? 'Document Processing' : 'Document Not Available'}
                      </h3>
                      <p className="text-sm text-amber-100/60">
                        {document.status === 'processing' 
                          ? 'This document is currently being processed. Please check back later.'
                          : 'The PDF viewer is not available for this document.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'metadata' && (
              <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                Document Information
              </h2>
              <dl className="space-y-3">
                {document.author && (
                  <div>
                    <dt className="text-sm text-amber-100/60 flex items-center gap-2 mb-1">
                      <User className="w-4 h-4" />
                      Author
                    </dt>
                    <dd className="text-amber-100 ml-6">{document.author}</dd>
                  </div>
                )}
                {document.year && (
                  <div>
                    <dt className="text-sm text-amber-100/60 flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" />
                      Year
                    </dt>
                    <dd className="text-amber-100 ml-6">{document.year}</dd>
                  </div>
                )}
                {document.publisher && (
                  <div>
                    <dt className="text-sm text-amber-100/60 mb-1">Publisher</dt>
                    <dd className="text-amber-100">{document.publisher}</dd>
                  </div>
                )}
                {document.domain && (
                  <div>
                    <dt className="text-sm text-amber-100/60 mb-1">Domain</dt>
                    <dd className="text-amber-100 capitalize">{document.domain}</dd>
                  </div>
                )}
                {document.lenses && document.lenses.length > 0 && (
                  <div>
                    <dt className="text-sm text-amber-100/60 mb-2">Lenses</dt>
                    <dd className="flex flex-wrap gap-2">
                      {document.lenses.map((lens, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-600/10 text-purple-400 rounded-full text-xs font-medium border border-purple-600/20"
                        >
                          {lens.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-600" />
                Tags & Details
              </h2>
              <dl className="space-y-3">
                {document.tags && document.tags.length > 0 && (
                  <div>
                    <dt className="text-sm text-amber-100/60 mb-2">Tags</dt>
                    <dd className="flex flex-wrap gap-2">
                      {document.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-amber-600/10 text-amber-400 rounded-full text-xs font-medium border border-amber-600/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {document.type && (
                  <div>
                    <dt className="text-sm text-amber-100/60 mb-1">Type</dt>
                    <dd className="text-amber-100">{document.type.replace(/_/g, ' ')}</dd>
                  </div>
                )}
                {document.metadata?.isStructuredText && document.metadata.chapters ? (
                  <div>
                    <dt className="text-sm text-amber-100/60 mb-1">Chapters</dt>
                    <dd className="text-amber-100">{document.metadata.chapters.length} chapters</dd>
                  </div>
                ) : (document.metadata?.pageCount || numPages) && (
                  <div>
                    <dt className="text-sm text-amber-100/60 mb-1">Pages</dt>
                    <dd className="text-amber-100">{document.metadata?.pageCount || numPages} pages</dd>
                  </div>
                )}
                {document.metadata?.lineCount && (
                  <div>
                    <dt className="text-sm text-amber-100/60 mb-1">Lines</dt>
                    <dd className="text-amber-100">{document.metadata.lineCount.toLocaleString()} lines</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-amber-100/60 mb-1">File Size</dt>
                  <dd className="text-amber-100">{formatFileSize(document.file_size)}</dd>
                </div>
              </dl>
            </div>

            {document.summary && (
              <div className="md:col-span-2 bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-amber-100 mb-4">Summary</h2>
                <p className="text-amber-100/80 leading-relaxed">{document.summary}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6">
                <AnnotationPanelLazy 
                  textId={documentId}
                  selectedText={selectedText}
                  selectedPosition={selectedPosition}
                  onSelectionCleared={handleSelectionCleared}
                  onAnnotationAdded={handleAnnotationAdded}
                  documentTitle={document.title}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Curator Note Section */}
            {document.curator_note && (
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  Curator Note
                </h3>
                <div className="max-h-64 overflow-y-auto pr-2">
                  <p className="text-sm text-amber-100/80 leading-relaxed">
                    {document.curator_note}
                  </p>
                </div>
              </div>
            )}

            {/* Table of Contents */}
            <TableOfContents
              items={tocItems}
              activeItemId={activeTOCItemId}
              onItemClick={handleTOCItemClick}
              chapters={document?.metadata?.isStructuredText ? document.metadata.chapters : undefined}
              documentTitle={document?.title}
              textId={documentId}
              isAdmin={isAdmin}
              onItemsUpdate={handleTOCItemsUpdate}
            />
            
            <CollectionsPanel textId={documentId} />
          </div>
        </div>
      </div>

      {/* Floating Audio Player for TTS */}
      {document && document.status === 'ready' && (
        <AudioPlayer
          documentId={documentId}
          ocrText={document.content}
          pdfUrl={pdfUrl}
          defaultCollapsed={true}
        />
      )}

      {/* Floating AI Search */}
      {FloatingAISearchComponent && (
        <FloatingAISearchComponent defaultCollapsed={true} />
      )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

