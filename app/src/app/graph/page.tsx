"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, BookOpen, ChevronDown, ChevronRight, ChevronUp, Compass, GraduationCap, Lightbulb, List, Map as MapIcon, Orbit, PanelRightClose, PanelRightOpen, Search, Sparkles, UserRound, X } from "lucide-react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AppLoader from "@/components/ui/AppLoader";
import ParallaxLoader from "@/components/ui/ParallaxLoader";
import KnowledgeGraphHeader from "@/components/admin/knowledge/KnowledgeGraphHeader";
import type { GraphSearchSuggestion } from "@/components/admin/knowledge/KnowledgeGraphHeader";
import CorrespondenceControls from "@/components/admin/knowledge/CorrespondenceControls";
import GraphControls from "@/components/admin/knowledge/GraphControls";
import EntityDetailModal from "@/components/admin/EntityDetailModal";
import CourseGraphEntityDialog from "@/components/graph/CourseGraphEntityDialog";
import CourseGraphPublicView from "@/components/graph/CourseGraphPublicView";
import { isSentenceLikeEntityName } from "@/lib/graph/entity-utils";
import {
  FD01_COURSE_SLUG,
  FD01_PATTERN_TEST_FALLBACK,
  FD01_PATTERN_TEST_VIEW,
  isFd01GraphPreviewEnabled,
  type PublicCourseGraphPackage,
} from "@/lib/graph/course-graph-public";
import {
  CorrespondenceEntity,
  CourseGraphEdge,
  CourseGraphEntity,
  CourseGraphEntityKind,
  CourseGraphPayload,
  GraphType,
} from "@/lib/types";

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
type CorrespondenceLayoutDensity = "compact" | "balanced" | "expanded";
type CorrespondenceLayoutEngine = "clusters" | "organic";

type FocusedCorrespondenceGraph = {
  entities: CorrespondenceEntity[];
  relationships: CorrespondenceRelationship[];
  seed: CorrespondenceEntity | null;
  availableNodeCount: number;
  availableEdgeCount: number;
};

type CorrespondenceTraversal = {
  path: CorrespondenceEntity[];
  index: number;
};

type PaginatedGraphResponse<T> = {
  items?: T[];
  total?: number;
  offset?: number;
  limit?: number;
  hasMore?: boolean;
};

// Supabase/PostgREST caps each response at 1,000 rows in this project. Keep
// the requested page size at that ceiling so offset pagination never skips
// rows when the API returns fewer items than requested.
const CORRESPONDENCE_PAGE_SIZE = 1000;
const DEFAULT_CANDIDATE_COURSE = "pre-how-to-hold-two-things-at-once";
const FOCUSED_GRAPH_NODE_LIMIT = 140;
const FOCUSED_GRAPH_EDGE_LIMIT = 520;
const FOCUSED_NEIGHBOR_FANOUT = 18;
const FOCUSED_CONTEXT_NODE_LIMIT = 90;
const INSPECTOR_CONNECTION_PREVIEW_LIMIT = 12;
const FULL_GRAPH_SAFE_NODE_HINT = 1200;
const FULL_GRAPH_SAFE_EDGE_HINT = 6000;
const DEFAULT_CORRESPONDENCE_RELATIONSHIP_FILTERS: CorrespondenceRelationshipFilters = {
  corresponds_to: true,
  associated_with: true,
  shares_correspondence_with: true,
  refines: false,
};

const COURSE_ENTITY_KIND_ORDER: CourseGraphEntityKind[] = [
  "course",
  "concept",
  "work",
  "person",
  "lesson",
  "edition",
  "passage",
  "tradition",
  "institution",
  "artifact",
];

const COURSE_ENTITY_KIND_LABELS: Record<CourseGraphEntityKind, string> = {
  course: "Courses",
  concept: "Concepts",
  work: "Works",
  person: "People",
  lesson: "Lessons",
  edition: "Editions",
  passage: "Passages",
  tradition: "Traditions",
  institution: "Institutions",
  artifact: "Artifacts",
};

const COURSE_ENTITY_KIND_COLORS: Record<CourseGraphEntityKind, string> = {
  course: "#F5D084",
  concept: "#22D3EE",
  work: "#A78BFA",
  person: "#FB7185",
  lesson: "#60A5FA",
  edition: "#C084FC",
  passage: "#38BDF8",
  tradition: "#34D399",
  institution: "#F59E0B",
  artifact: "#94A3B8",
};

type GraphPageEntity = CourseGraphEntity | CorrespondenceEntity;

