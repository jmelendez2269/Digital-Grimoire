'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sparkles,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  BookOpen,
  X,
  Check,
  ChevronLeft,
} from 'lucide-react';

interface Insight {
  id: string;
  title: string;
  hook: string;
  source_type: string | null;
  source_id: string | null;
  library_text_id: string | null;
  blog_slug: string | null;
  concept_search_terms: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export default function InsightsAdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();

  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  // New insight form
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formHook, setFormHook] = useState('');
  const [formSourceType, setFormSourceType] = useState<string>('text');
  const [formLibraryTextId, setFormLibraryTextId] = useState('');
  const [formBlogSlug, setFormBlogSlug] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/insights');
      const data = await res.json();
      setInsights(data.insights ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchInsights();
  }, [isAdmin, fetchInsights]);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/admin/insights?action=seed', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setSeedResult(`Error: ${data.error}`);
      } else {
        setSeedResult(`Seeded ${data.seeded} insights from the library.`);
        fetchInsights();
      }
    } finally {
      setSeeding(false);
    }
  };

  const handleToggle = async (insight: Insight) => {
    const res = await fetch('/api/admin/insights', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: insight.id, is_active: !insight.is_active }),
    });
    if (res.ok) {
      setInsights((prev) =>
        prev.map((i) => (i.id === insight.id ? { ...i, is_active: !i.is_active } : i))
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this insight?')) return;
    const res = await fetch(`/api/admin/insights?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setInsights((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: formTitle,
        hook: formHook,
        source_type: formSourceType || null,
      };
      if (formLibraryTextId) body.library_text_id = formLibraryTextId;
      if (formBlogSlug) body.blog_slug = formBlogSlug;

      const res = await fetch('/api/admin/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        setFormTitle('');
        setFormHook('');
        setFormLibraryTextId('');
        setFormBlogSlug('');
        fetchInsights();
      }
    } finally {
      setFormSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-amber-100">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-400">Access denied.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const active = insights.filter((i) => i.is_active).length;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-amber-50">
      <Header />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-4 mb-2">
            <Link href="/admin" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-amber-400" />
              <h1 className="text-3xl font-bold text-amber-100">Daily Insights</h1>
            </div>
          </div>
          <p className="text-zinc-400 mb-8 ml-9">
            Curate passages shown on the dashboard. {insights.length} total, {active} active.
          </p>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-900/20 hover:bg-amber-900/40 text-amber-300 border border-amber-500/30 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <BookOpen className={`w-4 h-4 ${seeding ? 'animate-pulse' : ''}`} />
              {seeding ? 'Seeding…' : 'Seed from Library'}
            </button>

            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors text-sm font-medium"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'Cancel' : 'Add Manually'}
            </button>

            <button
              onClick={fetchInsights}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Seed result banner */}
          {seedResult && (
            <div className={`mb-6 px-4 py-3 rounded-lg text-sm border flex items-center gap-2 ${
              seedResult.startsWith('Error')
                ? 'bg-red-900/20 border-red-500/30 text-red-300'
                : 'bg-green-900/20 border-green-500/30 text-green-300'
            }`}>
              {seedResult.startsWith('Error') ? <X className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
              {seedResult}
              <button onClick={() => setSeedResult(null)} className="ml-auto opacity-60 hover:opacity-100">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Manual create form */}
          {showForm && (
            <form
              onSubmit={handleCreate}
              className="mb-8 p-6 rounded-xl border border-zinc-700 bg-zinc-900/60 space-y-4"
            >
              <h2 className="text-lg font-semibold text-zinc-100 mb-2">New Insight</h2>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Title / Attribution</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder='e.g. "From: The Kybalion — Three Initiates"'
                  required
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Hook / Quote</label>
                <textarea
                  value={formHook}
                  onChange={(e) => setFormHook(e.target.value)}
                  placeholder="The passage or quote shown on the card…"
                  required
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Source Type</label>
                  <select
                    value={formSourceType}
                    onChange={(e) => setFormSourceType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="text">Library Text</option>
                    <option value="blog">Blog Post</option>
                    <option value="convergence_concept">Convergence Concept</option>
                    <option value="parallax_response">Parallax Response</option>
                  </select>
                </div>
                {formSourceType === 'text' && (
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Library Text ID (UUID)</label>
                    <input
                      type="text"
                      value={formLibraryTextId}
                      onChange={(e) => setFormLibraryTextId(e.target.value)}
                      placeholder="Optional — links to source"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}
                {formSourceType === 'blog' && (
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Blog Slug</label>
                    <input
                      type="text"
                      value={formBlogSlug}
                      onChange={(e) => setFormBlogSlug(e.target.value)}
                      placeholder="e.g. my-post-slug"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {formSaving ? 'Saving…' : 'Save Insight'}
                </button>
              </div>
            </form>
          )}

          {/* Insights list */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          ) : insights.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              <Sparkles className="w-10 h-10 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No insights yet.</p>
              <p className="text-sm mt-1">Click "Seed from Library" to populate from your text collection.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`rounded-xl border p-5 transition-colors ${
                    insight.is_active
                      ? 'border-zinc-700 bg-zinc-900/60'
                      : 'border-zinc-800/50 bg-zinc-900/20 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-amber-500/70 font-mono uppercase tracking-wide mb-1">
                        {insight.source_type ?? 'no source'}
                      </p>
                      <h3 className="text-sm font-semibold text-zinc-200 mb-2 truncate">{insight.title}</h3>
                      <p className="text-sm text-zinc-400 italic leading-relaxed line-clamp-3">{insight.hook}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(insight)}
                        title={insight.is_active ? 'Deactivate' : 'Activate'}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        {insight.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(insight.id)}
                        title="Delete"
                        className="p-2 rounded-lg hover:bg-red-900/20 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {(insight.library_text_id || insight.blog_slug) && (
                    <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-2 text-xs text-zinc-600 font-mono">
                      {insight.library_text_id && <span>lib: {insight.library_text_id}</span>}
                      {insight.blog_slug && <span>blog: {insight.blog_slug}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
