import type { SupabaseClient } from '@supabase/supabase-js';

type GraphBundleClaimSource = {
  title: string;
  author?: string | null;
  year?: string | null;
  citation?: string | null;
  url?: string | null;
  notes?: string | null;
};

type GraphBundleCorrespondenceClaim = {
  entity_slug: string;
  field_key: string;
  field_value?: string | null;
  field_value_json?: unknown | null;
  confidence?: string | null;
  notes?: string | null;
  source?: GraphBundleClaimSource | null;
};

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
    claims?: GraphBundleCorrespondenceClaim[];
  };
};

type SectionDiffSummary = {
  incoming: number;
  existing: number;
  new: number;
  updates: number;
  unchanged: number;
  duplicatesInBundle: number;
};

export type GraphBundleDiff = {
  convergence: {
    traditions: SectionDiffSummary;
    concepts: SectionDiffSummary;
    relationships: SectionDiffSummary;
  };
  correspondences: {
    entityTypes: SectionDiffSummary;
    relationshipTypes: SectionDiffSummary;
    entities: SectionDiffSummary;
    relationships: SectionDiffSummary;
    claims: SectionDiffSummary;
  };
};

function getProjectRef(url: string | undefined) {
  return url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || null;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function summarizeDiff<T>({
  incoming,
  existing,
  keyOf,
  comparableOf,
}: {
  incoming: T[];
  existing: T[];
  keyOf: (item: T) => string;
  comparableOf: (item: T) => unknown;
}): SectionDiffSummary {
  const duplicateKeys = new Set<string>();
  const seenIncomingKeys = new Set<string>();

  for (const item of incoming) {
    const key = keyOf(item);
    if (seenIncomingKeys.has(key)) {
      duplicateKeys.add(key);
    }
    seenIncomingKeys.add(key);
  }

  const existingByKey = new Map(existing.map((item) => [keyOf(item), stableStringify(comparableOf(item))] as const));

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const item of incoming) {
    const key = keyOf(item);
    const existingValue = existingByKey.get(key);
    if (!existingValue) {
      created += 1;
      continue;
    }

    if (existingValue === stableStringify(comparableOf(item))) {
      unchanged += 1;
    } else {
      updated += 1;
    }
  }

  return {
    incoming: incoming.length,
    existing: existing.length,
    new: created,
    updates: updated,
    unchanged,
    duplicatesInBundle: duplicateKeys.size,
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function ensureKnowledgeSource(
  supabase: SupabaseClient,
  source: GraphBundleClaimSource,
) {
  let query = supabase.from('knowledge_sources').select('id');

  query = source.title ? query.eq('title', source.title) : query.is('title', null);
  query = source.author ? query.eq('author', source.author) : query.is('author', null);
  query = source.year ? query.eq('year', source.year) : query.is('year', null);
  query = source.citation ? query.eq('citation', source.citation) : query.is('citation', null);
  query = source.url ? query.eq('url', source.url) : query.is('url', null);
  query = source.notes ? query.eq('notes', source.notes) : query.is('notes', null);

  const { data: existingRows, error: existingError } = await query.limit(1);
  if (existingError) throw existingError;

  const existingId = existingRows?.[0]?.id;
  if (existingId) {
    return existingId as string;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('knowledge_sources')
    .insert({
      title: source.title,
      author: source.author || null,
      year: source.year || null,
      citation: source.citation || null,
      url: source.url || null,
      notes: source.notes || null,
    })
    .select('id')
    .single();
  if (insertError) throw insertError;

  return inserted.id as string;
}

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000,
) {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw error;

    const page = data || [];
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

export async function exportGraphBundle(supabase: SupabaseClient, supabaseUrl?: string): Promise<GraphBundle> {
  const [
    traditions,
    concepts,
    conceptRelationships,
    entityTypes,
    relationshipTypes,
    entities,
    correspondenceRelationships,
    correspondenceClaims,
  ] = await Promise.all([
    fetchAllPages((from, to) =>
      supabase
        .from('convergence_traditions')
        .select('slug, label, color, icon, description, sort_order, is_active')
        .order('sort_order', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      supabase
        .from('convergence_concepts')
        .select('slug, name, tradition, era, short_definition, primary_sources, tags')
        .order('slug', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      supabase
        .from('convergence_relationships')
        .select('similarity, source_citation, notes, source:convergence_concepts!convergence_relationships_source_id_fkey(slug), target:convergence_concepts!convergence_relationships_target_id_fkey(slug)')
        .order('source_id', { ascending: true })
        .order('target_id', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      supabase
        .from('correspondence_entity_types')
        .select('slug, label, color, icon, description, sort_order, is_active')
        .order('sort_order', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      supabase
        .from('correspondence_relationship_types')
        .select('slug, label, color, icon, description, sort_order, is_active')
        .order('sort_order', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      supabase
        .from('correspondences')
        .select('id, slug, name, category, aliases, description, lenses, type:correspondence_entity_types(slug)')
        .order('slug', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      supabase
        .from('correspondence_relationships')
        .select('type, weight, confidence, source_citation, notes, source:correspondences!correspondence_relationships_source_id_fkey(slug), target:correspondences!correspondence_relationships_target_id_fkey(slug), relationship_type:correspondence_relationship_types(slug)')
        .order('source_id', { ascending: true })
        .order('target_id', { ascending: true })
        .order('type', { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      supabase
        .from('knowledge_claims')
        .select('entity_id, field_key, field_value, field_value_json, confidence, notes, source:knowledge_sources(title, author, year, citation, url, notes)')
        .eq('entity_type', 'correspondence')
        .order('entity_id', { ascending: true })
        .order('field_key', { ascending: true })
        .range(from, to),
    ),
  ]);
  const entitySlugById = new Map((entities || []).map((row: any) => [row.id, row.slug] as const));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: {
      supabaseUrl: supabaseUrl || null,
      projectRef: getProjectRef(supabaseUrl),
    },
    convergence: {
      traditions: traditions.map((row: any) => ({
        slug: row.slug,
        label: row.label,
        color: row.color,
        icon: row.icon,
        description: row.description,
        sort_order: row.sort_order,
        is_active: row.is_active,
      })),
      concepts: concepts.map((row: any) => ({
        slug: row.slug,
        name: row.name,
        tradition: row.tradition,
        tradition_slug:
          ((traditions.find((tradition: any) => tradition.label === row.tradition) as any)?.slug) || null,
        era: row.era,
        short_definition: row.short_definition,
        primary_sources: row.primary_sources || [],
        tags: row.tags || [],
      })),
      relationships: conceptRelationships.map((row: any) => ({
        source_slug: row.source?.slug,
        target_slug: row.target?.slug,
        similarity: Number(row.similarity),
        source_citation: row.source_citation,
        notes: row.notes,
      })).filter((row) => row.source_slug && row.target_slug),
    },
    correspondences: {
      entityTypes: entityTypes.map((row: any) => ({
        slug: row.slug,
        label: row.label,
        color: row.color,
        icon: row.icon,
        description: row.description,
        sort_order: row.sort_order,
        is_active: row.is_active,
      })),
      relationshipTypes: relationshipTypes.map((row: any) => ({
        slug: row.slug,
        label: row.label,
        color: row.color,
        icon: row.icon,
        description: row.description,
        sort_order: row.sort_order,
        is_active: row.is_active,
      })),
      entities: entities.map((row: any) => ({
        slug: row.slug,
        name: row.name,
        category: row.category,
        type_slug: row.type?.slug || null,
        aliases: row.aliases || [],
        description: row.description,
        lenses: row.lenses || [],
      })),
      relationships: correspondenceRelationships.map((row: any) => ({
        source_slug: row.source?.slug,
        target_slug: row.target?.slug,
        type: row.type,
        relationship_type_slug: row.relationship_type?.slug || null,
        weight: Number(row.weight),
        confidence: row.confidence,
        source_citation: row.source_citation,
        notes: row.notes,
      })).filter((row) => row.source_slug && row.target_slug),
      claims: correspondenceClaims
        .map((row: any) => ({
          entity_slug: entitySlugById.get(row.entity_id),
          field_key: row.field_key,
          field_value: row.field_value,
          field_value_json: row.field_value_json,
          confidence: row.confidence,
          notes: row.notes,
          source: row.source
            ? {
                title: row.source.title,
                author: row.source.author,
                year: row.source.year,
                citation: row.source.citation,
                url: row.source.url,
                notes: row.source.notes,
              }
            : null,
        }))
        .filter((row) => row.entity_slug),
    },
  };
}

export function diffGraphBundles(incoming: GraphBundle, existing: GraphBundle): GraphBundleDiff {
  return {
    convergence: {
      traditions: summarizeDiff({
        incoming: incoming.convergence.traditions,
        existing: existing.convergence.traditions,
        keyOf: (item) => item.slug,
        comparableOf: (item) => item,
      }),
      concepts: summarizeDiff({
        incoming: incoming.convergence.concepts,
        existing: existing.convergence.concepts,
        keyOf: (item) => item.slug,
        comparableOf: (item) => item,
      }),
      relationships: summarizeDiff({
        incoming: incoming.convergence.relationships,
        existing: existing.convergence.relationships,
        keyOf: (item) => `${item.source_slug}=>${item.target_slug}`,
        comparableOf: (item) => item,
      }),
    },
    correspondences: {
      entityTypes: summarizeDiff({
        incoming: incoming.correspondences.entityTypes,
        existing: existing.correspondences.entityTypes,
        keyOf: (item) => item.slug,
        comparableOf: (item) => item,
      }),
      relationshipTypes: summarizeDiff({
        incoming: incoming.correspondences.relationshipTypes,
        existing: existing.correspondences.relationshipTypes,
        keyOf: (item) => item.slug,
        comparableOf: (item) => item,
      }),
      entities: summarizeDiff({
        incoming: incoming.correspondences.entities,
        existing: existing.correspondences.entities,
        keyOf: (item) => item.slug,
        comparableOf: (item) => item,
      }),
      relationships: summarizeDiff({
        incoming: incoming.correspondences.relationships,
        existing: existing.correspondences.relationships,
        keyOf: (item) => `${item.source_slug}=>${item.target_slug}=>${item.type}`,
        comparableOf: (item) => item,
      }),
      claims: summarizeDiff({
        incoming: incoming.correspondences.claims || [],
        existing: existing.correspondences.claims || [],
        keyOf: (item) => `${item.entity_slug}=>${item.field_key}=>${item.source?.citation || item.source?.title || ''}`,
        comparableOf: (item) => item,
      }),
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

  const entities = await fetchAllPages((from, to) =>
    supabase
      .from('correspondences')
      .select('id, slug')
      .order('slug', { ascending: true })
      .range(from, to),
  );
  const entityIdBySlug = new Map(entities.map((row: any) => [row.slug, row.id] as const));

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

  const correspondenceClaims = bundle.correspondences.claims || [];
  if (correspondenceClaims.length > 0) {
    const sourceIdByFingerprint = new Map<string, string>();
    const claimsWithResolvedSource = [];

    for (const claim of correspondenceClaims) {
      let sourceId: string | null = null;
      if (claim.source?.title) {
        const fingerprint = stableStringify(claim.source);
        const cachedSourceId = sourceIdByFingerprint.get(fingerprint);
        sourceId = cachedSourceId || await ensureKnowledgeSource(supabase, claim.source);
        if (!cachedSourceId) {
          sourceIdByFingerprint.set(fingerprint, sourceId);
        }
      }

      claimsWithResolvedSource.push({
        entity_type: 'correspondence',
        entity_id: entityIdBySlug.get(claim.entity_slug),
        source_id: sourceId,
        field_key: claim.field_key,
        field_value: claim.field_value || null,
        field_value_json: claim.field_value_json ?? null,
        confidence: claim.confidence || null,
        notes: claim.notes || null,
      });
    }

    const validClaims = claimsWithResolvedSource.filter((claim) => claim.entity_id);
    const claimsBySourceKey = new Map<string, typeof validClaims>();

    for (const claim of validClaims) {
      const sourceKey = claim.source_id || '__NULL_SOURCE__';
      const group = claimsBySourceKey.get(sourceKey) || [];
      group.push(claim);
      claimsBySourceKey.set(sourceKey, group);
    }

    for (const [sourceKey, claims] of claimsBySourceKey.entries()) {
      const entityIds = Array.from(new Set(claims.map((claim) => claim.entity_id as string)));

      for (const entityIdChunk of chunkArray(entityIds, 250)) {
        let deleteQuery = supabase
          .from('knowledge_claims')
          .delete()
          .eq('entity_type', 'correspondence')
          .in('entity_id', entityIdChunk);

        if (sourceKey === '__NULL_SOURCE__') {
          deleteQuery = deleteQuery.is('source_id', null);
        } else {
          deleteQuery = deleteQuery.eq('source_id', sourceKey);
        }

        const { error: deleteError } = await deleteQuery;
        if (deleteError) throw deleteError;
      }

      for (const claimChunk of chunkArray(claims, 500)) {
        const { error: insertError } = await supabase
          .from('knowledge_claims')
          .insert(claimChunk);
        if (insertError) throw insertError;
      }
    }
  }
}
