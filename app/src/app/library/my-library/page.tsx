'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bookmark, 
  Folder, 
  FileText, 
  Calendar, 
  User, 
  Trash2,
  Edit3,
  BookOpen,
  Clock,
  CheckCircle2,
  X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface BookmarkedText {
  id: string;
  text_id: string;
  notes: string | null;
  created_at: string;
  texts: {
    id: string;
    title: string;
    author: string | null;
    year: number | null;
    type: string | null;
    domain: string | null;
    status: string;
  };
}

interface Collection {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  created_at: string;
  collection_items: {
    id: string;
    text_id: string;
    texts: {
      id: string;
      title: string;
      author: string | null;
      status: string;
    };
  }[];
}

interface ReadingProgress {
  id: string;
  text_id: string;
  progress_percent: number;
  completed: boolean;
  time_spent_seconds: number;
  updated_at: string;
  texts: {
    id: string;
    title: string;
    author: string | null;
    status: string;
  };
}

export default function MyLibraryPage() {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'collections' | 'progress'>('bookmarks');
  const [bookmarks, setBookmarks] = useState<BookmarkedText[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    icon: '📚',
    color: '#f59e0b',
    is_public: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, activeTab]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (!user) {
      window.location.href = '/login?redirect=/library/my-library';
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'bookmarks') {
        await fetchBookmarks();
      } else if (activeTab === 'collections') {
        await fetchCollections();
      } else if (activeTab === 'progress') {
        await fetchProgress();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    const response = await fetch('/api/bookmarks');
    if (response.ok) {
      const data = await response.json();
      setBookmarks(data.bookmarks || []);
    }
  };

  const fetchCollections = async () => {
    const response = await fetch('/api/collections?include_items=true');
    if (response.ok) {
      const data = await response.json();
      setCollections(data.collections || []);
    }
  };

  const fetchProgress = async () => {
    const response = await fetch('/api/reading-progress');
    if (response.ok) {
      const data = await response.json();
      setProgress(data.progress || []);
    }
  };

  const removeBookmark = async (textId: string) => {
    if (!confirm('Remove this bookmark?')) return;
    
    const response = await fetch(`/api/bookmarks?text_id=${textId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setBookmarks(bookmarks.filter((b) => b.text_id !== textId));
    }
  };

  const deleteCollection = async (collectionId: string) => {
    if (!confirm('Delete this collection? All items will be removed.')) return;

    const response = await fetch(`/api/collections?id=${collectionId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setCollections(collections.filter((c) => c.id !== collectionId));
    }
  };

  const openEditModal = (collection: Collection) => {
    setEditingCollection(collection);
    setEditForm({
      name: collection.name,
      description: collection.description || '',
      icon: collection.icon,
      color: collection.color,
      is_public: false, // Default to false as we don't have this field yet in the interface
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingCollection(null);
    setEditForm({
      name: '',
      description: '',
      icon: '📚',
      color: '#f59e0b',
      is_public: false,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollection) return;

    const response = await fetch(`/api/collections?id=${editingCollection.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });

    if (response.ok) {
      const { collection: updatedCollection } = await response.json();
      // Update the collection in the local state
      setCollections(collections.map((c) =>
        c.id === editingCollection.id
          ? { ...c, ...updatedCollection }
          : c
      ));
      closeEditModal();
    } else {
      alert('Failed to update collection');
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-amber-50">
      {/* Header */}
      <div className="border-b border-amber-900/20 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-amber-100">
              My Library
            </h1>
            <Link
              href="/library"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg text-sm font-medium transition-colors"
            >
              Browse Library
            </Link>
          </div>
          <p className="text-amber-100/60">
            Your personal collection of bookmarks, reading lists, and progress
          </p>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'bookmarks'
                  ? 'bg-amber-600/20 text-amber-400 ring-1 ring-amber-600/30'
                  : 'text-amber-100/60 hover:text-amber-100 hover:bg-zinc-800/50'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Bookmarks
            </button>
            <button
              onClick={() => setActiveTab('collections')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'collections'
                  ? 'bg-amber-600/20 text-amber-400 ring-1 ring-amber-600/30'
                  : 'text-amber-100/60 hover:text-amber-100 hover:bg-zinc-800/50'
              }`}
            >
              <Folder className="w-4 h-4" />
              Collections
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'progress'
                  ? 'bg-amber-600/20 text-amber-400 ring-1 ring-amber-600/30'
                  : 'text-amber-100/60 hover:text-amber-100 hover:bg-zinc-800/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Reading Progress
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-48 bg-zinc-900/30 border border-amber-900/20 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Bookmarks Tab */}
            {activeTab === 'bookmarks' && (
              <div>
                {bookmarks.length === 0 ? (
                  <div className="text-center py-16">
                    <Bookmark className="w-16 h-16 mx-auto mb-4 text-amber-100/20" />
                    <h3 className="text-lg font-medium text-amber-100 mb-2">
                      No bookmarks yet
                    </h3>
                    <p className="text-sm text-amber-100/60 mb-6">
                      Bookmark documents while browsing to save them here
                    </p>
                    <Link
                      href="/library"
                      className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Browse Library
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {bookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="bg-zinc-900/50 border border-amber-900/20 rounded-lg hover:border-amber-800/50 transition-all flex flex-col md:flex-row overflow-hidden"
                      >
                        {/* Icon Section */}
                        <div className="md:w-24 w-full h-32 md:h-auto bg-zinc-800/50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-12 h-12 text-amber-600" />
                        </div>

                        {/* Content Section - Scrollable */}
                        <div className="flex-1 p-4 overflow-y-auto max-h-40 space-y-2">
                          <div className="flex items-start justify-between mb-2">
                            <Link href={`/library/${bookmark.text_id}`} className="flex-1">
                              <h3 className="text-base font-semibold text-amber-100 line-clamp-2 hover:text-amber-400 transition-colors">
                                {bookmark.texts.title}
                              </h3>
                            </Link>
                            <button
                              onClick={() => removeBookmark(bookmark.text_id)}
                              className="text-red-400 hover:text-red-300 transition-colors ml-2"
                              title="Remove bookmark"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {bookmark.texts.author && (
                            <div className="flex items-center gap-2 text-xs text-amber-100/60">
                              <User className="w-3 h-3" />
                              <span>{bookmark.texts.author}</span>
                            </div>
                          )}

                          {bookmark.notes && (
                            <p className="text-xs text-amber-100/60 line-clamp-2">
                              {bookmark.notes}
                            </p>
                          )}

                          <div className="text-xs text-amber-100/40 pt-1">
                            Bookmarked {formatDate(bookmark.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Collections Tab */}
            {activeTab === 'collections' && (
              <div>
                {collections.length === 0 ? (
                  <div className="text-center py-16">
                    <Folder className="w-16 h-16 mx-auto mb-4 text-amber-100/20" />
                    <h3 className="text-lg font-medium text-amber-100 mb-2">
                      No collections yet
                    </h3>
                    <p className="text-sm text-amber-100/60 mb-6">
                      Create collections to organize your documents
                    </p>
                    <Link
                      href="/library"
                      className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Browse Library
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {collections.map((collection) => (
                      <div
                        key={collection.id}
                        className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6 hover:border-amber-800/50 transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{collection.icon}</span>
                            <div>
                              <h3 className="text-lg font-semibold text-amber-100">
                                {collection.name}
                              </h3>
                              {collection.description && (
                                <p className="text-sm text-amber-100/60">
                                  {collection.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(collection)}
                              className="text-amber-400 hover:text-amber-300 transition-colors"
                              title="Edit collection"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteCollection(collection.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Delete collection"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm text-amber-100/60 mb-3">
                            {collection.collection_items.length} document
                            {collection.collection_items.length !== 1 ? 's' : ''}
                          </div>

                          {collection.collection_items.slice(0, 5).map((item) => (
                            <Link
                              key={item.id}
                              href={`/library/${item.text_id}`}
                              className="block px-3 py-2 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-md transition-colors"
                            >
                              <div className="text-sm text-amber-100 line-clamp-1">
                                {item.texts.title}
                              </div>
                              {item.texts.author && (
                                <div className="text-xs text-amber-100/60">
                                  {item.texts.author}
                                </div>
                              )}
                            </Link>
                          ))}

                          {collection.collection_items.length > 5 && (
                            <div className="text-xs text-amber-100/40 text-center pt-2">
                              +{collection.collection_items.length - 5} more
                            </div>
                          )}
                        </div>

                        <div className="mt-4 text-xs text-amber-100/40">
                          Created {formatDate(collection.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reading Progress Tab */}
            {activeTab === 'progress' && (
              <div>
                {progress.length === 0 ? (
                  <div className="text-center py-16">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-amber-100/20" />
                    <h3 className="text-lg font-medium text-amber-100 mb-2">
                      No reading progress yet
                    </h3>
                    <p className="text-sm text-amber-100/60 mb-6">
                      Start reading documents to track your progress
                    </p>
                    <Link
                      href="/library"
                      className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Browse Library
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {progress.map((item) => (
                      <Link
                        key={item.id}
                        href={`/library/${item.text_id}`}
                        className="bg-zinc-900/50 border border-amber-900/20 rounded-lg hover:border-amber-800/50 transition-all flex flex-col md:flex-row overflow-hidden"
                      >
                        {/* Icon Section */}
                        <div className="md:w-24 w-full h-32 md:h-auto bg-zinc-800/50 flex items-center justify-center flex-shrink-0 relative">
                          <BookOpen className="w-12 h-12 text-amber-600" />
                          {item.completed && (
                            <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-emerald-400" />
                          )}
                        </div>

                        {/* Content Section - Scrollable */}
                        <div className="flex-1 p-4 overflow-y-auto max-h-40 space-y-2">
                          <h3 className="text-base font-semibold text-amber-100 line-clamp-2">
                            {item.texts.title}
                          </h3>

                          {item.texts.author && (
                            <div className="flex items-center gap-2 text-xs text-amber-100/60">
                              <User className="w-3 h-3" />
                              <span>{item.texts.author}</span>
                            </div>
                          )}

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-amber-100/60">
                              <span>Progress</span>
                              <span>{Math.round(item.progress_percent)}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-300"
                                style={{ width: `${item.progress_percent}%` }}
                              />
                            </div>
                          </div>

                          {/* Time Spent */}
                          {item.time_spent_seconds > 0 && (
                            <div className="flex items-center gap-2 text-xs text-amber-100/40">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(item.time_spent_seconds)} read</span>
                            </div>
                          )}

                          <div className="text-xs text-amber-100/40">
                            Last read {formatDate(item.updated_at)}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Collection Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-amber-900/30 rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-amber-900/20">
              <h2 className="text-2xl font-bold text-amber-100">Edit Collection</h2>
              <button
                onClick={closeEditModal}
                className="text-amber-100/60 hover:text-amber-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              {/* Collection Name */}
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-amber-100 mb-2">
                  Collection Name *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-950 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/30 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none transition-colors"
                  placeholder="My Collection"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-amber-100 mb-2">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-950 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/30 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none transition-colors resize-none"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-sm font-medium text-amber-100 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {['📚', '⭐', '❤️', '🔖', '📖', '✨', '🌟', '💎', '🎯', '🔥'].map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, icon })}
                      className={`text-3xl p-3 rounded-lg transition-all ${
                        editForm.icon === icon
                          ? 'bg-amber-600/20 ring-2 ring-amber-600/50 scale-110'
                          : 'bg-zinc-950 hover:bg-zinc-800 hover:scale-105'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-sm font-medium text-amber-100 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { name: 'Amber', value: '#f59e0b' },
                    { name: 'Red', value: '#ef4444' },
                    { name: 'Orange', value: '#f97316' },
                    { name: 'Green', value: '#22c55e' },
                    { name: 'Blue', value: '#3b82f6' },
                    { name: 'Purple', value: '#a855f7' },
                    { name: 'Pink', value: '#ec4899' },
                    { name: 'Cyan', value: '#06b6d4' },
                    { name: 'Emerald', value: '#10b981' },
                    { name: 'Indigo', value: '#6366f1' },
                    { name: 'Rose', value: '#f43f5e' },
                    { name: 'Teal', value: '#14b8a6' },
                  ].map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, color: color.value })}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        editForm.color === color.value
                          ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-900 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editForm.name.trim()}
                  className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

