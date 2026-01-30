'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Calendar, User, Tag, Clock, Download, Loader2, AlertCircle, Music, ShoppingCart, ExternalLink } from 'lucide-react';
import BookmarkButton from '@/components/BookmarkButton';
import CollectionsPanel from '@/components/CollectionsPanel';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { formatDate } from '@/lib/utils/formatting';
import { generateTrackedLink } from '@/lib/utils/affiliate';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

// Dynamically import media viewers
const AudioViewer = dynamic(() => import('@/components/AudioViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg select-none pointer-events-none">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
    </div>
  ),
});

const VideoViewer = dynamic(() => import('@/components/VideoViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg select-none pointer-events-none">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
    </div>
  ),
});

const ImageViewer = dynamic(() => import('@/components/ImageViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg select-none pointer-events-none">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
    </div>
  ),
});

interface MediaDocument {
  id: string;
  title: string;
  author: string | null;
  year: number | null;
  media_type: 'audio' | 'video' | 'photo';
  duration: number | null;
  transcript: string | null;
  thumbnail_url: string | null;
  cover_image_url: string | null;
  domain: string | null;
  tags: string[] | null;
  lenses: string[] | null;
  summary: string | null;
  short_summary: string | null;
  long_summary: string | null;
  curator_note: string | null;
  s3_key: string | null;
  mime_type: string | null;
  file_size: number | null;
  status: string;
  created_at: string;
  metadata?: {
    transcriptSegments?: Array<{ start: number; end: number; text: string }>;
    exif?: Record<string, any>;
    format?: string;
    [key: string]: any;
  };
}

