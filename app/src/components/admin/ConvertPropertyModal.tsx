"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { parsePropertyValue, suggestCategoryFromField } from "@/lib/graph/entity-utils";
import { getSuggestedRelationshipType } from "@/lib/graph/field-relationship-map";

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

interface EntityType {
  id: string;
  slug: string;
  label: string;
  color?: string | null;
  icon?: string | null;
}

interface RelationshipType {
  id: string;
  slug: string;
  label: string;
  icon?: string | null;
}

interface ConvertPropertyModalProps {
  claim: KnowledgeClaim;
  originalEntityName: string;
  originalEntityCategory: string;
  originalEntityId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ConnectionStatus {
  exists: boolean;
  connected: boolean;
  relationships?: Array<{ type: string; relationship_type?: { label: string } }>;
  entity?: any;
}

export default function ConvertPropertyModal({
  claim,
  originalEntityName,
  originalEntityCategory,
  originalEntityId,
  onClose,
  onSuccess,
}: ConvertPropertyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Parse property value into individual values
  const parsedValues = claim.field_value ? parsePropertyValue(claim.field_value) : [];
  const [selectedValues, setSelectedValues] = useState<Set<string>>(
    new Set(parsedValues.length === 1 ? parsedValues : [])
  );
  
  // Category selection
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  // Relationship type
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<string>("");
  
  // Connection status for selected values
  const [connectionStatus, setConnectionStatus] = useState<Map<string, ConnectionStatus>>(new Map());
  const [checkingConnections, setCheckingConnections] = useState(false);
  
  // Load entity types and relationship types
  useEffect(() => {
    const loadTypes = async () => {
      try {
        const [entityRes, relRes] = await Promise.all([
          fetch("/api/graph/types/entities"),
          fetch("/api/graph/types/relationships"),
        ]);
        
        const entityData = await entityRes.json();
        const relData = await relRes.json();
        
        setEntityTypes(entityData.items || []);
        setRelationshipTypes(relData.items || []);
        
        // Set suggested category
        const suggestedCategory = suggestCategoryFromField(claim.field_key);
        if (suggestedCategory) {
          setSelectedCategory(suggestedCategory);
        } else if (entityData.items && entityData.items.length > 0) {
          setSelectedCategory(entityData.items[0].slug);
        }
        
        // Set suggested relationship type
        const suggestedRelType = getSuggestedRelationshipType(claim.field_key);
        setSelectedRelationshipType(suggestedRelType);
      } catch (err) {
        console.error("Error loading types:", err);
      }
    };
    loadTypes();
  }, [claim.field_key]);
  
  // Check connection status for selected values
  useEffect(() => {
    if (!originalEntityId || selectedValues.size === 0) {
      setConnectionStatus(new Map());
      return;
    }

    const checkConnections = async () => {
      setCheckingConnections(true);
      const statusMap = new Map();

      for (const value of Array.from(selectedValues)) {
        try {
          const res = await fetch(
            `/api/graph/check-entity-connection?propertyValue=${encodeURIComponent(value)}&currentEntityId=${originalEntityId}`
          );
          if (res.ok) {
            const data = await res.json();
            statusMap.set(value, data);
          }
        } catch (err) {
          console.error(`Error checking connection for ${value}:`, err);
        }
      }

      setConnectionStatus(statusMap);
      setCheckingConnections(false);
    };

    const timeoutId = setTimeout(checkConnections, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedValues, originalEntityId]);

  const handleToggleValue = (value: string) => {
    const newSelected = new Set(selectedValues);
    if (newSelected.has(value)) {
      newSelected.delete(value);
      // Remove connection status for deselected value
      const newStatus = new Map(connectionStatus);
      newStatus.delete(value);
      setConnectionStatus(newStatus);
    } else {
      newSelected.add(value);
    }
    setSelectedValues(newSelected);
  };

  // Get warning messages for selected values
  const getConnectionWarnings = () => {
    const warnings: Array<{ value: string; status: ConnectionStatus }> = [];
    for (const value of Array.from(selectedValues)) {
      const status = connectionStatus.get(value);
      if (status?.connected) {
        warnings.push({ value, status });
      }
    }
    return warnings;
  };

  const warnings = getConnectionWarnings();
  const hasWarnings = warnings.length > 0;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedValues.size === 0) {
      setError("Please select at least one value to convert");
      return;
    }
    
    if (!selectedCategory) {
      setError("Please select an entity category");
      return;
    }
    
    if (!selectedRelationshipType) {
      setError("Please select a relationship type");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/graph/convert-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: claim.id,
          values: Array.from(selectedValues),
          category: selectedCategory,
          relationshipType: selectedRelationshipType,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to convert property to entity");
      }
      
      const result = await res.json();
      
      // Show success message with details
      let message = `Successfully created ${result.summary.entitiesCreated} entity(ies) and ${result.summary.relationshipsCreated} relationship(s)!`;
      if (result.summary.relationshipsSkipped > 0) {
        message += `\n\n${result.summary.relationshipsSkipped} relationship(s) were skipped (already exist).`;
      }
      if (result.summary.claimsCreated > 0) {
        message += `\n\n${result.summary.claimsCreated} backwards compatibility claim(s) created.`;
      }
      
      alert(message);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to convert property to entity");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-amber-900/30 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-amber-900/30 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-amber-100">Convert Property to Entity</h2>
            <p className="text-sm text-amber-100/60 mt-1">
              Convert property values from <span className="font-semibold">{originalEntityName}</span> into entities
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-amber-100/60 hover:text-amber-100 transition-colors p-2 hover:bg-zinc-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* Property Info */}
          <div>
            <label className="block text-sm font-medium text-amber-100/80 mb-2">
              Property Field
            </label>
            <div className="bg-zinc-800/50 border border-amber-900/20 rounded-lg px-4 py-2 text-amber-100/80">
              {claim.field_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          </div>
          
          {/* Values Selection */}
          <div>
            <label className="block text-sm font-medium text-amber-100/80 mb-2">
              Select Values to Convert
            </label>
            {parsedValues.length === 0 ? (
              <div className="text-sm text-amber-100/50 italic">
                No values found in property
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {parsedValues.map((value) => {
                  const isSelected = selectedValues.has(value);
                  const status = connectionStatus.get(value);
                  const isConnected = status?.connected;
                  const exists = status?.exists;
                  const existingRels = status?.relationships || [];
                  
                  return (
                    <label
                      key={value}
                      className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? isConnected
                            ? 'bg-amber-900/20 border-2 border-amber-600/50'
                            : 'bg-zinc-800/50 border border-amber-900/20'
                          : 'bg-zinc-800/50 border border-amber-900/20 hover:bg-zinc-800/70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleValue(value)}
                        className="w-4 h-4 text-amber-600 bg-zinc-700 border-amber-900/30 rounded focus:ring-amber-600 focus:ring-2 mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-100/90">{value}</span>
                          {isSelected && checkingConnections && (
                            <span className="text-xs text-amber-100/50">Checking...</span>
                          )}
                          {isSelected && isConnected && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Already connected
                            </span>
                          )}
                          {isSelected && exists && !isConnected && (
                            <span className="text-xs text-amber-400">Entity exists</span>
                          )}
                        </div>
                        {isSelected && isConnected && existingRels.length > 0 && (
                          <div className="text-xs text-amber-100/50 mt-1 ml-6">
                            Existing: {existingRels.map((r: any) => r.relationship_type?.label || r.type).join(', ')}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-amber-100/80 mb-2">
              Entity Category <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-zinc-800 border border-amber-900/30 rounded-lg px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
              required
            >
              <option value="">Select category...</option>
              {entityTypes.map((type) => (
                <option key={type.id} value={type.slug}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Relationship Type */}
          <div>
            <label className="block text-sm font-medium text-amber-100/80 mb-2">
              Relationship Type <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedRelationshipType}
              onChange={(e) => setSelectedRelationshipType(e.target.value)}
              className="w-full bg-zinc-800 border border-amber-900/30 rounded-lg px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
              required
            >
              <option value="">Select relationship type...</option>
              {relationshipTypes.map((type) => (
                <option key={type.id} value={type.slug}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-amber-100/50 mt-1">
              This relationship will connect {originalEntityName} to the new entity(ies)
            </p>
            {hasWarnings && (
              <p className="text-xs text-amber-400 mt-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Some selected values are already connected. A new relationship will only be created if it's a different type. 
                  Duplicate relationships of the same type will be skipped.
                </span>
              </p>
            )}
          </div>
          
          {/* Warning Message for Connected Entities */}
          {hasWarnings && (
            <div className="bg-amber-900/20 border border-amber-600/50 rounded-lg px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-amber-300 mb-1">
                    Already Connected Entities
                  </div>
                  <div className="text-xs text-amber-200/80 space-y-1">
                    {warnings.map(({ value, status }) => (
                      <div key={value}>
                        <span className="font-medium">{value}</span> is already connected via:{' '}
                        {status.relationships?.map((r: any) => r.relationship_type?.label || r.type).join(', ') || 'unknown'}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-amber-200/60 mt-2">
                    You can still proceed to add a different relationship type, or the same type will be skipped.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-amber-900/30">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading || selectedValues.size === 0}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Converting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Convert to Entity
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
