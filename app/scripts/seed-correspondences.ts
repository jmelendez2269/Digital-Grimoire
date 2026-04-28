import * as path from 'path';
import * as dotenv from 'dotenv';
import { createServiceClient } from '../src/lib/supabase/service';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

type EntityTypeInput = {
  slug: string;
  label: string;
  color: string;
  icon: string;
  description: string;
  sort_order: number;
};

type RelationshipTypeInput = {
  slug: string;
  label: string;
  color: string;
  icon: string;
  description: string;
  sort_order: number;
};

type EntityInput = {
  slug: string;
  name: string;
  category: string;
  aliases?: string[];
  description?: string;
  lenses?: string[];
};

type EdgeInput = {
  sourceSlug: string;
  targetSlug: string;
  type: string;
  weight?: number;
  confidence?: 'established' | 'interpretive' | 'speculative' | 'tradition';
  source_citation?: string;
  notes?: string;
};

const ENTITY_TYPES: EntityTypeInput[] = [
  { slug: 'planet', label: 'Planet', color: '#f59e0b', icon: 'sun', description: 'Planetary bodies and intelligences used in correspondence systems.', sort_order: 10 },
  { slug: 'metal', label: 'Metal', color: '#94a3b8', icon: 'metal', description: 'Traditional metals tied to alchemy and astrology.', sort_order: 20 },
  { slug: 'sign', label: 'Zodiac Sign', color: '#22c55e', icon: 'sign', description: 'Zodiacal signs used in astrological mapping.', sort_order: 30 },
  { slug: 'color', label: 'Color', color: '#ec4899', icon: 'color', description: 'Colours associated with symbolic and ritual systems.', sort_order: 40 },
];

const RELATIONSHIP_TYPES: RelationshipTypeInput[] = [
  { slug: 'corresponds_to', label: 'Corresponds To', color: '#f59e0b', icon: 'link', description: 'A traditional symbolic correspondence between two entities.', sort_order: 10 },
  { slug: 'associated_with', label: 'Associated With', color: '#38bdf8', icon: 'assoc', description: 'A looser symbolic or interpretive association between entities.', sort_order: 20 },
];

const ENTITIES: EntityInput[] = [
  { slug: 'sun', name: 'Sun', category: 'planet', aliases: ['Sol'], lenses: ['symbolic'] },
  { slug: 'moon', name: 'Moon', category: 'planet', aliases: ['Luna'], lenses: ['symbolic'] },
  { slug: 'mars', name: 'Mars', category: 'planet', aliases: ['Ares'], lenses: ['symbolic'] },
  { slug: 'venus', name: 'Venus', category: 'planet', aliases: ['Aphrodite'] },
  { slug: 'mercury', name: 'Mercury', category: 'planet', aliases: ['Hermes'] },
  { slug: 'jupiter', name: 'Jupiter', category: 'planet', aliases: ['Zeus'] },
  { slug: 'saturn', name: 'Saturn', category: 'planet', aliases: ['Kronos'] },
  { slug: 'iron', name: 'Iron', category: 'metal' },
  { slug: 'copper', name: 'Copper', category: 'metal' },
  { slug: 'quicksilver', name: 'Mercury (Metal)', category: 'metal', aliases: ['Quicksilver'] },
  { slug: 'tin', name: 'Tin', category: 'metal' },
  { slug: 'lead', name: 'Lead', category: 'metal' },
  { slug: 'gold', name: 'Gold', category: 'metal' },
  { slug: 'silver', name: 'Silver', category: 'metal' },
  { slug: 'aries', name: 'Aries', category: 'sign' },
  { slug: 'taurus', name: 'Taurus', category: 'sign' },
  { slug: 'gemini', name: 'Gemini', category: 'sign' },
  { slug: 'cancer', name: 'Cancer', category: 'sign' },
  { slug: 'leo', name: 'Leo', category: 'sign' },
  { slug: 'virgo', name: 'Virgo', category: 'sign' },
  { slug: 'red', name: 'Red', category: 'color' },
  { slug: 'green', name: 'Green', category: 'color' },
  { slug: 'yellow', name: 'Yellow', category: 'color' },
  { slug: 'white', name: 'White', category: 'color' },
  { slug: 'black', name: 'Black', category: 'color' },
];

const EDGES: EdgeInput[] = [
  { sourceSlug: 'mars', targetSlug: 'iron', type: 'corresponds_to', weight: 0.9, confidence: 'tradition', source_citation: 'Golden Dawn' },
  { sourceSlug: 'venus', targetSlug: 'copper', type: 'corresponds_to', weight: 0.9, confidence: 'tradition', source_citation: 'Golden Dawn' },
  { sourceSlug: 'mercury', targetSlug: 'quicksilver', type: 'corresponds_to', weight: 0.9, confidence: 'tradition', source_citation: 'Golden Dawn' },
  { sourceSlug: 'jupiter', targetSlug: 'tin', type: 'corresponds_to', weight: 0.9, confidence: 'tradition', source_citation: 'Golden Dawn' },
  { sourceSlug: 'saturn', targetSlug: 'lead', type: 'corresponds_to', weight: 0.9, confidence: 'tradition', source_citation: 'Golden Dawn' },
  { sourceSlug: 'sun', targetSlug: 'gold', type: 'corresponds_to', weight: 0.95, confidence: 'tradition', source_citation: 'Golden Dawn' },
  { sourceSlug: 'moon', targetSlug: 'silver', type: 'corresponds_to', weight: 0.95, confidence: 'tradition', source_citation: 'Golden Dawn' },
  { sourceSlug: 'mars', targetSlug: 'aries', type: 'associated_with', weight: 0.8, confidence: 'tradition', source_citation: 'Classical astrology' },
  { sourceSlug: 'sun', targetSlug: 'leo', type: 'associated_with', weight: 0.85, confidence: 'tradition', source_citation: 'Classical astrology' },
  { sourceSlug: 'venus', targetSlug: 'taurus', type: 'associated_with', weight: 0.75, confidence: 'tradition', source_citation: 'Classical astrology' },
  { sourceSlug: 'mars', targetSlug: 'red', type: 'associated_with', weight: 0.7, confidence: 'tradition' },
  { sourceSlug: 'venus', targetSlug: 'green', type: 'associated_with', weight: 0.7, confidence: 'tradition' },
  { sourceSlug: 'sun', targetSlug: 'yellow', type: 'associated_with', weight: 0.7, confidence: 'tradition' },
  { sourceSlug: 'moon', targetSlug: 'white', type: 'associated_with', weight: 0.7, confidence: 'tradition' },
  { sourceSlug: 'saturn', targetSlug: 'black', type: 'associated_with', weight: 0.7, confidence: 'tradition' },
];

