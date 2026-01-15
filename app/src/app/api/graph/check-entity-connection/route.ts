import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { slugifyEntityName } from "@/lib/graph/entity-utils";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(req.url);
    const propertyValue = searchParams.get("propertyValue");
    const currentEntityId = searchParams.get("currentEntityId");

    if (!propertyValue || !currentEntityId) {
      return NextResponse.json(
        { error: "propertyValue and currentEntityId are required" },
        { status: 400 }
      );
    }

    const slug = slugifyEntityName(propertyValue);

    // Check if entity exists - try both exact slug match and case-insensitive name match
    let { data: existingEntity, error: entityError } = await supabase
      .from("correspondences")
      .select("id, name, slug, category")
      .eq("slug", slug)
      .maybeSingle();

    // If not found by slug, try case-insensitive exact name match
    if (!existingEntity && !entityError) {
      const { data: nameMatch } = await supabase
        .from("correspondences")
        .select("id, name, slug, category")
        .ilike("name", propertyValue.trim())
        .maybeSingle();
      
      // Only use if it's an exact match (case-insensitive)
      if (nameMatch && nameMatch.name.toLowerCase().trim() === propertyValue.toLowerCase().trim()) {
        existingEntity = nameMatch;
      }
    }

    if (entityError && entityError.code !== 'PGRST116') {
      throw entityError;
    }

    if (!existingEntity) {
      return NextResponse.json({
        exists: false,
        connected: false,
      });
    }

    // Check if already connected (bidirectional)
    // Check both directions: A->B and B->A
    const [result1, result2] = await Promise.all([
      supabase
        .from("correspondence_relationships")
        .select("id, type, weight, confidence, relationship_type:correspondence_relationship_types(id, slug, label)")
        .eq("source_id", currentEntityId)
        .eq("target_id", existingEntity.id),
      supabase
        .from("correspondence_relationships")
        .select("id, type, weight, confidence, relationship_type:correspondence_relationship_types(id, slug, label)")
        .eq("source_id", existingEntity.id)
        .eq("target_id", currentEntityId),
    ]);

    if (result1.error) {
      console.error("Error checking relationships (direction 1):", result1.error);
    }
    if (result2.error) {
      console.error("Error checking relationships (direction 2):", result2.error);
    }

    // Combine both directions
    const relationships = [
      ...(result1.data || []),
      ...(result2.data || [])
    ];

    const isConnected = relationships.length > 0;

    // Debug logging (can be removed in production)
    if (isConnected) {
      console.log(`[Connection Check] ${propertyValue} (${existingEntity.id}) is connected to ${currentEntityId} via ${relationships.length} relationship(s)`);
    }

    return NextResponse.json({
      exists: true,
      connected: isConnected,
      entity: existingEntity,
      relationships: relationships || [],
    });
  } catch (err: any) {
    console.error("Error checking entity connection:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to check entity connection" },
      { status: 500 }
    );
  }
}
