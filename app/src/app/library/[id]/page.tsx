'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Tag, 
  BookOpen, 
  Globe, 
  FileText,
  Loader2,
  AlertCircle,
  Highlighter
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import PDFViewer from '@/components/PDFViewer';
import BookmarkButton from '@/components/BookmarkButton';
import ReadingProgress, { useReadingProgressTracker } from '@/components/ReadingProgress';
import AnnotationPanel from '@/components/AnnotationPanel';
import CollectionsPanel from '@/components/CollectionsPanel';

interface TextDocument {
  id: string;
  title: string;
  author: string | null;
  year: number | null;
  type: string | null;
  domain: string | null;
  publisher: string | null;
  tags: string[] | null;
  summary: string | null;
  content: string | null;
  s3_key: string | null;
  file_size: number | null;
  status: string;
  created_at: string;
  metadata?: {
    standardizedId?: string;
    pageCount?: number;
    lineCount?: number;
    metadataFileKey?: string;
  };
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<TextDocument | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'viewer' | 'metadata' | 'content' | 'notes'>('viewer');
  const [numPages, setNumPages] = useState<number | null>(null);

  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Fetch document metadata
      const { data, error: fetchError } = await supabase
        .from('texts')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;
      
      if (!data) {
        setError('Document not found');
        return;
      }

      setDocument(data);

      // If document has S3 key, fetch the signed URL
      if (data.s3_key && data.status === 'ready') {
        const { data: urlData } = await supabase.storage
          .from('documents')
          .createSignedUrl(data.s3_key, 3600); // 1 hour expiry

        if (urlData?.signedUrl) {
          setPdfUrl(urlData.signedUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching document:', err);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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
              <BookmarkButton textId={documentId} size="md" showLabel />
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                document.status === 'ready' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : document.status === 'processing'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {document.status}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-amber-100 mb-2">
            {document.title}
          </h1>

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
              onClick={() => setActiveTab('content')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'content'
                  ? 'bg-zinc-900 text-amber-400 border-t border-x border-amber-900/20'
                  : 'text-amber-100/60 hover:text-amber-100'
              }`}
            >
              <Globe className="w-4 h-4 inline mr-2" />
              Content
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
                {pdfUrl && document.status === 'ready' ? (
                  <PDFViewer fileUrl={pdfUrl} fileName={document.title} />
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
                {document.type && (
                  <div>
                    <dt className="text-sm text-amber-100/60 mb-1">Type</dt>
                    <dd className="text-amber-100">{document.type.replace(/_/g, ' ')}</dd>
                  </div>
                )}
                {document.domain && (
                  <div>
                    <dt className="text-sm text-amber-100/60 flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4" />
                      Domain
                    </dt>
                    <dd className="text-amber-100 ml-6 capitalize">{document.domain}</dd>
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
                {document.metadata?.pageCount && (
                  <div>
                    <dt className="text-sm text-amber-100/60 mb-1">Pages</dt>
                    <dd className="text-amber-100">{document.metadata.pageCount} pages</dd>
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
                <div>
                  <dt className="text-sm text-amber-100/60 mb-1">Uploaded</dt>
                  <dd className="text-amber-100">{formatDate(document.created_at)}</dd>
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

            {activeTab === 'content' && (
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-amber-100 mb-4">Full Text Content</h2>
                {document.content ? (
                  <div className="prose prose-invert prose-amber max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-amber-100/80 leading-relaxed font-sans">
                      {document.content}
                    </pre>
                  </div>
                ) : (
                  <p className="text-amber-100/60 text-center py-8">
                    No extracted text content available for this document.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6">
                <AnnotationPanel textId={documentId} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <ReadingProgress textId={documentId} totalPages={numPages || undefined} />
            <CollectionsPanel textId={documentId} />
          </div>
        </div>
      </div>
    </div>
  );
}