async function upsertEntityTypes() {
  const supabase = createServiceClient();
  console.log(`Ensuring ${ENTITY_TYPES.length} correspondence entity types...`);

  for (const entityType of ENTITY_TYPES) {
    const { data: existing, error: selectError } = await supabase
      .from('correspondence_entity_types')
      .select('id')
      .eq('slug', entityType.slug)
      .maybeSingle();
    if (selectError) throw selectError;

    if (existing) {
      const { error } = await supabase
        .from('correspondence_entity_types')
        .update(entityType)
        .eq('id', existing.id);
      if (error) throw error;
      console.log(`updated type ${entityType.slug}`);
    } else {
      const { error } = await supabase.from('correspondence_entity_types').insert(entityType);
      if (error) throw error;
      console.log(`inserted type ${entityType.slug}`);
    }
  }
}

async function upsertRelationshipTypes() {
  const supabase = createServiceClient();
  console.log(`Ensuring ${RELATIONSHIP_TYPES.length} correspondence relationship types...`);

  for (const relationshipType of RELATIONSHIP_TYPES) {
    const { data: existing, error: selectError } = await supabase
      .from('correspondence_relationship_types')
      .select('id')
      .eq('slug', relationshipType.slug)
      .maybeSingle();
    if (selectError) throw selectError;

    if (existing) {
      const { error } = await supabase
        .from('correspondence_relationship_types')
        .update(relationshipType)
        .eq('id', existing.id);
      if (error) throw error;
      console.log(`updated relationship type ${relationshipType.slug}`);
    } else {
      const { error } = await supabase.from('correspondence_relationship_types').insert(relationshipType);
      if (error) throw error;
      console.log(`inserted relationship type ${relationshipType.slug}`);
    }
  }
}

async function upsertEntities() {
  const supabase = createServiceClient();
  console.log(`Ensuring ${ENTITIES.length} correspondence entities...`);

  const { data: typeRows, error: typeError } = await supabase
    .from('correspondence_entity_types')
    .select('id, slug');
  if (typeError) throw typeError;
  const typeBySlug = new Map((typeRows || []).map((row) => [row.slug, row.id] as const));

  for (const entity of ENTITIES) {
    const type_id = typeBySlug.get(entity.category);
    const payload = {
      ...entity,
      aliases: entity.aliases || [],
      lenses: entity.lenses || [],
      type_id,
    };

    const { data: existing, error: selectError } = await supabase
      .from('correspondences')
      .select('id')
      .eq('slug', entity.slug)
      .maybeSingle();
    if (selectError) throw selectError;

    if (existing) {
      const { error } = await supabase
        .from('correspondences')
        .update(payload)
        .eq('id', existing.id);
      if (error) throw error;
      console.log(`updated entity ${entity.slug}`);
    } else {
      const { error } = await supabase.from('correspondences').insert(payload);
      if (error) throw error;
      console.log(`inserted entity ${entity.slug}`);
    }
  }
}

async function insertEdges() {
  const supabase = createServiceClient();
  console.log(`Ensuring ${EDGES.length} correspondence relationships...`);

  const { data: allEntities, error: entityError } = await supabase
    .from('correspondences')
    .select('id, slug');
  if (entityError) throw entityError;
  const entityBySlug = new Map((allEntities || []).map((entity) => [entity.slug, entity.id] as const));

  const { data: relationshipTypes, error: relationshipTypeError } = await supabase
    .from('correspondence_relationship_types')
    .select('id, slug');
  if (relationshipTypeError) throw relationshipTypeError;
  const relationshipTypeBySlug = new Map((relationshipTypes || []).map((row) => [row.slug, row.id] as const));

  for (const edge of EDGES) {
    const source_id = entityBySlug.get(edge.sourceSlug);
    const target_id = entityBySlug.get(edge.targetSlug);
    if (!source_id || !target_id) {
      console.warn(`Skipping relationship ${edge.sourceSlug} -> ${edge.targetSlug}; missing entity ids.`);
      continue;
    }

    const { error } = await supabase
      .from('correspondence_relationships')
      .upsert(
        {
          source_id,
          target_id,
          type: edge.type,
          relationship_type_id: relationshipTypeBySlug.get(edge.type),
          weight: edge.weight ?? 0.5,
          confidence: edge.confidence ?? 'tradition',
          source_citation: edge.source_citation,
          notes: edge.notes,
        },
        { onConflict: 'source_id,target_id,type' },
      );

    if (error) throw error;
    console.log(`upserted ${edge.sourceSlug} -> ${edge.targetSlug} (${edge.type})`);
  }
}

async function main() {
  console.log('Seeding correspondences...');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  await upsertEntityTypes();
  await upsertRelationshipTypes();
  await upsertEntities();
  await insertEdges();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
