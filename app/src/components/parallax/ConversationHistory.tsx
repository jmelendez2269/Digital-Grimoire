'use client';

import { useState, useEffect } from 'react';
import { History, ChevronRight, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { LensWeights } from '@/lib/parallax/lens-orchestrator';
import { getActiveLenses } from '@/lib/parallax/lenses';
import { useAuth } from '@/contexts/AuthContext';

interface Source {
  text_id: string;
  text_title?: string;
  text_author?: string;
  chunk_id?: string;
  relevance?: number;
}

interface ConversationEntry {
  id: string;
  query: string;
  lensWeights: LensWeights;
  synthesis: string;
  responsePreview: string;
  response?: any; // Full response object
  timestamp: Date | string;
  sources?: Source[];
}

interface ConversationHistoryProps {
  onSelectConversation: (conversation: ConversationEntry) => void;
  currentQuery?: string;
  currentResponseId?: string;
  refreshTrigger?: number; // Trigger to refresh history
}

export default function ConversationHistory({
  onSelectConversation,
  currentQuery,
  currentResponseId,
  refreshTrigger,
}: ConversationHistoryProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default

  // Load conversations from localStorage and API
  useEffect(() => {
    loadConversations();
  }, [user, refreshTrigger]);

  async function loadConversations() {
    setLoading(true);

    // Load from localStorage first (quick access)
    const localKey = user ? `parallax_history_${user.id}` : 'parallax_history_guest';
    const localHistory = typeof window !== 'undefined'
      ? localStorage.getItem(localKey)
      : null;

    let localConversations: ConversationEntry[] = [];
    if (localHistory) {
      try {
        localConversations = JSON.parse(localHistory).map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }));
      } catch (e) {
        console.error('Error parsing local history:', e);
      }
    }

    // Load from API if user is authenticated
    if (user) {
      try {
        const response = await fetch('/api/parallax/history?limit=50');
        if (response.ok) {
          const data = await response.json();
          const apiConversations: ConversationEntry[] = (data.responses || []).map((resp: any) => {
            // Parse the response_text - it might be a JSON string or already an object
            let parsedResponse: any = null;
            let synthesis = '';
            let responsePreview = '';

            try {
              if (typeof resp.response_text === 'string') {
                // Try to parse as JSON first
                try {
                  parsedResponse = JSON.parse(resp.response_text);
                  synthesis = parsedResponse.synthesis || resp.response_text;
                  responsePreview = parsedResponse.synthesis
                    ? parsedResponse.synthesis.substring(0, 150)
                    : resp.response_text.substring(0, 150);
                } catch {
                  // If parsing fails, treat as plain text
                  synthesis = resp.response_text;
                  responsePreview = resp.response_text.substring(0, 150);
                }
              } else {
                parsedResponse = resp.response_text;
                synthesis = parsedResponse?.synthesis || '';
                responsePreview = synthesis.substring(0, 150);
              }
            } catch (e) {
              console.error('Error parsing response:', e);
              synthesis = typeof resp.response_text === 'string' ? resp.response_text : '';
              responsePreview = synthesis.substring(0, 150);
            }

            return {
              id: resp.id,
              query: resp.query_text,
              lensWeights: resp.lens_weights || {},
              synthesis,
              responsePreview,
              response: parsedResponse || resp.response_text, // Full response object
              timestamp: new Date(resp.created_at),
              sources: resp.sources || [],
            };
          });

          // Merge and deduplicate (prefer API data)
          const merged = [...apiConversations];
          const apiIds = new Set(apiConversations.map(c => c.id));

          localConversations.forEach((local: ConversationEntry) => {
            if (!apiIds.has(local.id)) {
              merged.push(local);
            }
          });

          // Sort by timestamp (newest first) and limit to 50
          merged.sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
            const timeB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
            return timeB.getTime() - timeA.getTime();
          });

          setConversations(merged.slice(0, 50));

          // Update localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem(localKey, JSON.stringify(merged.slice(0, 50)));
          }
        }
      } catch (error) {
        console.error('Error loading history from API:', error);
        // Fall back to local storage
        setConversations(localConversations.slice(0, 50));
      }
    } else {
      // Guest user - only use localStorage
      setConversations(localConversations.slice(0, 50));
    }

    setLoading(false);
  }

  function formatTimestamp(timestamp: Date | string): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  function formatLensWeights(lensWeights: LensWeights): string {
    const activeLenses = getActiveLenses(lensWeights);
    if (activeLenses.length === 0) return 'No lenses';

    const lensAbbrev: Record<string, string> = {
      'Scientific': 'Sci',
      'Psychological': 'Psy',
      'Philosophical': 'Phi',
      'Religious/Spiritual': 'Rel',
      'Historical/Anthropological': 'Hist',
      'Symbolic/Occult': 'Sym',
      'Mathematical': 'Math'
    };

    return activeLenses
      .map(lens => {
        const abbrev = lensAbbrev[lens.name] || lens.name.substring(0, 4);
        const weight = lensWeights[lens.id as keyof LensWeights] || 0;
        return `${abbrev}:${weight}`;
      })
      .slice(0, 3)
      .join(', ') + (activeLenses.length > 3 ? '...' : '');
  }

  return (
    <div className="bg-zinc-900/50 border border-cyan-500/20 rounded-xl overflow-hidden">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-amber-100">Conversation History</h2>
          {conversations.length > 0 && (
            <span className="px-2 py-0.5 bg-cyan-600/20 text-cyan-400 text-xs font-medium rounded-full">
              {conversations.length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-amber-100/60" />
        ) : (
          <ChevronDown className="w-5 h-5 text-amber-100/60" />
        )}
      </button>

      {/* Content - Collapsible */}
      {isExpanded && (
        <div className="border-t border-cyan-500/20 max-h-96 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-amber-100/60">Loading...</div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <History className="w-12 h-12 text-zinc-600 mb-3" />
              <p className="text-amber-100/60">No conversations yet</p>
              <p className="text-sm text-amber-100/40 mt-1">
                Your query history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => {
                const isActive = currentResponseId === conversation.id ||
                  (currentQuery && currentQuery === conversation.query && !currentResponseId);

                return (
                  <button
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${isActive
                      ? 'bg-cyan-600/20 border-cyan-500/50 shadow-md'
                      : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 hover:border-cyan-500/30'
                      }`}
                  >
                    {/* Query */}
                    <div className="font-medium text-amber-100 mb-2 line-clamp-2">
                      {conversation.query}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-xs text-amber-100/60 mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(conversation.timestamp)}
                      </div>
                      <div className="truncate">
                        {formatLensWeights(conversation.lensWeights)}
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="text-sm text-amber-100/70 line-clamp-2">
                      {conversation.responsePreview}...
                    </div>

                    <ChevronRight className="w-4 h-4 text-cyan-400/60 mt-2 ml-auto" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

