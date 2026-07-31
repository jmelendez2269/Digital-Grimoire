"use client";

import { AlertTriangle, ExternalLink, Network } from "lucide-react";

import type { PublicCourseGraphPackage } from "@/lib/graph/course-graph-public";

const EVIDENCE_LABELS: Record<string, string> = {
  course_structure: "Course structure",
  direct_statement: "Direct statement",
  bibliographic: "Bibliographic",
  documented_history: "Documented history",
  tradition_attestation: "Tradition attestation",
  scholarly_interpretation: "Scholarly interpretation",
  editorial_choice: "Editorial choice",
};

const SYMMETRIC_PREDICATES = new Set([
  "contrasts_with",
  "conceptually_similar_to",
  "editorially_juxtaposed_with",
  "historically_connected_to",
  "doctrinally_related_to",
  "corresponds_to",
  "associated_with",
]);

export default function CourseGraphPublicView({
  graph,
  focus,
  usedFallback,
}: {
  graph: PublicCourseGraphPackage;
  focus: string | null;
  usedFallback: boolean;
}) {
  const entityById = new Map(
    graph.entities.map((entity) => [entity.stable_id, entity]),
  );
  const citationById = new Map(
    graph.citations.map((citation) => [citation.evidence_key, citation]),
  );
  const orderedEdgeById = new Map(
    graph.edges.map((edge) => [edge.stable_id, edge]),
  );
  const orderedEdges = graph.selected_view.edge_ids
    .map((edgeId) => orderedEdgeById.get(edgeId))
    .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge));
  const focusedEntity = focus ? entityById.get(focus) : null;

  return (
    <section className="mx-auto max-w-5xl space-y-6" aria-label={graph.selected_view.label}>
      <div className="rounded-2xl border border-amber-800/30 bg-amber-950/15 p-5">
        <div className="flex items-start gap-3">
          <Network className="mt-1 h-5 w-5 shrink-0 text-amber-300/80" />
          <div>
            <p className="font-[family-name:var(--font-cinzel)] text-[10px] uppercase tracking-[0.2em] text-amber-400/70">
              {graph.course.course_id_tag} · {graph.selected_view.label}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl text-amber-100">
              {graph.course.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              {graph.selected_view.description}
            </p>
            {focusedEntity && (
              <p className="mt-3 rounded-lg border border-cyan-800/25 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-100/75">
                Focus: {focusedEntity.display_name}
              </p>
            )}
            {usedFallback && (
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                The learner package is unavailable, so this view is using the
                exact six-record course fallback with the same citations and
                caveats.
              </p>
            )}
          </div>
        </div>
      </div>

      <ol className="space-y-4">
        {orderedEdges.map((edge, index) => {
          const source = entityById.get(edge.source_stable_id);
          const target = entityById.get(edge.target_stable_id);
          const citations = edge.evidence_ids
            .map((evidenceId) => citationById.get(evidenceId))
            .filter(
              (citation): citation is NonNullable<typeof citation> =>
                Boolean(citation),
            );

          return (
            <li
              key={edge.stable_id}
              className="rounded-2xl border border-white/10 bg-zinc-950/65 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                    Record {index + 1}
                  </p>
                  <h2 className="mt-1 font-[family-name:var(--font-cormorant)] text-2xl text-amber-100">
                    {source?.display_name || edge.source_stable_id}{" "}
                    <span aria-hidden="true" className="text-zinc-600">
                      {SYMMETRIC_PREDICATES.has(edge.predicate) ? "↔" : "→"}
                    </span>{" "}
                    {target?.display_name || edge.target_stable_id}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.13em]">
                  <span className="rounded-full border border-cyan-700/30 bg-cyan-950/25 px-2.5 py-1 text-cyan-200/75">
                    {edge.predicate}
                  </span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-zinc-400">
                    {edge.scope || "structural"}
                  </span>
                  <span className="rounded-full border border-amber-700/25 px-2.5 py-1 text-amber-200/70">
                    {edge.confidence}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-zinc-300">
                {edge.connection_summary}
              </p>

              {edge.caveats.map((caveat) => (
                <p
                  key={caveat}
                  className="mt-3 flex gap-2 rounded-lg border border-amber-900/25 bg-amber-950/15 px-3 py-2 text-xs leading-5 text-amber-100/65"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {caveat}
                </p>
              ))}

              <div className="mt-4 space-y-2 border-t border-white/8 pt-4">
                {citations.map((citation) => (
                  <div
                    key={citation.evidence_key}
                    className="text-xs leading-5 text-zinc-500"
                  >
                    <span className="text-cyan-200/60">
                      {EVIDENCE_LABELS[citation.evidence_class] ||
                        citation.evidence_class}
                    </span>
                    {" · "}
                    {citation.source_url ? (
                      <a
                        href={citation.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-zinc-400 underline decoration-white/20 underline-offset-2 hover:text-cyan-100"
                      >
                        {citation.citation}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span>{citation.citation}</span>
                    )}
                    {" · "}
                    <span className="font-mono text-[10px]">
                      {citation.locator}
                    </span>
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      {graph.reviewed_non_edges.map((nonEdge) => (
        <div
          key={nonEdge.statement}
          className="rounded-2xl border border-fuchsia-900/30 bg-fuchsia-950/10 p-5"
        >
          <p className="font-[family-name:var(--font-cinzel)] text-[10px] uppercase tracking-[0.2em] text-fuchsia-300/65">
            Reviewed non-edge
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {nonEdge.statement}
          </p>
        </div>
      ))}
    </section>
  );
}
