'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Archive, FileText, Clock, Trash2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import JournalNameSetupModal from '@/components/JournalNameSetupModal';

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
  const { user } = useAuth();
  const [pages, setPages] = useState<JournalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [creatingPage, setCreatingPage] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Check if journal name is set on mount
  useEffect(() => {
    if (user && !user.user_metadata?.journal_name) {
      setShowSetupModal(true);
    }
  }, [user]);

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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-transparent">
          <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-amber-500 mb-1 font-mono tracking-tight text-glow">
                // {user?.user_metadata?.journal_name || 'Digital_Grimoire'}
                  </h1>
                  <p className="text-zinc-500 font-mono text-sm">
                    &gt; Accessing personal knowledge base...
                  </p>
                </div>
                <button
                  onClick={createNewPage}
                  disabled={creatingPage}
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 text-amber-500 rounded font-mono text-sm uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Init_Entry
                </button>
              </div>

              {/* Search and filters */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Query database..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 font-mono text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`flex items-center gap-2 px-4 py-2 rounded border transition-all text-xs font-mono uppercase tracking-wider ${showArchived
                      ? 'bg-amber-900/20 border-amber-700 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                      : 'bg-black/40 border-white/10 text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  {showArchived ? 'Hide_Archived' : 'Show_Archived'}
                </button>
              </div>
            </div>

            {/* Pages list */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-amber-500 text-xs font-mono animate-pulse">
                  INITIALIZING_STREAM...
                </div>
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-lg">
                <FileText className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-600 mb-4 font-mono text-sm">
                  {searchQuery
                    ? 'QUERY_RETURNED_ZERO_RESULTS'
                    : showArchived
                      ? 'ARCHIVE_EMPTY'
                      : 'DATABASE_EMPTY // AWAITING_INPUT'}
                </p>
                {!searchQuery && !showArchived && (
                  <button
                    onClick={createNewPage}
                    disabled={creatingPage}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white rounded font-mono text-xs uppercase"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Entry
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1 w-full max-w-4xl mx-auto">
                {filteredPages.map((page) => (
                  <PageCard key={page.id} page={page} onUpdate={fetchPages} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Journal Name Setup Modal */}
      {showSetupModal && (
        <JournalNameSetupModal
          onComplete={() => {
            setShowSetupModal(false);
            // Refresh page to update journal name
            window.location.reload();
          }}
        />
      )}
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

  // Format date to tech timestamp
  const formatDate = (dateString: string) => {
    return new Date(dateString).toISOString().replace('T', ' ').substring(0, 16);
  };

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

  return (
    <Link href={`/journal/${page.id}`} className="block">
      <div className={`group relative flex items-center gap-4 p-3 border-b border-white/5 transition-all hover:bg-white/5 ${page.is_archived ? 'opacity-50' : ''}`}>
        {/* Icon / Status */}
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-amber-500 font-mono text-sm group-hover:border-amber-500/50 group-hover:shadow-[0_0_10px_rgba(245,158,11,0.1)] transition-all">
          {page.icon || (page.is_archived ? '📦' : '📄')}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-zinc-300 group-hover:text-amber-400 transition-colors truncate font-mono">
              {page.title || 'Untitled_Data_Log'}
            </h3>
            {page.is_archived && <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">[ARCHIVED]</span>}
          </div>
          <div className="flex items-center gap-4 mt-0.5">
            <span className="text-[10px] text-zinc-600 font-mono">ID: {page.id.substring(0, 8)}</span>
            <span className="text-[10px] text-zinc-600 font-mono">UPDATED: {formatDate(page.updated_at)}</span>
          </div>
        </div>

        {/* Actions (Visible on Hover) */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={toggleArchive}
            className="p-1.5 text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors"
            title={page.is_archived ? "Restore" : "Archive"}
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
            title="Delete Permanently"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3 bg-zinc-800 mx-1"></div>
          <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-amber-500 transition-colors" />
        </div>
      </div>
    </Link>
  );
}
