'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Trash2, Archive, Smile } from 'lucide-react';
import Link from 'next/link';
import JournalEditor from '@/components/JournalEditor';
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface JournalPage {
  id: string;
  title: string;
  content: any;
  icon: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export default function JournalPageEditor() {
  const router = useRouter();
  const params = useParams();
  const pageId = params?.id as string;

  const [page, setPage] = useState<JournalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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

  async function updateContent(newContent: string) {
    if (!page) return;

    try {
      const contentJson = JSON.parse(newContent);
      const response = await fetch(`/api/journal/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentJson }),
      });

      if (!response.ok) {
        throw new Error('Failed to update content');
      }

      const data = await response.json();
      setPage(data.page);
    } catch (err) {
      console.error('Error updating content:', err);
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
        <JournalEditor
          content={JSON.stringify(page.content)}
          onUpdate={updateContent}
          placeholder="Start writing your thoughts..."
          autoSave={true}
        />
      </div>
    </div>
  );
}

