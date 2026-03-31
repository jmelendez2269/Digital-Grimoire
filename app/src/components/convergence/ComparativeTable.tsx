"use client";

import { useMemo, useState } from "react";

interface ConvergenceConcept {
  id: string;
  slug: string;
  name: string;
  tradition: string;
  era?: string;
  short_definition?: string;
  primary_sources?: string[];
  tags?: string[];
}

interface ConvergenceRelationship {
  id: string;
  source_id: string;
  target_id: string;
  similarity: number;
  source_citation?: string;
  notes?: string;
}

interface ComparativeTableProps {
  concepts: ConvergenceConcept[];
  relationships: ConvergenceRelationship[];
  onSelectConcept: (concept: ConvergenceConcept) => void;
}

type SortField = "name" | "tradition" | "similarity";
type SortDirection = "asc" | "desc";

export default function ComparativeTable({
  concepts,
  relationships,
  onSelectConcept,
}: ComparativeTableProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);

  // Build concept pairs with similarity scores
  const conceptPairs = useMemo(() => {
    const pairs: Array<{
      concept1: ConvergenceConcept;
      concept2: ConvergenceConcept;
      similarity: number;
      relationship: ConvergenceRelationship;
    }> = [];

    const conceptMap = new Map(concepts.map((c) => [c.id, c]));

    relationships.forEach((rel) => {
      const concept1 = conceptMap.get(rel.source_id);
      const concept2 = conceptMap.get(rel.target_id);

      if (concept1 && concept2) {
        // Ensure consistent ordering (alphabetical by name)
        const [c1, c2] = concept1.name < concept2.name ? [concept1, concept2] : [concept2, concept1];

        pairs.push({
          concept1: c1,
          concept2: c2,
          similarity: rel.similarity,
          relationship: rel,
        });
      }
    });

    return pairs;
  }, [concepts, relationships]);

  // Sort pairs
  const sortedPairs = useMemo(() => {
    const sorted = [...conceptPairs].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.concept1.name.localeCompare(b.concept1.name);
          break;
        case "tradition":
          comparison = a.concept1.tradition.localeCompare(b.concept1.tradition);
          if (comparison === 0) {
            comparison = a.concept2.tradition.localeCompare(b.concept2.tradition);
          }
          break;
        case "similarity":
          comparison = a.similarity - b.similarity;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [conceptPairs, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return "text-green-400";
    if (similarity >= 0.6) return "text-amber-400";
    if (similarity >= 0.4) return "text-yellow-400";
    return "text-amber-100/60";
  };

  const getSimilarityBarWidth = (similarity: number) => {
    return `${similarity * 100}%`;
  };

  if (conceptPairs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-amber-100/60">
        <div className="text-center">
          <p className="text-lg mb-2">No relationships found</p>
          <p className="text-sm">Try adjusting your similarity threshold or adding relationships to the database.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-amber-900/30">
            <th
              className="text-left py-3 px-4 text-sm font-semibold text-amber-100/80 cursor-pointer hover:text-amber-100"
              onClick={() => handleSort("name")}
            >
              Concept 1
              {sortField === "name" && (
                <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
              )}
            </th>
            <th
              className="text-left py-3 px-4 text-sm font-semibold text-amber-100/80 cursor-pointer hover:text-amber-100"
              onClick={() => handleSort("name")}
            >
              Concept 2
            </th>
            <th
              className="text-left py-3 px-4 text-sm font-semibold text-amber-100/80 cursor-pointer hover:text-amber-100"
              onClick={() => handleSort("tradition")}
            >
              Traditions
              {sortField === "tradition" && (
                <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
              )}
            </th>
            <th
              className="text-left py-3 px-4 text-sm font-semibold text-amber-100/80 cursor-pointer hover:text-amber-100"
              onClick={() => handleSort("similarity")}
            >
              Similarity
              {sortField === "similarity" && (
                <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
              )}
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-amber-100/80">
              Source
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedPairs.map((pair) => (
            <tr
              key={pair.relationship.id}
              className="border-b border-amber-900/10 hover:bg-zinc-800/30 transition-colors"
            >
              <td className="py-3 px-4">
                <button
                  onClick={() => {
                    setSelectedConceptId(pair.concept1.id);
                    onSelectConcept(pair.concept1);
                  }}
                  className={`text-left text-amber-100 hover:text-amber-50 hover:underline ${
                    selectedConceptId === pair.concept1.id ? "font-semibold text-amber-200" : ""
                  }`}
                >
                  {pair.concept1.name}
                </button>
                <div className="text-xs text-amber-100/50 mt-1">{pair.concept1.tradition}</div>
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={() => {
                    setSelectedConceptId(pair.concept2.id);
                    onSelectConcept(pair.concept2);
                  }}
                  className={`text-left text-amber-100 hover:text-amber-50 hover:underline ${
                    selectedConceptId === pair.concept2.id ? "font-semibold text-amber-200" : ""
                  }`}
                >
                  {pair.concept2.name}
                </button>
                <div className="text-xs text-amber-100/50 mt-1">{pair.concept2.tradition}</div>
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  <span className="px-2 py-1 rounded text-xs bg-zinc-800 text-amber-100/80">
                    {pair.concept1.tradition}
                  </span>
                  <span className="px-2 py-1 rounded text-xs bg-zinc-800 text-amber-100/80">
                    {pair.concept2.tradition}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all`}
                      style={{ width: getSimilarityBarWidth(pair.similarity) }}
                    />
                  </div>
                  <span className={`text-sm font-medium min-w-[3rem] ${getSimilarityColor(pair.similarity)}`}>
                    {(pair.similarity * 100).toFixed(0)}%
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                {pair.relationship.source_citation ? (
                  <span className="text-xs text-amber-100/60">{pair.relationship.source_citation}</span>
                ) : (
                  <span className="text-xs text-amber-100/30">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
