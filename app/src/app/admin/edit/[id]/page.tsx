'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2, Save, ArrowLeft, Image as ImageIcon, FileText, Tag, Eye, BookOpen, Sparkles, Crop, Edit, X } from 'lucide-react';
import Link from 'next/link';
import CoverCropModal from '@/components/CoverCropModal';

interface DocumentData {
  id: string;
  title: string;
  author: string | null;
  year: number | null;
  type: string | null;
  domain: string | null;
  tags: string[] | null;
  lenses: string[] | null;
  cover_image_url: string | null;
  short_summary: string | null;
  curator_note: string | null;
  metadata?: any;
}

export default function EditDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scrapingCover, setScrapingCover] = useState(false);
  const [generatingAICover, setGeneratingAICover] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [document, setDocument] = useState<DocumentData | null>(null);

  // Form state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState<number | null>(null);
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalAuthor, setOriginalAuthor] = useState('');
  const [originalYear, setOriginalYear] = useState<number | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverPosition, setCoverPosition] = useState('center');
  const [curatorNote, setCuratorNote] = useState('');
  const [shortSummary, setShortSummary] = useState('');
  const [domain, setDomain] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [lenses, setLenses] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [generatingCuratorNote, setGeneratingCuratorNote] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingDomain, setGeneratingDomain] = useState(false);

  const availableLenses = [
    'scientific',
    'psychological',
    'philosophical',
    'religious_spiritual',
    'historical_anthropological',
    'symbolic_occult',
    'mathematical'
  ];

  const documentId = params.id as string;

  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('texts')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Document not found');

      setDocument(data);
      const titleValue = data.title || '';
      const authorValue = data.author || '';
      const yearValue = data.year || null;
      setTitle(titleValue);
      setAuthor(authorValue);
      setYear(yearValue);
      setOriginalTitle(titleValue);
      setOriginalAuthor(authorValue);
      setOriginalYear(yearValue);
      setCoverImageUrl(data.cover_image_url || '');
      setCoverPosition(data.metadata?.cover_position || 'center');
      setCuratorNote(data.curator_note || '');
      setShortSummary(data.short_summary || '');
      setDomain(data.domain || '');
      setTags(data.tags || []);
      setLenses(data.lenses || []);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Update metadata with cover position
      const currentMetadata = document?.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        cover_position: coverPosition,
      };

      const { error: updateError } = await supabase
        .from('texts')
        .update({
          title: title.trim() || null,
          author: author.trim() || null,
          year: year || null,
          cover_image_url: coverImageUrl || null,
          curator_note: curatorNote || null,
          short_summary: shortSummary || null,
          domain: domain || null,
          tags,
          lenses,
          metadata: updatedMetadata,
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Update document state to reflect changes
      if (document) {
        const updatedTitle = title.trim() || '';
        const updatedAuthor = author.trim() || null;
        const updatedYear = year || null;
        setDocument({
          ...document,
          title: updatedTitle,
          author: updatedAuthor,
          year: updatedYear,
          cover_image_url: coverImageUrl || null,
          curator_note: curatorNote || null,
          short_summary: shortSummary || null,
          domain: domain || null,
          tags,
          lenses,
          metadata: updatedMetadata,
        });
        // Update original values if info was edited
        setOriginalTitle(updatedTitle);
        setOriginalAuthor(updatedAuthor || '');
        setOriginalYear(updatedYear);
        // Exit edit mode if it was active
        setIsEditingInfo(false);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating document:', err);
      setError(err instanceof Error ? err.message : 'Failed to update document');
    } finally {
      setSaving(false);
    }
  };

  const handleScrapeCover = async () => {
    if (!title.trim() || !author.trim()) {
      setError('Title and author are required to scrape cover');
      return;
    }

    try {
      setScrapingCover(true);
      setError(null);

      const response = await fetch('/api/covers/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textId: documentId,
          title: title.trim(),
          author: author.trim(),
        }),
      });

      // Check if response is ok before parsing
      if (!response.ok) {
        let errorMessage = 'Failed to scrape cover';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = `Error: ${response.status} ${response.statusText}`;
        }
        setError(errorMessage);
        return;
      }

      const result = await response.json();

      if (result.success) {
        // Update state immediately for instant UI feedback
        setCoverImageUrl(result.imageUrl);
        
        // Update document state to reflect the new cover
        if (document) {
          setDocument({
            ...document,
            cover_image_url: result.imageUrl,
          });
        }
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        
        // Optionally refresh document after a short delay to ensure database is updated
        // But don't wait for it since we've already updated the state
        setTimeout(async () => {
          await fetchDocument();
        }, 500);
      } else {
        setError(result.error || 'Failed to scrape cover from any source');
      }
    } catch (err) {
      console.error('Error scraping cover:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to scrape cover. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setScrapingCover(false);
    }
  };

  const handleGenerateAICover = async () => {
    if (!title.trim() || !author.trim() || !domain.trim()) {
      setError('Title, author, and domain are required to generate AI cover');
      return;
    }

    try {
      setGeneratingAICover(true);
      setError(null);

      const response = await fetch('/api/covers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textId: documentId,
          title: title.trim(),
          author: author.trim(),
          domain: domain.trim(),
          tags: tags.length > 0 ? tags : undefined,
        }),
      });

      // Check if response is ok before parsing
      if (!response.ok) {
        let errorMessage = 'Failed to generate AI cover';
        let errorDetails = null;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData;
          console.error('[Frontend] API error response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });
        } catch (parseError) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            errorMessage = `Error ${response.status}: ${errorText || response.statusText}`;
            console.error('[Frontend] Non-JSON error response:', errorText);
          } catch {
            errorMessage = `Error: ${response.status} ${response.statusText}`;
          }
        }
        console.error('[Frontend] Full error details:', {
          url: '/api/covers/generate',
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          errorDetails,
        });
        setError(errorMessage);
        return;
      }

      const result = await response.json();

      if (result.success) {
        // Update state immediately for instant UI feedback
        setCoverImageUrl(result.imageUrl);
        
        // Update document state to reflect the new cover
        if (document) {
          setDocument({
            ...document,
            cover_image_url: result.imageUrl,
          });
        }
        
        // Show warning if database update failed but cover was generated
        if (result.warning) {
          setError(result.warning);
          setTimeout(() => setError(null), 5000);
        } else {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        }
        
        // Optionally refresh document after a short delay to ensure database is updated
        // But don't wait for it since we've already updated the state
        setTimeout(async () => {
          await fetchDocument();
        }, 500);
      } else {
        setError(result.error || 'Failed to generate AI cover');
      }
    } catch (err) {
      console.error('[Frontend] Exception generating AI cover:', err);
      console.error('[Frontend] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      const errorMessage = err instanceof Error 
        ? `Network error: ${err.message}` 
        : 'Failed to generate AI cover. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setGeneratingAICover(false);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!documentId) return;

    setCropModalOpen(false);
    setUploadingCover(true);
    setError(null);

    try {
      // Convert blob to File
      const file = new File([croppedBlob], `cover-${documentId}-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      // Upload to Supabase Storage (similar to avatars)
      // Create covers bucket if it doesn't exist, or use a generic storage approach
      // For now, we'll convert to data URL and store that
      // Or we could upload to R2 via presigned URL

      // Convert to data URL (simple, works immediately)
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const dataUrl = reader.result as string;
          if (!dataUrl) {
            throw new Error('Failed to convert image to data URL');
          }

          setCoverImageUrl(dataUrl);
          
          // Save to database
          const { error: updateError } = await supabase
            .from('texts')
            .update({
              cover_image_url: dataUrl,
            })
            .eq('id', documentId);

          if (updateError) {
            throw updateError;
          }

          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
          await fetchDocument();
        } catch (err) {
          console.error('Error in crop upload callback:', err);
          setError('Failed to upload cropped cover. Please try again.');
          setUploadingCover(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read cropped image. Please try again.');
        setUploadingCover(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading cropped cover:', err);
      setError('Failed to upload cropped cover. Please try again.');
    } finally {
      setUploadingCover(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const toggleLens = (lens: string) => {
    if (lenses.includes(lens)) {
      setLenses(lenses.filter(l => l !== lens));
    } else {
      setLenses([...lenses, lens]);
    }
  };

  const handleStartEditInfo = () => {
    setIsEditingInfo(true);
  };

  const handleCancelEditInfo = () => {
    // Restore original values
    setTitle(originalTitle);
    setAuthor(originalAuthor);
    setYear(originalYear);
    setIsEditingInfo(false);
  };

  const handleSaveInfo = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { error: updateError } = await supabase
        .from('texts')
        .update({
          title: title.trim() || null,
          author: author.trim() || null,
          year: year || null,
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Update document state and original values
      if (document) {
        const updatedTitle = title.trim() || '';
        const updatedAuthor = author.trim() || null;
        const updatedYear = year || null;
        setDocument({
          ...document,
          title: updatedTitle,
          author: updatedAuthor,
          year: updatedYear,
        });
        setOriginalTitle(updatedTitle);
        setOriginalAuthor(updatedAuthor || '');
        setOriginalYear(updatedYear);
      }

      setIsEditingInfo(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating document info:', err);
      setError(err instanceof Error ? err.message : 'Failed to update document info');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-amber-50">
        <Header />
        <div className="max-w-4xl mx-auto px-6 py-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="min-h-screen bg-zinc-950 text-amber-50">
        <Header />
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400">{error}</p>
            <Link
              href="/admin"
              className="inline-block mt-4 text-amber-400 hover:text-amber-300"
            >
              Return to Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-zinc-950 text-amber-50">
          <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Link>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-amber-100 mb-2">Edit Document</h1>
              <p className="text-amber-100/60">
                Update library card display settings and metadata
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
            <p className="text-emerald-400">Document updated successfully!</p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Document Info - Title and Author */}
        {document && (
          <div className="mb-6 bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-amber-100">Document Information</h3>
              </div>
              {!isEditingInfo && (
                <button
                  onClick={handleStartEditInfo}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-amber-900/30 hover:border-amber-600/50 rounded-lg text-amber-100 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span className="text-sm">Edit</span>
                </button>
              )}
            </div>
            
            {isEditingInfo ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-amber-100/80 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter document title"
                    className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-amber-100/80 mb-2">
                      Author
                    </label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Enter author name"
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-amber-100/80 mb-2">
                      Year
                    </label>
                    <input
                      type="number"
                      value={year || ''}
                      onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="e.g., 1877"
                      min="0"
                      max="9999"
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCancelEditInfo}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-amber-900/30 hover:border-amber-600/50 rounded-lg text-amber-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSaveInfo}
                    disabled={!title.trim() || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Info</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <h2 className="text-xl font-semibold text-amber-100 mb-1">
                    {title || 'Untitled'}
                  </h2>
                  {(author || year) && (
                    <p className="text-sm text-amber-100/60">
                      {author && `by ${author}`}
                      {year && ` (${year})`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit Form */}
        <div className="space-y-6">
          {/* Cover Image URL */}
          <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-amber-100">Cover Image</h3>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-amber-100/80 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://example.com/cover-image.jpg"
                    className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={handleScrapeCover}
                    disabled={scrapingCover || generatingAICover || !author.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                    title={!author.trim() ? 'Author required to scrape cover' : 'Automatically find cover from Open Library, Internet Archive, or Google Books'}
                  >
                    {scrapingCover ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Scraping...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span className="hidden sm:inline">Scrape Cover</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleGenerateAICover}
                    disabled={generatingAICover || scrapingCover || !title.trim() || !author.trim() || !domain.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                    title={!domain.trim() ? 'Domain required to generate AI cover' : 'Generate a unique AI cover using getimg.ai'}
                  >
                    {generatingAICover ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span className="hidden sm:inline">Generate AI Cover</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-amber-100/50">
                Recommended: 400x600px or 2:3 aspect ratio. Click "Scrape Cover" to automatically find a cover from public sources, or "Generate AI Cover" to create a unique AI-generated cover.
              </p>
              {coverImageUrl && (
                <>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setCropModalOpen(true)}
                      disabled={uploadingCover}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-amber-900/30 hover:border-amber-600/50 rounded-lg text-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Crop and position the cover image"
                    >
                      <Crop className="w-4 h-4" />
                      <span className="text-sm">Crop Cover</span>
                    </button>
                    <div className="flex-1">
                      <label className="block text-sm text-amber-100/80 mb-2">
                        Image Position
                      </label>
                      <select
                        value={coverPosition}
                        onChange={(e) => setCoverPosition(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:border-amber-600/50"
                      >
                        <option value="center">Center</option>
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="top left">Top Left</option>
                        <option value="top right">Top Right</option>
                        <option value="bottom left">Bottom Left</option>
                        <option value="bottom right">Bottom Right</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-amber-100/50 mt-2">
                    Use "Crop Cover" to crop the image to perfect 2:3 ratio, or adjust position to show the best part of the image.
                  </p>
                  <div className="mt-3">
                    <p className="text-sm text-amber-100/80 mb-2">Preview:</p>
                    <div className="w-40 aspect-[2/3] bg-zinc-800 rounded-lg overflow-hidden">
                      <img
                        src={coverImageUrl}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                        style={{ objectPosition: coverPosition }}
                        onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.className = 'w-full h-full flex items-center justify-center bg-red-900/20';
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Curator Note */}
          <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-amber-100">Curator's Note</h3>
              </div>
              {!curatorNote && (
                <button
                  onClick={async () => {
                    setGeneratingCuratorNote(true);
                    try {
                      const response = await fetch('/api/documents/generate-metadata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          textId: documentId,
                          field: 'curatorNote',
                        }),
                      });
                      
                      if (!response.ok) {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || 'Failed to generate curator note');
                      }
                      
                      const data = await response.json();
                      setCuratorNote(data.text);
                    } catch (error: any) {
                      console.error('Error generating curator note:', error);
                      alert(`Failed to generate curator note: ${error.message}`);
                    } finally {
                      setGeneratingCuratorNote(false);
                    }
                  }}
                  disabled={generatingCuratorNote}
                  className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  title="Generate curator note using AI"
                >
                  {generatingCuratorNote ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate
                    </>
                  )}
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm text-amber-100/80 mb-2">
                Why is this document in our collection?
              </label>
              <textarea
                value={curatorNote}
                onChange={(e) => setCuratorNote(e.target.value)}
                placeholder="Explain the significance of this document and why it was chosen for the library..."
                rows={4}
                className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 resize-none"
              />
              <p className="text-xs text-amber-100/50 mt-1">
                This will appear on the library card in italics
              </p>
            </div>
          </div>

          {/* Short Summary */}
          <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-amber-100">Brief Summary</h3>
              </div>
              {!shortSummary && (
                <button
                  onClick={async () => {
                    setGeneratingSummary(true);
                    try {
                      const response = await fetch('/api/documents/generate-metadata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          textId: documentId,
                          field: 'shortSummary',
                        }),
                      });
                      
                      if (!response.ok) {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || 'Failed to generate summary');
                      }
                      
                      const data = await response.json();
                      setShortSummary(data.text);
                    } catch (error: any) {
                      console.error('Error generating summary:', error);
                      alert(`Failed to generate summary: ${error.message}`);
                    } finally {
                      setGeneratingSummary(false);
                    }
                  }}
                  disabled={generatingSummary}
                  className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  title="Generate brief summary using AI"
                >
                  {generatingSummary ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate
                    </>
                  )}
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm text-amber-100/80 mb-2">
                Short description (2-3 sentences)
              </label>
              <textarea
                value={shortSummary}
                onChange={(e) => setShortSummary(e.target.value)}
                placeholder="A concise summary of what this document covers..."
                rows={3}
                className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 resize-none"
              />
            </div>
          </div>

          {/* Domain */}
          <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-amber-100">Domain</h3>
              </div>
              {!domain && (
                <button
                  onClick={async () => {
                    setGeneratingDomain(true);
                    try {
                      const response = await fetch('/api/documents/generate-metadata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          textId: documentId,
                          field: 'domain',
                        }),
                      });
                      
                      if (!response.ok) {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || 'Failed to generate domain');
                      }
                      
                      const data = await response.json();
                      setDomain(data.text);
                    } catch (error: any) {
                      console.error('Error generating domain:', error);
                      alert(`Failed to generate domain: ${error.message}`);
                    } finally {
                      setGeneratingDomain(false);
                    }
                  }}
                  disabled={generatingDomain}
                  className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  title="Generate domain using AI"
                >
                  {generatingDomain ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate
                    </>
                  )}
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm text-amber-100/80 mb-2">
                Primary subject domain
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g., astrology, psychology, philosophy"
                className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50"
              />
            </div>
          </div>

          {/* Lenses */}
          <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-amber-100">Convergence Lenses</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableLenses.map((lens) => (
                <button
                  key={lens}
                  onClick={() => toggleLens(lens)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    lenses.includes(lens)
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-800 text-amber-100/70 hover:bg-zinc-700'
                  }`}
                >
                  {lens.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-amber-100">Tags</h3>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  placeholder="Add a tag..."
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50"
                />
                <button
                  onClick={addTag}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-amber-100 flex items-center gap-2"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-amber-100/50 hover:text-amber-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
            <Link
              href={`/library/${documentId}`}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              View Document
            </Link>
          </div>
        </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Cover Crop Modal */}
      {cropModalOpen && coverImageUrl && (
        <CoverCropModal
          imageSrc={coverImageUrl}
          onComplete={handleCropComplete}
          onCancel={() => setCropModalOpen(false)}
        />
      )}
    </div>
  );
}

