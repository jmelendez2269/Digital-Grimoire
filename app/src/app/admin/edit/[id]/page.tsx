'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2, Save, ArrowLeft, Image as ImageIcon, FileText, Tag, Eye, BookOpen, Sparkles } from 'lucide-react';
import Link from 'next/link';

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
}

export default function EditDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scrapingCover, setScrapingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [document, setDocument] = useState<DocumentData | null>(null);

  // Form state
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [curatorNote, setCuratorNote] = useState('');
  const [shortSummary, setShortSummary] = useState('');
  const [domain, setDomain] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [lenses, setLenses] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

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
      setCoverImageUrl(data.cover_image_url || '');
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

      const { error: updateError } = await supabase
        .from('texts')
        .update({
          cover_image_url: coverImageUrl || null,
          curator_note: curatorNote || null,
          short_summary: shortSummary || null,
          domain: domain || null,
          tags,
          lenses,
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

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
    if (!document || !document.title || !document.author) {
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
          title: document.title,
          author: document.author,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCoverImageUrl(result.imageUrl);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        // Refresh document to get updated cover
        await fetchDocument();
      } else {
        setError(result.error || 'Failed to scrape cover from any source');
      }
    } catch (err) {
      console.error('Error scraping cover:', err);
      setError('Failed to scrape cover. Please try again.');
    } finally {
      setScrapingCover(false);
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
          <h1 className="text-3xl font-bold text-amber-100 mb-2">Edit Document</h1>
          <p className="text-amber-100/60">
            Update library card display settings and metadata
          </p>
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

        {/* Document Info */}
        {document && (
          <div className="mb-6 bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <BookOpen className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-amber-100 mb-1">
                  {document.title}
                </h2>
                {document.author && (
                  <p className="text-sm text-amber-100/60">
                    by {document.author} {document.year && `(${document.year})`}
                  </p>
                )}
              </div>
            </div>
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
                <div className="flex items-end">
                  <button
                    onClick={handleScrapeCover}
                    disabled={scrapingCover || !document?.author}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                    title={!document?.author ? 'Author required to scrape cover' : 'Automatically find cover from Open Library, Internet Archive, or Google Books'}
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
                </div>
              </div>
              <p className="text-xs text-amber-100/50">
                Recommended: 400x600px or 2:3 aspect ratio. Click "Scrape Cover" to automatically find a cover from public sources.
              </p>
              {coverImageUrl && (
                <div className="mt-3">
                  <p className="text-sm text-amber-100/80 mb-2">Preview:</p>
                  <div className="w-40 aspect-[2/3] bg-zinc-800 rounded-lg overflow-hidden">
                    <img
                      src={coverImageUrl}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.className = 'w-full h-full flex items-center justify-center bg-red-900/20';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Curator Note */}
          <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-amber-100">Curator's Note</h3>
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
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-amber-100">Brief Summary</h3>
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
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-amber-100">Domain</h3>
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
    </div>
  );
}

