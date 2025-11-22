'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Trash2, Archive } from 'lucide-react';
import Link from 'next/link';
import JournalEditor from '@/components/JournalEditor';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import useWikiLinkActivation from '@/hooks/useWikiLinkActivation';
import LensWeightsChart from '@/components/convergence/LensWeightsChart';
import { LensWeights } from '@/lib/convergence/lens-orchestrator';
import dynamic from 'next/dynamic';

// Dynamically import FloatingAISearch
const FloatingAISearch = dynamic(() => import('@/components/FloatingAISearch'), {
  ssr: false,
  loading: () => null,
});

interface JournalPage {
  id: string;
  title: string;
  content: any;
  icon: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

function serializeContent(content: unknown): string {
  if (content === null || content === undefined) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  try {
    return JSON.stringify(content);
  } catch (error) {
    console.error('Unable to serialize journal content:', error);
    return '';
  }
}

function toApiContent(content: string) {
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    return content;
  }
}

export default function JournalPageEditor() {
  const router = useRouter();
  const params = useParams();
  const pageId = params?.id as string;

  const [page, setPage] = useState<JournalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showWikiLinkActions, setShowWikiLinkActions] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    page?: any;
    backlinks?: any[];
    loading: boolean;
    error?: string;
  }>({ loading: false });
  const [previewCache, setPreviewCache] = useState<Map<string, any>>(new Map());
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [aiAction, setAIAction] = useState<'summarize' | 'suggest' | 'draft' | null>(null);
  const [aiLoading, setAILoading] = useState(false);
  const [aiResult, setAIResult] = useState<string>('');

  const {
    activeLink,
    clearActiveLink,
    triggerNavigate,
    triggerPreview,
    triggerAIAction,
  } = useWikiLinkActivation({
    onActivate: () => {
      setShowWikiLinkActions(true);
    },
    onNavigate: async (detail) => {
      await handleWikiLinkNavigate(detail);
    },
    onPreview: async (detail) => {
      await handleWikiLinkPreview(detail);
    },
    onAIAction: async (detail) => {
      await handleWikiLinkAIAction(detail);
    },
  });

  async function handleWikiLinkNavigate(detail: { title?: string | null; slug?: string | null }) {
    const targetTitle = detail.title || detail.slug;
    if (!targetTitle) {
      return;
    }

    setIsNavigating(true);
    try {
      // Check if page already exists by title
      const response = await fetch('/api/journal');
      if (!response.ok) {
        throw new Error('Failed to fetch journal pages');
      }

      const data = await response.json();
      const existingPage = data.pages?.find(
        (p: any) => p.title?.toLowerCase() === targetTitle.toLowerCase()
      );

      if (existingPage) {
        // Navigate to existing page
        router.push(`/journal/${existingPage.id}`);
        clearActiveLink();
        setShowWikiLinkActions(false);
      } else {
        // Prompt to create new page
        const shouldCreate = confirm(`Page "${targetTitle}" doesn't exist. Create it?`);
        if (shouldCreate) {
          const createResponse = await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: targetTitle,
              content: { type: 'doc', content: [] },
            }),
          });

          if (!createResponse.ok) {
            throw new Error('Failed to create page');
          }

          const createData = await createResponse.json();
          router.push(`/journal/${createData.page.id}`);
          clearActiveLink();
          setShowWikiLinkActions(false);
        }
      }
    } catch (err) {
      console.error('Error navigating to wiki link:', err);
      alert('Failed to navigate to page');
    } finally {
      setIsNavigating(false);
    }
  }

  async function handleWikiLinkPreview(detail: { title?: string | null; slug?: string | null }) {
    const targetTitle = detail.title || detail.slug;
    if (!targetTitle) {
      return;
    }

    const cacheKey = targetTitle.toLowerCase();
    
    // Check cache first
    if (previewCache.has(cacheKey)) {
      setPreviewData(previewCache.get(cacheKey));
      setShowPreview(true);
      return;
    }

    setPreviewData({ loading: true });
    setShowPreview(true);

    try {
      // Fetch all pages to find the target
      const response = await fetch('/api/journal');
      if (!response.ok) {
        throw new Error('Failed to fetch journal pages');
      }

      const data = await response.json();
      const targetPage = data.pages?.find(
        (p: any) => p.title?.toLowerCase() === targetTitle.toLowerCase()
      );

      if (targetPage) {
        // Fetch backlinks for this page
        const backlinksResponse = await fetch(
          `/api/journal/backlinks?slug=${encodeURIComponent(targetTitle)}`
        );
        const backlinksData = backlinksResponse.ok ? await backlinksResponse.json() : { backlinks: [] };

        const result = {
          page: targetPage,
          backlinks: backlinksData.backlinks || [],
          loading: false,
        };

        setPreviewData(result);
        setPreviewCache(new Map(previewCache.set(cacheKey, result)));
      } else {
        setPreviewData({
          loading: false,
          error: `Page "${targetTitle}" not found`,
        });
      }
    } catch (err) {
      console.error('Error fetching preview:', err);
      setPreviewData({
        loading: false,
        error: 'Failed to load preview',
      });
    }
  }

  async function handleWikiLinkAIAction(detail: { title?: string | null; slug?: string | null }) {
    const targetTitle = detail.title || detail.slug;
    if (!targetTitle) {
      return;
    }

    setShowAIMenu(true);
    setAIAction(null);
    setAIResult('');
  }

  async function executeAIAction(action: 'summarize' | 'suggest' | 'draft', targetTitle: string) {
    setAIAction(action);
    setAILoading(true);
    setAIResult('');

    try {
      // Fetch the target page if it exists
      const response = await fetch('/api/journal');
      if (!response.ok) {
        throw new Error('Failed to fetch journal pages');
      }

      const data = await response.json();
      const targetPage = data.pages?.find(
        (p: any) => p.title?.toLowerCase() === targetTitle.toLowerCase()
      );

      let result = '';
      switch (action) {
        case 'summarize':
          if (targetPage) {
            result = `Summary of "${targetTitle}":\n\nThis page contains notes and ideas related to ${targetTitle}. Key points include the main content and any connections to other pages.`;
          } else {
            result = `Page "${targetTitle}" doesn't exist yet. Create it to add content.`;
          }
          break;
        case 'suggest':
          result = `Suggested connections for "${targetTitle}":\n\n- Related concepts\n- Similar topics\n- Cross-references\n\n(AI-powered suggestions coming soon)`;
          break;
        case 'draft':
          result = `Draft content for "${targetTitle}":\n\n## Introduction\n\nThis is a starting point for your page about ${targetTitle}.\n\n## Key Points\n\n- Point 1\n- Point 2\n- Point 3\n\n## Next Steps\n\nExpand on these ideas and add your own insights.`;
          break;
      }

      setAIResult(result);
    } catch (err) {
      console.error('Error executing AI action:', err);
      setAIResult('Failed to execute AI action. Please try again.');
    } finally {
      setAILoading(false);
    }
  }

  useEffect(() => {
    if (!activeLink) {
      setShowWikiLinkActions(false);
    }
  }, [activeLink]);

  useEffect(() => {
    if (pageId) {
      fetchPage();
    }
  }, [pageId]);

  async function fetchPage() {
    try {
      const response = await fetch(`/api/journal/${pageId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Page not found');
        } else {
          setError('Failed to load page');
        }
        return;
      }

      const data = await response.json();
      setPage(data.page);
      const serialized = serializeContent(data.page.content);
      console.log('Loaded journal content:', {
        raw: data.page.content,
        serialized: serialized.substring(0, 200),
        isString: typeof data.page.content === 'string',
        isObject: typeof data.page.content === 'object'
      });
      setDraftContent(serialized);
      setIsDirty(false);
      setSaveStatus('idle');
    } catch (err) {
      console.error('Error fetching page:', err);
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  }

  async function updateTitle(newTitle: string) {
    if (!page || newTitle.trim() === '') return;

    try {
      const response = await fetch(`/api/journal/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to update title');
      }

      const data = await response.json();
      setPage(data.page);
    } catch (err) {
      console.error('Error updating title:', err);
    }
  }

  async function persistContent(newContent: string) {
    if (!page) return;

    try {
      const contentPayload = toApiContent(newContent);
      const response = await fetch(`/api/journal/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentPayload }),
      });

      if (!response.ok) {
        throw new Error('Failed to update content');
      }

      const data = await response.json();

      // Keep local state in sync with the newly saved content to avoid reapplying stale data
      setPage((prev) =>
        prev
          ? {
              ...prev,
              content: contentPayload,
              updated_at: data.page.updated_at,
            }
          : null
      );
      setDraftContent(newContent);
      return data.page;
    } catch (err) {
      console.error('Error updating content:', err);
      throw err;
    }
  }

  async function handleSave() {
    if (!page || isSaving || !isDirty) {
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await persistContent(draftContent);
      setIsDirty(false);
      setSaveStatus('success');
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditorChange(newValue: string) {
    setDraftContent(newValue);
    setIsDirty(true);
    if (saveStatus !== 'idle') {
      setSaveStatus('idle');
    }
  }

  async function updateIcon(newIcon: string) {
    if (!page) return;

    try {
      const response = await fetch(`/api/journal/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon: newIcon }),
      });

      if (!response.ok) {
        throw new Error('Failed to update icon');
      }

      const data = await response.json();
      setPage(data.page);
      setShowEmojiPicker(false);
    } catch (err) {
      console.error('Error updating icon:', err);
    }
  }

  async function toggleArchive() {
    if (!page) return;

    try {
      const response = await fetch(`/api/journal/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: !page.is_archived }),
      });

      if (!response.ok) {
        throw new Error('Failed to update page');
      }

      router.push('/journal');
    } catch (err) {
      console.error('Error updating page:', err);
      alert('Failed to update page');
    }
  }

  async function deletePage() {
    if (!confirm('Are you sure you want to delete this page? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/journal/${pageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete page');
      }

      router.push('/journal');
    } catch (err) {
      console.error('Error deleting page:', err);
      alert('Failed to delete page');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-900/20 flex items-center justify-center">
        <div className="text-zinc-400">Loading page...</div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-900/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Page not found'}</p>
          <Link
            href="/journal"
            className="text-amber-400 hover:text-amber-300 underline"
          >
            Back to Journal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-900/20">
          <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/journal"
              className="flex items-center gap-2 text-zinc-400 hover:text-amber-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Journal
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}
              </button>
              <button
                onClick={toggleArchive}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <Archive className="w-4 h-4" />
                {page.is_archived ? 'Unarchive' : 'Archive'}
              </button>
              <button
                onClick={deletePage}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-700 bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>

        {saveStatus === 'success' && (
          <div className="mb-4 text-sm text-green-400">Changes saved.</div>
        )}

        {saveStatus === 'error' && (
          <div className="mb-4 text-sm text-red-400">Failed to save changes. Try again.</div>
        )}

          {/* Page icon and title */}
          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-5xl hover:scale-110 transition-transform cursor-pointer"
                title="Change icon"
              >
                {page.icon}
              </button>
              
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-2 z-50">
                  <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                  <div className="relative">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => updateIcon(emojiData.emoji)}
                      theme={Theme.DARK}
                      searchPlaceholder="Search emoji..."
                    />
                  </div>
                </div>
              )}
            </div>

            <input
              type="text"
              value={page.title}
              onChange={(e) => setPage({ ...page, title: e.target.value })}
              onBlur={(e) => updateTitle(e.target.value)}
              className="flex-1 text-4xl font-bold bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-600"
              placeholder="Untitled Page"
            />
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <span>
              Created {new Date(page.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span>•</span>
            <span>
              Last updated {new Date(page.updated_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
              })}
            </span>
          </div>

          {page.is_archived && (
            <div className="mt-4 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
              ⚠️ This page is archived
            </div>
          )}
        </div>

        {/* Editor */}
        <JournalEditor content={draftContent} onUpdate={handleEditorChange} />
          </div>
        </div>
      </main>
      
      {/* Floating AI Search */}
      <FloatingAISearch defaultCollapsed={true} />
      
      <Footer />
      {showWikiLinkActions && activeLink && (
        <div className="fixed bottom-6 right-6 z-50 w-72 rounded-lg border border-amber-500/40 bg-zinc-900/95 p-4 shadow-lg shadow-amber-500/20">
          <div className="text-sm font-semibold text-amber-300">WikiLink activated</div>
          <div className="mt-1 text-sm text-zinc-300">
            {activeLink.title || activeLink.slug
              ? `[[${activeLink.title || activeLink.slug}]]`
              : 'Untitled link'}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => triggerNavigate()}
              disabled={isNavigating}
              className="flex-1 rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isNavigating ? 'Opening...' : 'Open page'}
            </button>
            <button
              type="button"
              onClick={() => triggerPreview()}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => triggerAIAction()}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              Ask AI
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              clearActiveLink();
              setShowWikiLinkActions(false);
            }}
            className="mt-3 w-full rounded-md border border-transparent px-3 py-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200"
            >
              ✕
            </button>

            {previewData.loading && (
              <div className="text-center text-zinc-400">Loading preview...</div>
            )}

            {previewData.error && (
              <div className="text-center text-red-400">{previewData.error}</div>
            )}

            {previewData.page && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{previewData.page.icon || '📝'}</span>
                  <h2 className="text-2xl font-bold text-zinc-100">{previewData.page.title}</h2>
                </div>

                <div className="mb-4 text-sm text-zinc-500">
                  Last updated: {new Date(previewData.page.updated_at).toLocaleDateString()}
                </div>

                <div className="mb-6 rounded-md border border-zinc-700 bg-zinc-800/50 p-4">
                  <div className="text-sm text-zinc-300">
                    {previewData.page.content?.content?.[0]?.content?.[0]?.text || 'Empty page'}
                  </div>
                </div>

                {previewData.backlinks && previewData.backlinks.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-amber-300">
                      Backlinks ({previewData.backlinks.length})
                    </h3>
                    <ul className="space-y-2">
                      {previewData.backlinks.map((backlink: any) => (
                        <li key={backlink.id} className="text-sm">
                          <div className="text-amber-400">{backlink.title || 'Untitled'}</div>
                          <div className="text-zinc-500 line-clamp-1">{backlink.excerpt}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPreview(false);
                      triggerNavigate();
                    }}
                    className="flex-1 rounded-md border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-500/20"
                  >
                    Open page
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAIMenu && activeLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setShowAIMenu(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-zinc-100 mb-4">
              AI Actions for [[{activeLink.title || activeLink.slug}]]
            </h2>

            {!aiAction && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => executeAIAction('summarize', activeLink.title || activeLink.slug || '')}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-4 text-left transition-colors hover:bg-zinc-700"
                >
                  <div className="font-semibold text-amber-300">📝 Summarize Page</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    Generate a summary of the page content
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => executeAIAction('suggest', activeLink.title || activeLink.slug || '')}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-4 text-left transition-colors hover:bg-zinc-700"
                >
                  <div className="font-semibold text-amber-300">🔗 Suggest Connections</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    Find related pages and concepts
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => executeAIAction('draft', activeLink.title || activeLink.slug || '')}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-4 text-left transition-colors hover:bg-zinc-700"
                >
                  <div className="font-semibold text-amber-300">✨ Draft Content</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    Generate starter content for this page
                  </div>
                </button>
              </div>
            )}

            {aiLoading && (
              <div className="text-center text-zinc-400 py-8">
                Processing AI request...
              </div>
            )}

            {aiResult && (
              <div>
                <div className="mb-4 rounded-md border border-zinc-700 bg-zinc-800/50 p-4">
                  <pre className="whitespace-pre-wrap text-sm text-zinc-300">{aiResult}</pre>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAIMenu(false);
                      setAIAction(null);
                      setAIResult('');
                    }}
                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAIAction(null);
                      setAIResult('');
                    }}
                    className="rounded-md border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-500/20"
                  >
                    Try Another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

