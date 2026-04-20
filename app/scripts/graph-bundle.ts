import type { SupabaseClient } from '@supabase/supabase-js';

export type GraphBundle = {
  version: 1;
  exportedAt: string;
  source: {
    supabaseUrl: string | null;
    projectRef: string | null;
  };
  convergence: {
    traditions: Array<{
      slug: string;
      label: string;
      color?: string | null;
      icon?: string | null;
      description?: string | null;
      sort_order?: number | null;
      is_active?: boolean | null;
    }>;
    concepts: Array<{
      slug: string;
      name: string;
      tradition: string;
      tradition_slug?: string | null;
      era?: string | null;
      short_definition?: string | null;
      primary_sources?: string[] | null;
      tags?: string[] | null;
    }>;
    relationships: Array<{
      source_slug: string;
      target_slug: string;
      similarity: number;
      source_citation?: string | null;
      notes?: string | null;
    }>;
  };
  correspondences: {
    entityTypes: Array<{
      slug: string;
      label: string;
      color?: string | null;
      icon?: string | null;
      description?: string | null;
      sort_order?: number | null;
      is_active?: boolean | null;
    }>;
    relationshipTypes: Array<{
      slug: string;
      label: string;
      color?: string | null;
      icon?: string | null;
      description?: string | null;
      sort_order?: number | null;
      is_active?: boolean | null;
    }>;
    entities: Array<{
      slug: string;
      name: string;
      category: string;
      type_slug?: string | null;
      aliases?: string[] | null;
      description?: string | null;
      lenses?: string[] | null;
    }>;
    relationships: Array<{
      source_slug: string;
      target_slug: string;
      type: string;
      relationship_type_slug?: string | null;
      weight: number;
      confidence: 'established' | 'interpretive' | 'speculative' | 'tradition';
      source_citation?: string | null;
      notes?: string | null;
    }>;
  };
};

function getProjectRef(url: string | undefined) {
  return url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || null;
}

export async function exportGraphBundle(supabase: SupabaseClient, supabaseUrl?: string): Promise<GraphBundle> {
  const [
    traditionsResult,
    conceptsResult,
    conceptRelationshipsResult,
    entityTypesResult,
    relationshipTypesResult,
    entitiesResult,
    correspondenceRelationshipsResult,
  ] = await Promise.all([
    supabase
      .from('convergence_traditions')
      .select('slug, label, color, icon, description, sort_order, is_active')
      .order('sort_order', { ascending: true }),
    supabase
      .from('convergence_concepts')
      .select('slug, name, tradition, era, short_definition, primary_sources, tags')
      .order('slug', { ascending: true }),
    supabase
      .from('convergence_relationships')
      .select('similarity, source_citation, notes, source:convergence_concepts!convergence_relationships_source_id_fkey(slug), target:convergence_concepts!convergence_relationships_target_id_fkey(slug)'),
    supabase
      .from('correspondence_entity_types')
      .select('slug, label, color, icon, description, sort_order, is_active')
      .order('sort_order', { ascending: true }),
    supabase
      .from('correspondence_relationship_types')
      .select('slug, label, color, icon, description, sort_order, is_active')
      .order('sort_order', { ascending: true }),
    supabase
      .from('correspondences')
      .select('slug, name, category, aliases, description, lenses, type:correspondence_entity_types(slug)')
      .order('slug', { ascending: true }),
    supabase
      .from('correspondence_relationships')
      .select('type, weight, confidence, source_citation, notes, source:correspondences!correspondence_relationships_source_id_fkey(slug), target:correspondences!correspondence_relationships_target_id_fkey(slug), relationship_type:correspondence_relationship_types(slug)'),
  ]);

  const results = [
    traditionsResult,
    conceptsResult,
    conceptRelationshipsResult,
    entityTypesResult,
    relationshipTypesResult,
    entitiesResult,
    correspondenceRelationshipsResult,
  ];
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw firstError;

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: {
      supabaseUrl: supabaseUrl || null,
      projectRef: getProjectRef(supabaseUrl),
    },
    convergence: {
      traditions: (traditionsResult.data || []).map((row) => ({
        slug: row.slug,
        label: row.label,
        color: row.color,
        icon: row.icon,
        description: row.description,
        sort_order: row.sort_order,
        is_active: row.is_active,
      })),
      concepts: (conceptsResult.data || []).map((row: any) => ({
        slug: row.slug,
        name: row.name,
        tradition: row.tradition,
        tradition_slug:
          (traditionsResult.data || []).find((tradition) => tradition.label === row.tradition)?.slug || null,
        era: row.era,
        short_definition: row.short_definition,
        primary_sources: row.primary_sources || [],
        tags: row.tags || [],
      })),
      relationships: (conceptRelationshipsResult.data || []).map((row: any) => ({
        source_slug: row.source?.slug,
        target_slug: row.target?.slug,
        similarity: Number(row.similarity),
        source_citation: row.source_citation,
        notes: row.notes,
      })).filter((row) => row.source_slug && row.target_slug),
    },
    correspondences: {
      entityTypes: (entityTypesResult.data || []).map((row) => ({
        slug: row.slug,
        label: row.label,
        color: row.color,
        icon: row.icon,
        description: row.description,
        sort_order: row.sort_order,
        is_active: row.is_active,
      })),
      relationshipTypes: (relationshipTypesResult.data || []).map((row) => ({
        slug: row.slug,
        label: row.label,
        color: row.color,
        icon: row.icon,
        description: row.description,
        sort_order: row.sort_order,
        is_active: row.is_active,
      })),
      entities: (entitiesResult.data || []).map((row: any) => ({
        slug: row.slug,
        name: row.name,
        category: row.category,
        type_slug: row.type?.slug || null,
        aliases: row.aliases || [],
        description: row.description,
        lenses: row.lenses || [],
      })),
      relationships: (correspondenceRelationshipsResult.data || []).map((row: any) => ({
        source_slug: row.source?.slug,
        target_slug: row.target?.slug,
        type: row.type,
        relationship_type_slug: row.relationship_type?.slug || null,
        weight: Number(row.weight),
        confidence: row.confidence,
        source_citation: row.source_citation,
        notes: row.notes,
      })).filter((row) => row.source_slug && row.target_slug),
    },
  };
}

