"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Orbit } from "lucide-react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AppLoader from "@/components/ui/AppLoader";
import ParallaxLoader from "@/components/ui/ParallaxLoader";
import KnowledgeGraphHeader from "@/components/admin/knowledge/KnowledgeGraphHeader";
import CorrespondenceControls from "@/components/admin/knowledge/CorrespondenceControls";
import GraphControls from "@/components/admin/knowledge/GraphControls";
import SimilarityControls from "@/components/parallax/SimilarityControls";
import TraditionLegend from "@/components/parallax/TraditionLegend";
import EntityNode from "@/components/PublicEntityCard";
import ComparativeTable from "@/components/parallax/ComparativeTable";
import EntityDetailModal from "@/components/admin/EntityDetailModal";
import ConceptDetailModal from "@/components/parallax/ConceptDetailModal";
import { isSentenceLikeEntityName } from "@/lib/graph/entity-utils";
import { CorrespondenceEntity, GraphType, ParallaxConcept, ParallaxRelationship } from "@/lib/types";

type CorrespondenceRelationship = {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  weight?: number;
  similarity?: number;
  confidence?: string;
  source_citation?: string;
  notes?: string;
};

type CorrespondenceRelationshipLayer = "corresponds_to" | "associated_with" | "shares_correspondence_with" | "refines";
type CorrespondenceRelationshipFilters = Record<CorrespondenceRelationshipLayer, boolean>;

type FocusedCorrespondenceGraph = {
  entities: CorrespondenceEntity[];
  relationships: CorrespondenceRelationship[];
  seed: CorrespondenceEntity | null;
  availableNodeCount: number;
  availableEdgeCount: number;
};

type PaginatedGraphResponse<T> = {
  items?: T[];
  total?: number;
  offset?: number;
  limit?: number;
  hasMore?: boolean;
};

const CORRESPONDENCE_PAGE_SIZE = 5000;
const FOCUSED_GRAPH_NODE_LIMIT = 140;
const FOCUSED_GRAPH_EDGE_LIMIT = 520;
const FOCUSED_NEIGHBOR_FANOUT = 18;
const FULL_GRAPH_SAFE_NODE_HINT = 1200;
const FULL_GRAPH_SAFE_EDGE_HINT = 6000;
const DEFAULT_CORRESPONDENCE_RELATIONSHIP_FILTERS: CorrespondenceRelationshipFilters = {
  corresponds_to: true,
  associated_with: true,
  shares_correspondence_with: true,
  refines: false,
};

const GraphVisualization = dynamic(
  () => import("@/components/parallax/ParallaxGraph"),
  { ssr: false, loading: () => <ParallaxLoader /> },
);

const FloatingAISearch = dynamic(() => import("@/components/FloatingAISearch"), {
  ssr: false,
  loading: () => null,
});

function getRelationshipStrength(relationship: CorrespondenceRelationship) {
  return relationship.similarity ?? relationship.weight ?? 0.5;
}

function getCorrespondenceRelationshipType(relationship: CorrespondenceRelationship): CorrespondenceRelationshipLayer {
  if (relationship.type === "associated_with") return "associated_with";
  if (relationship.type === "shares_correspondence_with") return "shares_correspondence_with";
  if (relationship.type === "refines") return "refines";
  return "corresponds_to";
}

