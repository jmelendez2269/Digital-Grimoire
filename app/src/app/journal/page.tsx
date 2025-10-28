'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Archive, FileText, Clock, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface JournalPage {
  id: string;
  title: string;
  content: any;
  icon: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export default function JournalHomePage() {
  const router = useRouter();
  const [pages, setPages] = useState<JournalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [creatingPage, setCreatingPage] = useState(false);

  useEffect(() => {
    fetchPages();
  }, [showArchived]);

  async function fetchPages() {
    try {
      const url = `/api/journal?include_archived=${showArchived}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch journal pages');
      }

      const data = await response.json();
      setPages(data.pages || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createNewPage() {
    setCreatingPage(true);
    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Page',
          content: { type: 'doc', content: [] },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create page');
      }

      const data = await response.json();
      router.push(`/journal/${data.page.id}`);
    } catch (error) {
      console.error('Error creating page:', error);
      alert('Failed to create new page');
    } finally {
      setCreatingPage(false);
    }
  }

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-900/20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-amber-400 mb-2">
                📖 Study Journal
              </h1>
              <p className="text-zinc-400">
                Your personal space for notes, reflections, and ideas
              </p>
            </div>
            <button
              onClick={createNewPage}
              disabled={creatingPage}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-zinc-900 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              New Page
            </button>
          </div>

          {/* Search and filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showArchived
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <Archive className="w-4 h-4" />
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </button>
          </div>
        </div>

        {/* Pages list */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">
            Loading your journal pages...
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 mb-4">
              {searchQuery
                ? 'No pages match your search'
                : showArchived
                ? 'No archived pages yet'
                : 'No pages yet. Create your first one!'}
            </p>
            {!searchQuery && !showArchived && (
              <button
                onClick={createNewPage}
                disabled={creatingPage}
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-zinc-900 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create First Page
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPages.map((page) => (
              <PageCard key={page.id} page={page} onUpdate={fetchPages} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PageCard({
  page,
  onUpdate,
}: {
  page: JournalPage;
  onUpdate: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  function getPreviewText(content: any): string {
    try {
      if (!content || !content.content) return '';
      
      // Extract text from Tiptap JSON
      const extractText = (node: any): string => {
        if (node.type === 'text') return node.text || '';
        if (node.content) {
          return node.content.map(extractText).join(' ');
        }
        return '';
      };

      const text = content.content.map(extractText).join(' ').trim();
      return text.slice(0, 120) + (text.length > 120 ? '...' : '');
    } catch {
      return '';
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this page?')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/journal/${page.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete page');
      }

      onUpdate();
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Failed to delete page');
    } finally {
      setDeleting(false);
    }
  }

  async function toggleArchive(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    try {
      const response = await fetch(`/api/journal/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: !page.is_archived }),
      });

      if (!response.ok) {
        throw new Error('Failed to update page');
      }

      onUpdate();
    } catch (error) {
      console.error('Error updating page:', error);
      alert('Failed to update page');
    }
  }

  const previewText = getPreviewText(page.content);
  const updatedDate = new Date(page.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link href={`/journal/${page.id}`}>
      <div
        className={`group relative p-5 rounded-lg border transition-all hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer ${
          page.is_archived
            ? 'bg-zinc-800/50 border-zinc-700/50 opacity-60'
            : 'bg-zinc-800/80 border-zinc-700 hover:border-amber-500/50'
        }`}
      >
        {/* Icon and title */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">{page.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-zinc-100 truncate group-hover:text-amber-400 transition-colors">
              {page.title}
            </h3>
          </div>
        </div>

        {/* Preview text */}
        {previewText && (
          <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
            {previewText}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="w-3 h-3" />
            {updatedDate}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={toggleArchive}
              className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors"
              title={page.is_archived ? 'Unarchive' : 'Archive'}
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {page.is_archived && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 text-xs bg-zinc-700 text-zinc-400 rounded">
              Archived
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

