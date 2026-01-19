"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, Link2, CheckCircle2, Edit, Maximize2 } from "lucide-react";
import ConvertPropertyModal from "@/components/admin/ConvertPropertyModal";
import EntityDetailModal from "@/components/admin/EntityDetailModal";
import { parsePropertyValue } from "@/lib/graph/entity-utils";

interface KnowledgeClaim {
  id: string;
  field_key: string;
  field_value?: string | null;
  source?: {
    id: string;
    title: string;
    author?: string | null;
  } | null;
}

export default function EntityDetails({
  entity,
  onGraphRefresh,
}: {
  entity: {
    id: string;
    name: string;
    category: string;
    aliases?: string[];
    description?: string;
    lenses?: string[];
  } | null;
  onGraphRefresh?: () => void;
}) {
  const [claims, setClaims] = useState<KnowledgeClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [convertModalClaim, setConvertModalClaim] = useState<KnowledgeClaim | null>(null);
  const [entityConnectionStatus, setEntityConnectionStatus] = useState<Map<string, { exists: boolean; connected: boolean; relationships?: any[]; entity?: any }>>(new Map());
  const [checkingConnections, setCheckingConnections] = useState(false);
  const [connectionsProgress, setConnectionsProgress] = useState({ current: 0, total: 0 });
  const [showExpandModal, setShowExpandModal] = useState(false);
  const { isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const loadClaims = async () => {
      if (!entity?.id) {
        setClaims([]);
        setEntityConnectionStatus(new Map());
        return;
      }
      try {
        setLoadingClaims(true);
        const res = await fetch(
          `/api/knowledge/claims?entityType=correspondence&entityId=${entity.id}`
        );
        if (res.ok) {
          const data = await res.json();
          setClaims(data.items || []);
        }
      } catch (err) {
        console.error("Error loading claims:", err);
      } finally {
        setLoadingClaims(false);
      }
    };
    loadClaims();
  }, [entity?.id]);

  // Check connection status for each claim value
  const checkConnections = useCallback(async () => {
    if (!entity?.id || !isAdmin || claims.length === 0) {
      setEntityConnectionStatus(new Map());
      setCheckingConnections(false);
      return;
    }

    setCheckingConnections(true);
    const statusMap = new Map();
    
    // Count total values to check for progress tracking
    let totalChecks = 0;
    const valuesToCheck: Array<{ claimId: string; value: string }> = [];
    
    for (const claim of claims) {
      if (!claim.field_value || !claim.field_value.trim()) continue;
      
      // Parse comma-separated values
      const values = parsePropertyValue(claim.field_value);
      
      for (const value of values) {
        valuesToCheck.push({ claimId: claim.id, value });
        totalChecks++;
      }
    }
    
    setConnectionsProgress({ current: 0, total: totalChecks });
    
    // Process all checks in parallel for better performance
    const checkPromises: Promise<void>[] = [];
    const completedChecksRef = { current: 0 };
    
    const updateProgress = () => {
      completedChecksRef.current++;
      setConnectionsProgress({ current: completedChecksRef.current, total: totalChecks });
    };
    
    for (const { claimId, value } of valuesToCheck) {
      const promise = (async () => {
        try {
          const res = await fetch(
            `/api/graph/check-entity-connection?propertyValue=${encodeURIComponent(value)}&currentEntityId=${entity.id}`
          );
          if (res.ok) {
            const data = await res.json();
            // Ensure we have the expected structure
            if (data && typeof data === 'object') {
              statusMap.set(`${claimId}-${value}`, {
                exists: data.exists === true,
                connected: data.connected === true,
                relationships: data.relationships || [],
                entity: data.entity,
              });
            }
          } else {
            const errorData = await res.json().catch(() => ({}));
            console.error(`Failed to check connection for ${value}:`, errorData);
          }
        } catch (err) {
          console.error(`Error checking connection for ${value}:`, err);
        } finally {
          updateProgress();
        }
      })();
      checkPromises.push(promise);
    }
    
    // Wait for all checks to complete
    await Promise.all(checkPromises);
    
    setEntityConnectionStatus(statusMap);
    setCheckingConnections(false);
    setConnectionsProgress({ current: 0, total: 0 });
  }, [claims, entity?.id, isAdmin]);

  useEffect(() => {
    // Debounce the connection checks slightly to avoid too many requests
    const timeoutId = setTimeout(checkConnections, 300);
    return () => clearTimeout(timeoutId);
  }, [checkConnections]);

  if (!entity) {
    return (
      <div className="text-amber-100/60 text-sm">Select a node to view details.</div>
    );
  }

  // More robust checks - handle various data formats
  const hasDescription = entity.description != null && 
    String(entity.description).trim().length > 0;
  
  const hasAliases = Array.isArray(entity.aliases) && 
    entity.aliases.length > 0 && 
    entity.aliases.some((a: any) => a != null && String(a).trim() !== '');
  
  const hasLenses = Array.isArray(entity.lenses) && 
    entity.lenses.length > 0 && 
    entity.lenses.some((l: any) => l != null && String(l).trim() !== '');
  
  // Check if we have knowledge claims
  const hasClaims = claims.length > 0 && 
    claims.some(c => c.field_value && String(c.field_value).trim() !== '');
  
  const hasAdditionalInfo = hasDescription || hasAliases || hasLenses || hasClaims;

  const handleEdit = () => {
    router.push(`/admin/knowledge-graph?editId=${entity.id}&graphType=correspondences`);
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1">
            <div className="inline-block px-2.5 py-1 bg-amber-900/30 border border-amber-700/40 rounded-md mb-2">
              <div className="text-xs uppercase tracking-wide text-amber-200 font-medium">
                {entity.category}
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-100 leading-tight">{entity.name}</div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isAdmin && (
              <button
                onClick={handleEdit}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-amber-100/70 hover:text-amber-100 transition-colors border border-amber-900/30 hover:border-amber-700/50"
                title="Edit entity"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowExpandModal(true)}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-amber-100/70 hover:text-amber-100 transition-colors border border-amber-900/30 hover:border-amber-700/50"
              title="Expand view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {hasDescription && (
        <div className="mb-4">
          <p className="text-sm text-amber-100/80 leading-relaxed">{entity.description}</p>
        </div>
      )}
      
      {hasAliases && (
        <div className="mb-4">
          <div className="text-xs text-amber-100/50 mb-2 uppercase tracking-wide">Aliases</div>
          <div className="flex flex-wrap gap-2">
            {entity.aliases!.map((a) => (
              <span key={a} className="px-2 py-1 rounded bg-zinc-800 text-xs text-amber-100/80">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {hasLenses && (
        <div className="mb-4">
          <div className="text-xs text-amber-100/50 mb-2 uppercase tracking-wide">Lenses</div>
          <div className="flex flex-wrap gap-2">
            {entity.lenses!.map((l) => (
              <span key={l} className="px-2 py-1 rounded bg-amber-900/20 border border-amber-700/30 text-xs text-amber-100/90">
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasClaims && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs text-amber-100/50 uppercase tracking-wide">Properties</div>
            {checkingConnections && isAdmin && (
              <span className="text-xs text-amber-100/40 italic">Checking connections...</span>
            )}
          </div>
          {checkingConnections && isAdmin && connectionsProgress.total > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-amber-100/60 mb-1">
                <span>Loading connections...</span>
                <span>
                  {connectionsProgress.current} / {connectionsProgress.total}
                </span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-600 transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, (connectionsProgress.current / connectionsProgress.total) * 100)}%` 
                  }}
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            {claims
              .filter(c => c.field_value && String(c.field_value).trim() !== '')
              .map((claim) => {
                const values = parsePropertyValue(claim.field_value || '');
                return (
                  <div key={claim.id} className="border-b border-zinc-800/50 pb-2 last:border-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-xs uppercase tracking-wide text-amber-100/50">
                        {claim.field_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => setConvertModalClaim(claim)}
                          className="text-xs text-amber-600 hover:text-amber-500 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-amber-900/20"
                          title="Convert to Entity"
                        >
                          <Sparkles className="w-3 h-3" />
                          Convert
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-amber-100/80">
                      {values.length > 0 ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          {values.map((value, idx) => {
                            const statusKey = `${claim.id}-${value}`;
                            const status = entityConnectionStatus.get(statusKey);
                            const isConnected = status?.connected === true;
                            const exists = status?.exists === true;
                            const relationships = status?.relationships || [];
                            
                            return (
                              <span 
                                key={idx} 
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/50 border border-zinc-700/30"
                              >
                                <span>{value}</span>
                                {isConnected && (
                                  <span 
                                    className="text-xs text-green-400 flex items-center gap-1" 
                                    title={`Already connected via: ${relationships.map((r: any) => r.relationship_type?.label || r.type).join(', ')}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span className="text-[10px]">Connected</span>
                                  </span>
                                )}
                                {exists && !isConnected && (
                                  <span 
                                    className="text-xs text-amber-400 flex items-center gap-1" 
                                    title="Entity exists but not connected"
                                  >
                                    <Link2 className="w-3 h-3" />
                                    <span className="text-[10px]">Exists</span>
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{claim.field_value}</span>
                      )}
                    </div>
                    {claim.source && (
                      <div className="text-xs text-amber-100/40 mt-1">
                        Source: {claim.source.title}
                        {claim.source.author && ` — ${claim.source.author}`}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {loadingClaims && (
        <div className="text-xs text-amber-100/40 italic">Loading properties...</div>
      )}

      {!hasAdditionalInfo && !loadingClaims && (
        <div className="text-sm text-amber-100/40 italic">
          No additional information available for this entity.
        </div>
      )}

      {/* Convert Property Modal */}
      {convertModalClaim && entity && (
        <ConvertPropertyModal
          claim={convertModalClaim}
          originalEntityName={entity.name}
          originalEntityCategory={entity.category}
          originalEntityId={entity.id}
          onClose={() => setConvertModalClaim(null)}
          onSuccess={() => {
            // Refresh claims after conversion
            const loadClaims = async () => {
              try {
                setLoadingClaims(true);
                const res = await fetch(
                  `/api/knowledge/claims?entityType=correspondence&entityId=${entity.id}`
                );
                if (res.ok) {
                  const data = await res.json();
                  setClaims(data.items || []);
                }
              } catch (err) {
                console.error("Error loading claims:", err);
              } finally {
                setLoadingClaims(false);
              }
            };
            loadClaims();
            // Refresh the graph to show new entities and connections
            if (onGraphRefresh) {
              onGraphRefresh();
            }
            // Wait a bit for graph to refresh, then re-check connections
            setTimeout(() => {
              checkConnections();
            }, 1000);
            setConvertModalClaim(null);
          }}
        />
      )}

      {/* Expand Detail Modal */}
      {showExpandModal && entity && (
        <EntityDetailModal
          entity={entity}
          graphType="correspondences"
          onClose={() => setShowExpandModal(false)}
        />
      )}
    </div>
  );
}


