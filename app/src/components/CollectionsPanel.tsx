'use client';

import { useState, useEffect } from 'react';
import { FolderPlus, Folder, Plus, Check, X } from 'lucide-react';

interface Collection {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  created_at: string;
}

interface CollectionsPanelProps {
  textId: string;
  mode?: 'manage' | 'add';
  onCollectionChange?: () => void;
}

export default function CollectionsPanel({
  textId,
  mode = 'add',
  onCollectionChange,
}: CollectionsPanelProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [textCollections, setTextCollections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Create form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState('📚');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/collections?include_items=true');
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
        
        // Find which collections contain this text
        const textColls = data.collections
          .filter((c: any) => 
            c.collection_items?.some((item: any) => item.text_id === textId)
          )
          .map((c: any) => c.id);
        setTextCollections(textColls);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCollection = async () => {
    if (!newName.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          icon: newIcon,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCollections([data.collection, ...collections]);
        setNewName('');
        setNewDescription('');
        setNewIcon('📚');
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Error creating collection:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCollection = async (collectionId: string) => {
    const isInCollection = textCollections.includes(collectionId);

    try {
      if (isInCollection) {
        // Remove from collection
        const response = await fetch(
          `/api/collections/items?collection_id=${collectionId}&text_id=${textId}`,
          { method: 'DELETE' }
        );

        if (response.ok) {
          setTextCollections(textCollections.filter((id) => id !== collectionId));
          onCollectionChange?.();
        }
      } else {
        // Add to collection
        const response = await fetch('/api/collections/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collection_id: collectionId,
            text_id: textId,
          }),
        });

        if (response.ok) {
          setTextCollections([...textCollections, collectionId]);
          onCollectionChange?.();
        }
      }
    } catch (error) {
      console.error('Error toggling collection:', error);
    }
  };

  const iconOptions = ['📚', '⭐', '❤️', '🔖', '📖', '✨', '🌟', '💎', '🎯', '🔥'];

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6 animate-pulse">
        <div className="h-32 bg-zinc-800/50 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-amber-100 flex items-center gap-2">
          <Folder className="w-5 h-5 text-amber-600" />
          Collections
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="text-xs px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 rounded-md transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          {showCreateForm ? 'Cancel' : 'New Collection'}
        </button>
      </div>

      {/* Create Collection Form */}
      {showCreateForm && (
        <div className="mb-4 p-4 bg-zinc-800/50 border border-amber-900/10 rounded-lg space-y-3">
          <div>
            <label className="block text-sm text-amber-100/60 mb-2">
              Collection Name *
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Must Read, Favorites, Research..."
              className="w-full px-3 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-md text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-amber-100/60 mb-2">
              Description (Optional)
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Brief description..."
              className="w-full px-3 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-md text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-amber-100/60 mb-2">
              Icon
            </label>
            <div className="flex gap-2">
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setNewIcon(icon)}
                  className={`w-10 h-10 rounded-md text-xl transition-all ${
                    newIcon === icon
                      ? 'bg-amber-600/20 ring-2 ring-amber-600/50'
                      : 'bg-zinc-800/50 hover:bg-zinc-800'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={createCollection}
              disabled={!newName.trim() || submitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Collection'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewName('');
                setNewDescription('');
                setNewIcon('📚');
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-md text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Collections List */}
      {collections.length === 0 ? (
        <div className="text-center py-8">
          <FolderPlus className="w-12 h-12 mx-auto mb-3 text-amber-100/20" />
          <p className="text-sm text-amber-100/60 mb-3">
            No collections yet. Create your first collection to organize your library.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {collections.map((collection) => {
            const isInCollection = textCollections.includes(collection.id);
            
            return (
              <button
                key={collection.id}
                onClick={() => toggleCollection(collection.id)}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  isInCollection
                    ? 'bg-amber-600/10 border-amber-600/30 ring-1 ring-amber-600/20'
                    : 'bg-zinc-800/30 border-amber-900/10 hover:bg-zinc-800/50'
                } border`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{collection.icon}</span>
                    <div>
                      <h4 className="text-sm font-medium text-amber-100">
                        {collection.name}
                      </h4>
                      {collection.description && (
                        <p className="text-xs text-amber-100/60 mt-0.5">
                          {collection.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {isInCollection ? (
                      <Check className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Plus className="w-5 h-5 text-amber-100/40" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