async function fetchGraphPage<T>(
  endpoint: string,
  options: { limit: number; offset: number; cacheBust: number },
): Promise<PaginatedGraphResponse<T>> {
  const params = new URLSearchParams({
    limit: String(options.limit),
    offset: String(options.offset),
    _t: String(options.cacheBust),
  });
  const response = await fetch(`${endpoint}?${params.toString()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
  }

  return response.json() as Promise<PaginatedGraphResponse<T>>;
}

async function fetchAllGraphPages<T>(endpoint: string, pageSize: number) {
  const cacheBust = Date.now();
  const firstPage = await fetchGraphPage<T>(endpoint, {
    limit: pageSize,
    offset: 0,
    cacheBust,
  });

  const firstItems = firstPage.items || [];
  const total = Math.max(firstPage.total ?? firstItems.length, firstItems.length);

  if (!firstPage.hasMore || total <= firstItems.length) {
    return firstItems;
  }

  const offsets: number[] = [];
  for (let offset = firstItems.length; offset < total; offset += pageSize) {
    offsets.push(offset);
  }

  const remainingPages = await Promise.all(
    offsets.map((offset) =>
      fetchGraphPage<T>(endpoint, {
        limit: pageSize,
        offset,
        cacheBust,
      }),
    ),
  );

  return [
    ...firstItems,
    ...remainingPages.flatMap((page) => page.items || []),
  ];
}

function pickCorrespondenceSeed(
  entities: CorrespondenceEntity[],
  degreeById: Map<string, number>,
  shuffleToken: number,
) {
  const connectedEntities = entities.filter((entity) => (degreeById.get(entity.id) || 0) > 0);
  const candidates = connectedEntities.length > 0 ? connectedEntities : entities;

  if (candidates.length === 0) return null;
  return candidates[shuffleToken % candidates.length] || candidates[0];
}

function buildFocusedCorrespondenceGraph(
  entities: CorrespondenceEntity[],
  relationships: CorrespondenceRelationship[],
  shuffleToken: number,
): FocusedCorrespondenceGraph {
  const entityById = new Map(entities.map((entity) => [entity.id, entity] as const));
  const candidateIds = new Set(entityById.keys());
  const relevantRelationships = relationships.filter((relationship) =>
    candidateIds.has(relationship.source_id) && candidateIds.has(relationship.target_id),
  );

  if (entities.length === 0 || relevantRelationships.length === 0) {
    return {
      entities,
      relationships: [],
      seed: entities[0] || null,
      availableNodeCount: entities.length,
      availableEdgeCount: relevantRelationships.length,
    };
  }

  const degreeById = new Map<string, number>();
  const adjacency = new Map<string, Array<{ nodeId: string; relationship: CorrespondenceRelationship }>>();

  for (const entity of entities) {
    degreeById.set(entity.id, 0);
    adjacency.set(entity.id, []);
  }

  for (const relationship of relevantRelationships) {
    degreeById.set(relationship.source_id, (degreeById.get(relationship.source_id) || 0) + 1);
    degreeById.set(relationship.target_id, (degreeById.get(relationship.target_id) || 0) + 1);
    adjacency.get(relationship.source_id)?.push({ nodeId: relationship.target_id, relationship });
    adjacency.get(relationship.target_id)?.push({ nodeId: relationship.source_id, relationship });
  }

  for (const neighbors of adjacency.values()) {
    neighbors.sort((left, right) => {
      const strengthDelta = getRelationshipStrength(right.relationship) - getRelationshipStrength(left.relationship);
      if (strengthDelta !== 0) return strengthDelta;
      return (degreeById.get(right.nodeId) || 0) - (degreeById.get(left.nodeId) || 0);
    });
  }

  const seed = pickCorrespondenceSeed(entities, degreeById, shuffleToken);
  if (!seed) {
    return {
      entities,
      relationships: relevantRelationships,
      seed: null,
      availableNodeCount: entities.length,
      availableEdgeCount: relevantRelationships.length,
    };
  }

  const selectedIds = new Set<string>([seed.id]);
  const queue = [seed.id];

  while (queue.length > 0 && selectedIds.size < FOCUSED_GRAPH_NODE_LIMIT) {
    const currentId = queue.shift()!;
    const neighbors = adjacency.get(currentId) || [];

    for (const { nodeId } of neighbors.slice(0, FOCUSED_NEIGHBOR_FANOUT)) {
      if (selectedIds.has(nodeId)) continue;
      selectedIds.add(nodeId);
      queue.push(nodeId);
      if (selectedIds.size >= FOCUSED_GRAPH_NODE_LIMIT) break;
    }
  }

  if (selectedIds.size < FOCUSED_GRAPH_NODE_LIMIT) {
    const fallbackEntities = [...entities]
      .sort((left, right) => (degreeById.get(right.id) || 0) - (degreeById.get(left.id) || 0))
      .filter((entity) => !selectedIds.has(entity.id));

    for (const entity of fallbackEntities) {
      selectedIds.add(entity.id);
      if (selectedIds.size >= FOCUSED_GRAPH_NODE_LIMIT) break;
    }
  }

  const selectedRelationships = relevantRelationships
    .filter((relationship) => selectedIds.has(relationship.source_id) && selectedIds.has(relationship.target_id))
    .sort((left, right) => {
      const strengthDelta = getRelationshipStrength(right) - getRelationshipStrength(left);
      if (strengthDelta !== 0) return strengthDelta;

      const leftDegree = (degreeById.get(left.source_id) || 0) + (degreeById.get(left.target_id) || 0);
      const rightDegree = (degreeById.get(right.source_id) || 0) + (degreeById.get(right.target_id) || 0);
      return rightDegree - leftDegree;
    })
    .slice(0, FOCUSED_GRAPH_EDGE_LIMIT);

  const relationshipBackedIds = new Set<string>([seed.id]);
  for (const relationship of selectedRelationships) {
    relationshipBackedIds.add(relationship.source_id);
    relationshipBackedIds.add(relationship.target_id);
  }

  const selectedEntities = [...selectedIds]
    .filter((entityId) => relationshipBackedIds.has(entityId))
    .map((entityId) => entityById.get(entityId))
    .filter(Boolean) as CorrespondenceEntity[];

  selectedEntities.sort((left, right) => {
    if (left.id === seed.id) return -1;
    if (right.id === seed.id) return 1;
    return (degreeById.get(right.id) || 0) - (degreeById.get(left.id) || 0);
  });

  return {
    entities: selectedEntities,
    relationships: selectedRelationships,
    seed,
    availableNodeCount: entities.length,
    availableEdgeCount: relevantRelationships.length,
  };
}

function GraphPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [graphType, setGraphType] = useState<GraphType>((searchParams.get("type") as GraphType) || "correspondences");
  const [viewMode, setViewMode] = useState<"cards" | "graph" | "table">("graph");
  const [entities, setEntities] = useState<(ParallaxConcept | CorrespondenceEntity)[]>([]);
  const [relationships, setRelationships] = useState<(ParallaxRelationship | CorrespondenceRelationship)[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParallaxConcept, setSelectedParallaxConcept] = useState<ParallaxConcept | null>(null);
  const [selectedCorrespondenceEntity, setSelectedCorrespondenceEntity] = useState<CorrespondenceEntity | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTradition, setSelectedTradition] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [minSimilarity, setMinSimilarity] = useState(0);
  const [correspondenceShuffleToken, setCorrespondenceShuffleToken] = useState(() => Math.floor(Math.random() * 997));
  const [correspondenceGraphScope, setCorrespondenceGraphScope] = useState<"focused" | "full">("focused");
  const [correspondenceRelationshipFilters, setCorrespondenceRelationshipFilters] =
    useState<CorrespondenceRelationshipFilters>(DEFAULT_CORRESPONDENCE_RELATIONSHIP_FILTERS);

  useEffect(() => {
    let cancelled = false;

    const fetchEntities = async () => {
      setLoading(true);
      try {
        if (graphType === "parallax") {
          const [entitiesRes, relationshipsRes] = await Promise.all([
            fetch("/api/concepts?limit=200", { cache: "no-store" }),
            fetch(`/api/concepts/relationships?limit=400&minSimilarity=${minSimilarity}`, { cache: "no-store" }),
          ]);

          const entitiesData = await entitiesRes.json();
          const relationshipsData = await relationshipsRes.json();

          if (cancelled) return;
          setEntities(entitiesData.items || []);
          setRelationships(relationshipsData.items || []);
        } else {
          const [allEntities, allRelationships] = await Promise.all([
            fetchAllGraphPages<CorrespondenceEntity>("/api/graph/entities", CORRESPONDENCE_PAGE_SIZE),
            fetchAllGraphPages<CorrespondenceRelationship>("/api/graph/edges", CORRESPONDENCE_PAGE_SIZE),
          ]);

          if (cancelled) return;
          setEntities(allEntities);
          setRelationships(allRelationships.map((relationship: CorrespondenceRelationship) => ({
            ...relationship,
            similarity: relationship.weight || 0.5,
          })));
        }
      } catch (error) {
        console.error("Failed to fetch entities", error);
        if (cancelled) return;
        setEntities([]);
        setRelationships([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchEntities();

    return () => {
      cancelled = true;
    };
  }, [graphType, minSimilarity]);

  const traditions = useMemo(() => {
    if (graphType !== "parallax") return [];

    return Array.from(
      new Set(
        (entities as ParallaxConcept[])
          .map((concept) => concept.tradition || concept.tradition_ref?.label)
          .filter(Boolean) as string[],
      ),
    ).sort();
  }, [graphType, entities]);

  const categories = useMemo(() => {
    if (graphType !== "correspondences") return [];

    return Array.from(
      new Set(
        (entities as CorrespondenceEntity[])
          .map((entity) => entity.category || entity.type?.label)
          .filter(Boolean) as string[],
      ),
    ).sort();
  }, [graphType, entities]);

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      if (graphType === "correspondences") {
        const correspondence = entity as CorrespondenceEntity;
        if (isSentenceLikeEntityName(correspondence.name)) {
          return false;
        }
      }

      const query = searchQuery.toLowerCase();

      if (graphType === "parallax" && selectedTradition) {
        const concept = entity as ParallaxConcept;
        const traditionLabel = concept.tradition || concept.tradition_ref?.label;
        if (traditionLabel !== selectedTradition) return false;
      }

      if (graphType === "correspondences" && selectedCategory) {
        const correspondence = entity as CorrespondenceEntity;
        const categoryLabel = correspondence.category || correspondence.type?.label;
        if (categoryLabel !== selectedCategory) return false;
      }

      if (!searchQuery) return true;

      if (graphType === "correspondences") {
        const correspondence = entity as CorrespondenceEntity;
        return (
          correspondence.name.toLowerCase().includes(query) ||
          (correspondence.slug && correspondence.slug.toLowerCase().includes(query)) ||
          (correspondence.category && correspondence.category.toLowerCase().includes(query)) ||
          (correspondence.type?.label && correspondence.type.label.toLowerCase().includes(query)) ||
          correspondence.aliases?.some((alias) => alias.toLowerCase().includes(query)) ||
          correspondence.description?.toLowerCase().includes(query)
        );
      }

      const concept = entity as ParallaxConcept;
      return (
        concept.name.toLowerCase().includes(query) ||
        (concept.tradition && concept.tradition.toLowerCase().includes(query)) ||
        (concept.tradition_ref && concept.tradition_ref.label.toLowerCase().includes(query)) ||
        concept.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
        concept.short_definition?.toLowerCase().includes(query)
      );
    });
  }, [entities, graphType, searchQuery, selectedCategory, selectedTradition]);

  const graphFilteredCorrespondenceEntities = useMemo(() => {
    if (graphType !== "correspondences") {
      return filteredEntities as CorrespondenceEntity[];
    }

    const anchors = filteredEntities as CorrespondenceEntity[];
    if (anchors.length === 0) return [];
    if (!selectedCategory) return anchors;

    const correspondenceById = new Map(
      (entities as CorrespondenceEntity[]).map((entity) => [entity.id, entity] as const),
    );
    const anchorIds = new Set(anchors.map((entity) => entity.id));
    const graphIds = new Set(anchorIds);

    for (const relationship of relationships as CorrespondenceRelationship[]) {
      if (anchorIds.has(relationship.source_id) || anchorIds.has(relationship.target_id)) {
        const source = correspondenceById.get(relationship.source_id);
        const target = correspondenceById.get(relationship.target_id);

        if (source && !isSentenceLikeEntityName(source.name)) {
          graphIds.add(source.id);
        }
        if (target && !isSentenceLikeEntityName(target.name)) {
          graphIds.add(target.id);
        }
      }
    }

    return [...graphIds]
      .map((entityId) => correspondenceById.get(entityId))
      .filter(Boolean) as CorrespondenceEntity[];
  }, [entities, filteredEntities, graphType, relationships, selectedCategory]);

  const focusedCorrespondenceGraph = useMemo(() => {
    if (graphType !== "correspondences") return null;

    const correspondenceById = new Map(
      (entities as CorrespondenceEntity[]).map((entity) => [entity.id, entity] as const),
    );

    return buildFocusedCorrespondenceGraph(
      graphFilteredCorrespondenceEntities,
      (relationships as CorrespondenceRelationship[])
        .filter((relationship) => correspondenceRelationshipFilters[getCorrespondenceRelationshipType(relationship)])
        .filter((relationship) => {
          const source = correspondenceById.get(relationship.source_id);
          const target = correspondenceById.get(relationship.target_id);
          return !(
            (source && isSentenceLikeEntityName(source.name)) ||
            (target && isSentenceLikeEntityName(target.name))
          );
        }),
      correspondenceShuffleToken,
    );
  }, [
    correspondenceRelationshipFilters,
    correspondenceShuffleToken,
    entities,
    graphFilteredCorrespondenceEntities,
    graphType,
    relationships,
  ]);

  const fullCorrespondenceGraph = useMemo(() => {
    if (graphType !== "correspondences") return null;

    const visibleEntityIds = new Set(
      graphFilteredCorrespondenceEntities.map((entity) => entity.id),
    );

    const eligibleRelationships = (relationships as CorrespondenceRelationship[]).filter(
      (relationship) =>
        correspondenceRelationshipFilters[getCorrespondenceRelationshipType(relationship)] &&
        visibleEntityIds.has(relationship.source_id) &&
        visibleEntityIds.has(relationship.target_id),
    );

    return {
      entities: graphFilteredCorrespondenceEntities,
      relationships: eligibleRelationships,
    };
  }, [correspondenceRelationshipFilters, graphFilteredCorrespondenceEntities, graphType, relationships]);

  const activeCorrespondenceGraph =
    correspondenceGraphScope === "focused" ? focusedCorrespondenceGraph : fullCorrespondenceGraph;

  const graphEntities = graphType === "correspondences" && viewMode === "graph"
    ? activeCorrespondenceGraph?.entities || []
    : filteredEntities;
  const graphRelationships = graphType === "correspondences" && viewMode === "graph"
    ? activeCorrespondenceGraph?.relationships || []
    : relationships;
  const displayedEntityCount = graphType === "correspondences" && viewMode === "graph"
    ? activeCorrespondenceGraph?.entities.length || 0
    : filteredEntities.length;
  const displayedRelationshipCount = graphType === "correspondences" && viewMode === "graph"
    ? activeCorrespondenceGraph?.relationships.length || 0
    : relationships.length;

  const handleTypeChange = (type: GraphType) => {
    setGraphType(type);
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedTradition(null);
    setMinSimilarity(0);
    setCorrespondenceGraphScope("focused");
    setCorrespondenceRelationshipFilters(DEFAULT_CORRESPONDENCE_RELATIONSHIP_FILTERS);
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", type);
    router.replace(`/graph?${params.toString()}`, { scroll: false });
  };

  const handleSelectEntity = (entity: ParallaxConcept | CorrespondenceEntity) => {
    if (graphType === "parallax") {
      setSelectedParallaxConcept(entity as ParallaxConcept);
    } else {
      setSelectedCorrespondenceEntity(entity as CorrespondenceEntity);
    }
  };

  const isParallaxGraphView = graphType === "parallax" && viewMode === "graph";
  const correspondenceRelationshipCounts = useMemo(() => {
    if (graphType !== "correspondences") {
      return {
        corresponds_to: 0,
        associated_with: 0,
        shares_correspondence_with: 0,
        refines: 0,
      };
    }

    return (relationships as CorrespondenceRelationship[]).reduce(
      (counts, relationship) => {
        counts[getCorrespondenceRelationshipType(relationship)] += 1;
        return counts;
      },
      {
        corresponds_to: 0,
        associated_with: 0,
        shares_correspondence_with: 0,
        refines: 0,
      } as Record<CorrespondenceRelationshipLayer, number>,
    );
  }, [graphType, relationships]);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 selection:bg-amber-900/30">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <KnowledgeGraphHeader
          title={graphType === "parallax" ? "The Parallax Graph" : "Correspondences"}
          subtitle={graphType === "parallax"
            ? "Visualizing the convergence of magical traditions and modern theory."
            : correspondenceGraphScope === "focused"
              ? "Focused constellations drawn from the full correspondence archive."
              : "The full correspondence archive, organized as a living network."}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          entityCount={displayedEntityCount}
          connectionCount={displayedRelationshipCount}
          loading={loading}
        />

        <div className="mb-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <GraphControls
              graphType={graphType}
              onGraphTypeChange={handleTypeChange}
              viewMode={viewMode === "table" ? "cards" : viewMode}
              onViewModeChange={(mode) => setViewMode(mode)}
            />

            {graphType === "parallax" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-400 hover:text-amber-200 transition-colors ${viewMode === "table" ? "text-amber-200 bg-white/10" : ""}`}
                >
                  <span>Table View</span>
                </button>
              </div>
            )}

            {graphType === "correspondences" && viewMode === "graph" && activeCorrespondenceGraph && (
              <div className="flex items-center gap-3">
                {correspondenceGraphScope === "focused" && focusedCorrespondenceGraph ? (
                  <>
                    <div className="hidden md:flex flex-col text-right">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-amber-500/50 font-mono">
                        Random Discovery
                      </span>
                      <span className="text-sm text-amber-100">
                        {focusedCorrespondenceGraph.seed?.name || "Archive"}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Showing {focusedCorrespondenceGraph.entities.length} nodes and {focusedCorrespondenceGraph.relationships.length} links from {focusedCorrespondenceGraph.availableNodeCount} filtered entities and {focusedCorrespondenceGraph.availableEdgeCount} filtered links
                      </span>
                    </div>

                    <button
                      onClick={() => setCorrespondenceShuffleToken((token) => token + 1)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-400 hover:text-amber-200 transition-colors"
                    >
                      <Orbit className="w-3.5 h-3.5" />
                      <span>Shuffle Random Focus</span>
                    </button>
                  </>
                ) : (
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-amber-500/50 font-mono">
                      Archive View
                    </span>
                    <span className="text-sm text-amber-100">
                      Showing every filtered correspondence
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {activeCorrespondenceGraph.entities.length} nodes and {activeCorrespondenceGraph.relationships.length} links are currently in view
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {graphType === "parallax" && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <SimilarityControls
                minSimilarity={minSimilarity}
                onSimilarityChange={setMinSimilarity}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedTradition={selectedTradition}
                onTraditionChange={setSelectedTradition}
                traditions={traditions}
              />
            </div>
          )}

          {graphType === "correspondences" && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <CorrespondenceControls
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                categories={categories}
                graphScope={correspondenceGraphScope}
                onGraphScopeChange={setCorrespondenceGraphScope}
                showGraphScopeControls={viewMode === "graph"}
                relationshipFilters={correspondenceRelationshipFilters}
                onRelationshipFilterChange={(layer, value) =>
                  setCorrespondenceRelationshipFilters((current) => ({
                    ...current,
                    [layer]: value,
                  }))
                }
                relationshipCounts={correspondenceRelationshipCounts}
                showRelationshipFilters={viewMode === "graph"}
              />
            </div>
          )}
        </div>

        <div className="min-h-[600px] animate-in fade-in duration-700">
          {loading ? (
            <div className="flex items-center justify-center p-20">
              <div className="flex flex-col items-center gap-4">
                <ParallaxLoader />
                {graphType === "correspondences" && (
                  <p className="text-sm text-amber-100/50">
                    {correspondenceGraphScope === "focused"
                      ? "Loading the correspondence archive and picking a random constellation..."
                      : "Loading the full correspondence archive..."}
                  </p>
                )}
              </div>
            </div>
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEntities.map((entity) => (
                <EntityNode
                  key={entity.id}
                  entity={entity}
                  graphType={graphType}
                  relationships={relationships}
                  onSelect={() => handleSelectEntity(entity)}
                />
              ))}

              {filteredEntities.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <div className="inline-block p-4 rounded-full bg-white/5 border border-white/10 mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-500/50" />
                  </div>
                  <h3 className="text-amber-100 font-bold mb-2">No Signal Found</h3>
                  <p className="text-amber-100/40 text-sm max-w-sm mx-auto">
                    {searchQuery
                      ? "Query produced no matches. Adjust search parameters."
                      : "Knowledge base is empty."}
                  </p>
                </div>
              )}
            </div>
          ) : viewMode === "table" ? (
            <ComparativeTable
              concepts={filteredEntities as ParallaxConcept[]}
              relationships={relationships}
              onSelectConcept={(entity) => handleSelectEntity(entity)}
            />
          ) : (
            <div className={`grid gap-6 ${isParallaxGraphView ? "grid-cols-1 lg:grid-cols-4" : "grid-cols-1"}`}>
              <div className={isParallaxGraphView ? "lg:col-span-3" : "col-span-1"}>
                <div className="h-[700px] bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl">
                  <GraphVisualization
                    concepts={graphEntities as (ParallaxConcept | CorrespondenceEntity)[]}
                    relationships={graphRelationships}
                    onSelectConcept={(entity: ParallaxConcept | CorrespondenceEntity) => handleSelectEntity(entity)}
                    minSimilarity={minSimilarity}
                  />
                </div>
                {graphType === "correspondences" &&
                  viewMode === "graph" &&
                  correspondenceGraphScope === "focused" &&
                  activeCorrespondenceGraph && (
                    <div className="mt-3 rounded-xl border border-emerald-900/30 bg-emerald-950/20 px-4 py-3 text-xs leading-6 text-emerald-100/70">
                      Focused mode is the best entry point when you arrive with a search term or just want one inviting thread to follow. Add layers gradually, then switch to `Full Archive` when you want to wander the wider network and discover unexpected neighbors.
                    </div>
                  )}
                {graphType === "correspondences" &&
                  viewMode === "graph" &&
                  correspondenceGraphScope === "full" &&
                  displayedEntityCount > FULL_GRAPH_SAFE_NODE_HINT && (
                    <div className="mt-3 rounded-xl border border-amber-900/30 bg-amber-950/20 px-4 py-3 text-xs leading-6 text-amber-100/70">
                      Full archive mode is active. With {displayedEntityCount} nodes and {displayedRelationshipCount} links, this view is meant for exploration more than exhaustive reading.
                      Narrow by category or search when you want precision, or switch back to `Focused` for a calmer constellation.
                    </div>
                  )}
                {graphType === "correspondences" &&
                  viewMode === "graph" &&
                  correspondenceGraphScope === "full" &&
                  displayedRelationshipCount > FULL_GRAPH_SAFE_EDGE_HINT && (
                    <div className="mt-3 rounded-xl border border-zinc-800 bg-black/30 px-4 py-3 text-xs leading-6 text-zinc-400">
                      This is a discovery view. Don’t worry about reading every label at once. Use search, category filters, hover, and click-to-focus to pull one thread out of the archive at a time.
                    </div>
                  )}
              </div>

              {isParallaxGraphView && (
                <div className="lg:col-span-1">
                  <div className="bg-zinc-900/50 border border-amber-900/20 rounded-2xl p-4 shadow-2xl h-fit">
                    <TraditionLegend
                      traditions={traditions}
                      concepts={entities as ParallaxConcept[]}
                      selectedTradition={selectedTradition}
                      onSelectTradition={setSelectedTradition}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedParallaxConcept && (
          <ConceptDetailModal
            concept={selectedParallaxConcept}
            relationships={relationships}
            concepts={entities as ParallaxConcept[]}
            onClose={() => setSelectedParallaxConcept(null)}
          />
        )}

        {selectedCorrespondenceEntity && (
          <EntityDetailModal
            entity={selectedCorrespondenceEntity}
            graphType={graphType}
            onClose={() => setSelectedCorrespondenceEntity(null)}
            readOnly={true}
          />
        )}
      </main>

      {graphType === "parallax" && <FloatingAISearch defaultCollapsed={true} />}

      <Footer />
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<AppLoader fullScreen />}>
      <GraphPageContent />
    </Suspense>
  );
}
