/**
 * Validation utilities for Parallax Graph entities and relationships
 * Provides reusable validation functions to prevent data integrity issues
 */

import { createServiceClient } from "@/lib/supabase/service";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: any;
}

/**
 * Validate that a concept exists in the database
 */
export async function validateConceptExists(conceptId: string): Promise<ValidationResult> {
  if (!conceptId || typeof conceptId !== "string") {
    return {
      valid: false,
      error: "Concept ID is required and must be a string",
    };
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      // NOTE: 'convergence_concepts' is the legacy table name. Do not change unless database migration is performed.
      .from("convergence_concepts")
      .select("id, name")
      .eq("id", conceptId)
      .single();

    if (error || !data) {
      return {
        valid: false,
        error: `Concept with ID ${conceptId} does not exist`,
        details: error,
      };
    }

    return {
      valid: true,
      details: { concept: data },
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Failed to validate concept: ${err?.message}`,
      details: err,
    };
  }
}

/**
 * Validate that both source and target concepts exist
 */
export async function validateConceptsExist(
  sourceId: string,
  targetId: string
): Promise<ValidationResult> {
  // Check source
  const sourceValidation = await validateConceptExists(sourceId);
  if (!sourceValidation.valid) {
    return {
      valid: false,
      error: `Source concept invalid: ${sourceValidation.error}`,
      details: { source: sourceValidation },
    };
  }

  // Check target
  const targetValidation = await validateConceptExists(targetId);
  if (!targetValidation.valid) {
    return {
      valid: false,
      error: `Target concept invalid: ${targetValidation.error}`,
      details: { target: targetValidation },
    };
  }

  return {
    valid: true,
    details: {
      source: sourceValidation.details?.concept,
      target: targetValidation.details?.concept,
    },
  };
}

/**
 * Validate that a relationship can be created (no self-referential, concepts exist)
 */
export async function validateRelationship(
  sourceId: string,
  targetId: string
): Promise<ValidationResult> {
  // Check for self-referential relationship
  if (sourceId === targetId) {
    return {
      valid: false,
      error: "Self-referential relationships are not allowed (source_id cannot equal target_id)",
    };
  }

  // Validate concepts exist
  return await validateConceptsExist(sourceId, targetId);
}

/**
 * Validate similarity value is in valid range (0-1)
 */
export function validateSimilarity(similarity: number): ValidationResult {
  if (typeof similarity !== "number" || isNaN(similarity)) {
    return {
      valid: false,
      error: "Similarity must be a number",
    };
  }

  if (similarity < 0 || similarity > 1) {
    return {
      valid: false,
      error: `Similarity must be between 0 and 1, got ${similarity}`,
    };
  }

  return {
    valid: true,
  };
}

/**
 * Check if a relationship already exists (bidirectional check)
 */
export async function checkDuplicateRelationship(
  sourceId: string,
  targetId: string,
  excludeId?: string
): Promise<ValidationResult & { exists: boolean; relationship?: any }> {
  try {
    const supabase = createServiceClient();

    // Check both directions: source->target and target->source
    const { data: existing1 } = await supabase
      .from("convergence_relationships")
      .select("id, source_id, target_id, similarity")
      .eq("source_id", sourceId)
      .eq("target_id", targetId)
      .maybeSingle();

    const { data: existing2 } = await supabase
      .from("convergence_relationships")
      .select("id, source_id, target_id, similarity")
      .eq("source_id", targetId)
      .eq("target_id", sourceId)
      .maybeSingle();

    const existing = existing1 || existing2;

    // If we're updating, exclude the current relationship
    if (existing && excludeId && existing.id === excludeId) {
      return {
        valid: true,
        exists: false,
      };
    }

    if (existing) {
      return {
        valid: true,
        exists: true,
        relationship: existing,
        error: "A relationship already exists between these concepts",
      };
    }

    return {
      valid: true,
      exists: false,
    };
  } catch (err: any) {
    return {
      valid: false,
      exists: false,
      error: `Failed to check for duplicate relationship: ${err?.message}`,
      details: err,
    };
  }
}

/**
 * Validate concept creation data
 */
export function validateConceptData(data: {
  name?: string;
  tradition?: string;
  traditionId?: string;
  slug?: string;
  similarity?: number;
}): ValidationResult {
  const errors: string[] = [];

  // Name validation
  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    errors.push("Name is required and must be a non-empty string");
  } else if (data.name.length > 255) {
    errors.push("Name must be 255 characters or less");
  }

  // Tradition validation
  if (!data.tradition && !data.traditionId) {
    errors.push("Either tradition or traditionId is required");
  }

  // Slug validation (if provided)
  if (data.slug !== undefined) {
    if (typeof data.slug !== "string") {
      errors.push("Slug must be a string");
    } else if (data.slug.length > 255) {
      errors.push("Slug must be 255 characters or less");
    } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
      errors.push("Slug must contain only lowercase letters, numbers, and hyphens");
    }
  }

  // Similarity validation (if provided - shouldn't be in concept data, but check anyway)
  if (data.similarity !== undefined) {
    const similarityValidation = validateSimilarity(data.similarity);
    if (!similarityValidation.valid) {
      errors.push(similarityValidation.error || "Invalid similarity value");
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join("; "),
      details: { errors },
    };
  }

  return {
    valid: true,
  };
}

/**
 * Validate relationship creation data
 */
export function validateRelationshipData(data: {
  sourceId?: string;
  targetId?: string;
  similarity?: number;
}): ValidationResult {
  const errors: string[] = [];

  // Source ID validation
  if (!data.sourceId || typeof data.sourceId !== "string") {
    errors.push("sourceId is required and must be a string");
  }

  // Target ID validation
  if (!data.targetId || typeof data.targetId !== "string") {
    errors.push("targetId is required and must be a string");
  }

  // Self-referential check
  if (data.sourceId && data.targetId && data.sourceId === data.targetId) {
    errors.push("Self-referential relationships are not allowed");
  }

  // Similarity validation
  if (data.similarity !== undefined) {
    const similarityValidation = validateSimilarity(data.similarity);
    if (!similarityValidation.valid) {
      errors.push(similarityValidation.error || "Invalid similarity value");
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join("; "),
      details: { errors },
    };
  }

  return {
    valid: true,
  };
}
