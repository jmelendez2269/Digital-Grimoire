'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, Archive, FileText, Calendar, ChevronRight, 
  Trash2, Pin, Tag, BookOpen, Layers, Award, ChevronDown, Lock
} from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import JournalNameSetupModal from '@/components/JournalNameSetupModal';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface JournalPage {
  id: string;
  title: string;
  content: any;
  icon: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  
  // Workbook & Artifact Fields
  course_id?: string;
  week_number?: number;
  entry_type?: 'free' | 'lens_exercise' | 'synthesis' | 'note' | 'capstone';
  artifact_name?: string;
  tags?: string[];
  is_pinned?: boolean;
}

interface Course {
  id: string;
  title: string;
  slug: string;
}

type TabType = 'journal' | 'workbooks' | 'artifacts';

// ─── Main Component ─────────────────────────────────────────────────────────

export default function JournalHomePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [pages, setPages] = useState<JournalPage[]>([]);
  const [courses, setCourses] = useState<Record<string, Course>>({});
  const [loading, setLoading] = useState(true);
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('journal');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [creatingPage, setCreatingPage] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [expandedWorkbooks, setExpandedWorkbooks] = useState<Record<string, boolean>>({});

  // Check if journal name is set on mount
  useEffect(() => {
    if (user && !user.user_metadata?.journal_name) {
      setShowSetupModal(true);
    }
  }, [user]);

  // Initial Load
  useEffect(() => {
    fetchPages();
    fetchCourses();
  }, [showArchived]);

  async function fetchPages() {
    setLoading(true);
    try {
      const url = `/api/journal?include_archived=${showArchived}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch journal pages');
      const data = await response.json();
      setPages(data.pages || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCourses() {
    try {
      const response = await fetch('/api/courses');
      if (response.ok) {
        const data = await response.json();
        const courseMap: Record<string, Course> = {};
        if (data.courses) {
          data.courses.forEach((c: Course) => {
            courseMap[c.id] = c;
          });
        }
        setCourses(courseMap);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
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
          icon: '📄',
          entry_type: 'free',
        }),
      });

      if (!response.ok) throw new Error('Failed to create page');

      const data = await response.json();
      router.push(`/journal/${data.page.id}`);
    } catch (error) {
      console.error('Error creating page:', error);
      alert('Failed to create new page');
    } finally {
      setCreatingPage(false);
    }
  }

  async function togglePin(pageId: string, currentPinStatus: boolean) {
    try {
      const response = await fetch(`/api/journal/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !currentPinStatus }),
      });
      if (response.ok) fetchPages();
    } catch (error) {
      console.error('Error pinning page:', error);
    }
  }

  async function toggleArchive(pageId: string, currentArchiveStatus: boolean) {
    try {
      const response = await fetch(`/api/journal/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: !currentArchiveStatus }),
      });
      if (response.ok) fetchPages();
    } catch (error) {
      console.error('Error archiving page:', error);
    }
  }

  async function deletePage(pageId: string) {
    if (!confirm('Are you sure you want to delete this specific entry?')) return;
    try {
      const response = await fetch(`/api/journal/${pageId}`, { method: 'DELETE' });
      if (response.ok) fetchPages();
    } catch (error) {
      console.error('Error deleting page:', error);
    }
  }

  const toggleWorkbook = (courseId: string) => {
    setExpandedWorkbooks(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  // ─── Filtering & Sorting ─────────────────────────────────────────────────
  
  // Basic search filter
  const searchFilteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (page.tags && page.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Split into categories
  const freeEntries = searchFilteredPages.filter(p => !p.course_id && p.entry_type !== 'capstone');
  const workbookEntries = searchFilteredPages.filter(p => !!p.course_id);
  const artifactEntries = searchFilteredPages.filter(p => !!p.artifact_name || p.entry_type === 'capstone');

  // Sort helper: pinned first, then newest
  const sortPinnedAndNewest = (a: JournalPage, b: JournalPage) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  };

  const sortedFreeEntries = [...freeEntries].sort(sortPinnedAndNewest);
  const sortedArtifacts = [...artifactEntries].sort(sortPinnedAndNewest);

  // Group workbook entries by course
  const groupedWorkbooks: Record<string, JournalPage[]> = {};
  workbookEntries.forEach(page => {
    if (!page.course_id) return;
    if (!groupedWorkbooks[page.course_id]) {
      groupedWorkbooks[page.course_id] = [];
    }
    groupedWorkbooks[page.course_id].push(page);
  });

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 selection:bg-amber-500/30 font-sans">
      <Header />
      <main className="flex-1 relative">
        {/* Ambient Effects */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-amber-500/5 via-transparent to-transparent opacity-50" />
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-900/10 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
          
          {/* Header Area */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500">
                {user?.user_metadata?.journal_name || 'My_Grimoire'}
              </h1>
              <p className="text-zinc-400 max-w-xl text-lg">
                Your personal collection of thoughts, workbooks, and artifacts.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right mr-4 text-zinc-500">
                <div className="text-xl font-bold font-mono text-zinc-300">{pages.length}</div>
                <div className="text-[10px] uppercase tracking-widest">Total Entries</div>
              </div>
              <button
                onClick={createNewPage}
                disabled={creatingPage}
                className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                New Entry
              </button>
            </div>
          </div>

          {/* Navigation & Controls */}
          <div className="flex flex-col md:flex-row gap-6 mb-10 pb-6 border-b border-white/10">
            
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-zinc-900 rounded-lg shrink-0">
              <button
                onClick={() => setActiveTab('journal')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'journal' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                My Journal
              </button>
              <button
                onClick={() => setActiveTab('workbooks')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'workbooks' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Workbooks
              </button>
              <button
                onClick={() => setActiveTab('artifacts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'artifacts' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Award className="w-4 h-4" />
                Artifact Gallery
              </button>
            </div>

            {/* Search Tool */}
            <div className="relative flex-1 max-w-md ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search entries or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 text-sm transition-colors"
              />
            </div>

            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
                showArchived
                  ? 'bg-zinc-800 border border-zinc-700 text-amber-500'
                  : 'bg-zinc-900/50 border border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Archive className="w-4 h-4" />
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </button>
          </div>

          {/* Tab Content */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-zinc-900 animate-pulse border border-white/5" />)}
            </div>
          ) : (
            <>
              {/* Journal Tab */}
              {activeTab === 'journal' && (
                sortedFreeEntries.length === 0 ? (
                  <EmptyState tab="journal" onCreate={createNewPage} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedFreeEntries.map(page => (
                      <PageCard 
                        key={page.id} 
                        page={page} 
                        onTogglePin={() => togglePin(page.id, !!page.is_pinned)}
                        onToggleArchive={() => toggleArchive(page.id, page.is_archived)}
                        onDelete={() => deletePage(page.id)}
                      />
                    ))}
                  </div>
                )
              )}

              {/* Workbooks Tab */}
              {activeTab === 'workbooks' && (
                Object.keys(groupedWorkbooks).length === 0 ? (
                  <EmptyState tab="workbooks" />
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedWorkbooks).map(([courseId, courseEntries]) => {
                      const courseName = courses[courseId]?.title || `Unknown Course (${courseId})`;
                      const courseSlug = courses[courseId]?.slug;
                      const isExpanded = expandedWorkbooks[courseId] !== false; // Default true
                      
                      return (
                        <div key={courseId} className="border border-white/10 bg-black/40 rounded-xl overflow-hidden">
                          {/* Workbook Header */}
                          <div 
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                            onClick={() => toggleWorkbook(courseId)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-emerald-500" />
                              </div>
                              <div>
                                <h2 className="text-xl font-bold text-zinc-100">{courseName}</h2>
                                <p className="text-sm text-zinc-500">{courseEntries.length} entries</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {courseSlug && (
                                <Link 
                                  href={`/courses/${courseSlug}/learn`}
                                  onClick={e => e.stopPropagation()}
                                  className="text-xs font-medium px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                                >
                                  Course Page
                                </Link>
                              )}
                              <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {/* Workbook Entries Grid */}
                          {isExpanded && (
                            <div className="p-5 pt-0 border-t border-white/5 bg-zinc-950/50">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                                {courseEntries.sort((a,b) => (a.week_number || 0) - (b.week_number || 0)).map(page => (
                                  <PageCard 
                                    key={page.id} 
                                    page={page}
                                    onTogglePin={() => togglePin(page.id, !!page.is_pinned)}
                                    onToggleArchive={() => toggleArchive(page.id, page.is_archived)}
                                    onDelete={() => deletePage(page.id)}
                                    showCourseTag={false}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* Artifacts Tab */}
              {activeTab === 'artifacts' && (
                sortedArtifacts.length === 0 ? (
                  <EmptyState tab="artifacts" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedArtifacts.map(page => (
                      <PageCard 
                        key={page.id} 
                        page={page} 
                        onTogglePin={() => togglePin(page.id, !!page.is_pinned)}
                        onToggleArchive={() => toggleArchive(page.id, page.is_archived)}
                        onDelete={() => deletePage(page.id)}
                      />
                    ))}
                  </div>
                )
              )}
            </>
          )}

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

// ─── Sub-Components ─────────────────────────────────────────────────────────

function EmptyState({ tab, onCreate }: { tab: string; onCreate?: () => void }) {
  const settings = {
    journal: { icon: FileText, title: 'No Standard Entries Found', desc: 'Your free-form journal entries will appear here.' },
    workbooks: { icon: Layers, title: 'No Workbooks Found', desc: 'Entries created during course learning will automatically group here.' },
    artifacts: { icon: Award, title: 'No Artifacts Found', desc: 'Special micro-artifacts and capstones will appear in this gallery.' },
  }[tab];

  if (!settings) return null;
  const Icon = settings.icon;

  return (
    <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl bg-zinc-900/20">
      <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mx-auto mb-6">
        <Icon className="w-8 h-8 text-zinc-600" />
      </div>
      <h3 className="text-xl font-semibold text-zinc-300 mb-2">{settings.title}</h3>
      <p className="text-zinc-500 max-w-sm mx-auto mb-6">{settings.desc}</p>
      
      {onCreate && (
        <button
          onClick={onCreate}
          className="text-amber-500 hover:text-amber-400 text-sm font-medium border-b border-amber-500/30 hover:border-amber-400 transition-colors pb-0.5"
        >
          Create First Entry &rarr;
        </button>
      )}
    </div>
  );
}

function PageCard({
  page,
  onTogglePin,
  onToggleArchive,
  onDelete,
  showCourseTag = true
}: {
  page: JournalPage;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  showCourseTag?: boolean;
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const isArtifact = !!page.artifact_name || page.entry_type === 'capstone';

  return (
    <Link href={`/journal/${page.id}`} className="group block h-full">
      <div className={`
        relative h-full flex flex-col p-5
        bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden transition-all duration-300
        hover:border-amber-500/30 hover:bg-zinc-900/80
        ${page.is_pinned ? 'border-amber-500/20 bg-amber-950/10' : ''}
        ${page.is_archived ? 'opacity-50 grayscale' : ''}
        ${isArtifact ? 'border-purple-500/20 bg-purple-950/10' : ''}
      `}>
        {/* Header line */}
        <div className="flex items-start justify-between mb-4">
          <div className="text-4xl filter drop-shadow-md">
            {page.icon || (page.is_archived ? '📦' : '📄')}
          </div>
          
          <div className="flex items-center gap-2">
            {page.is_pinned && <Pin className="w-4 h-4 text-amber-500 fill-amber-500/20" />}
            {page.is_archived && <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-medium">Archived</span>}
            {isArtifact && <Award className="w-4 h-4 text-purple-400" />}
          </div>
        </div>

        {/* Title & Meta */}
        <div className="flex-1 mb-6">
          <h3 className="text-lg font-bold text-zinc-100 group-hover:text-amber-400 transition-colors leading-snug mb-2 line-clamp-2">
            {page.title || 'Untitled Entry'}
          </h3>
          
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(page.updated_at)}
            </div>
            
            {showCourseTag && page.course_id && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-500/20">
                Workbook WK{page.week_number}
              </span>
            )}
            
            {page.entry_type && page.entry_type !== 'free' && !page.artifact_name && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase tracking-wider">
                {page.entry_type.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Tags */}
          {page.tags && page.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {page.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-black/40 border border-white/5 rounded text-zinc-400">
                  <Tag className="w-2.5 h-2.5" /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Inline Actions Toolbar (Hidden until hover) */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(); }}
            className={`p-1.5 rounded transition-colors ${page.is_pinned ? 'text-amber-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-amber-500 hover:bg-zinc-800'}`}
            title={page.is_pinned ? "Unpin" : "Pin to Top"}
          >
            <Pin className={`w-3.5 h-3.5 ${page.is_pinned ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleArchive(); }}
            className="p-1.5 text-zinc-400 hover:text-amber-500 hover:bg-zinc-800 rounded transition-colors"
            title={page.is_archived ? "Restore" : "Archive"}
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        
      </div>
    </Link>
  );
}
