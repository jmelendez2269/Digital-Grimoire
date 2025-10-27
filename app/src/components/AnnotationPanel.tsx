'use client';

import { useState, useEffect, useCallback } from 'react';
import { Highlighter, MessageSquare, Trash2, Edit3, Save, X } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';

interface Annotation {
  id: string;
  quote: string;
  note: string | null;
  position: any;
  created_at: string;
}

interface AnnotationPanelProps {
  textId: string;
  showAddForm?: boolean;
  onAnnotationAdded?: () => void;
  selectedText?: string | null;
  selectedPosition?: any;
  onSelectionCleared?: () => void;
}

export default function AnnotationPanel({
  textId,
  showAddForm = false,
  onAnnotationAdded,
  selectedText = null,
  selectedPosition = null,
  onSelectionCleared,
}: AnnotationPanelProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  
  // Add annotation form state
  const [showForm, setShowForm] = useState(showAddForm);
  const [newQuote, setNewQuote] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newPosition, setNewPosition] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-populate form when text is selected in PDF
  useEffect(() => {
    if (selectedText && selectedText.length > 0) {
      setNewQuote(selectedText);
      setNewPosition(selectedPosition);
      setShowForm(true);
    }
  }, [selectedText, selectedPosition]);

  const fetchAnnotations = useCallback(async () => {
    try {
      const response = await fetch(`/api/annotations?text_id=${textId}`);
      if (response.ok) {
        const data = await response.json();
        setAnnotations(data.annotations || []);
      }
    } catch (error) {
      console.error('Error fetching annotations:', error);
    } finally {
      setLoading(false);
    }
  }, [textId]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const addAnnotation = async () => {
    if (!newQuote.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_id: textId,
          quote: newQuote.trim(),
          note: newNote.trim() || null,
          position: newPosition || {},
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnnotations([data.annotation, ...annotations]);
        setNewQuote('');
        setNewNote('');
        setNewPosition(null);
        setShowForm(false);
        onAnnotationAdded?.();
        onSelectionCleared?.();
      }
    } catch (error) {
      console.error('Error adding annotation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const updateAnnotation = async (id: string, note: string) => {
    try {
      const response = await fetch(`/api/annotations?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnnotations(
          annotations.map((ann) =>
            ann.id === id ? data.annotation : ann
          )
        );
        setEditingId(null);
      }
    } catch (error) {
      console.error('Error updating annotation:', error);
    }
  };

  const deleteAnnotation = async (id: string) => {
    if (!confirm('Delete this annotation?')) return;

    try {
      const response = await fetch(`/api/annotations?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAnnotations(annotations.filter((ann) => ann.id !== id));
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6 animate-pulse">
        <div className="h-40 bg-zinc-800/50 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-amber-100 flex items-center gap-2">
          <Highlighter className="w-5 h-5 text-amber-600" />
          Annotations & Highlights
        </h3>
        <button
          onClick={() => {
            if (showForm) {
              setNewQuote('');
              setNewNote('');
              setNewPosition(null);
              onSelectionCleared?.();
            }
            setShowForm(!showForm);
          }}
          className="text-xs px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 rounded-md transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Note'}
        </button>
      </div>

      {/* Add Annotation Form */}
      {showForm && (
        <div className="mb-4 p-4 bg-zinc-800/50 border border-amber-900/10 rounded-lg space-y-3">
          <div>
            <label className="block text-sm text-amber-100/60 mb-2">
              Highlighted Text *
            </label>
            <textarea
              value={newQuote}
              onChange={(e) => setNewQuote(e.target.value)}
              placeholder="Select text in PDF or paste here..."
              className="w-full px-3 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-md text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 text-sm resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm text-amber-100/60 mb-2">
              Your Note (Optional)
            </label>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add your thoughts or commentary..."
              className="w-full px-3 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-md text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 text-sm resize-none"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addAnnotation}
              disabled={!newQuote.trim() || submitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
            >
              {submitting ? 'Saving...' : 'Save Annotation'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setNewQuote('');
                setNewNote('');
                setNewPosition(null);
                onSelectionCleared?.();
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-md text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Annotations List */}
      {annotations.length === 0 ? (
        <div className="text-center py-8">
          <Highlighter className="w-12 h-12 mx-auto mb-3 text-amber-100/20" />
          <p className="text-sm text-amber-100/60">
            No annotations yet. Highlight text and add your notes while reading.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              className="p-4 bg-zinc-800/30 border border-amber-900/10 rounded-lg space-y-2"
            >
              {/* Quoted Text */}
              <div className="pl-3 border-l-2 border-amber-600/50">
                <p className="text-sm text-amber-100/90 italic">
                  "{annotation.quote}"
                </p>
              </div>

              {/* Note */}
              {editingId === annotation.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-md text-amber-100 text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateAnnotation(annotation.id, editNote)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditNote('');
                      }}
                      className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-amber-100 rounded text-xs font-medium flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : annotation.note ? (
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-100/70 flex-1">
                    {annotation.note}
                  </p>
                </div>
              ) : null}

              {/* Actions & Date */}
              <div className="flex items-center justify-between pt-2 border-t border-amber-900/10">
                <span className="text-xs text-amber-100/40">
                  {formatDate(annotation.created_at)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(annotation.id);
                      setEditNote(annotation.note || '');
                    }}
                    className="text-amber-400 hover:text-amber-300 transition-colors"
                    title="Edit note"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteAnnotation(annotation.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Delete annotation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

