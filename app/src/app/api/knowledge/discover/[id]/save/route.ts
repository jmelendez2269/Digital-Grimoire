import { NextRequest } from "next/server";
import { z } from "zod";
import {
  researcher,
  checkDB,
  handleInquiry,
  InquiryError,
  json,
  type ResearchDB,
} from "@/lib/inquiries/server";
import type { Connection, DiscoveryResult } from "@/lib/discovery/model";

async function resolveEntity(
  db: ResearchDB,
  owner: string,
  entity: Connection["from"]
) {
  const escaped = entity.name.replace(/[%_\\]/g, "\\$&");
  const correspondence = await db
    .from("correspondences")
    .select("id,name")
    .ilike("name", escaped)
    .limit(2);
  checkDB(correspondence.error);
  const original =
    correspondence.data?.length === 1 ? correspondence.data[0] : null;
  const existingQuery = db
    .from("research_entities")
    .select("id")
    .eq("created_by", owner);
  const existing = original
    ? await existingQuery.eq("correspondence_id", original.id).maybeSingle()
    : await existingQuery
        .eq("kind", entity.kind)
        .ilike("name", escaped)
        .maybeSingle();
  checkDB(existing.error);
  if (existing.data) return existing.data.id as string;
  // Reuse a same-kind entry even if it was created without the archive bridge.
  const named = await db
    .from("research_entities")
    .select("id")
    .eq("created_by", owner)
    .eq("kind", entity.kind)
    .ilike("name", escaped)
    .maybeSingle();
  checkDB(named.error);
  if (named.data) return named.data.id as string;
  const inserted = await db
    .from("research_entities")
    .insert({
      ...entity,
      name: original?.name || entity.name,
      correspondence_id: original?.id || null,
      created_by: owner,
    })
    .select("id")
    .single();
  if (inserted.error?.code === "23505") {
    const retry = await db
      .from("research_entities")
      .select("id")
      .eq("created_by", owner)
      .eq("kind", entity.kind)
      .ilike("name", escaped)
      .maybeSingle();
    if (retry.data) return retry.data.id as string;
  }
  checkDB(inserted.error);
  return inserted.data!.id as string;
}

export function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleInquiry(async () => {
    const { user, db } = await researcher(request);
    const id = z.uuid().parse((await context.params).id);
    const { index } = z
      .object({ index: z.number().int().min(0).max(4) })
      .parse(await request.json());
    const run = await db
      .from("research_discoveries")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .eq("status", "complete")
      .maybeSingle();
    checkDB(run.error);
    if (!run.data) throw new InquiryError("Discovery not found.", 404);
    const result = run.data.result as DiscoveryResult;
    const connection = result.connections[index];
    if (!connection) throw new InquiryError("Connection not found.", 404);
    const prior = await db
      .from("research_findings")
      .select("id,inquiry_id")
      .eq("discovery_id", id)
      .eq("discovery_index", index)
      .maybeSingle();
    checkDB(prior.error);
    if (prior.data)
      return json({
        inquiryId: prior.data.inquiry_id,
        findingId: prior.data.id,
      });
    const root = await db
      .from("research_discoveries")
      .select("question")
      .eq("id", run.data.root_id)
      .eq("owner_id", user.id)
      .single();
    checkDB(root.error);
    const inquiryInsert = await db.from("research_inquiries").upsert(
      {
        owner_id: user.id,
        title: root.data!.question.slice(0, 180),
        question: root.data!.question,
        discovery_root_id: run.data.root_id,
      },
      { onConflict: "discovery_root_id", ignoreDuplicates: true }
    );
    checkDB(inquiryInsert.error);
    const inquiry = await db
      .from("research_inquiries")
      .select("id")
      .eq("discovery_root_id", run.data.root_id)
      .eq("owner_id", user.id)
      .single();
    checkDB(inquiry.error);
    const sourceId = await resolveEntity(db, user.id, connection.from);
    const targetId = await resolveEntity(db, user.id, connection.to);
    if (sourceId === targetId)
      throw new InquiryError(
        "These names resolve to the same entry. Review the connection before saving."
      );
    const proof = connection.evidence[0];
    const source = result.sources.find((s) => s.id === proof.sourceId)!;
    const finding = await db
      .from("research_findings")
      .insert({
        inquiry_id: inquiry.data!.id,
        title: connection.title,
        claim: connection.explanation,
        source_kind: source.kind === "library" ? "library" : "external",
        source_title: source.title,
        source_url: source.kind === "web" ? source.url : "",
        source_locator:
          source.kind === "library"
            ? `Library passage ${source.chunkId || source.textId}`
            : "Retrieved web excerpt; open the source to check its full context",
        excerpt: proof.quote,
        text_id: source.textId || null,
        chunk_id: source.chunkId || null,
        note: `Discovered while asking: ${run.data.question}\n\nNext question: ${connection.nextQuestion}\n\nSupporting sources:\n${connection.evidence
          .map((e) => {
            const s = result.sources.find((item) => item.id === e.sourceId)!;
            return `${s.title}: ${s.url}\n${e.quote}`;
          })
          .join("\n\n")}`,
        context: connection.context,
        evidence_class: connection.evidenceClass,
        source_entity_id: sourceId,
        target_entity_id: targetId,
        predicate: connection.predicate,
        provenance: { query: run.data.question },
        status: "draft",
        discovery_id: id,
        discovery_index: index,
      })
      .select("id")
      .single();
    if (finding.error?.code === "23505") {
      const concurrent = await db
        .from("research_findings")
        .select("id,inquiry_id")
        .eq("discovery_id", id)
        .eq("discovery_index", index)
        .single();
      checkDB(concurrent.error);
      return json({
        inquiryId: concurrent.data!.inquiry_id,
        findingId: concurrent.data!.id,
      });
    }
    checkDB(finding.error);
    return json({ inquiryId: inquiry.data!.id, findingId: finding.data!.id });
  });
}
