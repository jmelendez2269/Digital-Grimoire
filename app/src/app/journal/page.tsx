'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Archive, FileText, Clock, Trash2, ChevronRight, Calendar } from 'lucide-react';
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
    <div className="flex min-h-screen flex-col bg-black selection:bg-amber-500/30">
      <Header />
      <main className="flex-1 relative">
        {/* Background Ambient Effects */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-amber-500/10 via-transparent to-transparent opacity-50" />
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[100px]" />
        </div>

        {/* Hero / Cover Section */}
        <div className="relative z-10 pt-20 pb-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  {user?.user_metadata?.journal_name || 'My_Grimoire'}
                </h1>
                <p className="text-zinc-400 max-w-xl text-lg leading-relaxed">
                  Your personal collection of thoughts and records.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right mr-4">
                  <div className="text-2xl font-bold font-mono text-zinc-100">{pages.length}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Entries</div>
                </div>
                <button
                  onClick={createNewPage}
                  disabled={creatingPage}
                  className="group relative px-6 py-3 bg-amber-500 text-black font-bold font-mono uppercase tracking-wider overflow-hidden hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                >
                  <span className="relative flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Entry
                  </span>
                </button>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="glass-panel p-2 rounded-lg mb-8 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-20 z-20 shadow-2xl shadow-black/50">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/5 rounded text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 font-mono text-sm transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-mono uppercase tracking-wider border transition-all ${showArchived
                      ? 'bg-amber-900/20 border-amber-500/50 text-amber-500'
                      : 'bg-black/20 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  {showArchived ? 'Hide Archived' : 'Show Archived'}
                </button>
              </div>
            </div>

            {/* Content Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 rounded-lg bg-zinc-900/50 border border-white/5 animate-pulse" />
                ))}
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/20">
                <FileText className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
                <h3 className="text-xl text-zinc-400 font-bold mb-2">No Entries Found</h3>
                <p className="text-zinc-600 font-mono text-sm mb-6">
                  {searchQuery ? 'No results for your search' : 'Your journal is empty'}
                </p>
                {!searchQuery && !showArchived && (
                  <button
                    onClick={createNewPage}
                    className="text-amber-500 hover:text-amber-400 font-mono text-sm border-b border-amber-500/30 hover:border-amber-500 transition-colors"
                  >
                    Start Writing &rarr;
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
    <Link href={`/journal/${page.id}`} className="group block h-full">
      <div className={`
        relative h-full flex flex-col
        glass-panel rounded-xl overflow-hidden transition-all duration-300
        hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]
        hover:-translate-y-1
        ${page.is_archived ? 'opacity-50 grayscale' : ''}
      `}>
        {/* Animated Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Top Header Area (The "Fold") */}
        <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-400">
              {formatDate(page.updated_at)}
            </span>
          </div>
          {/* Fold/Color indicator place holder */}
          {page.is_archived && (
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-medium">Archived</span>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 flex flex-col gap-4 relative">
          {/* Icon Watermark */}
          <div className="absolute top-4 right-4 text-6xl opacity-[0.03] group-hover:opacity-[0.07] transition-opacity select-none filter blur-sm">
            {page.icon || (page.is_archived ? '📦' : '📄')}
          </div>

          <div className="flex items-start justify-between">
            <div className="text-3xl mb-2 filter drop-shadow-md">
              {page.icon || (page.is_archived ? '📦' : '📄')}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-200 group-hover:text-amber-500 transition-colors leading-tight mb-2 line-clamp-2">
              {page.title || 'Untitled Entry'}
            </h3>
          </div>
        </div>

        {/* Action Bar (Slide up on hover) */}
        <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between translate-y-full group-hover:translate-y-0 transition-transform duration-300 absolute bottom-0 left-0 right-0 backdrop-blur-md">
          <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
            Read Entry <ChevronRight className="w-3 h-3" />
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleArchive}
              className="p-1.5 text-zinc-400 hover:text-amber-500 hover:bg-zinc-800 rounded transition-colors"
              title={page.is_archived ? "Restore" : "Archive"}
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