export async function importGraphBundle(supabase: SupabaseClient, bundle: GraphBundle) {
  if (bundle.version !== 1) {
    throw new Error(`Unsupported graph bundle version: ${bundle.version}`);
  }

  if (bundle.convergence.traditions.length > 0) {
    const { error } = await supabase
      .from('convergence_traditions')
      .upsert(bundle.convergence.traditions, { onConflict: 'slug' });
    if (error) throw error;
  }

  if (bundle.correspondences.entityTypes.length > 0) {
    const { error } = await supabase
      .from('correspondence_entity_types')
      .upsert(bundle.correspondences.entityTypes, { onConflict: 'slug' });
    if (error) throw error;
  }

  if (bundle.correspondences.relationshipTypes.length > 0) {
    const { error } = await supabase
      .from('correspondence_relationship_types')
      .upsert(bundle.correspondences.relationshipTypes, { onConflict: 'slug' });
    if (error) throw error;
  }

  const { data: traditions, error: traditionsError } = await supabase
    .from('convergence_traditions')
    .select('id, slug');
  if (traditionsError) throw traditionsError;
  const traditionIdBySlug = new Map((traditions || []).map((row) => [row.slug, row.id] as const));

  if (bundle.convergence.concepts.length > 0) {
    const conceptsPayload = bundle.convergence.concepts.map((concept) => ({
      slug: concept.slug,
      name: concept.name,
      tradition: concept.tradition,
      tradition_id: concept.tradition_slug ? traditionIdBySlug.get(concept.tradition_slug) || null : null,
      era: concept.era || null,
      short_definition: concept.short_definition || null,
      primary_sources: concept.primary_sources || [],
      tags: concept.tags || [],
    }));

    const { error } = await supabase
      .from('convergence_concepts')
      .upsert(conceptsPayload, { onConflict: 'slug' });
    if (error) throw error;
  }

  const { data: entityTypes, error: entityTypesError } = await supabase
    .from('correspondence_entity_types')
    .select('id, slug');
  if (entityTypesError) throw entityTypesError;
  const entityTypeIdBySlug = new Map((entityTypes || []).map((row) => [row.slug, row.id] as const));

  if (bundle.correspondences.entities.length > 0) {
    const entityPayload = bundle.correspondences.entities.map((entity) => ({
      slug: entity.slug,
      name: entity.name,
      category: entity.category,
      type_id: entity.type_slug ? entityTypeIdBySlug.get(entity.type_slug) || null : null,
      aliases: entity.aliases || [],
      description: entity.description || null,
      lenses: entity.lenses || [],
    }));

    const { error } = await supabase
      .from('correspondences')
      .upsert(entityPayload, { onConflict: 'slug' });
    if (error) throw error;
  }

  const { data: concepts, error: conceptsError } = await supabase
    .from('convergence_concepts')
    .select('id, slug');
  if (conceptsError) throw conceptsError;
  const conceptIdBySlug = new Map((concepts || []).map((row) => [row.slug, row.id] as const));

  if (bundle.convergence.relationships.length > 0) {
    const relationshipPayload = bundle.convergence.relationships
      .map((relationship) => ({
        source_id: conceptIdBySlug.get(relationship.source_slug),
        target_id: conceptIdBySlug.get(relationship.target_slug),
        similarity: relationship.similarity,
        source_citation: relationship.source_citation || null,
        notes: relationship.notes || null,
      }))
      .filter((relationship) => relationship.source_id && relationship.target_id);

    if (relationshipPayload.length > 0) {
      const { error } = await supabase
        .from('convergence_relationships')
        .upsert(relationshipPayload, { onConflict: 'source_id,target_id' });
      if (error) throw error;
    }
  }

  const { data: relationshipTypes, error: relationshipTypesError } = await supabase
    .from('correspondence_relationship_types')
    .select('id, slug');
  if (relationshipTypesError) throw relationshipTypesError;
  const relationshipTypeIdBySlug = new Map((relationshipTypes || []).map((row) => [row.slug, row.id] as const));

  const { data: entities, error: entitiesError } = await supabase
    .from('correspondences')
    .select('id, slug');
  if (entitiesError) throw entitiesError;
  const entityIdBySlug = new Map((entities || []).map((row) => [row.slug, row.id] as const));

  if (bundle.correspondences.relationships.length > 0) {
    const relationshipPayload = bundle.correspondences.relationships
      .map((relationship) => ({
        source_id: entityIdBySlug.get(relationship.source_slug),
        target_id: entityIdBySlug.get(relationship.target_slug),
        type: relationship.type,
        relationship_type_id: relationship.relationship_type_slug
          ? relationshipTypeIdBySlug.get(relationship.relationship_type_slug) || null
          : null,
        weight: relationship.weight,
        confidence: relationship.confidence,
        source_citation: relationship.source_citation || null,
        notes: relationship.notes || null,
      }))
      .filter((relationship) => relationship.source_id && relationship.target_id);

    if (relationshipPayload.length > 0) {
      const { error } = await supabase
        .from('correspondence_relationships')
        .upsert(relationshipPayload, { onConflict: 'source_id,target_id,type' });
      if (error) throw error;
    }
  }
}