const GraphVisualization = dynamic(
  () => import("@/components/parallax/ParallaxGraph"),
  { ssr: false, loading: () => <ParallaxLoader /> },
);

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
  preferredSeedId?: string | null,
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

  const seed = (preferredSeedId ? entityById.get(preferredSeedId) : null) || pickCorrespondenceSeed(entities, degreeById, shuffleToken);
  if (!seed) {
    return {
      entities,
      relationships: relevantRelationships,
      seed: null,
      availableNodeCount: entities.length,
      availableEdgeCount: relevantRelationships.length,
    };
  }

  // An explicit focus keeps a true one-hop neighborhood bright while retaining
  // a bounded two-hop halo for orientation. Random discovery remains a
  // bounded multi-hop constellation so its initial view stays approachable.
  if (preferredSeedId && seed.id === preferredSeedId) {
    const directRelationships = relevantRelationships
      .filter((relationship) => relationship.source_id === seed.id || relationship.target_id === seed.id)
      .sort((left, right) => getRelationshipStrength(right) - getRelationshipStrength(left));
    const directNeighborIds = new Set<string>();

    for (const relationship of directRelationships) {
      directNeighborIds.add(
        relationship.source_id === seed.id ? relationship.target_id : relationship.source_id,
      );
    }

    const directNeighborhoodIds = new Set([seed.id, ...directNeighborIds]);
    const contextScoreById = new Map<string, number>();

    for (const relationship of relevantRelationships) {
      const sourceIsDirect = directNeighborhoodIds.has(relationship.source_id);
      const targetIsDirect = directNeighborhoodIds.has(relationship.target_id);
      if (sourceIsDirect === targetIsDirect) continue;

      const contextId = sourceIsDirect ? relationship.target_id : relationship.source_id;
      contextScoreById.set(
        contextId,
        (contextScoreById.get(contextId) || 0) + 1 + getRelationshipStrength(relationship),
      );
    }

    const contextEntities = [...entities]
      .filter((entity) => !directNeighborhoodIds.has(entity.id))
      .sort((left, right) => {
        const scoreDelta = (contextScoreById.get(right.id) || 0) - (contextScoreById.get(left.id) || 0);
        if (scoreDelta !== 0) return scoreDelta;
        return (degreeById.get(right.id) || 0) - (degreeById.get(left.id) || 0);
      })
      .slice(0, FOCUSED_CONTEXT_NODE_LIMIT);
    const contextualIds = new Set([
      ...directNeighborhoodIds,
      ...contextEntities.map((entity) => entity.id),
    ]);
    const directRelationshipIds = new Set(directRelationships.map((relationship) => relationship.id));
    const contextRelationships = relevantRelationships
      .filter(
        (relationship) =>
          contextualIds.has(relationship.source_id) &&
          contextualIds.has(relationship.target_id) &&
          !directRelationshipIds.has(relationship.id),
      )
      .sort((left, right) => getRelationshipStrength(right) - getRelationshipStrength(left))
      .slice(0, Math.max(FOCUSED_GRAPH_EDGE_LIMIT - directRelationships.length, 0));
    const directEntities = [
      seed,
      ...[...directNeighborIds]
        .map((entityId) => entityById.get(entityId))
        .filter(Boolean) as CorrespondenceEntity[],
      ...contextEntities,
    ];

    return {
      entities: directEntities,
      relationships: [...directRelationships, ...contextRelationships],
      seed,
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
  const requestedGraphType = searchParams.get("type");
  const isPublicCourseView = requestedGraphType === "course";
  const selectedPublicCourse = searchParams.get("course")?.trim() || "";
  const selectedPublicView = searchParams.get("view")?.trim() || "";
  const selectedPublicFocus = searchParams.get("focus")?.trim() || null;
  const selectedCandidateBundle = searchParams.get("bundle")?.trim() || "";
  const publicCoursePreviewEnabled = isFd01GraphPreviewEnabled();

  const [graphType, setGraphType] = useState<GraphType>(
    requestedGraphType === "course"
      ? "parallax"
      : requestedGraphType === "parallax" ||
          requestedGraphType === "correspondences"
        ? requestedGraphType
        : "correspondences",
  );

  useEffect(() => {
    setGraphType(
      requestedGraphType === "course" ||
        requestedGraphType === "parallax"
        ? "parallax"
        : "correspondences",
    );
  }, [requestedGraphType]);

  const [viewMode, setViewMode] = useState<"cards" | "graph">("graph");
  const [entities, setEntities] = useState<GraphPageEntity[]>([]);
  const [relationships, setRelationships] = useState<(CourseGraphEdge | CorrespondenceRelationship)[]>([]);
  const [courseGraph, setCourseGraph] = useState<CourseGraphPayload | null>(null);
  const [courseGraphError, setCourseGraphError] = useState<string | null>(null);
  const [publicCourseGraph, setPublicCourseGraph] =
    useState<PublicCourseGraphPackage | null>(null);
  const [usedStaticCourseFallback, setUsedStaticCourseFallback] =
    useState(false);
  const [selectedCourseKinds, setSelectedCourseKinds] = useState<CourseGraphEntityKind[]>(
    COURSE_ENTITY_KIND_ORDER,
  );
  const [loading, setLoading] = useState(true);
  const [selectedCourseEntity, setSelectedCourseEntity] = useState<CourseGraphEntity | null>(null);
  const [courseFocusEntityId, setCourseFocusEntityId] = useState<string | null>(null);
  const [selectedCorrespondenceEntity, setSelectedCorrespondenceEntity] = useState<CorrespondenceEntity | null>(null);
  const [inspectedCorrespondenceEntity, setInspectedCorrespondenceEntity] = useState<CorrespondenceEntity | null>(null);
  const [correspondenceHistory, setCorrespondenceHistory] = useState<CorrespondenceEntity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [correspondenceShuffleToken, setCorrespondenceShuffleToken] = useState(() => Math.floor(Math.random() * 997));
  const [correspondenceFocusEntityId, setCorrespondenceFocusEntityId] = useState<string | null>(null);
  const [correspondenceFocusSource, setCorrespondenceFocusSource] = useState<"random" | "selected" | null>(null);
  const [correspondenceGraphScope, setCorrespondenceGraphScope] = useState<"focused" | "full">("focused");
  const [correspondenceRelationshipFilters, setCorrespondenceRelationshipFilters] =
    useState<CorrespondenceRelationshipFilters>(DEFAULT_CORRESPONDENCE_RELATIONSHIP_FILTERS);
  const [correspondenceLayoutDensity, setCorrespondenceLayoutDensity] =
    useState<CorrespondenceLayoutDensity>("expanded");
  const [correspondenceLayoutEngine, setCorrespondenceLayoutEngine] =
    useState<CorrespondenceLayoutEngine>("clusters");
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [expandedInspectorEntityId, setExpandedInspectorEntityId] = useState<string | null>(null);
  const [graphSearchFocused, setGraphSearchFocused] = useState(false);
  const [correspondenceTraversal, setCorrespondenceTraversal] = useState<CorrespondenceTraversal>({
    path: [],
    index: -1,
  });
  const deepLinkedFocusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!searchParams.has("source")) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("source");
    const query = params.toString();
    router.replace(query ? `/graph?${query}` : "/graph", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    let cancelled = false;

    const fetchEntities = async () => {
      setLoading(true);
      setCourseGraphError(null);
      try {
        if (isPublicCourseView) {
          setCourseGraph(null);
          setEntities([]);
          setRelationships([]);
          if (!publicCoursePreviewEnabled) {
            setPublicCourseGraph(null);
            setUsedStaticCourseFallback(false);
            throw new Error(
              "This learner course graph preview has not been enabled.",
            );
          }

          if (
            selectedPublicCourse !== FD01_COURSE_SLUG ||
            selectedPublicView !== FD01_PATTERN_TEST_VIEW
          ) {
            setPublicCourseGraph(null);
            setUsedStaticCourseFallback(false);
            throw new Error(
              "This public course view requires one exact course and saved-view selection.",
            );
          }

          try {
            const response = await fetch(
              `/api/course-graph/learner?course=${encodeURIComponent(selectedPublicCourse)}&view=${encodeURIComponent(selectedPublicView)}`,
              { cache: "no-store" },
            );
            const data = (await response.json()) as PublicCourseGraphPackage & {
              error?: string;
            };
            if (
              !response.ok ||
              data.schema_version !== "course-graph-learner/v1" ||
              data.course?.slug !== selectedPublicCourse ||
              data.selected_view?.view_id !== selectedPublicView
            ) {
              throw new Error(data.error || "Learner package unavailable");
            }
            if (cancelled) return;
            setPublicCourseGraph(data);
            setUsedStaticCourseFallback(false);
          } catch {
            if (cancelled) return;
            setPublicCourseGraph(FD01_PATTERN_TEST_FALLBACK);
            setUsedStaticCourseFallback(true);
          }
          return;
        }

        if (graphType === "parallax") {
          if (
            Boolean(selectedCandidateBundle) ===
            Boolean(selectedPublicCourse)
          ) {
            throw new Error(
              "Select exactly one course or candidate bundle in the URL.",
            );
          }
          const selector = selectedCandidateBundle
            ? `bundle=${encodeURIComponent(selectedCandidateBundle)}`
            : `course=${encodeURIComponent(selectedPublicCourse)}`;
          const response = await fetch(`/api/course-graph?${selector}`, {
            cache: "no-store",
          });
          const data = (await response.json()) as CourseGraphPayload & {
            error?: string;
            detail?: string;
          };

          if (!response.ok) {
            throw new Error(data.error || data.detail || `Course graph request failed (${response.status})`);
          }

          if (cancelled) return;
          setCourseGraph(data);
          setEntities(data.entities || []);
          setRelationships(data.edges || []);
        } else {
          const [allEntities, allRelationships] = await Promise.all([
            fetchAllGraphPages<CorrespondenceEntity>("/api/graph/entities", CORRESPONDENCE_PAGE_SIZE),
            fetchAllGraphPages<CorrespondenceRelationship>("/api/graph/edges", CORRESPONDENCE_PAGE_SIZE),
          ]);

          if (cancelled) return;
          setCourseGraph(null);
          setEntities(allEntities);
          setRelationships(allRelationships.map((relationship: CorrespondenceRelationship) => ({
            ...relationship,
            similarity: relationship.weight || 0.5,
          })));
        }
      } catch (error) {
        console.error("Failed to fetch entities", error);
        if (cancelled) return;
        if (graphType === "parallax") {
          setCourseGraphError(
            error instanceof Error ? error.message : "The course candidate graph could not be loaded.",
          );
        }
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
  }, [
    graphType,
    isPublicCourseView,
    publicCoursePreviewEnabled,
    selectedCandidateBundle,
    selectedPublicCourse,
    selectedPublicView,
  ]);

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

  const searchSuggestions = useMemo<GraphSearchSuggestion[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return entities
      .map((entity) => {
        const name = entity.name || "";
        const nameLower = name.toLowerCase();
        const aliases = "aliases" in entity ? entity.aliases || [] : [];
        const aliasMatch = aliases.find((alias) => alias.toLowerCase().includes(query));
        const context = graphType === "correspondences"
          ? ((entity as CorrespondenceEntity).category || (entity as CorrespondenceEntity).type?.label || aliasMatch)
          : `${COURSE_ENTITY_KIND_LABELS[(entity as CourseGraphEntity).entity_kind]}${(entity as CourseGraphEntity).course_role ? ` · ${(entity as CourseGraphEntity).course_role}` : ""}`;
        const courseContextMatch =
          graphType === "parallax" &&
          ((entity as CourseGraphEntity).synthesis_draft.toLowerCase().includes(query) ||
            (entity as CourseGraphEntity).course_role?.toLowerCase().includes(query) ||
            (entity as CourseGraphEntity).entity_kind.includes(query));
        const score = nameLower === query ? 0 : nameLower.startsWith(query) ? 1 : nameLower.includes(query) ? 2 : aliasMatch ? 3 : courseContextMatch ? 4 : 99;
        return { suggestion: { id: entity.id, name, context }, score };
      })
      .filter((item) => item.score < 99 && !isSentenceLikeEntityName(item.suggestion.name))
      .sort((left, right) => left.score - right.score || left.suggestion.name.localeCompare(right.suggestion.name))
      .slice(0, 8)
      .map((item) => item.suggestion);
  }, [entities, graphType, searchQuery]);

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      if (graphType === "correspondences") {
        const correspondence = entity as CorrespondenceEntity;
        if (isSentenceLikeEntityName(correspondence.name)) {
          return false;
        }
      }

      const query = searchQuery.toLowerCase();

      if (graphType === "parallax") {
        const courseEntity = entity as CourseGraphEntity;
        if (!selectedCourseKinds.includes(courseEntity.entity_kind)) return false;
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

      const courseEntity = entity as CourseGraphEntity;
      return (
        courseEntity.name.toLowerCase().includes(query) ||
        courseEntity.slug.toLowerCase().includes(query) ||
        courseEntity.stable_id.toLowerCase().includes(query) ||
        courseEntity.entity_kind.toLowerCase().includes(query) ||
        courseEntity.aliases.some((alias) => alias.toLowerCase().includes(query)) ||
        courseEntity.course_role?.toLowerCase().includes(query) ||
        courseEntity.synthesis_draft.toLowerCase().includes(query)
      );
    });
  }, [
    entities,
    graphType,
    searchQuery,
    selectedCategory,
    selectedCourseKinds,
  ]);

  const groupedCorrespondenceCards = useMemo(() => {
    if (graphType !== "correspondences") return [];

    const groups = new Map<string, CorrespondenceEntity[]>();

    for (const entity of filteredEntities as CorrespondenceEntity[]) {
      const label = entity.type?.label || entity.category || "Other";
      const bucket = groups.get(label) || [];
      bucket.push(entity);
      groups.set(label, bucket);
    }

    return [...groups.entries()]
      .map(([label, items]) => ({
        label,
        items: [...items].sort((left, right) => left.name.localeCompare(right.name)),
      }))
      .sort((left, right) => right.items.length - left.items.length || left.label.localeCompare(right.label));
  }, [filteredEntities, graphType]);

  const graphFilteredCorrespondenceEntities = useMemo(() => {
    if (graphType !== "correspondences") {
      return filteredEntities as CorrespondenceEntity[];
    }

    const anchors = filteredEntities as CorrespondenceEntity[];
    if (anchors.length === 0) return [];
    if (!selectedCategory && !searchQuery.trim()) return anchors;

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
  }, [entities, filteredEntities, graphType, relationships, searchQuery, selectedCategory]);

  const archiveCorrespondenceEntities = useMemo(() => {
    if (graphType !== "correspondences") return [];
    return (entities as CorrespondenceEntity[]).filter(
      (entity) => !isSentenceLikeEntityName(entity.name),
    );
  }, [entities, graphType]);
  const focusedCorrespondenceEntityPool = correspondenceFocusEntityId
    ? archiveCorrespondenceEntities
    : graphFilteredCorrespondenceEntities;

  const focusedCorrespondenceGraph = useMemo(() => {
    if (graphType !== "correspondences") return null;

    const correspondenceById = new Map(
      (entities as CorrespondenceEntity[]).map((entity) => [entity.id, entity] as const),
    );

    return buildFocusedCorrespondenceGraph(
      focusedCorrespondenceEntityPool,
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
      correspondenceFocusEntityId,
    );
  }, [
    correspondenceFocusEntityId,
    correspondenceRelationshipFilters,
    correspondenceShuffleToken,
    entities,
    focusedCorrespondenceEntityPool,
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

  const visibleCourseRelationships = useMemo(() => {
    if (graphType !== "parallax") return [];
    const visibleEntityIds = new Set(filteredEntities.map((entity) => entity.id));
    return (relationships as CourseGraphEdge[]).filter(
      (relationship) =>
        visibleEntityIds.has(relationship.source_id) &&
        visibleEntityIds.has(relationship.target_id),
    );
  }, [filteredEntities, graphType, relationships]);

  const courseDegreeById = useMemo(() => {
    const degree = new Map<string, number>();
    if (graphType !== "parallax") return degree;
    for (const relationship of relationships as CourseGraphEdge[]) {
      degree.set(relationship.source_id, (degree.get(relationship.source_id) || 0) + 1);
      degree.set(relationship.target_id, (degree.get(relationship.target_id) || 0) + 1);
    }
    return degree;
  }, [graphType, relationships]);

  const courseKindCounts = useMemo(() => {
    const counts = new Map<CourseGraphEntityKind, number>();
    if (graphType !== "parallax") return counts;
    for (const entity of entities as CourseGraphEntity[]) {
      counts.set(entity.entity_kind, (counts.get(entity.entity_kind) || 0) + 1);
    }
    return counts;
  }, [entities, graphType]);

  const graphEntities = graphType === "correspondences" && viewMode === "graph"
    ? activeCorrespondenceGraph?.entities || []
    : filteredEntities;
  const graphRelationships = graphType === "correspondences"
    ? viewMode === "graph"
      ? activeCorrespondenceGraph?.relationships || []
      : relationships
    : visibleCourseRelationships;
  const displayedEntityCount = graphType === "correspondences" && viewMode === "graph"
    ? activeCorrespondenceGraph?.entities.length || 0
    : filteredEntities.length;
  const displayedRelationshipCount = graphType === "correspondences"
    ? viewMode === "graph"
      ? activeCorrespondenceGraph?.relationships.length || 0
      : relationships.length
    : visibleCourseRelationships.length;

  const correspondenceDegreeById = useMemo(() => {
    const degree = new Map<string, number>();
    if (graphType !== "correspondences") return degree;
    for (const relationship of relationships as CorrespondenceRelationship[]) {
      degree.set(relationship.source_id, (degree.get(relationship.source_id) || 0) + 1);
      degree.set(relationship.target_id, (degree.get(relationship.target_id) || 0) + 1);
    }
    return degree;
  }, [graphType, relationships]);

  const mostConnectedCorrespondence = useMemo(() => {
    if (graphType !== "correspondences") return null;
    return [...(entities as CorrespondenceEntity[])]
      .filter((entity) => !isSentenceLikeEntityName(entity.name))
      .sort((left, right) => (correspondenceDegreeById.get(right.id) || 0) - (correspondenceDegreeById.get(left.id) || 0))[0] || null;
  }, [correspondenceDegreeById, entities, graphType]);

  const inspectedCorrespondenceNeighbors = useMemo(() => {
    if (!inspectedCorrespondenceEntity || graphType !== "correspondences") return [];
    const entityById = new Map((entities as CorrespondenceEntity[]).map((entity) => [entity.id, entity] as const));
    const neighbors = new Map<string, { entity: CorrespondenceEntity; strength: number }>();
    for (const relationship of relationships as CorrespondenceRelationship[]) {
      if (!correspondenceRelationshipFilters[getCorrespondenceRelationshipType(relationship)]) continue;
      const neighborId = relationship.source_id === inspectedCorrespondenceEntity.id
        ? relationship.target_id
        : relationship.target_id === inspectedCorrespondenceEntity.id
          ? relationship.source_id
          : null;
      if (!neighborId) continue;
      const entity = entityById.get(neighborId);
      if (!entity || isSentenceLikeEntityName(entity.name)) continue;
      const strength = getRelationshipStrength(relationship);
      const current = neighbors.get(neighborId);
      if (!current || strength > current.strength) neighbors.set(neighborId, { entity, strength });
    }
    return [...neighbors.values()]
      .sort((left, right) => right.strength - left.strength || left.entity.name.localeCompare(right.entity.name));
  }, [correspondenceRelationshipFilters, entities, graphType, inspectedCorrespondenceEntity, relationships]);

  const inspectorConnectionsExpanded = Boolean(
    inspectedCorrespondenceEntity && expandedInspectorEntityId === inspectedCorrespondenceEntity.id,
  );
  const visibleInspectedCorrespondenceNeighbors = inspectorConnectionsExpanded
    ? inspectedCorrespondenceNeighbors
    : inspectedCorrespondenceNeighbors.slice(0, INSPECTOR_CONNECTION_PREVIEW_LIMIT);

  const focusCorrespondence = useCallback((
    entity: CorrespondenceEntity,
    options: {
      query?: string;
      source?: "random" | "selected";
      recordTraversal?: boolean;
    } = {},
  ) => {
    const {
      query = entity.name,
      source = "selected",
      recordTraversal = true,
    } = options;

    setSearchQuery(query);
    setCorrespondenceGraphScope("focused");
    setCorrespondenceFocusEntityId(entity.id);
    setCorrespondenceFocusSource(source);
    setViewMode("graph");
    setInspectedCorrespondenceEntity(entity);
    setCorrespondenceHistory((current) => [
      entity,
      ...current.filter((item) => item.id !== entity.id),
    ].slice(0, 6));

    if (recordTraversal) {
      setCorrespondenceTraversal((current) => {
        if (current.path[current.index]?.id === entity.id) return current;
        const nextPath = [...current.path.slice(0, current.index + 1), entity].slice(-32);
        return { path: nextPath, index: nextPath.length - 1 };
      });
    }
  }, []);

  useEffect(() => {
    const focusValue = searchParams.get("focus")?.trim().toLowerCase();

    if (graphType !== "correspondences" || !focusValue) {
      deepLinkedFocusRef.current = null;
      return;
    }

    const entity = (entities as CorrespondenceEntity[]).find(
      (candidate) =>
        candidate.id.toLowerCase() === focusValue ||
        candidate.slug?.toLowerCase() === focusValue,
    );

    if (!entity || deepLinkedFocusRef.current === entity.id) {
      return;
    }

    deepLinkedFocusRef.current = entity.id;
    focusCorrespondence(entity, { recordTraversal: false });
  }, [entities, focusCorrespondence, graphType, searchParams]);

  const clearCorrespondenceLock = useCallback(() => {
    setSearchQuery("");
    setCorrespondenceFocusEntityId(null);
    setCorrespondenceFocusSource(null);
    setInspectedCorrespondenceEntity(null);
    setExpandedInspectorEntityId(null);
    setCorrespondenceTraversal({ path: [], index: -1 });
  }, []);

  const handleTypeChange = (type: GraphType) => {
    setGraphType(type);
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedCourseEntity(null);
    setCourseFocusEntityId(null);
    setSelectedCourseKinds(COURSE_ENTITY_KIND_ORDER);
    setCorrespondenceGraphScope("focused");
    setCorrespondenceFocusEntityId(null);
    setCorrespondenceFocusSource(null);
    setCorrespondenceRelationshipFilters(DEFAULT_CORRESPONDENCE_RELATIONSHIP_FILTERS);
    setCorrespondenceLayoutDensity("expanded");
    setCorrespondenceLayoutEngine("clusters");
    setCorrespondenceTraversal({ path: [], index: -1 });
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", type);
    params.delete("source");
    if (
      type === "parallax" &&
      !params.has("course") &&
      !params.has("bundle")
    ) {
      params.set("course", DEFAULT_CANDIDATE_COURSE);
    }
    if (type === "correspondences") {
      params.delete("course");
      params.delete("bundle");
    }
    router.replace(`/graph?${params.toString()}`, { scroll: false });
  };

  const handleSelectEntity = (entity: GraphPageEntity) => {
    if (graphType === "correspondences") {
      const correspondence = entity as CorrespondenceEntity;
      focusCorrespondence(correspondence);
      setSelectedCorrespondenceEntity(correspondence);
      return;
    }

    const courseEntity = entity as CourseGraphEntity;
    setCourseFocusEntityId(courseEntity.id);
    setSelectedCourseEntity(courseEntity);
  };

  const openCorrespondenceDetails = (entity: CorrespondenceEntity) => {
    focusCorrespondence(entity);
    setSelectedCorrespondenceEntity(entity);
  };

  const pullCorrespondenceThread = (entity: CorrespondenceEntity | null) => {
    if (!entity) return;
    focusCorrespondence(entity);
  };

  const exploreRandomCorrespondence = (entity: CorrespondenceEntity | null) => {
    if (!entity) return;
    setSelectedCategory(null);
    focusCorrespondence(entity, { query: "", source: "random" });
  };

  const selectCorrespondenceSuggestion = (suggestion: GraphSearchSuggestion) => {
    setGraphSearchFocused(false);
    const entity = (entities as CorrespondenceEntity[]).find((candidate) => candidate.id === suggestion.id);
    if (entity) {
      focusCorrespondence(entity);
    } else {
      setSearchQuery(suggestion.name);
      setCorrespondenceGraphScope("focused");
      setCorrespondenceFocusEntityId(suggestion.id);
      setCorrespondenceFocusSource("selected");
      setViewMode("graph");
    }
  };

  useEffect(() => {
    const handleTraversalKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.key === "Escape") {
        if (selectedCorrespondenceEntity) {
          event.preventDefault();
          setSelectedCorrespondenceEntity(null);
        } else if (!isTyping && graphType === "correspondences" && correspondenceFocusEntityId) {
          event.preventDefault();
          clearCorrespondenceLock();
        }
        return;
      }

      if (
        isTyping ||
        selectedCorrespondenceEntity ||
        graphType !== "correspondences" ||
        viewMode !== "graph" ||
        !correspondenceFocusEntityId ||
        (event.key !== "ArrowLeft" && event.key !== "ArrowRight") ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        if (correspondenceTraversal.index <= 0) return;
        const nextIndex = correspondenceTraversal.index - 1;
        const previousEntity = correspondenceTraversal.path[nextIndex];
        if (!previousEntity) return;
        event.preventDefault();
        setCorrespondenceTraversal((current) => ({ ...current, index: nextIndex }));
        focusCorrespondence(previousEntity, { recordTraversal: false });
        return;
      }

      const forwardEntity = correspondenceTraversal.path[correspondenceTraversal.index + 1];
      if (forwardEntity) {
        event.preventDefault();
        setCorrespondenceTraversal((current) => ({ ...current, index: current.index + 1 }));
        focusCorrespondence(forwardEntity, { recordTraversal: false });
        return;
      }

      const previousEntityId = correspondenceTraversal.path[correspondenceTraversal.index - 1]?.id;
      const nextConnection =
        inspectedCorrespondenceNeighbors.find(({ entity }) => entity.id !== previousEntityId) ||
        inspectedCorrespondenceNeighbors[0];
      if (!nextConnection) return;

      event.preventDefault();
      const nextPath = [
        ...correspondenceTraversal.path.slice(0, correspondenceTraversal.index + 1),
        nextConnection.entity,
      ].slice(-32);
      setCorrespondenceTraversal({ path: nextPath, index: nextPath.length - 1 });
      focusCorrespondence(nextConnection.entity, { recordTraversal: false });
    };

    window.addEventListener("keydown", handleTraversalKey);
    return () => window.removeEventListener("keydown", handleTraversalKey);
  }, [
    clearCorrespondenceLock,
    correspondenceFocusEntityId,
    correspondenceTraversal,
    focusCorrespondence,
    graphType,
    inspectedCorrespondenceNeighbors,
    selectedCorrespondenceEntity,
    viewMode,
  ]);

  const isParallaxGraphView = graphType === "parallax" && viewMode === "graph";

  if (isPublicCourseView) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-300 selection:bg-amber-900/30">
        <Header />
        <main className="container mx-auto px-4 pb-12 pt-24">
          {loading ? (
            <div className="flex min-h-[500px] items-center justify-center">
              <ParallaxLoader />
            </div>
          ) : publicCourseGraph ? (
            <CourseGraphPublicView
              graph={publicCourseGraph}
              focus={selectedPublicFocus}
              usedFallback={usedStaticCourseFallback}
            />
          ) : (
            <div className="mx-auto max-w-2xl rounded-2xl border border-rose-900/35 bg-rose-950/15 px-6 py-10 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-rose-400/70" />
              <h1 className="mt-4 font-[family-name:var(--font-cormorant)] text-2xl text-amber-100">
                Course view unavailable
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {courseGraphError ||
                  "Choose the exact course and saved view from the learner course."}
              </p>
            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 selection:bg-amber-900/30">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Collapsible controls panel */}
        <div
          className={`grid transition-all duration-500 ease-in-out ${controlsCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}
        >
          <div className="overflow-hidden">
            <KnowledgeGraphHeader
              title={graphType === "parallax" ? "Course Knowledge" : "Correspondences"}
              subtitle={graphType === "parallax"
                ? "Reviewing the concepts, works, people, and typed connections extracted from completed courses."
                : correspondenceGraphScope === "focused"
                  ? "Focused constellations drawn from the full correspondence archive."
                  : "The full correspondence archive, organized as a living network."}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              entityCount={displayedEntityCount}
              connectionCount={displayedRelationshipCount}
              loading={loading}
              suggestions={searchSuggestions}
              showSearch={graphType === "parallax"}
              onSuggestionSelect={(suggestion) => {
                if (graphType === "correspondences") selectCorrespondenceSuggestion(suggestion);
                else {
                  setSearchQuery(suggestion.name);
                  const courseEntity = (entities as CourseGraphEntity[]).find(
                    (candidate) => candidate.id === suggestion.id,
                  );
                  if (courseEntity) setCourseFocusEntityId(courseEntity.id);
                }
              }}
            />

        <div className="mb-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <GraphControls
              graphType={graphType}
              onGraphTypeChange={handleTypeChange}
              viewMode={viewMode}
              onViewModeChange={(mode) => setViewMode(mode)}
              showViewMode={graphType === "parallax"}
            />

            {graphType === "correspondences" && viewMode === "graph" && activeCorrespondenceGraph && (
              <div className="flex items-center gap-3">
                {correspondenceGraphScope === "focused" && focusedCorrespondenceGraph ? (
                  <>
                    <div className="hidden md:flex flex-col text-right">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-amber-500/50 font-mono">
                        {correspondenceFocusSource === "selected" ? "Current Focus" : "Random Discovery"}
                      </span>
                      <span className="text-sm text-amber-100">
                        {focusedCorrespondenceGraph.seed?.name || "Archive"}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Showing {focusedCorrespondenceGraph.entities.length} nodes and {focusedCorrespondenceGraph.relationships.length} links from {focusedCorrespondenceGraph.availableNodeCount} filtered entities and {focusedCorrespondenceGraph.availableEdgeCount} filtered links
                      </span>
                    </div>

                    <button
                      onClick={() => { setCorrespondenceFocusEntityId(null); setCorrespondenceFocusSource(null); setCorrespondenceShuffleToken((token) => token + 1); }}
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

          {graphType === "correspondences" && (
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Correspondence views">
              {([
                { label: "Atlas", icon: MapIcon, active: viewMode === "graph" && correspondenceGraphScope === "full", select: () => { setSearchQuery(""); setSelectedCategory(null); setCorrespondenceFocusEntityId(null); setCorrespondenceFocusSource(null); setViewMode("graph"); setCorrespondenceGraphScope("full"); } },
                { label: "Focus", icon: Sparkles, active: viewMode === "graph" && correspondenceGraphScope === "focused", select: () => { setViewMode("graph"); setCorrespondenceGraphScope("focused"); } },
                { label: "Table", icon: List, active: viewMode === "cards", select: () => setViewMode("cards") },
              ] as const).map((mode) => (
                <button
                  key={mode.label}
                  type="button"
                  role="tab"
                  aria-selected={mode.active}
                  onClick={mode.select}
                  disabled={loading}
                  className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 py-1.5 font-[family-name:var(--font-cinzel)] text-[11px] uppercase tracking-[0.16em] transition-colors disabled:cursor-wait disabled:opacity-35 ${mode.active ? "border-amber-500/35 bg-amber-500/10 text-amber-100" : "border-white/10 bg-black/35 text-zinc-500 hover:border-white/20 hover:text-zinc-300"}`}
                >
                  <mode.icon className="h-3.5 w-3.5" />
                  {mode.label}
                </button>
              ))}
            </div>
          )}

          {graphType === "parallax" && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
              <div className="flex flex-wrap items-center gap-2" aria-label="Filter course entities by kind">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCourseKinds(
                      selectedCourseKinds.length === COURSE_ENTITY_KIND_ORDER.length
                        ? []
                        : COURSE_ENTITY_KIND_ORDER,
                    )
                  }
                  aria-pressed={selectedCourseKinds.length === COURSE_ENTITY_KIND_ORDER.length}
                  className="min-h-11 rounded-lg border border-white/10 bg-black/35 px-3 text-[10px] uppercase tracking-[0.14em] text-zinc-400 hover:border-cyan-500/30 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45"
                >
                  {selectedCourseKinds.length === COURSE_ENTITY_KIND_ORDER.length ? "Clear kinds" : "Show all"}
                </button>
                {COURSE_ENTITY_KIND_ORDER.filter((kind) => (courseKindCounts.get(kind) || 0) > 0).map((kind) => {
                  const active = selectedCourseKinds.includes(kind);
                  return (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setSelectedCourseKinds((current) =>
                          current.includes(kind)
                            ? current.filter((candidate) => candidate !== kind)
                            : [...current, kind],
                        )
                      }
                      className={`min-h-11 rounded-lg border px-3 text-[10px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 ${
                        active
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
                          : "border-white/8 bg-black/20 text-zinc-600 hover:text-zinc-400"
                      }`}
                    >
                      {COURSE_ENTITY_KIND_LABELS[kind]} · {courseKindCounts.get(kind)}
                    </button>
                  );
                })}
              </div>
              {courseGraph && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-800/25 bg-amber-950/15 px-4 py-3 text-xs leading-5 text-amber-100/65">
                  <span>
                    Candidate import · {courseGraph.import.course_id_tag} · prepared{" "}
                    {courseGraph.import.prepared_on}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {courseGraph.counts.evidence} evidence records ·{" "}
                    {courseGraph.counts.blocked_inferences} blocked inferences
                  </span>
                </div>
              )}
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
                showGraphScopeControls={false}
                layoutDensity={correspondenceLayoutDensity}
                onLayoutDensityChange={setCorrespondenceLayoutDensity}
                showLayoutDensityControls={viewMode === "graph"}
                layoutEngine={correspondenceLayoutEngine}
                onLayoutEngineChange={setCorrespondenceLayoutEngine}
                showLayoutEngineControls={viewMode === "graph"}
              />
            </div>
          )}
        </div>
          </div>{/* end overflow-hidden */}
        </div>{/* end collapsible grid */}

        {/* Toggle strip */}
        <div className="flex justify-center mb-3">
          <button
            type="button"
            onClick={() => setControlsCollapsed((c) => !c)}
            className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-black/50 border border-amber-900/20 text-[10px] uppercase tracking-[0.22em] text-amber-100/35 hover:text-amber-100/65 hover:border-amber-900/40 transition-all duration-200 backdrop-blur-sm"
          >
            {controlsCollapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
            {controlsCollapsed ? "Show controls" : "Hide controls"}
          </button>
        </div>

        <div className={`animate-in fade-in duration-700 ${controlsCollapsed ? "" : "min-h-[600px]"}`}>
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
          ) : graphType === "parallax" && courseGraphError ? (
            <div className="mx-auto max-w-2xl rounded-2xl border border-rose-900/35 bg-rose-950/15 px-6 py-10 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-rose-400/70" />
              <h2 className="mt-4 font-[family-name:var(--font-cormorant)] text-2xl text-amber-100">
                Course candidates are not available in this session
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{courseGraphError}</p>
            </div>
          ) : viewMode === "cards" ? (
            filteredEntities.length === 0 ? (
              <div className="py-20 text-center">
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
            ) : graphType === "correspondences" ? (
              <div className="max-h-[700px] overflow-auto rounded-2xl border border-amber-900/20 bg-zinc-950/40">
                <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_minmax(120px,0.35fr)_90px] gap-3 border-b border-white/8 bg-[#090807] px-4 py-3 font-[family-name:var(--font-cinzel)] text-[10px] uppercase tracking-[0.2em] text-amber-100/45">
                  <span>Correspondence</span><span>Category</span><span className="text-right">Links</span>
                </div>
                <div className="divide-y divide-white/5">
                  {groupedCorrespondenceCards.flatMap((group) => group.items).map((entity) => (
                    <button key={entity.id} type="button" onClick={() => handleSelectEntity(entity)} className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_minmax(120px,0.35fr)_90px] items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-amber-500/5 focus:bg-amber-500/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500/30">
                      <span className="min-w-0"><span className="block truncate font-[family-name:var(--font-cormorant)] text-lg text-amber-100/85">{entity.name}</span>{entity.description && <span className="mt-0.5 block truncate font-[family-name:var(--font-cormorant)] text-sm text-zinc-500">{entity.description}</span>}</span>
                      <span className="truncate text-xs text-zinc-500">{entity.category || entity.type?.label || "Other"}</span>
                      <span className="text-right font-mono text-xs text-cyan-400/55">{correspondenceDegreeById.get(entity.id) || 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(filteredEntities as CourseGraphEntity[]).map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => handleSelectEntity(entity)}
                    className="group flex min-h-52 flex-col rounded-2xl border border-white/10 bg-zinc-950/55 p-5 text-left shadow-[0_16px_40px_rgba(0,0,0,0.2)] transition-colors hover:border-cyan-500/30 hover:bg-cyan-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.17em] text-cyan-200/70">
                        {entity.entity_kind === "course" ? (
                          <GraduationCap className="h-4 w-4" />
                        ) : entity.entity_kind === "work" ? (
                          <BookOpen className="h-4 w-4" />
                        ) : entity.entity_kind === "person" ? (
                          <UserRound className="h-4 w-4" />
                        ) : (
                          <Lightbulb className="h-4 w-4" />
                        )}
                        {COURSE_ENTITY_KIND_LABELS[entity.entity_kind]}
                      </span>
                      <span className="rounded-full border border-amber-500/25 bg-amber-500/8 px-2 py-1 text-[9px] uppercase tracking-wider text-amber-200/80">
                        {entity.review_state.replaceAll("_", " ")}
                      </span>
                    </span>
                    <span className="mt-4 font-[family-name:var(--font-cormorant)] text-2xl leading-tight text-amber-100">
                      {entity.name}
                    </span>
                    {entity.course_role && (
                      <span className="mt-2 text-xs text-violet-300/65">{entity.course_role}</span>
                    )}
                    <span className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
                      {entity.synthesis_live || entity.synthesis_draft}
                    </span>
                    <span className="mt-auto flex items-center justify-between gap-3 pt-5 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                      <span>Identity: {entity.identity_state.replaceAll("_", " ")}</span>
                      <span>{courseDegreeById.get(entity.id) || 0} links</span>
                    </span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className={`grid gap-4 transition-[grid-template-columns] duration-200 motion-reduce:transition-none ${isParallaxGraphView ? "grid-cols-1 lg:grid-cols-4" : graphType === "correspondences" ? inspectorCollapsed ? "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_64px]" : "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]" : "grid-cols-1"}`}>

              <div className={`${isParallaxGraphView ? "lg:col-span-3" : "col-span-1"} order-1 min-w-0`}>
                {graphType === "correspondences" && (
                  <div className="relative z-40 mb-3 rounded-xl border border-amber-900/25 bg-zinc-950/70 p-2.5 shadow-xl">
                    <label htmlFor="canvas-graph-search" className="mb-1.5 block font-[family-name:var(--font-cinzel)] text-[10px] uppercase tracking-[0.2em] text-amber-400/65">
                      Find and focus a node
                    </label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500/55" />
                      <input
                        id="canvas-graph-search"
                        type="search"
                        role="combobox"
                        aria-label="Search the graph"
                        aria-autocomplete="list"
                        aria-controls="canvas-graph-search-results"
                        aria-expanded={graphSearchFocused && searchSuggestions.length > 0}
                        value={searchQuery}
                        onChange={(event) => {
                          const nextQuery = event.target.value;
                          setSearchQuery(nextQuery);
                           setGraphSearchFocused(Boolean(nextQuery));
                           if (!nextQuery) {
                             clearCorrespondenceLock();
                           }
                        }}
                        onFocus={() => setGraphSearchFocused(true)}
                        onBlur={(event) => {
                          const input = event.currentTarget;
                          window.setTimeout(() => {
                            if (document.activeElement !== input) setGraphSearchFocused(false);
                          }, 120);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && searchSuggestions[0]) {
                            event.preventDefault();
                            selectCorrespondenceSuggestion(searchSuggestions[0]);
                          }
                          if (event.key === "Escape") setGraphSearchFocused(false);
                        }}
                        placeholder="Search correspondences by name or alias..."
                        className="h-11 w-full rounded-lg border border-white/10 bg-black/55 pl-10 pr-10 font-[family-name:var(--font-cormorant)] text-base text-amber-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500/45 focus:ring-2 focus:ring-amber-500/15"
                      />
                      {searchQuery && (
                        <button type="button" onClick={clearCorrespondenceLock} aria-label="Clear graph search" className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-600 hover:bg-white/5 hover:text-amber-100">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {graphSearchFocused && searchSuggestions.length > 0 && (
                      <div id="canvas-graph-search-results" role="listbox" className="absolute left-2.5 right-2.5 top-[calc(100%-2px)] z-50 rounded-xl border border-amber-900/40 bg-zinc-950/98 p-1.5 shadow-2xl">
                        {searchSuggestions.map((suggestion) => (
                          <button key={suggestion.id} type="button" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => selectCorrespondenceSuggestion(suggestion)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-amber-500/10 focus:bg-amber-500/10 focus:outline-none">
                            <span className="truncate font-[family-name:var(--font-cormorant)] text-base text-amber-100">{suggestion.name}</span>
                            {suggestion.context && <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-zinc-500">{suggestion.context}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {graphType === "correspondences" && correspondenceHistory.length > 0 && (
                  <nav className="mb-3 flex items-center gap-1 overflow-x-auto rounded-xl border border-white/8 bg-black/35 px-3 py-2" aria-label="Recently explored correspondences">
                    <Compass className="mr-1 h-3.5 w-3.5 shrink-0 text-cyan-400/60" />
                    {correspondenceHistory.map((entity, index) => (
                      <div key={entity.id} className="flex shrink-0 items-center gap-1">
                        {index > 0 && <ChevronRight className="h-3 w-3 text-zinc-700" />}
                        <button type="button" onClick={() => pullCorrespondenceThread(entity)} className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-amber-100">
                          {entity.name}
                        </button>
                      </div>
                    ))}
                  </nav>
                )}
                {graphType === "correspondences" && (
                  <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    {[
                      { eyebrow: "Suggested starting point", entity: focusedCorrespondenceGraph?.seed || null, icon: Sparkles, random: false },
                      { eyebrow: "Explore a network hub", entity: mostConnectedCorrespondence, icon: Orbit, random: false },
                      { eyebrow: "Random starting point", entity: (entities as CorrespondenceEntity[])[correspondenceShuffleToken % Math.max(entities.length, 1)] || null, icon: Compass, random: true },
                    ].map((thread) => (
                      <button key={thread.eyebrow} type="button" onClick={() => thread.random ? exploreRandomCorrespondence(thread.entity) : pullCorrespondenceThread(thread.entity)} disabled={!thread.entity} className="group min-h-24 rounded-2xl border border-white/10 bg-zinc-950/55 px-5 py-4 text-left shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition-colors hover:border-cyan-500/35 hover:bg-cyan-500/7 focus:outline-none focus:ring-2 focus:ring-cyan-400/35 disabled:opacity-40">
                        <span className="flex items-center gap-2 font-[family-name:var(--font-cinzel)] text-[10px] uppercase tracking-[0.22em] text-amber-400/65"><thread.icon className="h-4 w-4" />{thread.eyebrow}</span>
                        <span className="mt-2 block truncate font-[family-name:var(--font-cormorant)] text-2xl leading-none text-amber-100/90 group-hover:text-amber-100">{thread.entity?.name || "No starting point available"}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div
                  className={`bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl transition-all duration-500 ${controlsCollapsed ? "h-[calc(100vh-120px)]" : "h-[700px]"}`}
                >
                  <GraphVisualization
                    concepts={graphEntities}
                    relationships={graphRelationships}
                    onSelectConcept={(entity) => handleSelectEntity(entity as GraphPageEntity)}
                    onClearSelection={
                      graphType === "correspondences"
                        ? clearCorrespondenceLock
                        : () => setCourseFocusEntityId(null)
                    }
                    minSimilarity={0}
                    layoutDensity={correspondenceLayoutDensity}
                    layoutEngine={correspondenceLayoutEngine}
                    focusedEntityId={
                      graphType === "correspondences"
                        ? correspondenceFocusEntityId
                        : courseFocusEntityId
                    }
                  />
                </div>
                {graphType === "correspondences" &&
                  viewMode === "graph" &&
                  correspondenceGraphScope === "focused" &&
                  activeCorrespondenceGraph && (
                    <div className="mt-3 rounded-xl border border-emerald-900/30 bg-emerald-950/20 px-4 py-3 text-xs leading-6 text-emerald-100/70">
                      Hover a node to temporarily isolate its direct connections. Click to lock that spotlight and open its synthesis; closing the modal keeps the lock in place. Use ← and → to move backward or forward through your connection trail, and Esc or an empty part of the graph to unlock.
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
                      This is a discovery view. Don’t worry about reading every label at once. Use search, category filters, hover, and click a node to isolate its direct connections.
                    </div>
                  )}
              </div>

              {graphType === "correspondences" && (
                <aside className="order-3 min-w-0" aria-label="Selected correspondence inspector" data-collapsed={inspectorCollapsed ? "true" : "false"}>
                  {inspectorCollapsed ? (
                    <div className="rounded-2xl border border-cyan-900/30 bg-zinc-950/65 p-2 xl:sticky xl:top-24">
                      <button type="button" onClick={() => setInspectorCollapsed(false)} aria-label="Expand inspector" aria-expanded="false" className="flex min-h-12 w-full items-center justify-center rounded-xl border border-white/8 text-cyan-300/70 transition-colors hover:border-cyan-500/30 hover:bg-cyan-500/8 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40">
                        <PanelRightOpen className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-cyan-900/25 bg-zinc-950/65 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.26)] xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-400/60">Inspector</p>
                      <button type="button" onClick={() => setInspectorCollapsed(true)} aria-label="Collapse inspector" aria-expanded="true" className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-white/5 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"><PanelRightClose className="h-5 w-5" /></button>
                    </div>
                    {inspectedCorrespondenceEntity ? (
                      <div className="mt-4">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-amber-500/55">{inspectedCorrespondenceEntity.category || inspectedCorrespondenceEntity.type?.label || "Correspondence"}</p>
                        <h2 className="mt-1 font-[family-name:var(--font-cormorant)] text-2xl text-amber-100">{inspectedCorrespondenceEntity.name}</h2>
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                          {inspectedCorrespondenceNeighbors.length} visible of {correspondenceDegreeById.get(inspectedCorrespondenceEntity.id) || 0} total connections
                        </p>
                        {inspectedCorrespondenceEntity.description && <p className="mt-4 text-base leading-7 text-zinc-400">{inspectedCorrespondenceEntity.description}</p>}
                        {inspectedCorrespondenceEntity.aliases && inspectedCorrespondenceEntity.aliases.length > 0 && <p className="mt-4 text-xs leading-5 text-zinc-500">Also known as {inspectedCorrespondenceEntity.aliases.slice(0, 4).join(", ")}</p>}
                        {inspectedCorrespondenceNeighbors.length > 0 && (
                          <div className="mt-5 border-t border-white/8 pt-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-[family-name:var(--font-cinzel)] text-[9px] uppercase tracking-[0.2em] text-amber-400/65">Connected nodes</p>
                              <span className="rounded-full border border-amber-500/15 bg-amber-500/5 px-2 py-1 font-mono text-[9px] tabular-nums text-amber-200/55">
                                {visibleInspectedCorrespondenceNeighbors.length} of {inspectedCorrespondenceNeighbors.length}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-zinc-600">Choose a neighbor to move through the graph.</p>
                            {inspectedCorrespondenceNeighbors.length > INSPECTOR_CONNECTION_PREVIEW_LIMIT && (
                              <button
                                type="button"
                                aria-controls="inspector-connected-nodes"
                                aria-expanded={inspectorConnectionsExpanded}
                                onClick={() => setExpandedInspectorEntityId(inspectorConnectionsExpanded ? null : inspectedCorrespondenceEntity.id)}
                                className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan-900/35 bg-cyan-950/15 px-3 text-xs text-cyan-200/75 transition-colors hover:border-cyan-700/45 hover:bg-cyan-950/30 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/35"
                              >
                                {inspectorConnectionsExpanded ? (
                                  <>Show fewer <ChevronUp className="h-4 w-4" /></>
                                ) : (
                                  <>Show all {inspectedCorrespondenceNeighbors.length} connections <ChevronDown className="h-4 w-4" /></>
                                )}
                              </button>
                            )}
                            <div id="inspector-connected-nodes" className="mt-3 space-y-1">
                              {visibleInspectedCorrespondenceNeighbors.map(({ entity, strength }) => (
                                <button data-inspector-neighbor key={entity.id} type="button" onClick={() => pullCorrespondenceThread(entity)} className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-left text-sm text-zinc-400 transition-colors hover:bg-amber-500/8 hover:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400/30">
                                  <span className="truncate font-[family-name:var(--font-cormorant)] text-lg">{entity.name}</span>
                                  <span className="shrink-0 font-mono text-[9px] text-zinc-600">{Math.round(strength * 100)}%</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-5 grid gap-2">
                          <button type="button" onClick={() => pullCorrespondenceThread(inspectedCorrespondenceEntity)} className="min-h-11 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 text-xs uppercase tracking-[0.14em] text-amber-100 hover:bg-amber-500/15 focus:outline-none focus:ring-2 focus:ring-amber-400/35">Show this node + direct connections</button>
                          <button type="button" onClick={() => openCorrespondenceDetails(inspectedCorrespondenceEntity)} className="min-h-11 rounded-lg border border-white/10 px-3 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/35">Open full details</button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-10 text-center">
                        <Compass className="mx-auto h-6 w-6 text-zinc-700" />
                        <p className="mt-3 text-sm text-zinc-500">Select a node to inspect its place in the archive.</p>
                      </div>
                    )}
                  </div>
                  )}
                </aside>
              )}

              {isParallaxGraphView && (
                <div className="lg:col-span-1">
                  <div className="bg-zinc-900/50 border border-amber-900/20 rounded-2xl p-4 shadow-2xl h-fit">
                    <div>
                        <p className="font-[family-name:var(--font-cinzel)] text-[10px] uppercase tracking-[0.22em] text-amber-400/65">
                          Course graph key
                        </p>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">
                          Node color marks entity kind. Arrow direction preserves every source → target claim.
                        </p>
                        <div className="mt-4 space-y-2">
                          {COURSE_ENTITY_KIND_ORDER.filter((kind) => (courseKindCounts.get(kind) || 0) > 0).map((kind) => (
                            <button
                              key={kind}
                              type="button"
                              onClick={() =>
                                setSelectedCourseKinds((current) =>
                                  current.length === 1 && current[0] === kind
                                    ? COURSE_ENTITY_KIND_ORDER
                                    : [kind],
                                )
                              }
                              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: COURSE_ENTITY_KIND_COLORS[kind] }}
                                />
                                {COURSE_ENTITY_KIND_LABELS[kind]}
                              </span>
                              <span className="font-mono text-[10px] text-zinc-600">
                                {courseKindCounts.get(kind)}
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="mt-5 space-y-2 border-t border-white/8 pt-4 text-xs leading-5 text-zinc-500">
                          <p><span className="text-amber-300/75">Amber</span> · artifact-documented structure</p>
                          <p><span className="text-cyan-300/75">Cyan</span> · conceptual interpretation</p>
                          <p><span className="text-fuchsia-300/75">Rose</span> · editorial juxtaposition</p>
                          <p><span className="text-emerald-300/75">Green</span> · documented history</p>
                        </div>
                        <div className="mt-5 rounded-xl border border-amber-800/25 bg-amber-950/15 p-3 text-xs leading-5 text-amber-100/60">
                          Candidate means “awaiting curator review.” Open any node for its synthesis,
                          typed connections, evidence, and epistemic warnings.
                        </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <CourseGraphEntityDialog
          key={selectedCourseEntity?.id || "closed-course-entity"}
          entity={selectedCourseEntity}
          entities={courseGraph?.entities || []}
          edges={courseGraph?.edges || []}
          evidence={courseGraph?.evidence || []}
          graphImport={courseGraph?.import || null}
          blockedInferences={courseGraph?.blocked_inferences || []}
          onClose={() => setSelectedCourseEntity(null)}
          onFocusEntity={(nextEntity) => setCourseFocusEntityId(nextEntity.id)}
        />

        {selectedCorrespondenceEntity && (
          <EntityDetailModal
            entity={selectedCorrespondenceEntity}
            graphType={graphType}
            onClose={() => setSelectedCorrespondenceEntity(null)}
            onEntityChange={(entity) => {
              const archiveEntity = (entities as CorrespondenceEntity[]).find(
                (candidate) => candidate.id === entity.id,
              );
              focusCorrespondence(archiveEntity || entity);
            }}
            readOnly={true}
          />
        )}

      </main>

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
