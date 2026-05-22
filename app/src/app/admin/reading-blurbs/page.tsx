'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeft, Check, X, Loader2, Pencil, Save, RotateCcw, Search, ExternalLink } from 'lucide-react';

type DraftRow = {
  reading_id: string;
  course_slug: string;
  week_number: number;
  text_title: string;
  blurb_live: string | null;
  blurb_draft: string | null;
  status: string | null;
  reviewed_at: string | null;
  updated_at: string | null;
  // Enriched by the API from courses.content so reviewers have context.
  course_title?: string | null;
  week_title?: string | null;
  week_core_question?: string | null;
  week_key_tension?: string | null;
  reading_author?: string | null;
  reading_section?: string | null;
  selection_rationale?: string | null;
  keystone_reference?: string | null;
  keystone_description?: string | null;
  passage_reference?: string | null;
  passage_description?: string | null;
  // The week's coursework — what the digest must enable.
  lens_exercise_prompt?: string | null;
  lens_exercise_instructions?: string[] | null;
  synthesis_prompt?: string | null;
  synthesis_expansion?: string[] | null;
  micro_artifact_name?: string | null;
  micro_artifact_description?: string | null;
  micro_artifact_purpose?: string | null;
  sibling_readings?: Array<{
    reading_id: string | null;
    title: string;
    author: string | null;
    section: string | null;
    selection_rationale: string | null;
  }> | null;
};

type ActionState = 'idle' | 'promoting' | 'rejecting' | 'saving';

export default function ReadingBlurbsReviewPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [actionState, setActionState] = useState<Record<string, ActionState>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reading-blurbs', { cache: 'no-store' });
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
        d.text_title.toLowerCase().includes(q) ||
        d.course_slug.toLowerCase().includes(q) ||
        d.reading_id.toLowerCase().includes(q),
    );
  }, [drafts, search]);

  function setRowState(id: string, state: ActionState) {
    setActionState((prev) => ({ ...prev, [id]: state }));
  }

  async function promote(id: string) {
    setRowState(id, 'promoting');
    try {
      const res = await fetch(`/api/admin/reading-blurbs/${encodeURIComponent(id)}/promote`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setDrafts((prev) => prev.filter((d) => d.reading_id !== id));
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
      const res = await fetch(`/api/admin/reading-blurbs/${encodeURIComponent(id)}/reject`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setDrafts((prev) => prev.filter((d) => d.reading_id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setRowState(id, 'idle');
    }
  }

  function startEdit(d: DraftRow) {
    setEditingId(d.reading_id);
    setEditDraft(d.blurb_draft ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft('');
  }

  async function saveEdit(id: string) {
    setRowState(id, 'saving');
    try {
      const res = await fetch(`/api/admin/reading-blurbs/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blurb_draft: editDraft }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setDrafts((prev) =>
        prev.map((d) => (d.reading_id === id ? { ...d, blurb_draft: editDraft } : d)),
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
              <h1 className="text-3xl font-bold text-amber-100">Reading Digest Review</h1>
              <p className="text-zinc-400 mt-1">
                A digest is a long-form substitute for engaging with the source — substantive
                enough to do the week&apos;s coursework, with honest pointers back for seekers who
                want more. Approve, reject, or edit before approving.
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
              placeholder="Filter by title, course, or reading id"
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
                ? 'No digest drafts pending review.'
                : 'No drafts match your filter.'}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-zinc-500">
                {filtered.length} of {drafts.length} pending
              </div>
              {filtered.map((d) => {
                const isExpanded = expandedId === d.reading_id;
                const isEditing = editingId === d.reading_id;
                const state = actionState[d.reading_id] ?? 'idle';
                const displayDraft = isEditing ? editDraft : d.blurb_draft ?? '';
                return (
                  <div
                    key={d.reading_id}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : d.reading_id)}
                      className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-zinc-900/80 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-amber-100 truncate">{d.text_title}</div>
                        <div className="text-sm text-zinc-400 truncate">
                          {d.course_slug} · Week {d.week_number}
                          <span className="text-zinc-600"> · {d.reading_id}</span>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 flex-shrink-0">
                        {(d.blurb_draft ?? '').length} ch
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-zinc-800 p-4 space-y-4">
                        <div className="bg-zinc-950/40 border border-zinc-800 rounded-md p-4 space-y-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs uppercase tracking-wide text-zinc-500">
                              Context — what the digest has to carry
                            </div>
                            <Link
                              href={`/courses/${d.course_slug}/learn?week=${d.week_number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200"
                            >
                              View full week <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                          <div>
                            <div className="text-zinc-500 text-xs">Course / week</div>
                            <div className="text-zinc-200">
                              {d.course_title ?? d.course_slug} · Week {d.week_number}
                              {d.week_title ? `: ${d.week_title}` : ''}
                            </div>
                          </div>
                          {d.week_core_question && (
                            <div>
                              <div className="text-zinc-500 text-xs">Week core question</div>
                              <div className="text-zinc-200">{d.week_core_question}</div>
                            </div>
                          )}
                          {d.week_key_tension && (
                            <div>
                              <div className="text-zinc-500 text-xs">Key tension</div>
                              <div className="text-zinc-200">{d.week_key_tension}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-zinc-500 text-xs">Reading</div>
                            <div className="text-zinc-200">
                              {d.text_title}
                              {d.reading_author ? ` — ${d.reading_author}` : ''}
                              {d.reading_section ? ` · ${d.reading_section}` : ''}
                            </div>
                          </div>
                          {d.selection_rationale && (
                            <div>
                              <div className="text-zinc-500 text-xs">Why this reading</div>
                              <div className="text-zinc-200">{d.selection_rationale}</div>
                            </div>
                          )}
                          {(d.keystone_reference || d.keystone_description) && (
                            <div>
                              <div className="text-zinc-500 text-xs">Keystone (essential fragment)</div>
                              <div className="text-zinc-200">
                                {d.keystone_reference ? <span className="text-amber-300/80">{d.keystone_reference}</span> : null}
                                {d.keystone_reference && d.keystone_description ? ' :: ' : null}
                                {d.keystone_description}
                              </div>
                            </div>
                          )}
                          {(d.passage_reference || d.passage_description) && (
                            <details>
                              <summary className="cursor-pointer text-zinc-500 text-xs hover:text-zinc-300">
                                Passage (working reading)
                              </summary>
                              <div className="text-zinc-200 mt-1">
                                {d.passage_reference ? <span className="text-amber-300/80">{d.passage_reference}</span> : null}
                                {d.passage_reference && d.passage_description ? ' :: ' : null}
                                {d.passage_description}
                              </div>
                            </details>
                          )}
                          {d.sibling_readings && d.sibling_readings.length > 0 && (
                            <div>
                              <div className="text-zinc-500 text-xs">
                                Other readings this week ({d.sibling_readings.length})
                              </div>
                              <div className="text-zinc-300/90 text-xs italic mb-1">
                                The digest doesn&apos;t have to carry context these readings already cover.
                              </div>
                              <ul className="space-y-1.5">
                                {d.sibling_readings.map((s, i) => (
                                  <li key={s.reading_id ?? i} className="border-l-2 border-zinc-800 pl-2">
                                    <div className="text-zinc-200">
                                      {s.title}
                                      {s.author ? <span className="text-zinc-400"> — {s.author}</span> : null}
                                      {s.section ? <span className="text-zinc-500"> · {s.section}</span> : null}
                                    </div>
                                    {s.selection_rationale && (
                                      <div className="text-zinc-400 text-xs mt-0.5">{s.selection_rationale}</div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {(d.lens_exercise_prompt || d.synthesis_prompt || d.micro_artifact_name) && (
                          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-md p-4 space-y-3 text-sm">
                            <div className="text-xs uppercase tracking-wide text-emerald-400">
                              What this digest must enable
                            </div>
                            <p className="text-emerald-200/70 text-xs italic">
                              Read the draft below and ask: could a student do each of these with only the digest?
                            </p>
                            {d.lens_exercise_prompt && (
                              <div>
                                <div className="text-emerald-500/80 text-xs">Lens exercise</div>
                                <div className="text-zinc-200">{d.lens_exercise_prompt}</div>
                                {d.lens_exercise_instructions && d.lens_exercise_instructions.length > 0 && (
                                  <ul className="text-zinc-300/80 text-xs list-disc list-inside mt-1 space-y-0.5">
                                    {d.lens_exercise_instructions.map((line, i) => (
                                      <li key={i}>{line}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                            {d.synthesis_prompt && (
                              <div>
                                <div className="text-emerald-500/80 text-xs">Synthesis prompt</div>
                                <div className="text-zinc-200">{d.synthesis_prompt}</div>
                                {d.synthesis_expansion && d.synthesis_expansion.length > 0 && (
                                  <ul className="text-zinc-300/80 text-xs list-disc list-inside mt-1 space-y-0.5">
                                    {d.synthesis_expansion.map((line, i) => (
                                      <li key={i}>{line}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                            {d.micro_artifact_name && (
                              <div>
                                <div className="text-emerald-500/80 text-xs">Micro-artifact</div>
                                <div className="text-zinc-200">
                                  <span className="font-medium">{d.micro_artifact_name}</span>
                                  {d.micro_artifact_description ? ` — ${d.micro_artifact_description}` : ''}
                                </div>
                                {d.micro_artifact_purpose && (
                                  <div className="text-zinc-300/80 text-xs mt-0.5">{d.micro_artifact_purpose}</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
                              Live (current)
                            </div>
                            <div className="bg-zinc-950/60 border border-zinc-800 rounded-md p-3 text-sm text-zinc-300 whitespace-pre-wrap min-h-[160px]">
                              {d.blurb_live ?? '(none — first blurb)'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-amber-500 mb-2 flex items-center justify-between">
                              <span>Draft (proposed)</span>
                              <span className="text-zinc-500 normal-case tracking-normal">
                                {displayDraft.length} chars
                              </span>
                            </div>
                            {isEditing ? (
                              <textarea
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                                className="w-full bg-zinc-950/60 border border-amber-800 rounded-md p-3 text-sm text-amber-100 min-h-[160px] font-sans focus:outline-none focus:border-amber-600"
                                rows={8}
                              />
                            ) : (
                              <div className="bg-zinc-950/60 border border-amber-900/50 rounded-md p-3 text-sm text-amber-100 whitespace-pre-wrap min-h-[160px]">
                                {displayDraft || '(empty)'}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(d.reading_id)}
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
                                onClick={() => promote(d.reading_id)}
                                disabled={state !== 'idle'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-700 hover:bg-emerald-600 text-emerald-50 rounded-md disabled:opacity-50"
                              >
                                {state === 'promoting' ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                                Approve &amp; promote
                              </button>
                              <button
                                onClick={() => startEdit(d)}
                                disabled={state !== 'idle'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-md"
                              >
                                <Pencil className="w-4 h-4" /> Edit
                              </button>
                              <button
                                onClick={() => reject(d.reading_id)}
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
