import * as path from 'path';
import * as dotenv from 'dotenv';
import { createServiceClient } from '../src/lib/supabase/service';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

type TraditionInput = {
  slug: string;
  label: string;
  color: string;
  icon: string;
  description: string;
  sort_order: number;
};

type ConceptInput = {
  slug: string;
  name: string;
  tradition: string;
  era: string;
  short_definition: string;
  primary_sources: string[];
  tags: string[];
};

type RelationshipInput = {
  sourceSlug: string;
  targetSlug: string;
  similarity: number;
  source_citation: string;
  notes: string;
};

const TRADITIONS: TraditionInput[] = [
  {
    slug: 'buddhist',
    label: 'Buddhist',
    color: '#f59e0b',
    icon: 'dharma',
    description: 'Buddhist philosophical and contemplative traditions.',
    sort_order: 10,
  },
  {
    slug: 'quantum',
    label: 'Quantum',
    color: '#38bdf8',
    icon: 'wave',
    description: 'Modern physics concepts that dialogue with metaphysical language.',
    sort_order: 20,
  },
  {
    slug: 'christian',
    label: 'Christian',
    color: '#a855f7',
    icon: 'cross',
    description: 'Christian mystical and theological traditions.',
    sort_order: 30,
  },
  {
    slug: 'taoist',
    label: 'Taoist',
    color: '#22c55e',
    icon: 'tao',
    description: 'Classical Taoist metaphysical and contemplative thought.',
    sort_order: 40,
  },
];

const CONCEPTS: ConceptInput[] = [
  {
    slug: 'emptiness-buddhist',
    name: 'Emptiness (Sunyata)',
    tradition: 'Buddhist',
    era: 'Ancient',
    short_definition: 'The absence of inherent existence; all phenomena are empty of self-nature.',
    primary_sources: ['Heart Sutra', 'Prajnaparamita Sutras'],
    tags: ['metaphysics', 'consciousness', 'non-duality'],
  },
  {
    slug: 'zero-point-quantum',
    name: 'Quantum Zero-Point Field',
    tradition: 'Quantum',
    era: 'Modern',
    short_definition: 'The lowest possible energy state of a quantum field; a vacuum that is not truly empty but contains fluctuations.',
    primary_sources: ['Quantum Field Theory', 'Vacuum Energy'],
    tags: ['physics', 'quantum-mechanics', 'vacuum'],
  },
  {
    slug: 'void-christian',
    name: 'The Void (Apophatic Theology)',
    tradition: 'Christian',
    era: 'Medieval',
    short_definition: 'The ineffable divine reality beyond all positive attributes; God as no-thing.',
    primary_sources: ['Pseudo-Dionysius', 'Meister Eckhart'],
    tags: ['theology', 'mysticism', 'apophatic'],
  },
  {
    slug: 'wu-taoist',
    name: 'Wu (Non-Being)',
    tradition: 'Taoist',
    era: 'Ancient',
    short_definition: 'The unmanifest source; that which is before form, the void from which all things emerge.',
    primary_sources: ['Tao Te Ching', 'Zhuangzi'],
    tags: ['metaphysics', 'tao', 'non-being'],
  },
];

const RELATIONSHIPS: RelationshipInput[] = [
  {
    sourceSlug: 'emptiness-buddhist',
    targetSlug: 'zero-point-quantum',
    similarity: 0.75,
    source_citation: 'Capra, "The Tao of Physics" (1975)',
    notes: 'Both describe a fundamental void that is paradoxically full of potential.',
  },
  {
    sourceSlug: 'emptiness-buddhist',
    targetSlug: 'void-christian',
    similarity: 0.8,
    source_citation: 'Comparative mysticism studies',
    notes: 'Both point to a reality beyond conceptualization, a void that is paradoxically the source of all.',
  },
  {
    sourceSlug: 'emptiness-buddhist',
    targetSlug: 'wu-taoist',
    similarity: 0.85,
    source_citation: 'Historical Buddhist-Taoist dialogue in China',
    notes: 'Strong historical and conceptual overlap; both describe the unmanifest source.',
  },
  {
    sourceSlug: 'zero-point-quantum',
    targetSlug: 'void-christian',
    similarity: 0.7,
    source_citation: 'Polkinghorne, "Science and Theology" (1998)',
    notes: 'Modern physics and apophatic theology both point to a reality beyond positive description.',
  },
  {
    sourceSlug: 'zero-point-quantum',
    targetSlug: 'wu-taoist',
    similarity: 0.75,
    source_citation: 'Capra, "The Tao of Physics" (1975)',
    notes: 'The quantum vacuum and the Taoist void both describe the unmanifest source of manifestation.',
  },
  {
    sourceSlug: 'void-christian',
    targetSlug: 'wu-taoist',
    similarity: 0.8,
    source_citation: 'Comparative mysticism',
    notes: 'Both describe the ineffable source beyond positive attributes.',
  },
];

