'use client';

import { useState, useCallback, useEffect } from 'react';
import { BookOpen, Sparkles, Loader2 } from 'lucide-react';

export interface TOCItem {
  id: string;
  title: string;
  level: number; // 1 for top-level, 2 for nested, etc.
  pageNumber?: number; // For PDFs
  volume?: 'science' | 'religion'; // For volume separation
  titleGenerated?: boolean; // Track if title was AI-generated
}

interface TableOfContentsProps {
  items: TOCItem[];
  activeItemId?: string;
  onItemClick: (item: TOCItem) => void;
  chapters?: Array<{ id: string; title: string; content: string; volume?: 'science' | 'religion' }>; // Full chapter data for AI generation
  documentTitle?: string; // Document title for AI generation context
  textId?: string; // Document ID for saving
  isAdmin?: boolean; // Whether user is admin
  onItemsUpdate?: (updatedItems: TOCItem[]) => void; // Callback to update items after AI generation
}

export default function TableOfContents({
  items: initialItems,
  activeItemId,
  onItemClick,
  chapters,
  documentTitle,
  textId,
  isAdmin = false,
  onItemsUpdate,
}: TableOfContentsProps) {
  const [items, setItems] = useState<TOCItem[]>(initialItems);
  const [isGeneratingNames, setIsGeneratingNames] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update items when initialItems change
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Handler for generating chapter names
  const handleGenerateChapterNames = useCallback(async () => {
    if (!chapters || chapters.length === 0) {
      alert('Chapter content not available for AI generation.');
      return;
    }

    setIsGeneratingNames(true);
    try {
      const response = await fetch('/api/chapters/generate-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapters: chapters,
          documentTitle: documentTitle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate chapter names');
      }

      const data = await response.json();
      
      // Map generated chapter names back to TOCItems
      const updatedItems = items.map((item) => {
        const updatedChapter = data.chapters.find((ch: any) => ch.id === item.id);
        if (updatedChapter) {
          return {
            ...item,
            title: updatedChapter.title.replace(/^Chapter\s+[IVX]+:\s*/i, '').trim() || item.title,
            titleGenerated: updatedChapter.titleGenerated || false,
            volume: updatedChapter.volume || item.volume,
          };
        }
        return item;
      });

      setItems(updatedItems);
      
      // If admin and textId provided, save to database
      if (isAdmin && textId && data.chapters) {
        setIsSaving(true);
        try {
          const saveResponse = await fetch('/api/chapters/update-names', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              textId: textId,
              chapters: data.chapters,
            }),
          });

          if (!saveResponse.ok) {
            const errorData = await saveResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to save chapter names');
          }

          const saveData = await saveResponse.json();
          console.log('Chapter names saved successfully:', saveData);
          
          // Update local items with saved data
          const savedItems = updatedItems.map((item) => {
            const savedChapter = saveData.chapters.find((ch: any) => ch.id === item.id);
            if (savedChapter) {
              return {
                ...item,
                title: savedChapter.title.replace(/^Chapter\s+[IVX]+:\s*/i, '').trim() || item.title,
                titleGenerated: savedChapter.titleGenerated || false,
                volume: savedChapter.volume || item.volume,
              };
            }
            return item;
          });
          
          setItems(savedItems);
          
          // Notify parent component
          if (onItemsUpdate) {
            onItemsUpdate(savedItems);
          }
        } catch (saveError: any) {
          console.error('Error saving chapter names:', saveError);
          alert(`Generated names successfully, but failed to save: ${saveError.message}. You may need to refresh the page.`);
        } finally {
          setIsSaving(false);
        }
      } else {
        // Notify parent component if callback provided (non-admin or no textId)
        if (onItemsUpdate) {
          onItemsUpdate(updatedItems);
        }
      }
    } catch (error: any) {
      console.error('Error generating chapter names:', error);
      alert(`Failed to generate chapter names: ${error.message}. Please try again.`);
    } finally {
      setIsGeneratingNames(false);
    }
  }, [chapters, documentTitle, items, onItemsUpdate, isAdmin, textId]);

  // Don't render if no items
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-amber-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-600" />
          Table of Contents
        </h3>
        {/* AI Generate Button - only show for admins with chapters available */}
        {isAdmin && chapters && chapters.length > 0 && (
          <button
            onClick={handleGenerateChapterNames}
            disabled={isGeneratingNames || isSaving}
            className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            title="Generate and save chapter names using AI (Admin only)"
          >
            {isGeneratingNames || isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {isGeneratingNames ? 'Generating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Generate & Save
              </>
            )}
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto pr-2">
        <nav className="space-y-1">
          {items.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              onClick={() => onItemClick(item)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                item.id === activeItemId
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                  : 'text-amber-100/80 hover:bg-zinc-900/70 hover:text-amber-100 border border-transparent'
              }`}
              style={{
                paddingLeft: `${12 + (item.level - 1) * 16}px`,
              }}
            >
              <span className="text-sm leading-relaxed flex items-center">
                {item.title}
                {item.titleGenerated && (
                  <span className="ml-2 text-xs text-purple-400" title="AI-generated title">
                    ✨
                  </span>
                )}
                {item.pageNumber && (
                  <span className="ml-2 text-xs text-amber-100/50">
                    (p. {item.pageNumber})
                  </span>
                )}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

