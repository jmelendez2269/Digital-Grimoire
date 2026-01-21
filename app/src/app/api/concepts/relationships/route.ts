import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  validateRelationship,
  validateSimilarity,
  validateRelationshipData,
  checkDuplicateRelationship,
} from "@/lib/convergence/validation";

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

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(req.url);
    const sourceId = searchParams.get("sourceId");
    const minSimilarity = Number(searchParams.get("minSimilarity") || 0);
    const limit = Math.min(Number(searchParams.get("limit") || 100), 400);

    let query = supabase.from("convergence_relationships").select("*").limit(limit);
    if (sourceId) query = query.eq("source_id", sourceId);
    if (!Number.isNaN(minSimilarity)) query = query.gte("similarity", minSimilarity);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch concept relationships" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { sourceId, targetId, similarity = 0.5, source_citation, notes } = body || {};

    // Validate input data structure
    const dataValidation = validateRelationshipData({ sourceId, targetId, similarity });
    if (!dataValidation.valid) {
      return NextResponse.json(
        { error: dataValidation.error || "Invalid relationship data" },
        { status: 400 }
      );
    }

    // Validate similarity range
    const similarityValidation = validateSimilarity(similarity);
    if (!similarityValidation.valid) {
      return NextResponse.json(
        { error: similarityValidation.error || "Invalid similarity value" },
        { status: 400 }
      );
    }

    // Validate that concepts exist and relationship is valid
    const relationshipValidation = await validateRelationship(sourceId!, targetId!);
    if (!relationshipValidation.valid) {
      return NextResponse.json(
        { error: relationshipValidation.error || "Invalid relationship" },
        { status: 400 }
      );
    }

    // Check for duplicate relationships
    const duplicateCheck = await checkDuplicateRelationship(sourceId!, targetId!);
    if (duplicateCheck.exists) {
      return NextResponse.json(
        {
          error: "A relationship already exists between these concepts",
          existingRelationship: duplicateCheck.relationship,
        },
        { status: 409 } // Conflict
      );
    }

    // Create the relationship
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("convergence_relationships")
      .insert({
        source_id: sourceId,
        target_id: targetId,
        similarity,
        source_citation,
        notes,
      })
      .select("*")
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A relationship already exists between these concepts" },
          { status: 409 }
        );
      }
      // Handle foreign key violation
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "One or both concepts do not exist" },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ relationship: data }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating relationship:", err);
    return NextResponse.json(
      {
        error: err?.message || "Failed to create concept relationship",
        details: process.env.NODE_ENV === "development" ? String(err) : undefined,
      },
      { status: 500 }
    );
  }
}