async function upsertTraditions() {
  const supabase = createServiceClient();
  console.log(`Ensuring ${TRADITIONS.length} convergence traditions...`);

  for (const tradition of TRADITIONS) {
    const { data: existing, error: selectError } = await supabase
      .from('convergence_traditions')
      .select('id')
      .eq('slug', tradition.slug)
      .maybeSingle();
    if (selectError) throw selectError;

    if (existing) {
      const { error } = await supabase
        .from('convergence_traditions')
        .update(tradition)
        .eq('id', existing.id);
      if (error) throw error;
      console.log(`updated tradition ${tradition.slug}`);
    } else {
      const { error } = await supabase.from('convergence_traditions').insert(tradition);
      if (error) throw error;
      console.log(`inserted tradition ${tradition.slug}`);
    }
  }
}

async function upsertConcepts() {
  const supabase = createServiceClient();
  console.log(`Ensuring ${CONCEPTS.length} convergence concepts...`);

  const { data: traditionRows, error: traditionError } = await supabase
    .from('convergence_traditions')
    .select('id, label');
  if (traditionError) throw traditionError;
  const traditionByLabel = new Map((traditionRows || []).map((row) => [row.label, row.id] as const));

  for (const concept of CONCEPTS) {
    const tradition_id = traditionByLabel.get(concept.tradition);
    const payload = { ...concept, tradition_id };

    const { data: existing, error: selectError } = await supabase
      .from('convergence_concepts')
      .select('id')
      .eq('slug', concept.slug)
      .maybeSingle();
    if (selectError) throw selectError;

    if (existing) {
      const { error } = await supabase
        .from('convergence_concepts')
        .update(payload)
        .eq('id', existing.id);
      if (error) throw error;
      console.log(`updated concept ${concept.slug}`);
    } else {
      const { error } = await supabase.from('convergence_concepts').insert(payload);
      if (error) throw error;
      console.log(`inserted concept ${concept.slug}`);
    }
  }
}

async function seedRelationships() {
  const supabase = createServiceClient();
  console.log(`Seeding ${RELATIONSHIPS.length} convergence relationships...`);

  const { data: concepts, error: conceptError } = await supabase
    .from('convergence_concepts')
    .select('id, slug');
  if (conceptError) throw conceptError;
  const conceptBySlug = new Map((concepts || []).map((row) => [row.slug, row.id] as const));

  for (const relationship of RELATIONSHIPS) {
    const source_id = conceptBySlug.get(relationship.sourceSlug);
    const target_id = conceptBySlug.get(relationship.targetSlug);
    if (!source_id || !target_id) {
      console.warn(`Skipping relationship ${relationship.sourceSlug} -> ${relationship.targetSlug}; missing concept ids.`);
      continue;
    }

    const { error } = await supabase.from('convergence_relationships').insert({
      source_id,
      target_id,
      similarity: relationship.similarity,
      source_citation: relationship.source_citation,
      notes: relationship.notes,
    });

    if (error && error.code !== '23505') throw error;
    console.log(`seeded ${relationship.sourceSlug} -> ${relationship.targetSlug}`);
  }
}

async function main() {
  console.log('Seeding convergence graph...');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  await upsertTraditions();
  await upsertConcepts();
  await seedRelationships();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
