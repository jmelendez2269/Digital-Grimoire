import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import SaveToInquiry from "./SaveToInquiry";
import {
  EVIDENCE_CLASSES,
  PREDICATES,
  sourceHref,
  type KnowledgeEntity,
  type PublicFinding,
  type Capture,
} from "@/lib/inquiries/model";
export default function EvidenceCard({
  finding,
  entities,
}: {
  finding: PublicFinding;
  entities: KnowledgeEntity[];
}) {
  const { user } = useAuth();
  const source = entities.find((e) => e.id === finding.source_entity_id);
  const target = entities.find((e) => e.id === finding.target_entity_id);
  const href = sourceHref(finding);
  const capture: Capture = {
    title: `${source?.name || "?"} → ${target?.name || "?"}: ${finding.title}`,
    claim: finding.claim,
    source_kind: finding.source_kind,
    source_title: finding.source_title,
    source_url: finding.source_url,
    source_locator: finding.source_locator,
    excerpt: finding.excerpt,
    text_id: finding.text_id,
    chunk_id: finding.chunk_id,
    context: finding.context,
    provenance: { published_finding_id: finding.id },
  };
  return (
    <div className="space-y-4">
      <h3 className="font-serif text-xl text-amber-100">{finding.title}</h3>
      {source && target && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md bg-zinc-800 px-2 py-1">
            {source.name}
          </span>
          <span className="text-zinc-400">
            → {PREDICATES[finding.predicate]} →
          </span>
          <span className="rounded-md bg-zinc-800 px-2 py-1">
            {target.name}
          </span>
        </p>
      )}
      {finding.claim && (
        <p className="leading-7 whitespace-pre-wrap">{finding.claim}</p>
      )}
      <p className="text-xs tracking-wide text-teal-200 uppercase">
        {finding.source_kind === "ai" || finding.source_kind === "note"
          ? "Research lead — evidence not attached"
          : EVIDENCE_CLASSES[finding.evidence_class]}
      </p>
      {finding.excerpt && (
        <div className="border-l-2 border-amber-300/50 pl-4">
          <p className="mb-2 text-xs text-zinc-400">
            Source passage / image description
          </p>
          <p className="text-sm leading-7 whitespace-pre-wrap text-zinc-300">
            {finding.excerpt}
          </p>
        </div>
      )}
      <div className="text-sm leading-6 text-zinc-400">
        <p>{finding.source_title}</p>
        <p>{finding.source_locator}</p>
        {href && (
          <a
            className="inline-block min-h-11 py-2 text-amber-200 underline underline-offset-4"
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
          >
            Open source
          </a>
        )}
      </div>
      {finding.context && (
        <div>
          <p className="text-xs tracking-wide text-zinc-400 uppercase">
            Context and limits
          </p>
          <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-zinc-300">
            {finding.context}
          </p>
        </div>
      )}
      {[source, target]
        .filter((e): e is KnowledgeEntity => Boolean(e?.correspondence_id))
        .map((e) => (
          <Link
            key={e.id}
            className="mr-4 inline-block min-h-11 py-2 text-sm text-amber-200 underline"
            href={`/graph?type=correspondences&focus=${e.correspondence_id}`}
          >
            Explore {e.name} correspondences
          </Link>
        ))}
      <div className="flex flex-wrap gap-3 pt-2">
        {user ? (
          <SaveToInquiry capture={capture} label="Save to my Journal" />
        ) : (
          <Link
            href={`/login?redirect=/graph?type=research&focus=${finding.source_entity_id}`}
            className="inline-flex h-11 min-w-0 items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 text-sm hover:border-amber-300/50 hover:bg-zinc-700"
          >
            Sign in to save
          </Link>
        )}
      </div>
    </div>
  );
}
