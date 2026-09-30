import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { publicFinding, type Finding } from "@/lib/inquiries/model";
import { handleInquiry, json, checkDB } from "@/lib/inquiries/server";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  return handleInquiry(async () => {
    const db = createServiceClient();
    const offset = Math.max(
      0,
      Math.min(100000, Number(request.nextUrl.searchParams.get("offset")) || 0)
    );
    // Public fields are projected again with an explicit allowlist before serialization.
    const { data, error, count } = await db
      .from("research_findings")
      .select("*", { count: "exact" })
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .order("id")
      .range(offset, offset + 199);
    checkDB(error);
    const findings = ((data as Finding[]) || []).map(publicFinding);
    const ids = [
      ...new Set(
        findings
          .flatMap((f) => [f.source_entity_id, f.target_entity_id])
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const entities = ids.length
      ? await db
          .from("research_entities")
          .select("id,name,kind,definition,correspondence_id")
          .in("id", ids)
      : { data: [], error: null };
    checkDB(entities.error);
    return json({
      findings,
      entities: entities.data,
      total: count || 0,
      hasMore: offset + findings.length < (count || 0),
    });
  });
}
