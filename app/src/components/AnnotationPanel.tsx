'use client';

import { useState, useEffect, useCallback } from 'react';
import { Highlighter, MessageSquare, Trash2, Edit3, Save, X, Sparkles } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';

interface Annotation {
  id: string;
  quote: string;
  note: string | null;
  position: any;
  category: 'general' | 'important' | 'question' | 'insight' | 'to-research' | 'quote' | 'critique';
  highlight_color: 'yellow' | 'green' | 'blue' | 'pink' | 'red' | 'purple' | 'orange';
  created_at: string;
}

const ANNOTATION_CATEGORIES = [
  { value: 'general', label: '📝 General', color: 'gray', defaultHighlight: 'yellow' },
  { value: 'important', label: '⭐ Important', color: 'red', defaultHighlight: 'red' },
  { value: 'question', label: '❓ Question', color: 'blue', defaultHighlight: 'blue' },
  { value: 'insight', label: '💡 Insight', color: 'yellow', defaultHighlight: 'yellow' },
  { value: 'to-research', label: '🔍 To Research', color: 'purple', defaultHighlight: 'purple' },
  { value: 'quote', label: '💬 Quote', color: 'green', defaultHighlight: 'green' },
  { value: 'critique', label: '🎯 Critique', color: 'orange', defaultHighlight: 'orange' },
] as const;

