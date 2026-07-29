"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  FileText,
  GraduationCap,
  Lightbulb,
  Link2,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import type {
  CourseGraphBlockedInference,
  CourseGraphEdge,
  CourseGraphEntity,
  CourseGraphEntityKind,
  CourseGraphEvidence,
  CourseGraphImport,
} from "@/lib/types";

interface CourseGraphEntityDialogProps {
  entity: CourseGraphEntity | null;
  entities: CourseGraphEntity[];
  edges: CourseGraphEdge[];
  evidence: CourseGraphEvidence[];
  graphImport: CourseGraphImport | null;
  blockedInferences?: CourseGraphBlockedInference[];
  onClose: () => void;
  onFocusEntity?: (entity: CourseGraphEntity) => void;
}

type ConnectionGroup = {
  id: string;
  label: string;
  description: string;
  edges: CourseGraphEdge[];
};

const ENTITY_KIND_LABELS: Record<CourseGraphEntityKind, string> = {
  course: "Course",
  lesson: "Lesson",
  work: "Work",
  edition: "Edition",
  passage: "Passage",
  person: "Person",
  tradition: "Tradition",
  concept: "Concept",
  institution: "Institution",
  artifact: "Artifact",
};

function humanize(value: string | null | undefined) {
  if (!value) return "Not specified";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function KindIcon({ kind }: { kind: CourseGraphEntityKind }) {
  if (kind === "course" || kind === "lesson") return <GraduationCap className="h-4 w-4" />;
  if (kind === "work" || kind === "edition" || kind === "passage") return <BookOpen className="h-4 w-4" />;
  if (kind === "person") return <UserRound className="h-4 w-4" />;
  return <Lightbulb className="h-4 w-4" />;
}

function groupConnections(edges: CourseGraphEdge[]): ConnectionGroup[] {
  const groups: ConnectionGroup[] = [
    {
      id: "structural",
      label: "Course structure & bibliography",
      description: "Assignments, authorship, translation, and other source-documented roles.",
      edges: edges.filter((edge) => edge.edge_class === "structural"),
    },
    {
      id: "historical",
      label: "Documented historical relationships",
      description: "Connections supported as historical claims rather than course interpretation.",
      edges: edges.filter(
        (edge) => edge.edge_class !== "structural" && edge.epistemic_kind === "documented_historical",
      ),
    },
    {
      id: "conceptual",
      label: "Conceptual relationships",
      description: "Course-framed distinctions, responses, refinements, and contrasts.",
      edges: edges.filter(
        (edge) =>
          edge.edge_class !== "structural" &&
          (edge.epistemic_kind === "conceptual" || edge.epistemic_kind === "tradition"),
      ),
    },
    {
      id: "editorial",
      label: "Editorial relationships",
      description: "Juxtapositions made by this course; they are not historical-contact claims.",
      edges: edges.filter(
        (edge) => edge.edge_class !== "structural" && edge.epistemic_kind === "editorial",
      ),
    },
  ];

  return groups
    .map((group) => ({
      ...group,
      edges: [...group.edges].sort(
        (left, right) =>
          left.predicate.localeCompare(right.predicate) ||
          left.stable_id.localeCompare(right.stable_id),
      ),
    }))
    .filter((group) => group.edges.length > 0);
}

export default function CourseGraphEntityDialog({
  entity,
  entities,
  edges,
  evidence,
  graphImport,
  blockedInferences = [],
  onClose,
  onFocusEntity,
}: CourseGraphEntityDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeEntity, setActiveEntity] = useState<CourseGraphEntity | null>(entity);
  const [history, setHistory] = useState<CourseGraphEntity[]>([]);

  useEffect(() => {
    if (!entity) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [entity, onClose]);

  const entityById = useMemo(
    () => new Map(entities.map((candidate) => [candidate.id, candidate] as const)),
    [entities],
  );
  const evidenceByKey = useMemo(
    () => new Map(evidence.map((record) => [record.evidence_key, record] as const)),
    [evidence],
  );
  const incidentEdges = useMemo(() => {
    if (!activeEntity) return [];
    return edges.filter(
      (edge) => edge.source_id === activeEntity.id || edge.target_id === activeEntity.id,
    );
  }, [activeEntity, edges]);
  const connectionGroups = useMemo(() => groupConnections(incidentEdges), [incidentEdges]);
  const entityEvidence = useMemo(() => {
    if (!activeEntity) return [];
    return activeEntity.evidence_keys
      .map((key) => evidenceByKey.get(key))
      .filter((record): record is CourseGraphEvidence => Boolean(record));
  }, [activeEntity, evidenceByKey]);

  if (!entity || !activeEntity) return null;

  const openRelatedEntity = (nextEntity: CourseGraphEntity) => {
    setHistory((current) => [...current, activeEntity].slice(-24));
    setActiveEntity(nextEntity);
    onFocusEntity?.(nextEntity);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const goBack = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    setActiveEntity(previous);
    onFocusEntity?.(previous);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-amber-700/30 bg-[#090807] shadow-[0_28px_100px_rgba(0,0,0,0.72)]"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-white/10 bg-zinc-950/95 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            disabled={history.length === 0}
            aria-label="Return to the previous entity"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-colors hover:border-amber-500/30 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-25"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.17em]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/8 px-2.5 py-1 text-cyan-200/85">
                <KindIcon kind={activeEntity.entity_kind} />
                {ENTITY_KIND_LABELS[activeEntity.entity_kind]}
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                {humanize(activeEntity.review_state)}
              </span>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-zinc-400">
                Identity: {humanize(activeEntity.identity_state)}
              </span>
            </div>
            <h2
              id={titleId}
              className="mt-3 font-[family-name:var(--font-cormorant)] text-3xl leading-tight text-amber-100 sm:text-4xl"
            >
              {activeEntity.name}
            </h2>
            <p className="mt-1 break-all font-mono text-[10px] tracking-wide text-zinc-600">
              {activeEntity.stable_id}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close entity dossier"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/5 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={scrollRef} className="overflow-y-auto overscroll-contain">
          <div className="space-y-6 px-4 py-5 sm:px-7 sm:py-7">
            <div
              id={descriptionId}
              className="flex gap-3 rounded-xl border border-amber-700/30 bg-amber-950/20 px-4 py-3 text-sm leading-6 text-amber-100/75"
            >
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <p>
                Review-only candidate from a course extraction. Its synthesis and connections are
                drafts, not published graph claims.
              </p>
            </div>

            {(activeEntity.identity_state === "unresolved" ||
              activeEntity.identity_state === "merge_candidate") && (
              <div className="flex gap-3 rounded-xl border border-rose-800/35 bg-rose-950/20 px-4 py-3 text-sm leading-6 text-rose-100/75">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                <p>
                  This identity still needs curator review before it can be merged with a canonical
                  person or work.
                </p>
              </div>
            )}

            <section aria-labelledby={`${titleId}-synthesis`}>
              <p className="text-[10px] uppercase tracking-[0.24em] text-amber-400/60">
                {activeEntity.synthesis_live ? "Reviewed synthesis" : "Draft course synthesis"}
              </p>
              <h3
                id={`${titleId}-synthesis`}
                className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl text-amber-100"
              >
                What this entity means here
              </h3>
              <p className="mt-3 text-base leading-8 text-zinc-300">
                {activeEntity.synthesis_live || activeEntity.synthesis_draft}
              </p>
              {(activeEntity.course_role || activeEntity.aliases.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeEntity.course_role && (
                    <span className="rounded-lg border border-cyan-700/25 bg-cyan-950/20 px-3 py-2 text-xs text-cyan-100/75">
                      Course role: {activeEntity.course_role}
                    </span>
                  )}
                  {activeEntity.aliases.map((alias) => (
                    <span
                      key={alias}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400"
                    >
                      Alias: {alias}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby={`${titleId}-connections`}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-400/60">
                    Connection dossier
                  </p>
                  <h3
                    id={`${titleId}-connections`}
                    className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl text-amber-100"
                  >
                    {incidentEdges.length} typed {incidentEdges.length === 1 ? "connection" : "connections"}
                  </h3>
                </div>
                <p className="text-xs text-zinc-600">Arrows preserve source → target direction.</p>
              </div>

              {connectionGroups.length === 0 ? (
                <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-500">
                  No connections are recorded for this entity in the current import.
                </p>
              ) : (
                <div className="mt-5 space-y-6">
                  {connectionGroups.map((group) => (
                    <div key={group.id}>
                      <div className="mb-3">
                        <h4 className="font-[family-name:var(--font-cinzel)] text-xs uppercase tracking-[0.17em] text-amber-200/80">
                          {group.label}
                        </h4>
                        <p className="mt-1 text-xs leading-5 text-zinc-600">{group.description}</p>
                      </div>
                      <div className="space-y-3">
                        {group.edges.map((edge) => {
                          const outgoing = edge.source_id === activeEntity.id;
                          const related = entityById.get(outgoing ? edge.target_id : edge.source_id);
                          const edgeEvidence = edge.evidence_keys
                            .map((key) => evidenceByKey.get(key))
                            .filter((record): record is CourseGraphEvidence => Boolean(record));

                          return (
                            <article
                              key={edge.id}
                              className="rounded-xl border border-white/10 bg-zinc-950/55 p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                                    <ArrowUpRight
                                      className={`h-3.5 w-3.5 ${outgoing ? "text-cyan-400" : "rotate-180 text-violet-400"}`}
                                    />
                                    {outgoing ? "Outgoing" : "Incoming"} · {humanize(edge.predicate)}
                                  </p>
                                  {related ? (
                                    <button
                                      type="button"
                                      onClick={() => openRelatedEntity(related)}
                                      className="mt-2 inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg px-2 text-left font-[family-name:var(--font-cormorant)] text-xl text-amber-100 transition-colors hover:bg-amber-500/8 hover:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                                    >
                                      <Link2 className="h-4 w-4 shrink-0 text-cyan-400/70" />
                                      <span className="truncate">{related.name}</span>
                                    </button>
                                  ) : (
                                    <p className="mt-2 text-sm text-rose-300">Missing related entity</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1.5 sm:max-w-[45%] sm:justify-end">
                                  <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase tracking-wider text-zinc-400">
                                    {humanize(edge.epistemic_kind)}
                                  </span>
                                  <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase tracking-wider text-zinc-400">
                                    {humanize(edge.confidence)}
                                  </span>
                                  {edge.scope && (
                                    <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase tracking-wider text-zinc-400">
                                      {humanize(edge.scope)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="mt-3 text-sm leading-6 text-zinc-300">
                                {edge.connection_summary_live || edge.connection_summary_draft}
                              </p>

                              {edge.epistemic_kind === "editorial" && (
                                <div className="mt-3 flex gap-2 rounded-lg border border-fuchsia-800/30 bg-fuchsia-950/20 px-3 py-2 text-xs leading-5 text-fuchsia-100/75">
                                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-400" />
                                  <p>
                                    Course juxtaposition only. This does not establish historical
                                    contact, influence, transmission, or shared doctrine.
                                  </p>
                                </div>
                              )}

                              {edgeEvidence.length > 0 && (
                                <details className="mt-3 rounded-lg border border-white/8 bg-black/20">
                                  <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-xs text-amber-100/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/50">
                                    <FileText className="h-4 w-4" />
                                    {edgeEvidence.length} evidence {edgeEvidence.length === 1 ? "record" : "records"}
                                  </summary>
                                  <div className="space-y-3 border-t border-white/8 px-3 py-3">
                                    {edgeEvidence.map((record) => (
                                      <div key={record.id}>
                                        <p className="font-mono text-[10px] text-cyan-300/70">
                                          {record.evidence_key} · {humanize(record.evidence_class)}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-500">
                                          {record.heading_path} · {record.locator}
                                        </p>
                                        <blockquote className="mt-2 border-l-2 border-amber-600/35 pl-3 text-sm leading-6 text-zinc-400">
                                          {record.excerpt}
                                        </blockquote>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {entityEvidence.length > 0 && (
              <section aria-labelledby={`${titleId}-evidence`}>
                <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-400/60">
                  Entity evidence
                </p>
                <h3
                  id={`${titleId}-evidence`}
                  className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl text-amber-100"
                >
                  Source anchors
                </h3>
                <div className="mt-4 space-y-2">
                  {entityEvidence.map((record) => (
                    <details key={record.id} className="rounded-xl border border-white/10 bg-zinc-950/45">
                      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/50">
                        <span>{record.heading_path}</span>
                        <span className="shrink-0 font-mono text-[10px] text-zinc-600">{record.locator}</span>
                      </summary>
                      <div className="border-t border-white/8 px-4 py-4">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-cyan-300/65">
                          {record.evidence_key} · {humanize(record.evidence_class)}
                        </p>
                        <blockquote className="mt-3 border-l-2 border-amber-600/35 pl-3 text-sm leading-6 text-zinc-400">
                          {record.excerpt}
                        </blockquote>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {activeEntity.entity_kind === "course" && blockedInferences.length > 0 && (
              <section
                aria-labelledby={`${titleId}-blocked`}
                className="rounded-xl border border-rose-900/25 bg-rose-950/10 p-4 sm:p-5"
              >
                <p className="text-[10px] uppercase tracking-[0.24em] text-rose-400/65">
                  Epistemic guardrails
                </p>
                <h3
                  id={`${titleId}-blocked`}
                  className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl text-amber-100"
                >
                  Claims this import refuses to make
                </h3>
                <div className="mt-4 space-y-3">
                  {blockedInferences.map((blocked) => (
                    <div key={blocked.id} className="flex gap-3 text-sm leading-6 text-zinc-400">
                      <ShieldAlert className="mt-1 h-4 w-4 shrink-0 text-rose-400/70" />
                      <p>
                        <span className="text-zinc-200">{blocked.proposal}</span> — {blocked.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {graphImport && (
            <footer className="border-t border-white/10 bg-black/25 px-4 py-4 text-[10px] leading-5 text-zinc-600 sm:px-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>
                  Prepared {graphImport.prepared_on} · {graphImport.source_status} ·{" "}
                  {graphImport.run_mode}
                </p>
                <p className="inline-flex items-center gap-1.5 text-zinc-500">
                  <FileText className="h-3.5 w-3.5" />
                  {graphImport.source_path}
                </p>
              </div>
              <p className="mt-2 break-all font-mono">
                Source SHA-256: {graphImport.source_sha256}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-amber-100/45">
                Candidate class: {activeEntity.candidate_class}
                <ArrowUpRight className="h-3 w-3" />
              </p>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
