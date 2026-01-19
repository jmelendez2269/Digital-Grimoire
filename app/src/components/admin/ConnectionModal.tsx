"use client";

import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";

type GraphType = "correspondences" | "convergence";

interface Entity {
  id: string;
  name: string;
  [key: string]: any;
}

interface ConnectionModalProps {
  sourceEntity: Entity;
  graphType: GraphType;
  allEntities: Entity[];
  existingRelationships: any[];
  onClose: () => void;
  onSave: () => void;
}

const CONFIDENCE_LEVELS = ["established", "interpretive", "speculative", "tradition"];

export default function ConnectionModal({
  sourceEntity,
  graphType,
  allEntities,
  existingRelationships,
  onClose,
  onSave,
}: ConnectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Correspondence fields
  const [targetId, setTargetId] = useState("");
  const [relationshipType, setRelationshipType] = useState("corresponds_to");
  const [relationshipTypeId, setRelationshipTypeId] = useState<string | null>(null);
  const [weight, setWeight] = useState(0.5);
  const [confidence, setConfidence] = useState("tradition");
  const [sourceCitation, setSourceCitation] = useState("");
  const [notes, setNotes] = useState("");

  // Convergence fields
  const [similarity, setSimilarity] = useState(0.5);

  const [relationshipTypes, setRelationshipTypes] = useState<
    Array<{ id: string; slug: string; label: string; icon?: string | null }>
  >([]);

  useEffect(() => {
    const loadTypes = async () => {
      if (graphType !== "correspondences") return;
      try {
        const res = await fetch("/api/graph/types/relationships");
        const data = await res.json();
        setRelationshipTypes(data.items || []);
      } catch (err) {
        // fallback to slug input
      }
    };
    loadTypes();
  }, [graphType]);

  // Filter out entities that already have a relationship with source
  const availableEntities = allEntities
    .filter((e) => {
      if (e.id === sourceEntity.id) return false;
      if (!searchQuery) return true;
      return e.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .slice(0, 20); // Limit to 20 for performance

  // Check if relationship already exists (only when target is selected)
  const existingRelationship = targetId
    ? existingRelationships.find(
        (r) =>
          (r.source_id === sourceEntity.id && r.target_id === targetId) ||
          (r.source_id === targetId && r.target_id === sourceEntity.id)
      )
    : null;

  useEffect(() => {
    if (existingRelationship) {
      if (graphType === "correspondences") {
        setRelationshipType(existingRelationship.type);
        setRelationshipTypeId(existingRelationship.relationship_type_id || existingRelationship.relationship_type?.id || null);
        setWeight(existingRelationship.weight);
        setConfidence(existingRelationship.confidence);
        setSourceCitation(existingRelationship.source_citation || "");
        setNotes(existingRelationship.notes || "");
      } else {
        setSimilarity(existingRelationship.similarity);
        setSourceCitation(existingRelationship.source_citation || "");
        setNotes(existingRelationship.notes || "");
      }
    }
  }, [existingRelationship, graphType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!targetId) {
      setError("Please select a target entity");
      setLoading(false);
      return;
    }

    try {
      const endpoint =
        graphType === "correspondences"
          ? "/api/graph/edges"
          : "/api/concepts/relationships";

      const body: any = {
        sourceId: sourceEntity.id,
        targetId,
      };

      if (graphType === "correspondences") {
        body.type = relationshipType;
        body.typeId = relationshipTypeId;
        body.weight = weight;
        body.confidence = confidence;
        body.source_citation = sourceCitation;
        body.notes = notes;
      } else {
        body.similarity = similarity;
        body.source_citation = sourceCitation;
        body.notes = notes;
      }

      // Check if relationship exists (bidirectional check)
      const existingRel = existingRelationships.find(
        (r) =>
          (r.source_id === sourceEntity.id && r.target_id === targetId) ||
          (r.source_id === targetId && r.target_id === sourceEntity.id)
      );

      const method = existingRel ? "PATCH" : "POST";
      const url = existingRel ? `${endpoint}/${existingRel.id}` : endpoint;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save relationship");
      }

      onSave();
    } catch (err: any) {
      setError(err.message || "Failed to save relationship");
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
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-amber-900/30 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-amber-100">Create Connection</h2>
            <p className="text-sm text-amber-100/60 mt-1">
              From: <span className="font-medium">{sourceEntity.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-amber-100/60 hover:text-amber-100 transition-colors p-2 hover:bg-zinc-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Target Entity Selection */}
          <div>
            <label className="block text-sm font-medium text-amber-100/80 mb-2">
              Connect To *
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-100/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entities..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
              />
            </div>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
            >
              <option value="">Select an entity...</option>
              {availableEntities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
            {availableEntities.length === 0 && searchQuery && (
              <p className="text-xs text-amber-100/50 mt-1">No entities found matching your search</p>
            )}
          </div>

          {graphType === "correspondences" ? (
            <>
              {/* Relationship Type */}
              <div>
                <label className="block text-sm font-medium text-amber-100/80 mb-1">
                  Relationship Type *
                </label>
                {relationshipTypes.length > 0 ? (
                  <select
                    value={relationshipTypeId || ""}
                    onChange={(e) => {
                      const nextId = e.target.value || null;
                      setRelationshipTypeId(nextId);
                      const selected = relationshipTypes.find((t) => t.id === nextId);
                      if (selected) {
                        setRelationshipType(selected.slug);
                      }
                    }}
                    required
                    className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                  >
                    <option value="">Select a relationship type...</option>
                    {relationshipTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.icon ? `${type.icon} ` : ""}{type.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                  />
                )}
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-amber-100/80 mb-1">
                  Weight: {(weight * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weight}
                  onChange={(e) => setWeight(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-amber-100/40 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Confidence */}
              <div>
                <label className="block text-sm font-medium text-amber-100/80 mb-1">
                  Confidence Level *
                </label>
                <select
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                >
                  {CONFIDENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Similarity */}
              <div>
                <label className="block text-sm font-medium text-amber-100/80 mb-1">
                  Similarity: {(similarity * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={similarity}
                  onChange={(e) => setSimilarity(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-amber-100/40 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
                <p className="text-xs text-amber-100/50 mt-1">
                  0.9-1.0: Nearly identical | 0.7-0.89: Strong overlap | 0.5-0.69: Moderate | 0.3-0.49: Weak
                </p>
              </div>
            </>
          )}

          {/* Source Citation */}
          <div>
            <label className="block text-sm font-medium text-amber-100/80 mb-1">
              Source Citation
            </label>
            <input
              type="text"
              value={sourceCitation}
              onChange={(e) => setSourceCitation(e.target.value)}
              placeholder="e.g., Author Name, Book Title, Year"
              className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-amber-100/80 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes about this connection..."
              className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
            />
          </div>

          {existingRelationship && (
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 text-sm text-amber-100/80">
              ⚠️ A relationship already exists between these entities. Updating it will replace the existing one.
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-amber-900/30">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : existingRelationship ? "Update" : "Create"} Connection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