const HIGHLIGHT_COLORS = [
  { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-500', preview: 'rgba(234, 179, 8, 0.3)' },
  { value: 'green', label: 'Green', bg: 'bg-green-500', preview: 'rgba(34, 197, 94, 0.3)' },
  { value: 'blue', label: 'Blue', bg: 'bg-blue-500', preview: 'rgba(59, 130, 246, 0.3)' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-500', preview: 'rgba(236, 72, 153, 0.3)' },
  { value: 'red', label: 'Red', bg: 'bg-red-500', preview: 'rgba(239, 68, 68, 0.3)' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-500', preview: 'rgba(168, 85, 247, 0.3)' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-500', preview: 'rgba(249, 115, 22, 0.3)' },
] as const;

interface AnnotationPanelProps {
  textId: string;
  showAddForm?: boolean;
  onAnnotationAdded?: () => void;
  selectedText?: string | null;
  selectedPosition?: any;
  onSelectionCleared?: () => void;
  documentTitle?: string;
}

export default function AnnotationPanel({
  textId,
  showAddForm = false,
  onAnnotationAdded,
  selectedText = null,
  selectedPosition = null,
  onSelectionCleared,
  documentTitle,
}: AnnotationPanelProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  
  // Add annotation form state
  const [showForm, setShowForm] = useState(showAddForm);
  const [newQuote, setNewQuote] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newCategory, setNewCategory] = useState<Annotation['category']>('general');
  const [newHighlightColor, setNewHighlightColor] = useState<Annotation['highlight_color']>('yellow');
  const [newPosition, setNewPosition] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Filter state
  const [filterCategory, setFilterCategory] = useState<Annotation['category'] | 'all'>('all');
  
  // Convergence Machine modal state
  const [showConvergenceModal, setShowConvergenceModal] = useState(false);

  // Update highlight color when category changes
  useEffect(() => {
    const categoryInfo = ANNOTATION_CATEGORIES.find((c) => c.value === newCategory);
    if (categoryInfo) {
      setNewHighlightColor(categoryInfo.defaultHighlight as Annotation['highlight_color']);
    }
  }, [newCategory]);

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
          category: newCategory,
          highlight_color: newHighlightColor,
          position: newPosition || {},
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnnotations([data.annotation, ...annotations]);
        setNewQuote('');
        setNewNote('');
        setNewCategory('general');
        setNewHighlightColor('yellow');
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
              setNewCategory('general');
              setNewHighlightColor('yellow');
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

      {/* Convergence Machine Placeholder Button (only for The Kybalion) */}
      {documentTitle === 'The Kybalion' && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-900/20 via-amber-900/20 to-purple-900/20 border border-purple-600/30 rounded-lg">
          <button
            onClick={() => setShowConvergenceModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white rounded-lg font-medium transition-all transform hover:scale-[1.02]"
          >
            <Sparkles className="w-5 h-5" />
            Explore in Convergence Machine
          </button>
          <p className="text-xs text-amber-100/60 mt-2 text-center">
            Experience The Kybalion through 7 unique analytical lenses
          </p>
        </div>
      )}

      {/* Convergence Machine Coming Soon Modal */}
      {showConvergenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowConvergenceModal(false)}>
          <div className="bg-zinc-900 border-2 border-purple-600/50 rounded-xl p-6 max-w-lg mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-8 h-8 text-purple-400" />
              <h3 className="text-2xl font-bold text-amber-100">Convergence Machine</h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className="text-amber-100/80 leading-relaxed">
                The <span className="font-semibold text-purple-400">Convergence Machine</span> will allow you to explore The Kybalion through seven unique analytical lenses:
              </p>
              
              <ul className="space-y-2 text-sm text-amber-100/70">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span><strong className="text-amber-100">Philosophical:</strong> Examine core concepts and logical frameworks</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span><strong className="text-amber-100">Symbolic/Occult:</strong> Decode esoteric symbols and hidden meanings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span><strong className="text-amber-100">Religious/Spiritual:</strong> Explore theological dimensions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span><strong className="text-amber-100">Historical/Anthropological:</strong> Trace cultural origins and influences</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span><strong className="text-amber-100">Psychological:</strong> Analyze mental and cognitive aspects</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span><strong className="text-amber-100">Scientific:</strong> Compare with modern scientific understanding</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span><strong className="text-amber-100">Literary:</strong> Appreciate language, style, and narrative structure</span>
                </li>
              </ul>
              
              <p className="text-amber-100/80 leading-relaxed">
                Highlight any passage in The Kybalion to trigger AI-powered analysis across all seven perspectives, revealing deep interconnections and insights.
              </p>
              
              <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-3">
                <p className="text-xs text-purple-300">
                  <strong className="block mb-1">Coming Soon</strong>
                  This feature is currently in development and will be available in a future update. Check back soon!
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowConvergenceModal(false)}
              className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      {annotations.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-amber-100/60">Filter:</span>
          <button
            onClick={() => setFilterCategory('all')}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              filterCategory === 'all'
                ? 'bg-amber-600 text-white'
                : 'bg-zinc-800 text-amber-100/60 hover:bg-zinc-700'
            }`}
          >
            All ({annotations.length})
          </button>
          {ANNOTATION_CATEGORIES.map((cat) => {
            const count = annotations.filter((a) => a.category === cat.value).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(cat.value as Annotation['category'])}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  filterCategory === cat.value
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-800 text-amber-100/60 hover:bg-zinc-700'
                }`}
              >
                {cat.label.split(' ')[0]} {count}
              </button>
            );
          })}
        </div>
      )}

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
              Category *
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as Annotation['category'])}
              className="w-full px-3 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-md text-amber-100 focus:outline-none focus:border-amber-600/50 text-sm"
            >
              {ANNOTATION_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-amber-100/60 mb-2">
              Highlight Color *
            </label>
            <div className="flex gap-2">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setNewHighlightColor(color.value as Annotation['highlight_color'])}
                  className={`w-10 h-10 rounded-md border-2 transition-all ${
                    newHighlightColor === color.value
                      ? 'border-amber-400 scale-110'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                  style={{ backgroundColor: color.preview }}
                  title={color.label}
                  aria-label={`Select ${color.label} highlight color`}
                >
                  <span className="sr-only">{color.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-amber-100/40 mt-1">
              Selected: {HIGHLIGHT_COLORS.find((c) => c.value === newHighlightColor)?.label}
            </p>
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
                setNewCategory('general');
                setNewHighlightColor('yellow');
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
          {annotations
            .filter((a) => filterCategory === 'all' || a.category === filterCategory)
            .map((annotation) => {
              const categoryInfo = ANNOTATION_CATEGORIES.find((c) => c.value === annotation.category);
              const categoryColor = categoryInfo?.color || 'gray';
              
              return (
            <div
              key={annotation.id}
              className="p-4 bg-zinc-800/30 border border-amber-900/10 rounded-lg space-y-2"
            >
              {/* Category Badge */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    categoryColor === 'red' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    categoryColor === 'blue' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    categoryColor === 'yellow' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                    categoryColor === 'purple' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                    categoryColor === 'green' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    categoryColor === 'orange' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    'bg-zinc-700/50 text-zinc-400 border border-zinc-600/20'
                  }`}
                >
                  {categoryInfo?.label}
                </span>
              </div>
              
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
          );
        })}
        </div>
      )}
    </div>
  );
}

