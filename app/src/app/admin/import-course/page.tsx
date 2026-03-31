'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookMarked,
  Upload,
  Eye,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  ClipboardPaste,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { parseCourseMarkdown, type ParsedCourse, type ParseResult } from '@/lib/parsers/course-markdown-parser';

type InputMethod = 'paste' | 'file';
type ImportStatus = 'idle' | 'previewing' | 'importing' | 'success' | 'error';

export default function ImportCoursePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputMethod, setInputMethod] = useState<InputMethod>('paste');
  const [markdownText, setMarkdownText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [publishImmediately, setPublishImmediately] = useState(false);

  // Success state
  const [importedCourse, setImportedCourse] = useState<{
    courseId: string;
    slug: string;
    title: string;
    weekCount: number;
    readingCount: number;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMarkdownText(ev.target?.result as string || '');
      setParseResult(null);
      setStatus('idle');
      setError(null);
    };
    reader.readAsText(file);
  };

  const handlePreview = () => {
    if (!markdownText.trim()) {
      setError('Please paste or upload markdown content first.');
      setStatus('error');
      return;
    }
    setStatus('previewing');
    setError(null);

    // Run parser client-side for immediate preview
    const result = parseCourseMarkdown(markdownText);
    setParseResult(result);

    if (!result.success) {
      setError(result.error);
      setStatus('error');
    } else {
      setStatus('idle');
    }
  };

  const handleImport = async () => {
    if (!parseResult?.success) return;

    setStatus('importing');
    setError(null);

    try {
      const response = await fetch('/api/admin/import-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdownContent: markdownText, publishImmediately }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError(`Slug conflict: a course with this slug already exists (${data.existingSlug}). Rename the course or update the existing one.`);
        } else {
          setError(data.error || 'Import failed');
        }
        setStatus('error');
        return;
      }

      setImportedCourse({
        courseId: data.courseId,
        slug: data.slug,
        title: data.title,
        weekCount: data.weekCount,
        readingCount: data.readingCount,
      });
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setStatus('error');
    }
  };

  const resetForm = () => {
    setMarkdownText('');
    setFileName(null);
    setParseResult(null);
    setStatus('idle');
    setError(null);
    setWarningsOpen(false);
    setPublishImmediately(false);
    setImportedCourse(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parsedCourse = parseResult?.success ? parseResult.course : null;
  const warnings = parseResult?.warnings || [];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-200">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-4xl mx-auto px-6">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <BookMarked className="w-8 h-8 text-amber-500" />
              <h1 className="text-3xl font-bold text-amber-100">Import Course</h1>
            </div>
            <p className="text-zinc-400">
              Parse and import a course from the standard markdown production template.
            </p>
          </div>

          {/* Success */}
          {status === 'success' && importedCourse && (
            <div className="mb-6 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-emerald-400 mb-3">Course Imported Successfully</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm text-zinc-300 mb-4 font-mono">
                    <div><span className="text-zinc-500">Title:</span> {importedCourse.title}</div>
                    <div><span className="text-zinc-500">Slug:</span> {importedCourse.slug}</div>
                    <div><span className="text-zinc-500">Weeks:</span> {importedCourse.weekCount}</div>
                    <div><span className="text-zinc-500">Readings:</span> {importedCourse.readingCount}</div>
                    <div><span className="text-zinc-500">Published:</span> {publishImmediately ? 'Yes' : 'Draft'}</div>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      href={`/courses/${importedCourse.slug}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Course
                    </Link>
                    <Link
                      href={`/admin/edit/${importedCourse.courseId}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-sm transition-colors"
                    >
                      Edit in Admin
                    </Link>
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 rounded-lg text-sm transition-colors"
                    >
                      Import Another
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Input Section */}
          {status !== 'success' && (
            <div className="space-y-6">

              {/* Input Method Toggle */}
              <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  Course Markdown Source
                </h2>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setInputMethod('paste')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-mono border rounded transition-colors ${
                      inputMethod === 'paste'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'border-white/10 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    Paste Text
                  </button>
                  <button
                    onClick={() => setInputMethod('file')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-mono border rounded transition-colors ${
                      inputMethod === 'file'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'border-white/10 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload File
                  </button>
                </div>

                {inputMethod === 'paste' ? (
                  <textarea
                    value={markdownText}
                    onChange={(e) => {
                      setMarkdownText(e.target.value);
                      setParseResult(null);
                      setStatus('idle');
                    }}
                    placeholder="# Course C02 – Symbol, Myth, and Psychotechnology&#10;## Production Draft v1.0&#10;&#10;## COURSE METADATA&#10;..."
                    rows={16}
                    className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-zinc-300 placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-amber-500/50 resize-y"
                  />
                ) : (
                  <div>
                    <label
                      htmlFor="md-file"
                      className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-amber-500/40 transition-colors bg-zinc-900/30"
                    >
                      <Upload className="w-8 h-8 text-zinc-600 mb-2" />
                      <span className="text-sm text-zinc-500">
                        {fileName ? (
                          <span className="text-amber-400 font-mono">{fileName}</span>
                        ) : (
                          'Click to upload .md or .txt file'
                        )}
                      </span>
                      <input
                        id="md-file"
                        ref={fileInputRef}
                        type="file"
                        accept=".md,.txt,.markdown"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    {markdownText && (
                      <p className="mt-2 text-xs text-zinc-500 font-mono">
                        {markdownText.length.toLocaleString()} characters loaded
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Button */}
              <div className="flex justify-end">
                <button
                  onClick={handlePreview}
                  disabled={!markdownText.trim() || status === 'importing'}
                  className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 text-zinc-200 rounded-lg text-sm font-mono transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview Parse
                </button>
              </div>

              {/* Parse Preview */}
              {parsedCourse && (
                <div className="bg-zinc-900/50 border border-amber-500/20 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-amber-100 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      Parse Preview
                    </h2>
                    {warnings.length > 0 && (
                      <button
                        onClick={() => setWarningsOpen(!warningsOpen)}
                        className="flex items-center gap-1.5 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded"
                      >
                        ⚠ {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
                        {warningsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {warningsOpen && warnings.length > 0 && (
                    <div className="px-6 py-3 bg-amber-500/5 border-b border-amber-500/10">
                      <ul className="space-y-1">
                        {warnings.map((w, i) => (
                          <li key={i} className="text-xs text-amber-300 font-mono">⚠ {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="p-6 space-y-5">
                    {/* Core metadata */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block mb-1">Title</span>
                        <span className="text-zinc-200 font-medium">{parsedCourse.title}</span>
                      </div>
                      <div>
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block mb-1">Slug</span>
                        <span className="text-zinc-400 font-mono text-xs">{parsedCourse.slug}</span>
                      </div>
                      <div>
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block mb-1">Arc</span>
                        <span className="text-zinc-300">{parsedCourse.content.arc} · {parsedCourse.content.arc_position}</span>
                      </div>
                      <div>
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block mb-1">Level / Type</span>
                        <span className="text-zinc-300 capitalize">{parsedCourse.level} / {parsedCourse.course_type}</span>
                      </div>
                      <div>
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block mb-1">Duration</span>
                        <span className="text-zinc-300">{parsedCourse.duration_weeks} weeks</span>
                      </div>
                      <div>
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block mb-1">Learning Outcomes</span>
                        <span className="text-zinc-300">{parsedCourse.learning_outcomes.length}</span>
                      </div>
                    </div>

                    {/* Core question */}
                    {parsedCourse.content.core_question && (
                      <div>
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block mb-1">Core Question</span>
                        <p className="text-sm text-amber-300/80 italic">{parsedCourse.content.core_question}</p>
                      </div>
                    )}

                    {/* Weeks table */}
                    <div>
                      <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block mb-2">
                        Weeks ({parsedCourse.content.weeks.length})
                      </span>
                      <div className="border border-white/5 rounded overflow-hidden">
                        <table className="w-full text-xs font-mono">
                          <thead>
                            <tr className="bg-zinc-900/60 text-zinc-500 border-b border-white/5">
                              <th className="text-left px-3 py-2 w-10">#</th>
                              <th className="text-left px-3 py-2">Title</th>
                              <th className="text-left px-3 py-2 w-20">Readings</th>
                              <th className="text-left px-3 py-2 w-20">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedCourse.content.weeks.map((week) => (
                              <tr key={week.week_number} className="border-b border-white/5 last:border-0">
                                <td className="px-3 py-2 text-zinc-600">{week.week_number}</td>
                                <td className="px-3 py-2 text-zinc-300">{week.title}</td>
                                <td className="px-3 py-2 text-zinc-500">{week.readings.length}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    week.week_type === 'capstone'
                                      ? 'bg-cyan-500/10 text-cyan-400'
                                      : 'bg-zinc-800 text-zinc-500'
                                  }`}>
                                    {week.week_type}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Key tensions */}
                    {parsedCourse.content.key_tensions.length > 0 && (
                      <div>
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block mb-2">
                          Key Tensions ({parsedCourse.content.key_tensions.length})
                        </span>
                        <ul className="space-y-1">
                          {parsedCourse.content.key_tensions.map((t, i) => (
                            <li key={i} className="text-xs text-zinc-400 font-mono">↔ {t.label}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Import controls */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={publishImmediately}
                          onChange={(e) => setPublishImmediately(e.target.checked)}
                          className="w-4 h-4 rounded border-amber-600/30 bg-zinc-800 text-amber-600 focus:ring-amber-600/50"
                        />
                        <div>
                          <span className="text-sm text-zinc-300">Publish immediately</span>
                          <span className="block text-xs text-zinc-500">Otherwise saved as draft</span>
                        </div>
                      </label>

                      <button
                        onClick={handleImport}
                        disabled={status === 'importing'}
                        className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                      >
                        {status === 'importing' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <BookMarked className="w-4 h-4" />
                            Confirm Import
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help */}
          <div className="mt-8 p-5 bg-zinc-900/30 border border-white/5 rounded-lg">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3 font-mono uppercase tracking-wide">Expected Format</h3>
            <ul className="space-y-1.5 text-xs text-zinc-500 font-mono">
              <li><span className="text-zinc-400"># Course CXX – Title</span> — document header</li>
              <li><span className="text-zinc-400">## COURSE METADATA</span> — pipe table with Field/Value rows</li>
              <li><span className="text-zinc-400">## COURSE PREMISE</span> — free text paragraph</li>
              <li><span className="text-zinc-400">## KEY TENSIONS (Course Spine)</span> — numbered list</li>
              <li><span className="text-zinc-400">## LEARNING OUTCOMES</span> — numbered list</li>
              <li><span className="text-zinc-400">## COMPLETION PATHWAYS</span> — bullet list with course codes</li>
              <li><span className="text-zinc-400">## WEEK N – Title</span> — one section per week (1–8+)</li>
            </ul>
          </div>

          <div className="mt-4">
            <Link href="/admin" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
              ← Back to Admin
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
