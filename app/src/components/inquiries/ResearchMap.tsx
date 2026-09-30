"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import type { KnowledgeEntity, PublicFinding } from "@/lib/inquiries/model";
import type { GraphEdge, GraphEntity } from "@/lib/graph/graphology-adapter";
import { buttonClass, inputClass, inquiryRequest } from "./shared";
import EvidenceCard from "./EvidenceCard";
const Graph = dynamic(() => import("@/components/graph/SigmaGraph"), {
  ssr: false,
  loading: () => (
    <p role="status" className="p-6">
      Loading map…
    </p>
  ),
});
type MapData = {
  findings: PublicFinding[];
  entities: KnowledgeEntity[];
  total: number;
  hasMore: boolean;
};
export default function ResearchMap() {
  const params = useSearchParams();
  const { user } = useAuth();
  const [data, setData] = useState<MapData>({
    findings: [],
    entities: [],
    total: 0,
    hasMore: false,
  });
  const [query, setQuery] = useState(params.get("q") || "");
  const [focus, setFocus] = useState<string | null>(params.get("focus"));
  const [showGraph, setShowGraph] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load(offset = 0) {
    setLoading(true);
    setError("");
    try {
      const next = await inquiryRequest<MapData>(
        `/api/knowledge/map?offset=${offset}`
      );
      setData((previous) =>
        offset
          ? {
              ...next,
              findings: [...previous.findings, ...next.findings],
              entities: [
                ...new Map(
                  [...previous.entities, ...next.entities].map((e) => [e.id, e])
                ).values(),
              ],
            }
          : next
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the map.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const visibleFindings = useMemo(() => {
    const matching = new Set(
      data.entities
        .filter((e) =>
          `${e.name} ${e.definition}`
            .toLowerCase()
            .includes(query.toLowerCase())
        )
        .map((e) => e.id)
    );
    return data.findings.filter(
      (f) =>
        (!focus ||
          f.source_entity_id === focus ||
          f.target_entity_id === focus) &&
        (!query ||
          `${f.title} ${f.claim} ${f.context}`
            .toLowerCase()
            .includes(query.toLowerCase()) ||
          matching.has(f.source_entity_id || "") ||
          matching.has(f.target_entity_id || ""))
    );
  }, [data, query, focus]);
  const nodes = useMemo<GraphEntity[]>(() => {
    const ids = new Set(
      visibleFindings.flatMap((f) => [f.source_entity_id, f.target_entity_id])
    );
    return data.entities
      .filter((e) => ids.has(e.id))
      .map((e) => ({
        id: e.id,
        name: e.name,
        entity_kind: e.kind,
        description: e.definition,
      }));
  }, [data.entities, visibleFindings]);
  const edges = useMemo<GraphEdge[]>(
    () =>
      visibleFindings.map((f) => ({
        id: f.id,
        source_id: f.source_entity_id!,
        target_id: f.target_entity_id!,
        type: f.predicate,
        weight: 0.8,
        relationship_type: { slug: f.predicate, color: "#b48f4a" },
      })),
    [visibleFindings]
  );
  const focused = data.entities.find((e) => e.id === focus);
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 md:px-8">
        <nav
          className="flex flex-wrap gap-4 text-sm text-amber-200"
          aria-label="Knowledge views"
        >
          <Link aria-current="page" href="/graph?type=research">
            Concept map
          </Link>
          <Link href="/graph?type=correspondences">Correspondences</Link>
          <Link href="/graph?type=parallax&course=pre-how-to-hold-two-things-at-once">
            Course Knowledge
          </Link>
          {user && <Link href="/journal?tab=research">My Journal · Research</Link>}
        </nav>
        <header>
          <p className="mb-3 text-xs tracking-[0.2em] text-amber-200 uppercase">
            Connections with their evidence
          </p>
          <h1 className="font-serif text-4xl">The concept map</h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            Explore findings published from research inquiries. Each connection
            keeps its source, interpretation, and context attached.
          </p>
        </header>
        <div className="flex flex-wrap gap-3">
          <label className="min-w-0 flex-1">
            <span className="mb-2 block text-sm text-zinc-400">
              Find a concept or connection in loaded findings
            </span>
            <input
              className={inputClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Alchemy, resurrection, transformation…"
            />
          </label>
          <button
            className={`${buttonClass} self-end`}
            onClick={() => setShowGraph(!showGraph)}
          >
            {showGraph ? "Use evidence list" : "Show graph"}
          </button>
        </div>
        {focus && (
          <div className="flex flex-wrap items-center gap-3">
            <p>Connections around {focused?.name || "this entry"}</p>
            <button className={buttonClass} onClick={() => setFocus(null)}>
              Show all entries
            </button>
          </div>
        )}
        {error && (
          <div role="alert">
            <p className="text-red-300">{error}</p>
            <button className={buttonClass} onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}
        {loading && <p role="status">Loading published connections…</p>}
        {!loading && !data.findings.length && !error && (
          <section className="space-y-4 rounded-2xl border border-dashed border-zinc-600 p-8">
            <h2 className="font-serif text-2xl">
              The next connection starts with a source.
            </h2>
            <p className="text-zinc-400">
              Published inquiry findings will appear here, alongside links to
              the correspondence archive.
            </p>
            {user && (
              <Link className={buttonClass} href="/journal?tab=research">
                Start an inquiry
              </Link>
            )}
          </section>
        )}
        {showGraph && nodes.length > 0 && (
          <section
            aria-label="Published concept connections"
            className="overflow-hidden rounded-xl border border-zinc-700"
          >
            <Graph
              entities={nodes}
              edges={edges}
              height={420}
              minSimilarity={0}
              showOverviewEdges
              focusedEntityId={focus}
              onSelectEntity={(entity) => setFocus(entity.id)}
              onClearSelection={() => setFocus(null)}
            />
          </section>
        )}
        {nodes.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Explore entries">
            {nodes.map((node) => (
              <button
                key={node.id}
                className={buttonClass}
                onClick={() => setFocus(node.id)}
              >
                {node.name}
              </button>
            ))}
          </div>
        )}
        <p className="text-sm text-zinc-400">
          {visibleFindings.length} matching connections · {data.findings.length}{" "}
          of {data.total} loaded
        </p>
        <section
          aria-label="Evidence for connections"
          className="grid gap-5 md:grid-cols-2"
        >
          {visibleFindings.map((finding) => (
            <article
              id={`finding-${finding.id}`}
              key={finding.id}
              className="min-w-0 rounded-xl border border-zinc-700 bg-zinc-900/40 p-5"
            >
              <EvidenceCard finding={finding} entities={data.entities} />
            </article>
          ))}
        </section>
        {data.hasMore && (
          <button
            className={buttonClass}
            disabled={loading}
            onClick={() => void load(data.findings.length)}
          >
            Load more connections
          </button>
        )}
      </main>
      <Footer />
    </div>
  );
}
