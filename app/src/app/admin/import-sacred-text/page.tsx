'use client';

import { useState } from 'react';
import { 
  Globe, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  BookOpen,
  FileText,
  Eye,
  Link as LinkIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ParsePreview {
  title: string;
  author: string | null;
  year: number | null;
  chapterCount: number;
  totalLength: number;
}

type ImportStatus = 'idle' | 'validating' | 'parsing' | 'importing' | 'success' | 'error';

export default function ImportSacredTextPage() {
  const router = useRouter();
  
  // Form state
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'html' | 'markdown' | 'plaintext'>('html');
  const [useAI, setUseAI] = useState(true);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsePreview | null>(null);
  
  // Manual metadata overrides
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [publisher, setPublisher] = useState('');
  const [type, setType] = useState('book_esoteric');
  const [domain, setDomain] = useState('spirituality');
  const [tags, setTags] = useState('');
  const [lenses, setLenses] = useState('');
  const [summary, setSummary] = useState('');
  
  // Success state
  const [importedTextId, setImportedTextId] = useState<string | null>(null);
  const [aiEnhanced, setAiEnhanced] = useState(false);
  const [importWarning, setImportWarning] = useState<string | null>(null);

  const validateUrl = (urlString: string): boolean => {
    try {
      const parsedUrl = new URL(urlString);
      const hostname = parsedUrl.hostname.toLowerCase();
      return hostname.includes('sacred-texts.com');
    } catch {
      return false;
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[Import] Button clicked, URL:', url);
    
    // Reset state
    setError(null);
    setPreview(null);
    setImportedTextId(null);

    // Validate URL
    if (!url || url.trim() === '') {
      setError('Please enter a URL');
      setStatus('error');
      return;
    }

    // Check if URL is valid and from a supported domain
    let hostname = '';
    try {
      const parsedUrl = new URL(url.trim());
      hostname = parsedUrl.hostname.toLowerCase();
    } catch {
      setError('Please enter a valid URL (e.g., https://www.sacred-texts.com/...)');
      setStatus('error');
      return;
    }
    
    if (!validateUrl(url)) {
      // Provide helpful error message based on the domain
      if (hostname.includes('gutenberg.org')) {
        setError('Project Gutenberg is not supported via URL import. Please download the HTML file and use the Upload feature (Admin → Upload) to import Gutenberg texts.');
      } else if (hostname.includes('archive.org')) {
        setError('Internet Archive is not yet supported. Currently only supports: sacred-texts.com. Please use the Upload feature for texts from other sources.');
      } else {
        setError('Invalid URL. Currently only supports: sacred-texts.com. For other sources (Gutenberg, Archive.org), please use the Upload feature.');
      }
      setStatus('error');
      return;
    }

    try {
      setStatus('importing');
      console.log('[Import] Starting import process...');

      // Prepare metadata overrides
      const metadata: any = {};
      if (title.trim()) metadata.title = title.trim();
      if (author.trim()) metadata.author = author.trim();
      if (year) metadata.year = parseInt(year.toString());
      if (publisher.trim()) metadata.publisher = publisher.trim();
      if (type) metadata.type = type;
      if (domain) metadata.domain = domain;
      if (tags.trim()) metadata.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (lenses.trim()) metadata.lenses = lenses.split(',').map(l => l.trim()).filter(Boolean);
      if (summary.trim()) metadata.summary = summary.trim();

      // Call import API
      const response = await fetch('/api/import-sacred-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          format,
          useAI,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import text');
      }

      // Success!
      setStatus('success');
      setImportedTextId(data.textId);
      setAiEnhanced(data.aiEnhanced || false);
      setImportWarning(data.warning || null);
      setPreview({
        title: data.title,
        author: metadata.author || null,
        year: metadata.year || null,
        chapterCount: data.chapterCount,
        totalLength: data.totalLength,
      });

    } catch (err) {
      console.error('Import error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const resetForm = () => {
    setUrl('');
    setFormat('html');
    setUseAI(true);
    setStatus('idle');
    setError(null);
    setPreview(null);
    setImportedTextId(null);
    setAiEnhanced(false);
    setImportWarning(null);
    setTitle('');
    setAuthor('');
    setYear('');
    setPublisher('');
    setType('book_esoteric');
    setDomain('spirituality');
    setTags('');
    setLenses('');
    setSummary('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      
      <main className="flex-1">
        <div className="min-h-screen bg-zinc-950 text-amber-50 py-12">
          <div className="max-w-4xl mx-auto px-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Globe className="w-8 h-8 text-amber-600" />
                <h1 className="text-3xl font-bold text-amber-100">
                  Import Web Text
                </h1>
              </div>
              <p className="text-amber-100/60">
                Import texts from sacred-texts.com into your library
              </p>
            </div>

            {/* Success Message */}
            {status === 'success' && importedTextId && (
              <div className="mb-6 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                      Import Successful!
                    </h3>
                    {preview && (
                      <div className="text-sm text-amber-100/80 space-y-1 mb-4">
                        <p>Title: {preview.title}</p>
                        <p>Chapters: {preview.chapterCount}</p>
                        <p>Total Length: {preview.totalLength.toLocaleString()} characters</p>
                        {aiEnhanced && (
                          <p className="text-amber-300 flex items-center gap-1">
                            <span>✨</span> AI-enhanced metadata applied
                          </p>
                        )}
                      </div>
                    )}
                    {importWarning && (
                      <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-sm text-amber-300">
                        ⚠️ {importWarning}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <Link
                        href={`/library/${importedTextId}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View in Library
                      </Link>
                      <button
                        onClick={resetForm}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg transition-colors text-sm"
                      >
                        Import Another
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {status === 'error' && error && (
              <div className="mb-6 p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-400 mb-1">
                      Import Failed
                    </h3>
                    <p className="text-sm text-amber-100/80 mb-2">{error}</p>
                    {(error.includes('Gutenberg') || error.includes('Archive') || error.includes('not supported') || error.includes('Upload')) ? (
                      <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-200/90">
                        <strong>Tip:</strong> To import texts from other sources, go to{' '}
                        <Link href="/admin/upload" className="text-amber-400 hover:text-amber-300 underline">
                          Admin → Upload
                        </Link>
                        {' '}and upload the HTML, PDF, or image file directly.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Import Form */}
            <form 
              onSubmit={(e) => {
                console.log('[Import] Form onSubmit triggered');
                handleImport(e);
              }} 
              className="space-y-6"
              noValidate
            >
              {/* URL Input */}
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-amber-100 mb-4 flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-amber-600" />
                  Source URL
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="url" className="block text-sm font-medium text-amber-100/80 mb-2">
                      Source URL
                    </label>
                    <input
                      id="url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.sacred-texts.com/eso/kyb/index.htm"
                      className="w-full px-4 py-3 bg-zinc-800 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                      required
                      disabled={status === 'importing'}
                    />
                    <p className="mt-2 text-xs text-amber-100/50">
                      Enter a URL from sacred-texts.com (index pages or single pages)
                      <br />
                      <span className="text-amber-100/40">
                        Supported source: <strong>sacred-texts.com</strong> only. 
                        For other sources (Gutenberg, Archive.org), download the HTML file and use the Upload feature.
                      </span>
                    </p>
                  </div>

                  <div>
                    <label htmlFor="format" className="block text-sm font-medium text-amber-100/80 mb-2">
                      Content Format
                    </label>
                    <select
                      id="format"
                      value={format}
                      onChange={(e) => setFormat(e.target.value as 'html' | 'markdown' | 'plaintext')}
                      className="w-full px-4 py-3 bg-zinc-800 border border-amber-900/20 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                      disabled={status === 'importing'}
                    >
                      <option value="html">HTML (preserves formatting)</option>
                      <option value="markdown">Markdown (clean, editable)</option>
                      <option value="plaintext">Plain Text (smallest size)</option>
                    </select>
                    <p className="mt-2 text-xs text-amber-100/50">
                      {format === 'html' && 'Best for texts with complex formatting, tables, or special layout'}
                      {format === 'markdown' && 'Best for general texts and future manual editing'}
                      {format === 'plaintext' && 'Best for simple texts, poems, or scripture verses'}
                    </p>
                  </div>

                  {/* AI Toggle */}
                  <div className="mt-4">
                    <label className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-lg border border-amber-900/20 cursor-pointer hover:border-amber-600/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={useAI}
                        onChange={(e) => setUseAI(e.target.checked)}
                        disabled={status === 'importing'}
                        className="mt-1 w-4 h-4 rounded border-amber-600/30 bg-zinc-800 text-amber-600 focus:ring-2 focus:ring-amber-600/50 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-amber-100 font-medium">✨ AI-Enhanced Metadata</span>
                          <span className="text-xs text-amber-400/70 bg-amber-400/10 px-2 py-0.5 rounded">Recommended</span>
                        </div>
                        <p className="text-sm text-amber-100/60">
                          Automatically generate summaries, suggest lenses, and enhance tags using AI analysis. 
                          Adds ~10 seconds to import time.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Metadata Overrides */}
              <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-amber-100 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  Metadata (Optional Overrides)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-amber-100/80 mb-2">
                      Title
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Auto-detected from page"
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                      disabled={status === 'importing'}
                    />
                  </div>

                  <div>
                    <label htmlFor="author" className="block text-sm font-medium text-amber-100/80 mb-2">
                      Author
                    </label>
                    <input
                      id="author"
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Auto-detected from page"
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                      disabled={status === 'importing'}
                    />
                  </div>

                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-amber-100/80 mb-2">
                      Year
                    </label>
                    <input
                      id="year"
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="Auto-detected"
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                      disabled={status === 'importing'}
                    />
                  </div>

                  <div>
                    <label htmlFor="publisher" className="block text-sm font-medium text-amber-100/80 mb-2">
                      Publisher
                    </label>
                    <input
                      id="publisher"
                      type="text"
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                      disabled={status === 'importing'}
                    />
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-amber-100/80 mb-2">
                      Type
                    </label>
                    <select
                      id="type"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/20 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                      disabled={status === 'importing'}
                    >
                      <option value="book_esoteric">Book - Esoteric</option>
                      <option value="book_spiritual">Book - Spiritual</option>
                      <option value="book_psychology">Book - Psychology</option>
                      <option value="book_science">Book - Science</option>
                      <option value="article_scholarly">Article - Scholarly</option>
                      <option value="anthropology">Anthropology</option>
                      <option value="reference_table">Reference Table</option>
                      <option value="historical">Historical</option>
                      <option value="mythology">Mythology</option>
                      <option value="medical_overview">Medical Overview</option>
                      <option value="commentary">Commentary</option>
                      <option value="webpage">Webpage</option>
                      <option value="dictionary">Dictionary</option>
                      <option value="astrology">Astrology</option>
                      <option value="ritual_guide">Ritual Guide</option>
                      <option value="diagram">Diagram</option>
                      <option value="transcript">Transcript</option>
                      <option value="summary">Summary</option>
                      <option value="speculative">Speculative</option>
                      <option value="misc">Miscellaneous</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="domain" className="block text-sm font-medium text-amber-100/80 mb-2">
                      Domain
                    </label>
                    <select
                      id="domain"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/20 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                      disabled={status === 'importing'}
                    >
                      <option value="spirituality">Spirituality</option>
                      <option value="philosophy">Philosophy</option>
                      <option value="theology">Theology</option>
                      <option value="occultism">Occultism</option>
                      <option value="mysticism">Mysticism</option>
                      <option value="religion">Religion</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="tags" className="block text-sm font-medium text-amber-100/80 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      id="tags"
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g., hermeticism, alchemy, wisdom"
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                      disabled={status === 'importing'}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="lenses" className="block text-sm font-medium text-amber-100/80 mb-2">
                      Lenses (comma-separated)
                    </label>
                    <input
                      id="lenses"
                      type="text"
                      value={lenses}
                      onChange={(e) => setLenses(e.target.value)}
                      placeholder="e.g., hermetic_principles, metaphysics"
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                      disabled={status === 'importing'}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="summary" className="block text-sm font-medium text-amber-100/80 mb-2">
                      Summary
                    </label>
                    <textarea
                      id="summary"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Optional custom summary"
                      rows={3}
                      className="w-full px-4 py-2 bg-zinc-800 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50 resize-none"
                      disabled={status === 'importing'}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between">
                <Link
                  href="/admin"
                  className="text-amber-100/60 hover:text-amber-100 transition-colors"
                >
                  ← Back to Admin
                </Link>

                <button
                  type="submit"
                  disabled={status === 'importing' || !url || url.trim() === ''}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  aria-label={!url || url.trim() === '' ? 'Enter a URL to enable import' : 'Import text from sacred-texts.com'}
                >
                  {status === 'importing' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {useAI ? 'Importing and analyzing...' : 'Importing...'}
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Import Text
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Help Section */}
            <div className="mt-8 p-6 bg-zinc-900/30 border border-amber-900/10 rounded-lg">
              <h3 className="text-lg font-semibold text-amber-100 mb-3">
                How to Use
              </h3>
              <ul className="space-y-2 text-sm text-amber-100/70">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">1.</span>
                  <span>Find a text on <a href="https://www.sacred-texts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">sacred-texts.com</a></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">2.</span>
                  <span>Copy the URL (index page or single page)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">3.</span>
                  <span>Paste the URL above and select your preferred format</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">4.</span>
                  <span>Optionally override metadata fields (title, author, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">5.</span>
                  <span>Click Import Text and wait for the process to complete</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

