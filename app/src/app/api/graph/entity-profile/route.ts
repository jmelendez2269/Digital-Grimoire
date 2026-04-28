import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildCorrespondenceProfile,
  type CorrespondenceProfileClaimRow,
  type CorrespondenceProfileEntity,
  type CorrespondenceProfileRelationshipRow,
} from "@/lib/graph/correspondence-profile";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");

    if (!entityId) {
      return NextResponse.json({ error: "entityId is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const [entityResult, claimsResult, relationshipsResult] = await Promise.all([
      supabase
        .from("correspondences")
        .select(
          "id, slug, name, category, aliases, description, lenses, type:correspondence_entity_types(id, slug, label, color, icon)",
        )
        .eq("id", entityId)
        .single(),
      supabase
        .from("knowledge_claims")
        .select(
          "id, field_key, field_value, source:knowledge_sources(id, title, author, citation, year)",
        )
        .eq("entity_type", "correspondence")
        .eq("entity_id", entityId)
        .order("field_key", { ascending: true }),
      supabase
        .from("correspondence_relationships")
        .select(
          "id, source_id, target_id, type, weight, confidence, source_citation, notes, relationship_type:correspondence_relationship_types(id, slug, label, color, icon), source:correspondences!correspondence_relationships_source_id_fkey(id, slug, name, category, type:correspondence_entity_types(id, slug, label, color, icon)), target:correspondences!correspondence_relationships_target_id_fkey(id, slug, name, category, type:correspondence_entity_types(id, slug, label, color, icon))",
        )
        .or(`source_id.eq.${entityId},target_id.eq.${entityId}`),
    ]);

    if (entityResult.error) throw entityResult.error;
    if (claimsResult.error) throw claimsResult.error;
    if (relationshipsResult.error) throw relationshipsResult.error;

    const entity = entityResult.data as any as CorrespondenceProfileEntity;
    const claims = (claimsResult.data || []) as any as CorrespondenceProfileClaimRow[];
    const relationships = (relationshipsResult.data || []) as any as CorrespondenceProfileRelationshipRow[];

    const profile = buildCorrespondenceProfile({
      entity,
      claims,
      relationships,
    });

    const response = NextResponse.json({ profile });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load entity profile" },
      { status: 500 },
    );
  }
}
