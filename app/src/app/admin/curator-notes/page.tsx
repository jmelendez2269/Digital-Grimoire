'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeft, Check, X, Loader2, Pencil, Save, RotateCcw, Search } from 'lucide-react';

type RelatedText = { id: string; title: string; resonance: string };

type DraftRow = {
  id: string;
  title: string;
  author: string | null;
  year: number | null;
  cover_image_url: string | null;
  lenses: string[] | null;
  curator_note: string | null;
  curator_note_draft: string | null;
  long_summary: string | null;
  long_summary_draft: string | null;
  related_texts: RelatedText[] | null;
  curator_note_status: string | null;
};

type ActionState = 'idle' | 'promoting' | 'rejecting' | 'saving';

export default function CuratorNotesReviewPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [actionState, setActionState] = useState<Record<string, ActionState>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/curator-notes', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      setDrafts(body.drafts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drafts;
    return drafts.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.author ?? '').toLowerCase().includes(q),
    );
  }, [drafts, search]);

  function setRowState(id: string, state: ActionState) {
    setActionState((prev) => ({ ...prev, [id]: state }));
  }

  async function promote(id: string) {
    setRowState(id, 'promoting');
    try {
      const res = await fetch(`/api/admin/curator-notes/${id}/promote`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Promote failed');
    } finally {
      setRowState(id, 'idle');
    }
  }

  async function reject(id: string) {
    setRowState(id, 'rejecting');
    try {
      const res = await fetch(`/api/admin/curator-notes/${id}/reject`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setRowState(id, 'idle');
    }
  }

  function startEdit(d: DraftRow) {
    setEditingId(d.id);
    setEditNote(d.curator_note_draft ?? '');
    setEditSummary(d.long_summary_draft ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditNote('');
    setEditSummary('');
  }

  async function saveEdit(id: string) {
    setRowState(id, 'saving');
    try {
      const res = await fetch(`/api/admin/curator-notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curator_note_draft: editNote,
          long_summary_draft: editSummary,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, curator_note_draft: editNote, long_summary_draft: editSummary }
            : d,
        ),
      );
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setRowState(id, 'idle');
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-amber-100">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-red-500 mb-4">Access Denied</h1>
            <p className="text-zinc-400">You do not have administrative privileges.</p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1 px-6 py-10 text-amber-50">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-amber-300 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to admin
          </Link>
          <div className="flex items-baseline justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-amber-100">Curator Note Review</h1>
              <p className="text-zinc-400 mt-1">
                Side-by-side comparison of live notes and pending drafts. Approve to promote
                the draft. Reject to discard. Edit to refine before approving.
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-md disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title or author"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-md pl-10 pr-4 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-700"
            />
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-md px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              {drafts.length === 0
                ? 'No drafts pending review.'
                : 'No drafts match your filter.'}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-zinc-500">
                {filtered.length} of {drafts.length} pending
              </div>
              {filtered.map((d) => {
                const isExpanded = expandedId === d.id;
                const isEditing = editingId === d.id;
                const state = actionState[d.id] ?? 'idle';
                const displayNote = isEditing ? editNote : d.curator_note_draft ?? '';
                const displaySummary = isEditing
                  ? editSummary
                  : d.long_summary_draft ?? '';
                return (
                  <div
                    key={d.id}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : d.id)}
                      className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-zinc-900/80 transition-colors"
                    >
                      {d.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.cover_image_url}
                          alt=""
                          className="w-10 h-14 object-cover rounded-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-zinc-800 rounded-sm flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-amber-100 truncate">{d.title}</div>
                        <div className="text-sm text-zinc-400 truncate">
                          {d.author ?? 'Unknown'}
                          {d.year ? ` · ${d.year}` : ''}
                          {d.lenses && d.lenses.length > 0
                            ? ` · ${d.lenses.join(', ')}`
                            : ''}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 flex-shrink-0">
                        {(d.curator_note_draft ?? '').length} ch
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-zinc-800 p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
                              Live (current)
                            </div>
                            <div className="bg-zinc-950/60 border border-zinc-800 rounded-md p-3 text-sm text-zinc-300 whitespace-pre-wrap min-h-[140px]">
                              {d.curator_note ?? '(none)'}
                            </div>
                            {d.long_summary && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
                                  Live long summary
                                </summary>
                                <div className="bg-zinc-950/40 border border-zinc-800 rounded-md p-3 text-xs text-zinc-400 whitespace-pre-wrap mt-1">
                                  {d.long_summary}
                                </div>
                              </details>
                            )}
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-amber-500 mb-2 flex items-center justify-between">
                              <span>Draft (proposed)</span>
                              <span className="text-zinc-500 normal-case tracking-normal">
                                {displayNote.length} chars
                              </span>
                            </div>
                            {isEditing ? (
                              <textarea
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                className="w-full bg-zinc-950/60 border border-amber-800 rounded-md p-3 text-sm text-amber-100 min-h-[140px] font-sans focus:outline-none focus:border-amber-600"
                                rows={6}
                              />
                            ) : (
                              <div className="bg-zinc-950/60 border border-amber-900/50 rounded-md p-3 text-sm text-amber-100 whitespace-pre-wrap min-h-[140px]">
                                {displayNote || '(empty)'}
                              </div>
                            )}
                            <details className="mt-2" open={isEditing}>
                              <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
                                Draft long summary ({displaySummary.length} chars)
                              </summary>
                              {isEditing ? (
                                <textarea
                                  value={editSummary}
                                  onChange={(e) => setEditSummary(e.target.value)}
                                  className="w-full bg-zinc-950/60 border border-amber-800 rounded-md p-3 text-xs text-amber-100/90 min-h-[120px] font-sans mt-1 focus:outline-none focus:border-amber-600"
                                  rows={6}
                                />
                              ) : (
                                <div className="bg-zinc-950/40 border border-amber-900/30 rounded-md p-3 text-xs text-amber-100/80 whitespace-pre-wrap mt-1">
                                  {displaySummary || '(empty)'}
                                </div>
                              )}
                            </details>
                          </div>
                        </div>

                        {d.related_texts && d.related_texts.length > 0 && (
                          <div>
                            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
                              Related texts
                            </div>
                            <div className="flex flex-col gap-2">
                              {d.related_texts.map((r) => (
                                <div
                                  key={r.id}
                                  className="bg-zinc-950/40 border border-zinc-800 rounded-md p-2 text-xs"
                                >
                                  <div className="text-amber-200 font-medium">{r.title}</div>
                                  <div className="text-zinc-400 mt-0.5">{r.resonance}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(d.id)}
                                disabled={state !== 'idle'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-700 hover:bg-amber-600 text-amber-50 rounded-md disabled:opacity-50"
                              >
                                {state === 'saving' ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                                Save edit
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={state !== 'idle'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-md"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => promote(d.id)}
                                disabled={state !== 'idle'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-700 hover:bg-emerald-600 text-emerald-50 rounded-md disabled:opacity-50"
                              >
                                {state === 'promoting' ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                                Approve & promote
                              </button>
                              <button
                                onClick={() => startEdit(d)}
                                disabled={state !== 'idle'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-md"
                              >
                                <Pencil className="w-4 h-4" /> Edit
                              </button>
                              <button
                                onClick={() => reject(d.id)}
                                disabled={state !== 'idle'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-900/60 hover:bg-red-800 text-red-100 rounded-md disabled:opacity-50 ml-auto"
                              >
                                {state === 'rejecting' ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