export default function MediaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const mediaId = params.id as string;

  const [media, setMedia] = useState<MediaDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  // Show "Coming Soon" message for non-admin users
  if (!authLoading && user && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
        <Header />
        <main className="flex-1">
          <div className="max-w-screen-2xl mx-auto px-4 py-8">
            <Link
              href="/library"
              className="inline-flex items-center gap-2 text-amber-100/60 hover:text-amber-400 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Library
            </Link>
            <div className="text-center py-16">
              <Music className="w-16 h-16 mx-auto mb-4 text-amber-100/20" />
              <h2 className="text-2xl font-medium text-amber-100 mb-4">
                Coming Soon
              </h2>
              <p className="text-lg text-amber-100/60 mb-6 max-w-2xl mx-auto">
                The Media Library is currently being prepared for launch. You'll soon be able to browse and explore our collection of audio, video, and photo content.
              </p>
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-6 max-w-2xl mx-auto">
                <p className="text-sm text-amber-300/80">
                  <strong className="block mb-2 text-amber-400">What to Expect:</strong>
                  Access to curated audio recordings, video content, and photo collections from our library. All media will be searchable and organized by domain, tags, and more.
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  useEffect(() => {
    if (!user || !mediaId) return;

    const fetchMedia = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch media document
        const response = await fetch(`/api/documents/${mediaId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch media');
        }

        const data = await response.json();
        setMedia(data);

        // Get signed URL for media file
        if (data.s3_key) {
          const urlResponse = await fetch(`/api/documents/${mediaId}`);
          if (urlResponse.ok) {
            const urlData = await urlResponse.json();
            setMediaUrl(urlData.url || `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${data.s3_key}`);
          } else {
            // Fallback to public URL
            setMediaUrl(`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${data.s3_key}`);
          }
        }
      } catch (err) {
        console.error('Error fetching media:', err);
        setError(err instanceof Error ? err.message : 'Failed to load media');
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [user, mediaId]);

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    if (!mediaUrl || !media) return;

    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${media.title}.${media.metadata?.format || 'mp3'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading media:', err);
      alert('Failed to download media');
    }
  };

  const handleBookmark = async (position: number) => {
    if (!media) return;

    try {
      const supabase = createClient();
      // Store bookmark position in localStorage for now
      // In production, save to database
      localStorage.setItem(`media-bookmark-${media.id}`, position.toString());
    } catch (err) {
      console.error('Error bookmarking position:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
        <Header />
        <main className="flex-1 flex items-center justify-center select-none pointer-events-none">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-amber-100 mb-2">Error Loading Media</h2>
            <p className="text-amber-100/60 mb-4">{error || 'Media not found'}</p>
            <Link
              href="/library/media"
              className="inline-block px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
            >
              Back to Media Library
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const transcriptSegments = media.metadata?.transcriptSegments || [];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="max-w-screen-2xl mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            href="/library/media"
            className="inline-flex items-center gap-2 text-amber-100/60 hover:text-amber-400 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Media Library
          </Link>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-amber-100 mb-2">{media.title}</h1>
                {media.author && (
                  <p className="text-amber-100/60 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {media.author}
                    {media.year && <span>({media.year})</span>}
                  </p>
                )}
              </div>
              <BookmarkButton textId={media.id} />
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-sm text-amber-100/60">
              {media.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(media.duration)}
                </div>
              )}
              {media.created_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(media.created_at)}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Media Player */}
            <div className="lg:col-span-2">
              <div className="h-[600px]">
                {media.media_type === 'audio' && mediaUrl && (
                  <AudioViewer
                    audioUrl={mediaUrl}
                    title={media.title}
                    transcript={media.transcript || undefined}
                    transcriptSegments={transcriptSegments}
                    onBookmark={handleBookmark}
                    onDownload={handleDownload}
                  />
                )}
                {media.media_type === 'video' && mediaUrl && (
                  <VideoViewer
                    videoUrl={mediaUrl}
                    title={media.title}
                    transcript={media.transcript || undefined}
                    transcriptSegments={transcriptSegments}
                    onBookmark={handleBookmark}
                    onDownload={handleDownload}
                  />
                )}
                {media.media_type === 'photo' && mediaUrl && (
                  <ImageViewer
                    imageUrl={mediaUrl}
                    title={media.title}
                    exif={media.metadata?.exif}
                    description={media.long_summary || media.summary || undefined}
                    onDownload={handleDownload}
                  />
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Buy on Amazon Section */}
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <h3 className="text-sm font-medium text-amber-100/60 mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-600" />
                  Support the Project
                </h3>
                <a
                  href={generateTrackedLink(media.title, media.author || undefined, 'Media_Sidebar')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg shadow-amber-900/20"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Buy on Amazon
                  <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                </a>
                <p className="text-[10px] text-amber-100/40 mt-3 text-center leading-tight">
                  As an Amazon Associate I earn from qualifying purchases.
                </p>
              </div>

              {/* Summary */}
              {media.long_summary && (
                <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-amber-100 mb-4">Summary</h3>
                  <p className="text-sm text-amber-100/80 leading-relaxed">{media.long_summary}</p>
                </div>
              )}

              {/* Curator Note */}
              {media.curator_note && (
                <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-amber-100 mb-4">Curator Note</h3>
                  <p className="text-sm text-amber-100/80 leading-relaxed">{media.curator_note}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-amber-100 mb-4">Details</h3>
                <div className="space-y-3 text-sm">
                  {media.domain && (
                    <div>
                      <span className="text-amber-100/60">Domain:</span>
                      <span className="ml-2 text-amber-100">{media.domain}</span>
                    </div>
                  )}
                  {media.metadata?.format && (
                    <div>
                      <span className="text-amber-100/60">Format:</span>
                      <span className="ml-2 text-amber-100">{media.metadata.format}</span>
                    </div>
                  )}
                  {media.file_size && (
                    <div>
                      <span className="text-amber-100/60">File Size:</span>
                      <span className="ml-2 text-amber-100">
                        {(media.file_size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {media.tags && media.tags.length > 0 && (
                <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {media.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-zinc-800/50 border border-amber-900/30 rounded text-xs text-amber-100/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Collections */}
              <CollectionsPanel textId={media.id} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

