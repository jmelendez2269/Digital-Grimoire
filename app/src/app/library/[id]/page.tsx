'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Trash2
} from 'lucide-react';
import BookmarkButton from '@/components/BookmarkButton';
import CollectionsPanel from '@/components/CollectionsPanel';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TableOfContents, { TOCItem } from '@/components/TableOfContents';
import { formatFileSize, formatDate, cleanHtmlText } from '@/lib/utils/formatting';
import { extractPDFText } from '@/lib/utils/pdf-text-extractor';
import { useAuth } from '@/contexts/AuthContext';
import * as pdfjsLib from 'pdfjs-dist';

// Dynamically import PDFViewer to avoid SSR issues with canvas/pdfjs
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg select-none pointer-events-none">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
    </div>
  ),
});

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
    <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg select-none pointer-events-none">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
    </div>
  ),
});

// Dynamically import HTMLViewer for HTML files
const HTMLViewer = dynamic(() => import('@/components/HTMLViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg select-none pointer-events-none">
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

  // Dynamically load FloatingAISearch only when needed
  const [FloatingAISearchComponent, setFloatingAISearchComponent] = useState<React.ComponentType<{ defaultCollapsed?: boolean }> | null>(null);

  // TTS Controls Reference
  const audioControlsRef = useRef<any>(null);

  // Full text extracted from HTML for TTS matching
  const [htmlFullText, setHtmlFullText] = useState<string | null>(null);
  
  // Full text extracted from PDF for TTS matching
  const [pdfFullText, setPdfFullText] = useState<string | null>(null);
  
  // Handler to set HTML full text with logging
  const handleHtmlFullTextExtracted = useCallback((text: string) => {
    console.log('[DocumentDetailPage] ✅ HTML full text extracted callback called:', {
      length: text.length,
      preview: text.substring(0, 200),
      firstChars: text.substring(0, 50)
    });
    setHtmlFullText(text);
  }, []);
  
  // Debug: Log when htmlFullText changes
  useEffect(() => {
    if (htmlFullText) {
      console.log('[DocumentDetailPage] ✅ htmlFullText state updated:', {
        length: htmlFullText.length,
        preview: htmlFullText.substring(0, 200)
      });
    } else {
      console.log('[DocumentDetailPage] htmlFullText is null');
    }
  }, [htmlFullText]);

  useEffect(() => {
    // Load FloatingAISearch after component mounts to avoid webpack resolution issues
    import('@/components/FloatingAISearch').then((mod) => {
      setFloatingAISearchComponent(() => mod.default);
    }).catch((error) => {
      console.error('Failed to load FloatingAISearch:', error);
    });
  }, []);

  // Memoize full text and chapter offsets for TTS synchronization
  const { fullText, chapterOffsets } = useMemo(() => {
    if (!document?.metadata?.chapters || !document.metadata.isStructuredText) {
      // For HTML documents, use extracted full text if available, otherwise fallback to document.content
      // Check both source_format and htmlUrl to detect HTML documents
      // If htmlUrl exists and we don't have pdfUrl, it's likely an HTML document
      const isHtmlDocument = htmlUrl && !pdfUrl && !document?.metadata?.isStructuredText;
      
      console.log('[DocumentDetailPage] Computing fullText:', {
        isHtmlDocument,
        hasHtmlUrl: !!htmlUrl,
        sourceFormat: document?.source_format,
        isStructuredText: document?.metadata?.isStructuredText,
        hasPdfUrl: !!pdfUrl,
        hasHtmlFullText: !!htmlFullText,
        htmlFullTextLength: htmlFullText?.length || 0,
        documentContentLength: document?.content?.length || 0
      });
      
      // If we have htmlFullText, use it regardless of detection (it means HTMLViewer extracted it)
      if (htmlFullText && htmlFullText.length > 100) {
        // Use the full text extracted from rendered HTML
        console.log('[DocumentDetailPage] ✅ Using extracted HTML fullText for TTS:', {
          length: htmlFullText.length,
          preview: htmlFullText.substring(0, 200)
        });
        return {
          fullText: htmlFullText,
          chapterOffsets: {} as Record<string, number>
        };
      }
      
      // If we have pdfFullText, use it for PDF documents
      if (pdfFullText && pdfFullText.length > 100) {
        console.log('[DocumentDetailPage] ✅ Using extracted PDF fullText for TTS:', {
          length: pdfFullText.length,
          preview: pdfFullText.substring(0, 200)
        });
        return {
          fullText: pdfFullText,
          chapterOffsets: {} as Record<string, number>
        };
      }
      
      if (isHtmlDocument && !htmlFullText) {
        console.warn('[DocumentDetailPage] ⚠️ HTML document but htmlFullText not available yet, using document.content fallback');
      }
      
      // For non-structured text, clean HTML from document content before using for TTS
      const rawContent = document?.content || '';
      const cleanedContent = rawContent ? cleanHtmlText(rawContent) : '';
      
      // Debug: Log if we cleaned HTML
      if (rawContent && (rawContent.includes('<') || rawContent.includes('&'))) {
        console.log('[DocumentDetailPage] Cleaned fullText for TTS:', {
          originalLength: rawContent.length,
          cleanedLength: cleanedContent.length,
          hadHtml: true,
          originalPreview: rawContent.substring(0, 200),
          cleanedPreview: cleanedContent.substring(0, 200)
        });
      }
      
      return {
        fullText: cleanedContent,
        chapterOffsets: {} as Record<string, number>
      };
    }

    const separator = '\n\n';
    let currentOffset = 0;
    const offsets: Record<string, number> = {};
    const texts: string[] = [];

    // Helper to normalize text (must match ChapterViewer's logic)
    const normalizeContent = (content: string) => {
      let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const hasLineBreaks = normalized.includes('\n');

      // Apply paragraph splitting logic if needed (matching ChapterViewer)
      if (!hasLineBreaks && normalized.length > 100) {
        normalized = normalized.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');
        normalized = normalized.replace(/(\.|!|\?)\s*["']\s*([A-Z])/g, '$1"$2');
        normalized = normalized.replace(/\.\s+["']([^"']+)["']\s+([A-Z])/g, '.\n\n"$1"\n\n$2');

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

        if (!normalized.includes('\n\n')) {
          normalized = normalized.replace(/([.!?])\s+([^.!?]{200,})/g, (match, punct, text) => {
            if (text.length > 200) return punct + '\n\n' + text;
            return match;
          });
        }
      }
      return normalized;
    };

    // Process all chapters
    document.metadata.chapters.forEach(chapter => {
      offsets[chapter.id] = currentOffset;
      const normalized = normalizeContent(chapter.content);
      texts.push(normalized);
      currentOffset += normalized.length + separator.length;
    });

    return {
      fullText: texts.join(separator),
      chapterOffsets: offsets
    };
  }, [document, htmlUrl, htmlFullText, pdfFullText]);

  // Handle Audio Player Ready
  const handleAudioPlayerReady = useCallback((controls: any) => {
    console.log('[DocumentDetailPage] Audio Player ready');
    audioControlsRef.current = controls;
  }, []);

  // Find all occurrences of text in a string
  const findAllOccurrences = useCallback((text: string, searchText: string): number[] => {
    const indices: number[] = [];
    let index = text.indexOf(searchText);
    while (index !== -1) {
      indices.push(index);
      index = text.indexOf(searchText, index + 1);
    }
    return indices;
  }, []);

  // Handle paragraph click for TTS (Structured Text)
  const handleParagraphClick = useCallback((text: string) => {
    if (!audioControlsRef.current || !activeChapterId || !document?.metadata?.chapters || !fullText) {
      console.warn('[TTS] Missing required data for paragraph click', {
        hasControls: !!audioControlsRef.current,
        activeChapterId,
        hasChapters: !!document?.metadata?.chapters,
        hasFullText: !!fullText
      });
      return;
    }

    // Find the active chapter
    const activeChapter = document.metadata.chapters.find(c => c.id === activeChapterId);
    if (!activeChapter) {
      console.warn('[TTS] Active chapter not found', { activeChapterId });
      return;
    }

    // Calculate global position
    // 1. Get chapter start offset
    const chapterStart = chapterOffsets[activeChapterId] || 0;
    
    // 2. Get the chapter text from fullText (most reliable)
    const chapterKeys = Object.keys(chapterOffsets).sort((a, b) => chapterOffsets[a] - chapterOffsets[b]);
    const currentChapterIndex = chapterKeys.indexOf(activeChapterId);
    const nextChapterId = currentChapterIndex >= 0 && currentChapterIndex < chapterKeys.length - 1 
      ? chapterKeys[currentChapterIndex + 1] 
      : null;
    const chapterEnd = nextChapterId ? chapterOffsets[nextChapterId] : fullText.length;
    
    const chapterTextInFull = fullText.substring(chapterStart, chapterEnd);
    
    if (!chapterTextInFull) {
      console.warn('[TTS] Chapter text is empty', { chapterStart, chapterEnd, fullTextLength: fullText.length });
      return;
    }
    
    // 3. Normalize both texts for better matching
    const normalizeForSearch = (t: string) => t.replace(/\s+/g, ' ').trim();
    const normalizedClicked = normalizeForSearch(text);
    const normalizedChapter = normalizeForSearch(chapterTextInFull);
    
    // Try multiple search strategies
    let localIndex = -1;
    let searchMethod = '';
    
    // Strategy 1: Exact match in original text
    localIndex = chapterTextInFull.indexOf(text);
    if (localIndex !== -1) {
      searchMethod = 'exact';
    }
    
    // Strategy 2: Normalized match
    if (localIndex === -1) {
      localIndex = normalizedChapter.indexOf(normalizedClicked);
      if (localIndex !== -1) {
        searchMethod = 'normalized';
      }
    }
    
    // Strategy 3: First 50 chars match (for long paragraphs)
    if (localIndex === -1 && text.length > 50) {
      const shortText = text.substring(0, 50);
      localIndex = chapterTextInFull.indexOf(shortText);
      if (localIndex !== -1) {
        searchMethod = 'short-exact';
      }
    }
    
    // Strategy 4: First 50 chars normalized
    if (localIndex === -1 && normalizedClicked.length > 50) {
      const shortNormalized = normalizedClicked.substring(0, 50);
      localIndex = normalizedChapter.indexOf(shortNormalized);
      if (localIndex !== -1) {
        searchMethod = 'short-normalized';
      }
    }
    
    // Strategy 5: Fuzzy match with regex (handles whitespace variations)
    if (localIndex === -1) {
      try {
        // Escape special regex characters but allow flexible whitespace
        const escaped = normalizedClicked.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flexiblePattern = escaped.replace(/\s+/g, '\\s+');
        const regex = new RegExp(flexiblePattern, 'i');
        const match = chapterTextInFull.match(regex);
        if (match && match.index !== undefined) {
          localIndex = match.index;
          searchMethod = 'regex';
        }
      } catch (err) {
        console.warn('[TTS] Regex search failed:', err);
      }
    }

    // Strategy 6: Search in raw chapter content and estimate
    if (localIndex === -1) {
      const rawChapterContent = activeChapter.content;
      const rawIndex = rawChapterContent.indexOf(text);
      
      if (rawIndex !== -1) {
        // Found in raw content, estimate position in fullText chapter
        const ratio = rawIndex / Math.max(rawChapterContent.length, 1);
        localIndex = Math.floor(chapterTextInFull.length * ratio);
        searchMethod = 'estimated';
      }
    }

    if (localIndex !== -1 && localIndex >= 0) {
      const globalIndex = chapterStart + localIndex;
      console.log(`[TTS] Seek to ${globalIndex} (Chapter: ${activeChapterId}, Local: ${localIndex}, Method: ${searchMethod}, Text length: ${text.length})`);
      
      // Verify the position is within bounds
      if (globalIndex >= 0 && globalIndex < fullText.length) {
        audioControlsRef.current.startFromPosition(globalIndex);
      } else {
        console.warn('[TTS] Calculated position out of bounds', { globalIndex, fullTextLength: fullText.length });
      }
    } else {
      console.warn('[TTS] Could not find clicked text in active chapter content', { 
        text: text.substring(0, 50),
        chapterId: activeChapterId,
        chapterStart,
        chapterEnd,
        chapterTextLength: chapterTextInFull.length,
        normalizedClicked: normalizedClicked.substring(0, 50)
      });
      
      // Final Fallback: Search anywhere in fullText (might jump to another chapter if text is duplicate)
      const allGlobalOccurrences = findAllOccurrences(fullText, text);
      if (allGlobalOccurrences.length > 0) {
        // Try to find the one closest to the chapter start
        const closestIndex = allGlobalOccurrences.reduce((closest, current) => {
          const closestDist = Math.abs(closest - chapterStart);
          const currentDist = Math.abs(current - chapterStart);
          return currentDist < closestDist ? current : closest;
        });
        console.log(`[TTS] Global Fallback Seek to ${closestIndex} (${allGlobalOccurrences.length} occurrences found, using closest to chapter)`);
        
        if (closestIndex >= 0 && closestIndex < fullText.length) {
          audioControlsRef.current.startFromPosition(closestIndex);
        }
      }
    }
  }, [activeChapterId, chapterOffsets, document, fullText, findAllOccurrences]);

  // Handle block click for TTS (HTML)
  const handleBlockClick = useCallback((text: string) => {
    try {
      console.log('[TTS] handleBlockClick called:', {
        clickedTextLength: text.length,
        clickedTextPreview: text.substring(0, 100),
        fullTextLength: fullText?.length || 0,
        fullTextPreview: fullText?.substring(0, 200) || 'null',
        hasControls: !!audioControlsRef.current
      });
      
      if (!audioControlsRef.current || !fullText || typeof fullText !== 'string') {
        console.warn('[TTS] Missing required data for block click', {
          hasControls: !!audioControlsRef.current,
          hasFullText: !!fullText,
          fullTextType: typeof fullText,
          fullTextLength: fullText?.length || 0
        });
        return;
      }

      // Clean the clicked text to ensure no HTML artifacts
      const cleanedText = cleanHtmlText(text);
      
      // Debug: Log cleaning process
      if (text !== cleanedText) {
        console.log('[TTS] Cleaned clicked text:', {
          original: text.substring(0, 100),
          cleaned: cleanedText.substring(0, 100),
          hadHtml: text.includes('<') || text.includes('&')
        });
      }
      
      if (!cleanedText || typeof cleanedText !== 'string' || cleanedText.trim().length === 0) {
        console.warn('[TTS] Invalid text for block click after cleaning', { 
          originalText: text?.substring(0, 50),
          cleanedText: cleanedText?.substring(0, 50)
        });
        return;
      }
      
      // Also check if fullText has HTML and warn
      if (fullText.includes('<') || fullText.includes('&')) {
        console.warn('[TTS] WARNING: fullText contains HTML! This will be read aloud. FullText preview:', fullText.substring(0, 200));
      }

      // Normalize function for search (preserve punctuation but normalize whitespace)
      const normalizeForSearch = (t: string) => {
        return t
          .replace(/\s+/g, ' ') // Normalize all whitespace to single space
          .trim();
      };
      
      const normalizedClicked = normalizeForSearch(cleanedText);
      const normalizedFull = normalizeForSearch(fullText);

      // Try multiple search strategies
      let index = -1;
      let searchMethod = '';
      const searchResults: Array<{ method: string; index: number }> = [];

      // Strategy 1: Exact match in original text (using cleaned text)
      index = fullText.indexOf(cleanedText);
      if (index !== -1) {
        searchMethod = 'exact';
        searchResults.push({ method: 'exact', index });
      }

      // Strategy 2: Normalized match (case-insensitive, whitespace normalized)
      if (index === -1) {
        const clickedLower = cleanedText.toLowerCase().replace(/\s+/g, ' ').trim();
        const fullLower = fullText.toLowerCase().replace(/\s+/g, ' ').trim();
        index = fullLower.indexOf(clickedLower);
        if (index !== -1) {
          searchMethod = 'normalized';
          searchResults.push({ method: 'normalized', index });
        }
      }

      // Strategy 3: First 50 chars match (for long paragraphs)
      if (index === -1 && cleanedText.length > 50) {
        const shortText = cleanedText.substring(0, 50).trim();
        index = fullText.indexOf(shortText);
        if (index !== -1) {
          searchMethod = 'short-50-exact';
          searchResults.push({ method: 'short-50-exact', index });
        }
      }

      // Strategy 4: First 50 chars normalized
      if (index === -1 && normalizedClicked.length > 50) {
        const shortNormalized = normalizedClicked.substring(0, 50);
        index = normalizedFull.indexOf(shortNormalized);
        if (index !== -1) {
          searchMethod = 'short-50-normalized';
          searchResults.push({ method: 'short-50-normalized', index });
        }
      }

      // Strategy 5: First 30 chars match (very short match)
      if (index === -1 && cleanedText.length > 30) {
        const veryShortText = cleanedText.substring(0, 30).trim();
        index = fullText.indexOf(veryShortText);
        if (index !== -1) {
          searchMethod = 'short-30-exact';
          searchResults.push({ method: 'short-30-exact', index });
        }
      }

      // Strategy 6: Fuzzy match with regex (handles whitespace variations)
      if (index === -1) {
        try {
          // Escape special regex characters but allow flexible whitespace
          const escaped = cleanedText
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .substring(0, 100); // Limit length for performance
          const flexiblePattern = escaped.replace(/\s+/g, '\\s+');
          const regex = new RegExp(flexiblePattern, 'i');
          const match = fullText.match(regex);
          if (match && match.index !== undefined) {
            index = match.index;
            searchMethod = 'regex';
            searchResults.push({ method: 'regex', index });
          }
        } catch (regexError) {
          console.warn('[TTS] Regex search failed:', regexError);
        }
      }

      // Strategy 7: Find first few words
      if (index === -1) {
        const firstWords = cleanedText.split(/\s+/).slice(0, 5).join(' ').trim();
        if (firstWords.length > 10) {
          index = fullText.indexOf(firstWords);
          if (index !== -1) {
            searchMethod = 'first-words';
            searchResults.push({ method: 'first-words', index });
          }
        }
      }

      if (index !== -1 && index >= 0 && index < fullText.length) {
        console.log(`[TTS] ✅ Found position ${index} using method: ${searchMethod}`, {
          clickedTextPreview: cleanedText.substring(0, 80),
          foundTextPreview: fullText.substring(index, index + 80),
          allResults: searchResults
        });
        audioControlsRef.current.startFromPosition(index);
      } else {
        console.error('[TTS] ❌ Could not find clicked text in full content', { 
          clickedTextLength: cleanedText.length,
          clickedTextPreview: cleanedText.substring(0, 100),
          normalizedClickedPreview: normalizedClicked.substring(0, 100),
          fullTextLength: fullText.length,
          fullTextPreview: fullText.substring(0, 200),
          normalizedFullPreview: normalizedFull.substring(0, 200),
          searchResults
        });
      }
    } catch (error) {
      console.error('[TTS] Error in handleBlockClick:', error);
    }
  }, [fullText, audioControlsRef]);

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
      // Fallback: if source_format is null, check file extension from s3_key
      let isHtmlFile = data.source_format === 'html' && !data.metadata?.isStructuredText;
      
      // Fallback detection: check file extension when source_format is null
      if (!isHtmlFile && !data.source_format && data.s3_key && !data.metadata?.isStructuredText) {
        const filename = data.s3_key.split('/').pop() || '';
        const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
        isHtmlFile = fileExtension === 'html' || fileExtension === 'htm';
      }

      // If document has S3 key, fetch the signed URL from R2
      if (data.s3_key && data.status === 'ready') {
        if (isHtmlFile) {
          // For HTML files, use the proxy route to avoid CORS issues
          console.log('[DocumentDetailPage] Using HTML proxy route for document');
          setHtmlUrl(`/api/documents/${documentId}/html`);
        } else {
          // For PDF files, fetch the signed URL
          console.log('[DocumentDetailPage] Fetching signed URL for PDF document');
          try {
            const response = await fetch(`/api/documents/${documentId}`);

            if (response.ok) {
              const result = await response.json();
              console.log('[DocumentDetailPage] Signed URL received, length:', result.url?.length || 0);
              setPdfUrl(result.url);
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
      // Reset extracted text when document changes
      setHtmlFullText(null);
      setPdfFullText(null);
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
  const handleDocumentLoad = useCallback(async (totalPages: number) => {
    console.log('[DocumentDetailPage] PDF loaded with', totalPages, 'pages');
    setNumPages(totalPages);
    
    // Extract full text from PDF for TTS matching
    if (pdfUrl) {
      try {
        const extracted = await extractPDFText(pdfUrl);
        console.log('[DocumentDetailPage] ✅ PDF full text extracted:', {
          length: extracted.fullText.length,
          preview: extracted.fullText.substring(0, 200)
        });
        setPdfFullText(extracted.fullText);
      } catch (err) {
        console.error('[DocumentDetailPage] Error extracting PDF text:', err);
      }
    }
  }, [pdfUrl]);

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

      // HTML document - use proxy route if it's a relative URL (proxy), otherwise use direct URL
      if (htmlUrl && document.status === 'ready') {
        // If htmlUrl is a relative path (starts with /), it's our proxy route
        // Otherwise, it's a direct R2 URL (shouldn't happen anymore, but handle it)
        const tocUrl = htmlUrl.startsWith('/') ? htmlUrl : `/api/documents/${documentId}/html`;
        const items = await extractHTMLTOC(tocUrl);
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

  // Update active TOC item when chapter changes (for structured text)
  useEffect(() => {
    if (document?.metadata?.isStructuredText && activeChapterId) {
      setActiveTOCItemId(activeChapterId);
    }
  }, [activeChapterId, document]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center select-none pointer-events-none">
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
                  className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'viewer'
                    ? 'bg-zinc-900 text-amber-400 border-t border-x border-amber-900/20'
                    : 'text-amber-100/60 hover:text-amber-100'
                    }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Viewer
                </button>
                <button
                  onClick={() => setActiveTab('metadata')}
                  className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'metadata'
                    ? 'bg-zinc-900 text-amber-400 border-t border-x border-amber-900/20'
                    : 'text-amber-100/60 hover:text-amber-100'
                    }`}
                >
                  <BookOpen className="w-4 h-4 inline mr-2" />
                  Metadata
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'notes'
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
                        onParagraphClick={handleParagraphClick}
                      />
                    ) : htmlUrl && document.status === 'ready' ? (
                      <HTMLViewer
                        fileUrl={htmlUrl}
                        fileName={document.title}
                        onDocumentLoad={handleHTMLDocumentLoad}
                        onTextSelected={handleTextSelected}
                        onBlockClick={handleBlockClick}
                        onFullTextExtracted={handleHtmlFullTextExtracted}
                      />
                    ) : pdfUrl && document.status === 'ready' ? (
                      <PDFViewer
                        fileUrl={pdfUrl}
                        fileName={document.title}
                        onDocumentLoad={handleDocumentLoad}
                        onTextSelected={handleTextSelected}
                        annotations={annotations}
                        onAnnotationClick={handleAnnotationClick}
                        onTextClick={handleBlockClick}
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
              ocrText={fullText || (document.content ? cleanHtmlText(document.content) : '')}
              pdfUrl={pdfUrl}
              defaultCollapsed={true}
              onReady={handleAudioPlayerReady}
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

