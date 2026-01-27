'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Link2, ChevronDown, ChevronUp, BookOpen, Sparkles, Loader2, FileText, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAllLenses, getActiveLenses } from '@/lib/convergence/lenses';
import { LensWeights } from '@/lib/convergence/lens-orchestrator';
import ExpandableLensCard from './ExpandableLensCard';
import SourceCard from './SourceCard';

interface Source {
  text_id: string;
  text_title?: string;
  text_author?: string;
  chunk_id?: string;
  chunk_index?: number;
  relevance?: number;
  content_preview?: string;
}

interface LensResponse {
  lens: string;
  lensName: string;
  content: string;
  sources: Source[];
}

interface ResponseStreamProps {
  response: {
    query: string;
    responses: LensResponse[];
    synthesis: string;
    sources: Source[];
  } | null;
  isStreaming: boolean;
  query?: string;
  lensWeights?: LensWeights;
  responseLength?: 'short' | 'medium' | 'long';
  onLensExpand?: (lensId: string) => void;
}

interface JournalPage {
  id: string;
  title: string;
  icon: string;
  updated_at: string;
}

export default function ResponseStream({
  response,
  isStreaming,
  query = '',
  lensWeights,
  responseLength = 'short',
  onLensExpand
}: ResponseStreamProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedLenses, setExpandedLenses] = useState<Set<string>>(new Set());
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMode, setSaveMode] = useState<'new' | 'existing'>('new');
  const [existingPages, setExistingPages] = useState<JournalPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [loadingPages, setLoadingPages] = useState(false);
  const [showNavigateModal, setShowNavigateModal] = useState(false);
  const [savedPageId, setSavedPageId] = useState<string | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [showLensWeights, setShowLensWeights] = useState(false);

  // localStorage functions
  const getNavigatePreference = (): boolean => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('convergence_navigate_after_save');
    return stored === 'true';
  };

  const setNavigatePreference = (value: boolean) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('convergence_navigate_after_save', value.toString());
    setDontAskAgain(value);
  };

  // Navigation handler
  const handleNavigate = () => {
    if (savedPageId) {
      setShowNavigateModal(false);
      router.push(`/journal/${savedPageId}`);
    }
  };

  // Load preference on mount
  useEffect(() => {
    const preference = getNavigatePreference();
    setDontAskAgain(preference);
  }, []);

  // Helper function to calculate lens weight bars
  const getLensWeightBars = (lensWeights: LensWeights) => {
    const activeLenses = getActiveLenses(lensWeights);
    if (activeLenses.length === 0) return [];

    // Create short abbreviations for each lens
    const lensAbbrev: Record<string, string> = {
      'Scientific': 'Sci',
      'Psychological': 'Psy',
      'Philosophical': 'Phi',
      'Religious/Spiritual': 'Rel',
      'Historical/Anthropological': 'Hist',
      'Symbolic/Occult': 'Sym',
      'Mathematical': 'Math'
    };

    const maxWeight = Math.max(...activeLenses.map(l => lensWeights[l.id as keyof LensWeights] || 0), 1);
    const maxBarLength = 20;

    return activeLenses
      .map(lens => {
        const weight = lensWeights[lens.id as keyof LensWeights] || 0;
        const barSize = Math.max(1, Math.round((weight / maxWeight) * maxBarLength));
        return {
          abbrev: lensAbbrev[lens.name] || lens.name.substring(0, 4),
          weight,
          barSize
        };
      })
      .sort((a, b) => b.weight - a.weight);
  };

  if (!response && !isStreaming) {
    return null;
  }

  const handleCopy = async () => {
    if (!response) return;

    const fullText = [
      `Query: ${response.query}`,
      '',
      `## Synthesis\n\n${response.synthesis}`,
      '',
      ...(response.responses || []).map(r => `## ${r.lensName}\n\n${r.content}`),
      '',
      '## Sources',
      ...response.sources.map((s, idx) => `${idx + 1}. ${s.text_title || 'Unknown'}${s.text_author ? ` by ${s.text_author}` : ''}`),
    ].join('\n\n');

    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert plain text with markdown-style headers to Tiptap JSON format
  const convertTextToTiptap = (text: string) => {
    const lines = text.split('\n');
    const content: any[] = [];
    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ').trim(); // Join with space instead of newline
        if (text) {
          content.push({
            type: 'paragraph',
            content: [{ type: 'text', text }]
          });
        }
        currentParagraph = [];
      }
    };

    for (const line of lines) {
      // Check for headers (## or ###)
      if (line.startsWith('## ')) {
        flushParagraph();
        const headingText = line.substring(3).trim();
        if (headingText) {
          content.push({
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: headingText }]
          });
        }
      } else if (line.startsWith('### ')) {
        flushParagraph();
        const headingText = line.substring(4).trim();
        if (headingText) {
          content.push({
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: headingText }]
          });
        }
      } else if (line.trim() === '') {
        flushParagraph();
      } else {
        currentParagraph.push(line);
      }
    }
    flushParagraph();

    // Filter out any invalid nodes and ensure we have valid content
    const validContent = content.filter((node: any) => {
      // Headings are always valid if they have text
      if (node.type === 'heading' && node.content && node.content.length > 0) {
        return true;
      }
      // Paragraphs must have at least one text node with non-empty text
      if (node.type === 'paragraph') {
        if (!node.content || node.content.length === 0) {
          return false;
        }
        const hasText = node.content.some((child: any) =>
          child.type === 'text' && child.text && child.text.trim().length > 0
        );
        return hasText;
      }
      return true; // Keep other node types
    });

    // Ensure we always have at least one valid content node
    if (validContent.length === 0) {
      validContent.push({
        type: 'paragraph',
        content: [{ type: 'text', text: 'No content' }]
      });
    }

    return {
      type: 'doc',
      content: validContent
    };
  };

  const handleSaveToNote = async () => {
    if (!response) return;

    // Show modal to let user choose
    setShowSaveModal(true);

    // Fetch existing pages
    setLoadingPages(true);
    try {
      const pagesResponse = await fetch('/api/journal?include_archived=false');
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        setExistingPages(pagesData.pages || []);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoadingPages(false);
    }
  };

  const performSave = async () => {
    if (!response) return;

    setSaving(true);
    setSaved(false);

    try {
      // Add lens weights data if available
      let lensWeightsSection = '';
      if (lensWeights) {
        const activeLenses = getActiveLenses(lensWeights);
        if (activeLenses.length > 0) {
          // Save lens weights as JSON data that can be parsed later
          lensWeightsSection = `\n\n<!-- LENS_WEIGHTS_DATA:${JSON.stringify(lensWeights)} -->\n`;
        }
      }

      // Format the response content
      const fullText = [
        `Query: ${response.query}${lensWeightsSection}`,
        '',
        `## Synthesis`,
        '',
        response.synthesis,
        '',
        ...(response.responses || []).flatMap(r => [
          `## ${r.lensName}`,
          '',
          r.content,
          ''
        ]),
        '## Sources',
        ...response.sources.map((s, idx) => `${idx + 1}. ${s.text_title || 'Unknown'}${s.text_author ? ` by ${s.text_author}` : ''}`),
      ].join('\n');

      // Convert to Tiptap format
      const newContent = convertTextToTiptap(fullText);

      // Validate content structure
      if (!newContent || !newContent.type || newContent.type !== 'doc' || !Array.isArray(newContent.content)) {
        console.error('Invalid Tiptap content structure:', newContent);
        throw new Error('Failed to convert content to valid format');
      }

      // Debug: Log content structure to help diagnose issues
      console.log('Saving content structure:', {
        type: newContent.type,
        contentLength: newContent.content.length,
        firstNode: newContent.content[0],
        fullStructure: JSON.stringify(newContent, null, 2).substring(0, 500)
      });

      // Ensure content has at least one non-empty node
      const hasValidContent = newContent.content.some((node: any) => {
        if (node.type === 'paragraph' && node.content) {
          return node.content.some((child: any) => child.type === 'text' && child.text && child.text.trim().length > 0);
        }
        if (node.type === 'heading' && node.content) {
          return node.content.some((child: any) => child.type === 'text' && child.text && child.text.trim().length > 0);
        }
        return false;
      });

      if (!hasValidContent) {
        console.warn('Warning: Content structure has no visible text nodes');
      }

      if (saveMode === 'new') {
        // Create new journal page
        const response_api = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `AI Response: ${response.query.substring(0, 50)}${response.query.length > 50 ? '...' : ''}`,
            content: newContent,
            icon: '📝',
          }),
        });

        // Check content type before parsing
        const contentType = response_api.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');

        if (!response_api.ok) {
          let errorMessage = `Failed to save note (${response_api.status})`;

          if (isJson) {
            try {
              const errorData = await response_api.json();
              errorMessage = errorData.error || errorMessage;
            } catch {
              // If JSON parsing fails, use default message
            }
          } else {
            // If response is HTML (error page), provide a helpful message
            errorMessage = 'Server returned an error page. Please check your authentication and try again.';
          }

          throw new Error(errorMessage);
        }

        if (!isJson) {
          throw new Error('Server returned an unexpected response format');
        }

        const data = await response_api.json();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        setShowSaveModal(false);

        // Store page ID and show navigation modal if preference allows
        setSavedPageId(data.page.id);
        if (!dontAskAgain) {
          setShowNavigateModal(true);
        }
      } else {
        // Add to existing page
        if (!selectedPageId) {
          throw new Error('Please select a page to add to');
        }

        // Fetch existing page
        const getResponse = await fetch(`/api/journal/${selectedPageId}`);
        if (!getResponse.ok) {
          throw new Error('Failed to fetch existing page');
        }

        const { page: existingPage } = await getResponse.json();

        // Helper function to validate and clean Tiptap nodes
        const isValidNode = (node: any): boolean => {
          if (!node || typeof node !== 'object') return false;

          // Headings are valid if they have text content
          if (node.type === 'heading') {
            if (!node.content || !Array.isArray(node.content)) return false;
            return node.content.some((child: any) =>
              child.type === 'text' && child.text && child.text.trim().length > 0
            );
          }

          // Paragraphs are valid if they have text content
          if (node.type === 'paragraph') {
            if (!node.content || !Array.isArray(node.content)) return false;
            return node.content.some((child: any) =>
              child.type === 'text' && child.text && child.text.trim().length > 0
            );
          }

          // Horizontal rules are always valid
          if (node.type === 'horizontalRule') return true;

          // Other node types - check if they have content
          if (node.content && Array.isArray(node.content)) {
            return node.content.length > 0;
          }

          return true; // Allow other node types
        };

        const filterValidNodes = (nodes: any[]): any[] => {
          if (!Array.isArray(nodes)) return [];
          return nodes.filter(isValidNode);
        };

        // Parse existing content
        let existingContent = existingPage.content;
        if (existingContent === null || existingContent === undefined) {
          existingContent = { type: 'doc', content: [] };
        } else if (typeof existingContent === 'string') {
          try {
            existingContent = JSON.parse(existingContent);
          } catch (e) {
            console.warn('Failed to parse existing content as JSON:', e);
            existingContent = { type: 'doc', content: [] };
          }
        }

        // Ensure it's a valid Tiptap doc
        if (!existingContent || typeof existingContent !== 'object' || existingContent.type !== 'doc') {
          existingContent = { type: 'doc', content: [] };
        }

        // Ensure content array exists and filter invalid nodes
        if (!Array.isArray(existingContent.content)) {
          existingContent.content = [];
        }
        const validExistingContent = filterValidNodes(existingContent.content);

        // Filter new content as well
        const validNewContent = filterValidNodes(newContent.content);

        // Merge content: add a separator and then the new content
        const horizontalRule = {
          type: 'horizontalRule'
        };

        // Build merged content array
        const mergedContentArray: any[] = [];

        // Add existing valid content
        if (validExistingContent.length > 0) {
          mergedContentArray.push(...validExistingContent);
        }

        // Add separator (horizontal rule) if we have both existing and new content
        if (validExistingContent.length > 0 && validNewContent.length > 0) {
          mergedContentArray.push(horizontalRule);
        }

        // Add new content
        if (validNewContent.length > 0) {
          mergedContentArray.push(...validNewContent);
        }

        // Ensure we have at least one valid node
        if (mergedContentArray.length === 0) {
          mergedContentArray.push({
            type: 'paragraph',
            content: [{ type: 'text', text: 'No content' }]
          });
        }

        const mergedContent = {
          type: 'doc',
          content: mergedContentArray
        };

        // Debug logging
        console.log('Merging content:', {
          existingNodes: validExistingContent.length,
          newNodes: validNewContent.length,
          mergedNodes: mergedContentArray.length,
          existingSample: validExistingContent[0],
          newSample: validNewContent[0]
        });

        // Final validation of merged content
        if (!mergedContent || mergedContent.type !== 'doc' || !Array.isArray(mergedContent.content)) {
          console.error('Invalid merged content structure:', mergedContent);
          throw new Error('Failed to create valid merged content structure');
        }

        // Update existing page
        const updateResponse = await fetch(`/api/journal/${selectedPageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: mergedContent,
          }),
        });

        const contentType = updateResponse.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');

        if (!updateResponse.ok) {
          let errorMessage = `Failed to update page (${updateResponse.status})`;

          if (isJson) {
            try {
              const errorData = await updateResponse.json();
              errorMessage = errorData.error || errorMessage;
            } catch {
              // If JSON parsing fails, use default message
            }
          } else {
            errorMessage = 'Server returned an error page. Please check your authentication and try again.';
          }

          throw new Error(errorMessage);
        }

        if (!isJson) {
          throw new Error('Server returned an unexpected response format');
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        setShowSaveModal(false);

        // Store page ID and show navigation modal if preference allows
        setSavedPageId(selectedPageId);
        if (!dontAskAgain) {
          setShowNavigateModal(true);
        }
      }
    } catch (error) {
      console.error('Error saving to journal:', error);
      alert(error instanceof Error ? error.message : 'Failed to save to journal');
    } finally {
      setSaving(false);
    }
  };

  const lenses = getAllLenses();
  // Get active lenses from lensWeights (since responses array may be empty for lazy loading)
  // Fallback: if no lensWeights, try to get from response metadata or show all lenses
  const activeLensIds = new Set(
    lensWeights && Object.keys(lensWeights).length > 0
      ? Object.entries(lensWeights)
        .filter(([_, weight]) => (weight as number) > 0)
        .map(([lens]) => lens)
      : response?.responses?.map(r => r.lens) || []
  );

  return (
    <div className="space-y-6">
      {/* Save to Journal Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-amber-900/30 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-amber-100">Save to Journal</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Mode Selection */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="saveMode"
                    value="new"
                    checked={saveMode === 'new'}
                    onChange={(e) => setSaveMode(e.target.value as 'new' | 'existing')}
                    className="w-4 h-4 text-amber-500"
                  />
                  <span className="text-amber-100">New Page</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="saveMode"
                    value="existing"
                    checked={saveMode === 'existing'}
                    onChange={(e) => setSaveMode(e.target.value as 'new' | 'existing')}
                    className="w-4 h-4 text-amber-500"
                  />
                  <span className="text-amber-100">Existing Page</span>
                </label>
              </div>

              {/* Page Selection (only show if existing mode) */}
              {saveMode === 'existing' && (
                <div>
                  <label htmlFor="page-select" className="block text-sm font-medium text-amber-100/80 mb-2">
                    Select Page
                  </label>
                  {loadingPages ? (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading pages...</span>
                    </div>
                  ) : existingPages.length === 0 ? (
                    <p className="text-zinc-400 text-sm">No pages available. Create a new page instead.</p>
                  ) : (
                    <select
                      id="page-select"
                      value={selectedPageId}
                      onChange={(e) => setSelectedPageId(e.target.value)}
                      className="w-full bg-zinc-800 border border-amber-900/20 rounded-lg px-4 py-2 text-amber-100 focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="">-- Select a page --</option>
                      {existingPages.map((page) => (
                        <option key={page.id} value={page.id}>
                          {page.icon} {page.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-amber-900/20 rounded-lg text-sm text-amber-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={performSave}
                  disabled={saving || (saveMode === 'existing' && !selectedPageId)}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-900 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Modal */}
      {showNavigateModal && savedPageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-amber-900/30 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-amber-100">Navigate to Journal Page?</h3>
              <button
                onClick={() => setShowNavigateModal(false)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-amber-100/80">
                Your response has been saved. Would you like to view the page now?
              </p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontAskAgain}
                  onChange={(e) => setNavigatePreference(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded"
                />
                <span className="text-sm text-amber-100/80">Don't ask again</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowNavigateModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-amber-900/20 rounded-lg text-sm text-amber-100 transition-colors"
                >
                  Stay Here
                </button>
                <button
                  onClick={handleNavigate}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-900 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Go to Page
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {response && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleSaveToNote}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-amber-900/20 rounded-lg text-sm text-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Save to Journal
              </>
            )}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-amber-900/20 rounded-lg text-sm text-amber-100 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      )}

      {/* Lens Weights Dropdown */}
      {response && lensWeights && (
        <div className="bg-zinc-900/30 border border-cyan-500/20 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowLensWeights(!showLensWeights)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="font-medium text-amber-100">Lens Weights</span>
            </div>
            {showLensWeights ? (
              <ChevronUp className="w-4 h-4 text-amber-100/60" />
            ) : (
              <ChevronDown className="w-4 h-4 text-amber-100/60" />
            )}
          </button>
          {showLensWeights && (
            <div className="px-4 py-4 border-t border-cyan-500/20 space-y-2.5">
              {getLensWeightBars(lensWeights).map((lens, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span className="text-amber-100/90 w-12 text-left font-medium">{lens.abbrev}</span>
                  <div className="flex-1 flex items-center min-w-0">
                    <span className="text-cyan-400 font-mono">{'█'.repeat(lens.barSize)}</span>
                    <span className="text-amber-100/30 font-mono">{'░'.repeat(20 - lens.barSize)}</span>
                  </div>
                  <span className="text-amber-100/80 w-10 text-right font-medium">{lens.weight}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Synthesis FIRST - Main Answer */}
      {response?.synthesis && (
        <div className="bg-gradient-to-br from-amber-900/20 to-amber-900/10 border-2 border-amber-500/30 rounded-xl p-6">
          <h3 className="text-2xl font-bold text-amber-100 mb-4 flex items-center gap-2">
            <span className="text-amber-400">⚡</span>
            Synthesis
          </h3>
          <div className="prose prose-invert max-w-none">
            <div className="text-amber-100/90 whitespace-pre-wrap leading-relaxed">
              {response.synthesis}
            </div>
          </div>

          {/* Combined Sources for Synthesis */}
          {response.sources && response.sources.length > 0 && (
            <div className="mt-6 pt-4 border-t border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <p className="text-sm font-medium text-amber-100/80">
                  All Sources ({response.sources.length})
                </p>
              </div>
              <div className="space-y-2">
                {response.sources.map((source, sIdx) => (
                  <SourceCard
                    key={sIdx}
                    source={source}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lens Responses - Expandable */}
      {response && activeLensIds.size > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-amber-100/80">
            Individual Perspectives ({activeLensIds.size})
          </h3>
          {response.responses && response.responses.length > 0 ? (
            // Show full responses if already loaded
            response.responses.map((lensResponse, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/30 border border-cyan-500/20 rounded-xl p-6"
              >
                <h3 className="text-xl font-bold text-cyan-400 mb-4">
                  {lensResponse.lensName} Perspective
                </h3>
                <div className="prose prose-invert max-w-none">
                  <div className="text-amber-100/90 whitespace-pre-wrap leading-relaxed">
                    {lensResponse.content}
                  </div>
                </div>

                {lensResponse.sources.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-amber-900/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <p className="text-sm font-medium text-amber-100/80">
                        Sources ({lensResponse.sources.length})
                      </p>
                    </div>
                    <div className="space-y-2">
                      {lensResponse.sources.map((source, sIdx) => (
                        <SourceCard
                          key={sIdx}
                          source={source}
                          lensName={lensResponse.lensName}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            // Show expandable placeholders if not loaded yet
            lenses
              .filter(lens => activeLensIds.has(lens.id))
              .map(lens => (
                <ExpandableLensCard
                  key={lens.id}
                  lensId={lens.id}
                  lensName={lens.name}
                  query={query || response?.query || ''}
                  lensWeights={lensWeights}
                  responseLength={responseLength}
                  onExpand={(lensId) => {
                    setExpandedLenses(prev => new Set(prev).add(lensId));
                    if (onLensExpand) onLensExpand(lensId);
                  }}
                />
              ))
          )}
        </div>
      )}

      {/* Streaming indicator */}
      {isStreaming && !response && (
        <div className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-amber-100/70">Analyzing from multiple perspectives...</p>
          </div>
        </div>
      )}
    </div>
  );
}
