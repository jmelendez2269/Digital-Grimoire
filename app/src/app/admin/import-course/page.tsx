'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputMethod, setInputMethod] = useState<InputMethod>('paste');
  const [markdownText, setMarkdownText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [publishImmediately, setPublishImmediately] = useState(false);

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
      setMarkdownText((ev.target?.result as string) || '');
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

  const parsedCourse: ParsedCourse | null = parseResult?.success ? parseResult.course : null;
  const warnings = parseResult?.warnings || [];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-200">
      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-3">
              <BookMarked className="h-8 w-8 text-amber-500" />
              <h1 className="text-3xl font-bold text-amber-100">Import Course</h1>
            </div>
            <p className="text-zinc-400">
              Parse and import a course from the standard markdown production template.
            </p>
          </div>

          {status === 'success' && importedCourse && (
            <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-400" />
                <div className="flex-1">
                  <h3 className="mb-3 text-lg font-semibold text-emerald-400">Course Imported Successfully</h3>
                  <div className="mb-4 grid grid-cols-2 gap-3 font-mono text-sm text-zinc-300">
                    <div><span className="text-zinc-500">Title:</span> {importedCourse.title}</div>
                    <div><span className="text-zinc-500">Slug:</span> {importedCourse.slug}</div>
                    <div><span className="text-zinc-500">Weeks:</span> {importedCourse.weekCount}</div>
                    <div><span className="text-zinc-500">Readings:</span> {importedCourse.readingCount}</div>
                    <div><span className="text-zinc-500">Published:</span> {publishImmediately ? 'Yes' : 'Draft'}</div>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      href={`/courses/${importedCourse.slug}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm text-white transition-colors hover:bg-amber-700"
                    >
                      <Eye className="h-4 w-4" />
                      View Course
                    </Link>
                    <Link
                      href={`/admin/edit/${importedCourse.courseId}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-100 transition-colors hover:bg-zinc-700"
                    >
                      Edit in Admin
                    </Link>
                    <button
                      onClick={resetForm}
                      className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800"
                    >
                      Import Another
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === 'error' && error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {status !== 'success' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-100">
                  <FileText className="h-5 w-5 text-amber-500" />
                  Course Markdown Source
                </h2>

                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => setInputMethod('paste')}
                    className={`flex items-center gap-2 rounded border px-4 py-2 font-mono text-sm transition-colors ${
                      inputMethod === 'paste'
                        ? 'border-amber-500/50 bg-amber-500/20 text-amber-400'
                        : 'border-white/10 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <ClipboardPaste className="h-4 w-4" />
                    Paste Text
                  </button>
                  <button
                    onClick={() => setInputMethod('file')}
                    className={`flex items-center gap-2 rounded border px-4 py-2 font-mono text-sm transition-colors ${
                      inputMethod === 'file'
                        ? 'border-amber-500/50 bg-amber-500/20 text-amber-400'
                        : 'border-white/10 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Upload className="h-4 w-4" />
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
                    className="w-full resize-y rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 font-mono text-sm text-zinc-300 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
                  />
                ) : (
                  <div>
                    <label
                      htmlFor="md-file"
                      className="flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-zinc-900/30 transition-colors hover:border-amber-500/40"
                    >
                      <Upload className="mb-2 h-8 w-8 text-zinc-600" />
                      <span className="text-sm text-zinc-500">
                        {fileName ? (
                          <span className="font-mono text-amber-400">{fileName}</span>
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
                      <p className="mt-2 font-mono text-xs text-zinc-500">
                        {markdownText.length.toLocaleString()} characters loaded
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handlePreview}
                  disabled={!markdownText.trim() || status === 'importing'}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800 px-5 py-2.5 font-mono text-sm text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Eye className="h-4 w-4" />
                  Preview Parse
                </button>
              </div>

              {parsedCourse && (
                <div className="overflow-hidden rounded-lg border border-amber-500/20 bg-zinc-900/50">
                  <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-100">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                      Parse Preview
                    </h2>
                    {warnings.length > 0 && (
                      <button
                        onClick={() => setWarningsOpen(!warningsOpen)}
                        className="flex items-center gap-1.5 rounded border border-amber-500/20 bg-amber-500/10 px-3 py-1 font-mono text-xs text-amber-400"
                      >
                        ⚠ {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
                        {warningsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>

                  {warningsOpen && warnings.length > 0 && (
                    <div className="border-b border-amber-500/10 bg-amber-500/5 px-6 py-3">
                      <ul className="space-y-1">
                        {warnings.map((warning, index) => (
                          <li key={index} className="font-mono text-xs text-amber-300">⚠ {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-5 p-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-500 font-mono">Title</span>
                        <span className="font-medium text-zinc-200">{parsedCourse.title}</span>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-500 font-mono">Slug</span>
                        <span className="font-mono text-xs text-zinc-400">{parsedCourse.slug}</span>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-500 font-mono">Arc</span>
                        <span className="text-zinc-300">{parsedCourse.content.arc} · {parsedCourse.content.arc_position}</span>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-500 font-mono">Level / Type</span>
                        <span className="capitalize text-zinc-300">{parsedCourse.level} / {parsedCourse.course_type}</span>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-500 font-mono">Duration</span>
                        <span className="text-zinc-300">{parsedCourse.duration_weeks} weeks</span>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-500 font-mono">Learning Outcomes</span>
                        <span className="text-zinc-300">{parsedCourse.learning_outcomes.length}</span>
                      </div>
                    </div>

                    {parsedCourse.content.core_question && (
                      <div>
                        <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-500 font-mono">Core Question</span>
                        <p className="text-sm italic text-amber-300/80">{parsedCourse.content.core_question}</p>
                      </div>
                    )}

                    <div>
                      <span className="mb-2 block text-xs uppercase tracking-wider text-zinc-500 font-mono">
                        Weeks ({parsedCourse.content.weeks.length})
                      </span>
                      <div className="overflow-hidden rounded border border-white/5">
                        <table className="w-full font-mono text-xs">
                          <thead>
                            <tr className="border-b border-white/5 bg-zinc-900/60 text-zinc-500">
                              <th className="w-10 px-3 py-2 text-left">#</th>
                              <th className="px-3 py-2 text-left">Title</th>
                              <th className="w-20 px-3 py-2 text-left">Readings</th>
                              <th className="w-20 px-3 py-2 text-left">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedCourse.content.weeks.map((week) => (
                              <tr key={week.week_number} className="border-b border-white/5 last:border-0">
                                <td className="px-3 py-2 text-zinc-600">{week.week_number}</td>
                                <td className="px-3 py-2 text-zinc-300">{week.title}</td>
                                <td className="px-3 py-2 text-zinc-500">{week.readings.length}</td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                                      week.week_type === 'capstone'
                                        ? 'bg-cyan-500/10 text-cyan-400'
                                        : 'bg-zinc-800 text-zinc-500'
                                    }`}
                                  >
                                    {week.week_type}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {parsedCourse.content.key_tensions.length > 0 && (
                      <div>
                        <span className="mb-2 block text-xs uppercase tracking-wider text-zinc-500 font-mono">
                          Key Tensions ({parsedCourse.content.key_tensions.length})
                        </span>
                        <ul className="space-y-1">
                          {parsedCourse.content.key_tensions.map((tension, index) => (
                            <li key={index} className="font-mono text-xs text-zinc-400">↔ {tension.label}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={publishImmediately}
                          onChange={(e) => setPublishImmediately(e.target.checked)}
                          className="h-4 w-4 rounded border-amber-600/30 bg-zinc-800 text-amber-600 focus:ring-amber-600/50"
                        />
                        <div>
                          <span className="text-sm text-zinc-300">Publish immediately</span>
                          <span className="block text-xs text-zinc-500">Otherwise saved as draft</span>
                        </div>
                      </label>

                      <button
                        onClick={handleImport}
                        disabled={status === 'importing'}
                        className="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {status === 'importing' ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <BookMarked className="h-4 w-4" />
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

          <div className="mt-8 rounded-lg border border-white/5 bg-zinc-900/30 p-5">
            <h3 className="mb-3 font-mono text-sm font-semibold uppercase tracking-wide text-zinc-400">Expected Format</h3>
            <ul className="space-y-1.5 font-mono text-xs text-zinc-500">
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
            <Link href="/admin" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
              ← Back to Admin
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
