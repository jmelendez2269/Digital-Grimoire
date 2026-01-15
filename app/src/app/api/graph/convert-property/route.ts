import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { slugifyEntityName, getBackwardsFieldKey } from "@/lib/graph/entity-utils";
import { getSuggestedRelationshipType } from "@/lib/graph/field-relationship-map";

async function isAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin";
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      claimId,
      values, // Array of strings to convert
      category,
      relationshipType, // Optional, will be auto-selected if not provided
    } = body || {};

    if (!claimId || !values || !Array.isArray(values) || values.length === 0 || !category) {
      return NextResponse.json(
        { error: "claimId, values (array), and category are required" },
        { status: 400 }
      );
    }

    const svc = createServiceClient();

    // Fetch original claim to get source_id and original entity info
    const { data: claim, error: claimError } = await svc
      .from("knowledge_claims")
      .select("*, source_id, field_key, entity_id, entity_type")
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json(
        { error: "Claim not found" },
        { status: 404 }
      );
    }

    // Fetch original entity to get its category and name
    const { data: originalEntity, error: entityError } = await svc
      .from("correspondences")
      .select("id, name, category, slug")
      .eq("id", claim.entity_id)
      .single();

    if (entityError || !originalEntity) {
      return NextResponse.json(
        { error: "Original entity not found" },
        { status: 404 }
      );
    }

    // Resolve category to type_id
    const { data: typeRow } = await svc
      .from("correspondence_entity_types")
      .select("id")
      .eq("slug", category)
      .single();

    if (!typeRow) {
      return NextResponse.json(
        { error: `Invalid category: ${category}` },
        { status: 400 }
      );
    }

    const typeId = typeRow.id;

    // Determine relationship type
    let resolvedRelationshipType = relationshipType;
    if (!resolvedRelationshipType) {
      resolvedRelationshipType = getSuggestedRelationshipType(claim.field_key);
    }

    // Resolve relationship type to type_id
    const { data: relTypeRow } = await svc
      .from("correspondence_relationship_types")
      .select("id")
      .eq("slug", resolvedRelationshipType)
      .single();

    if (!relTypeRow) {
      return NextResponse.json(
        { error: `Invalid relationship type: ${resolvedRelationshipType}` },
        { status: 400 }
      );
    }

    const relationshipTypeId = relTypeRow.id;

    // Get backwards field key for the new entity
    const backwardsFieldKey = getBackwardsFieldKey(originalEntity.category);

    const createdEntities: any[] = [];
    const createdRelationships: any[] = [];
    const createdClaims: any[] = [];
    const skippedRelationships: Array<{ value: string; reason: string }> = [];

    // Process each value
    for (const value of values) {
      const trimmedValue = value.trim();
      if (!trimmedValue) continue;

      const slug = slugifyEntityName(trimmedValue);

      // Check if entity already exists
      let { data: existingEntity } = await svc
        .from("correspondences")
        .select("id, name, slug")
        .eq("slug", slug)
        .single();

      let entityId: string;

      if (existingEntity) {
        // Entity exists, use it
        entityId = existingEntity.id;
        createdEntities.push(existingEntity);
      } else {
        // Create new entity
        const { data: newEntity, error: createError } = await svc
          .from("correspondences")
          .insert({
            name: trimmedValue,
            slug,
            category,
            type_id: typeId,
            aliases: [],
            description: null,
            lenses: [],
          })
          .select("*")
          .single();

        if (createError) {
          console.error(`Error creating entity ${trimmedValue}:`, createError);
          continue; // Skip this value and continue with others
        }

        entityId = newEntity.id;
        createdEntities.push(newEntity);
      }

      // Check if relationship of this specific type already exists (bidirectional check)
      // Check both directions separately for reliability
      const [result1, result2] = await Promise.all([
        svc
          .from("correspondence_relationships")
          .select("id, type")
          .eq("source_id", originalEntity.id)
          .eq("target_id", entityId)
          .eq("type", resolvedRelationshipType),
        svc
          .from("correspondence_relationships")
          .select("id, type")
          .eq("source_id", entityId)
          .eq("target_id", originalEntity.id)
          .eq("type", resolvedRelationshipType),
      ]);
      
      // Combine results from both directions
      const existingRels = [
        ...(result1.data || []),
        ...(result2.data || [])
      ];
      
      // If any relationships of this type exist, skip creating a duplicate
      const existingRelOfType = existingRels.length > 0;

      if (!existingRelOfType) {
        // Create relationship (original entity → new entity)
        const { data: relationship, error: relError } = await svc
          .from("correspondence_relationships")
          .insert({
            source_id: originalEntity.id,
            target_id: entityId,
            type: resolvedRelationshipType,
            relationship_type_id: relationshipTypeId,
            weight: 0.5,
            confidence: "tradition",
            source_citation: null,
            notes: null,
          })
          .select("*")
          .single();

        if (!relError && relationship) {
          createdRelationships.push(relationship);
        } else if (relError) {
          console.error(`Error creating relationship for ${trimmedValue}:`, relError);
        }
      } else {
        // Relationship of this type already exists - skip but note it
        skippedRelationships.push({
          value: trimmedValue,
          reason: `Relationship of type "${resolvedRelationshipType}" already exists`,
        });
      }

      // Create backwards compatibility claim
      // Check if claim already exists
      const { data: existingClaims } = await svc
        .from("knowledge_claims")
        .select("id")
        .eq("entity_type", "correspondence")
        .eq("entity_id", entityId)
        .eq("field_key", backwardsFieldKey)
        .eq("field_value", originalEntity.name);
      
      const existingClaim = existingClaims && existingClaims.length > 0 ? existingClaims[0] : null;

      if (!existingClaim) {
        const { data: backwardsClaim, error: claimError } = await svc
          .from("knowledge_claims")
          .insert({
            entity_type: "correspondence",
            entity_id: entityId,
            source_id: claim.source_id,
            field_key: backwardsFieldKey,
            field_value: originalEntity.name,
            field_value_json: null,
            confidence: null,
            notes: null,
          })
          .select("*")
          .single();

        if (!claimError && backwardsClaim) {
          createdClaims.push(backwardsClaim);
        }
      }
    }

    return NextResponse.json({
      success: true,
      entities: createdEntities,
      relationships: createdRelationships,
      claims: createdClaims,
      skipped: skippedRelationships,
      summary: {
        entitiesCreated: createdEntities.length,
        relationshipsCreated: createdRelationships.length,
        claimsCreated: createdClaims.length,
        relationshipsSkipped: skippedRelationships.length,
      },
    });
  } catch (err: any) {
    console.error("Error converting property to entity:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to convert property to entity" },
      { status: 500 }
    );
  }
}
