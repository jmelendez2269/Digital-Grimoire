import * as path from 'path';
import * as dotenv from 'dotenv';
import { createServiceClient } from '../src/lib/supabase/service';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

type ConceptInput = {
  slug: string;
  name: string;
  tradition: string;
  era?: string;
  short_definition?: string;
  primary_sources?: string[];
  tags?: string[];
};

type RelationshipInput = {
  sourceSlug: string;
  targetSlug: string;
  similarity: number;
  source_citation?: string;
  notes?: string;
};

// Emptiness/Void Cluster
const CONCEPTS: ConceptInput[] = [
  {
    slug: 'sunyata',
    name: 'Śūnyatā',
    tradition: 'Buddhist',
    era: '1st c. CE',
    short_definition: 'Emptiness; the absence of inherent existence; all phenomena are empty of self-nature.',
    primary_sources: ['Heart Sutra', 'Prajnaparamita Sutras', 'Mūlamadhyamakakārikā'],
    tags: ['metaphysics', 'consciousness', 'non-duality', 'emptiness']
  },
  {
    slug: 'wu',
    name: 'Wu',
    tradition: 'Taoist',
    era: '6th c. BCE',
    short_definition: 'Non-being; the void from which all things emerge; the unmanifest source.',
    primary_sources: ['Tao Te Ching', 'Zhuangzi'],
    tags: ['metaphysics', 'non-duality', 'emptiness', 'source']
  },
  {
    slug: 'apophatic-theology',
    name: 'Apophatic Theology',
    tradition: 'Christian',
    era: '4th-5th c. CE',
    short_definition: 'Via negativa; knowing God through negation, recognizing what God is not rather than what God is.',
    primary_sources: ['Pseudo-Dionysius', 'Gregory of Nyssa', 'Meister Eckhart'],
    tags: ['theology', 'mysticism', 'non-duality', 'negation']
  },
  {
    slug: 'zero-point-field',
    name: 'Quantum Zero-Point Field',
    tradition: 'Scientific',
    era: '20th c. CE',
    short_definition: 'The lowest possible energy state of a quantum field; a vacuum that contains virtual particles and potential.',
    primary_sources: ['Quantum Field Theory', 'Vacuum Fluctuations'],
    tags: ['physics', 'quantum', 'emptiness', 'potential']
  },
  {
    slug: 'ain',
    name: 'Ain',
    tradition: 'Kabbalistic',
    era: '12th-13th c. CE',
    short_definition: 'Nothingness; the absolute void; the unmanifest before manifestation.',
    primary_sources: ['Sefer Yetzirah', 'Zohar'],
    tags: ['mysticism', 'kabbalah', 'emptiness', 'source']
  },
  
  // Unity/Oneness Cluster
  {
    slug: 'brahman',
    name: 'Brahman',
    tradition: 'Vedantic',
    era: '8th c. BCE',
    short_definition: 'The ultimate reality; the absolute, unchanging, infinite consciousness that underlies all existence.',
    primary_sources: ['Upanishads', 'Brahma Sutras', 'Advaita Vedanta'],
    tags: ['metaphysics', 'consciousness', 'unity', 'absolute']
  },
  {
    slug: 'tawhid',
    name: 'Tawhid',
    tradition: 'Islamic',
    era: '7th c. CE',
    short_definition: 'The oneness of God; the absolute unity and uniqueness of the Divine.',
    primary_sources: ['Quran', 'Ibn Arabi', 'Sufi teachings'],
    tags: ['theology', 'unity', 'divine', 'oneness']
  },
  {
    slug: 'the-one',
    name: 'The One',
    tradition: 'Neoplatonic',
    era: '3rd c. CE',
    short_definition: 'The ultimate principle; the ineffable source of all existence, beyond being and non-being.',
    primary_sources: ['Plotinus', 'Enneads'],
    tags: ['philosophy', 'metaphysics', 'unity', 'source']
  },
  {
    slug: 'unified-field-theory',
    name: 'Unified Field Theory',
    tradition: 'Scientific',
    era: '20th-21st c. CE',
    short_definition: 'A theoretical framework attempting to unify all fundamental forces and particles into a single field.',
    primary_sources: ['Einstein', 'Quantum Field Theory', 'String Theory'],
    tags: ['physics', 'unity', 'theory', 'fundamental']
  },
  {
    slug: 'great-spirit',
    name: 'Great Spirit',
    tradition: 'Indigenous',
    era: 'Ancient',
    short_definition: 'The all-pervading, unifying life force; the sacred presence in all things.',
    primary_sources: ['Native American traditions', 'Indigenous wisdom'],
    tags: ['spirituality', 'unity', 'sacred', 'life-force']
  },
  
  // Consciousness Cluster
  {
    slug: 'atman',
    name: 'Atman',
    tradition: 'Hindu',
    era: '8th c. BCE',
    short_definition: 'The true self; the eternal, unchanging essence of individual consciousness, identical with Brahman.',
    primary_sources: ['Upanishads', 'Bhagavad Gita'],
    tags: ['consciousness', 'self', 'essence', 'eternal']
  },
  {
    slug: 'buddha-nature',
    name: 'Buddha-nature',
    tradition: 'Buddhist',
    era: '3rd-4th c. CE',
    short_definition: 'The inherent potential for enlightenment; the luminous, pure nature of mind present in all beings.',
    primary_sources: ['Tathāgatagarbha Sutras', 'Mahayana Buddhism'],
    tags: ['consciousness', 'potential', 'enlightenment', 'nature']
  },
  {
    slug: 'soul',
    name: 'Soul',
    tradition: 'Christian',
    era: '1st c. CE',
    short_definition: 'The immortal essence of a person; the spiritual dimension of human existence.',
    primary_sources: ['Bible', 'Christian theology', 'Church Fathers'],
    tags: ['consciousness', 'spirit', 'immortal', 'essence']
  },
  {
    slug: 'self',
    name: 'Self',
    tradition: 'Psychological',
    era: '20th c. CE',
    short_definition: 'The integrated, conscious experience of identity; the center of personality and awareness.',
    primary_sources: ['Jung', 'Psychology', 'Self-psychology'],
    tags: ['consciousness', 'identity', 'psychology', 'awareness']
  },
  {
    slug: 'quantum-observer',
    name: 'Quantum Observer',
    tradition: 'Scientific',
    era: '20th c. CE',
    short_definition: 'The role of consciousness in collapsing quantum wave functions; the measurement problem in quantum mechanics.',
    primary_sources: ['Quantum Mechanics', 'Measurement Problem', 'Observer Effect'],
    tags: ['physics', 'consciousness', 'quantum', 'observation']
  },
  
  // Path/Way Cluster
  {
    slug: 'tao',
    name: 'Tao',
    tradition: 'Taoist',
    era: '6th c. BCE',
    short_definition: 'The Way; the natural order of the universe; the path of effortless action and harmony.',
    primary_sources: ['Tao Te Ching', 'Zhuangzi'],
    tags: ['path', 'way', 'natural-order', 'harmony']
  },
  {
    slug: 'dharma',
    name: 'Dharma',
    tradition: 'Buddhist',
    era: '5th c. BCE',
    short_definition: 'The teachings; the universal law; the path to liberation and understanding of reality.',
    primary_sources: ['Buddhist Sutras', 'Pali Canon'],
    tags: ['path', 'teaching', 'law', 'liberation']
  },
  {
    slug: 'logos',
    name: 'Logos',
    tradition: 'Christian',
    era: '1st c. CE',
    short_definition: 'The Word; the divine reason and creative principle; the path of divine revelation.',
    primary_sources: ['Gospel of John', 'Christian theology', 'Stoic philosophy'],
    tags: ['path', 'word', 'divine', 'reason']
  },
  {
    slug: 'sharia',
    name: 'Sharia',
    tradition: 'Islamic',
    era: '7th c. CE',
    short_definition: 'The path to water; Islamic law and guidance for righteous living.',
    primary_sources: ['Quran', 'Hadith', 'Islamic jurisprudence'],
    tags: ['path', 'law', 'guidance', 'righteous']
  },
  {
    slug: 'scientific-method',
    name: 'Scientific Method',
    tradition: 'Scientific',
    era: '17th c. CE',
    short_definition: 'The systematic approach to understanding nature through observation, hypothesis, and experimentation.',
    primary_sources: ['Bacon', 'Descartes', 'Modern Science'],
    tags: ['path', 'method', 'knowledge', 'systematic']
  }
];

// Relationships with similarity scores
const RELATIONSHIPS: RelationshipInput[] = [
  // Emptiness/Void Cluster connections
  { sourceSlug: 'sunyata', targetSlug: 'wu', similarity: 0.95, notes: 'Both describe the void/non-being as fundamental reality' },
  { sourceSlug: 'sunyata', targetSlug: 'apophatic-theology', similarity: 0.88, notes: 'Both use negation to approach ultimate reality' },
  { sourceSlug: 'sunyata', targetSlug: 'zero-point-field', similarity: 0.82, notes: 'Both describe emptiness containing potential' },
  { sourceSlug: 'sunyata', targetSlug: 'ain', similarity: 0.90, notes: 'Both describe absolute void/nothingness' },
  { sourceSlug: 'wu', targetSlug: 'apophatic-theology', similarity: 0.85, notes: 'Both approach the unmanifest through negation' },
  { sourceSlug: 'wu', targetSlug: 'zero-point-field', similarity: 0.80, notes: 'Both describe void as source of manifestation' },
  { sourceSlug: 'wu', targetSlug: 'ain', similarity: 0.92, notes: 'Both describe the absolute void before creation' },
  { sourceSlug: 'apophatic-theology', targetSlug: 'ain', similarity: 0.87, notes: 'Both use negation to approach the ineffable' },
  { sourceSlug: 'zero-point-field', targetSlug: 'ain', similarity: 0.75, notes: 'Both describe void containing potential' },
  
  // Unity/Oneness Cluster connections
  { sourceSlug: 'brahman', targetSlug: 'tawhid', similarity: 0.93, notes: 'Both describe absolute unity of the Divine' },
  { sourceSlug: 'brahman', targetSlug: 'the-one', similarity: 0.91, notes: 'Both describe ultimate, ineffable reality' },
  { sourceSlug: 'brahman', targetSlug: 'unified-field-theory', similarity: 0.78, notes: 'Both seek to unify all existence' },
  { sourceSlug: 'brahman', targetSlug: 'great-spirit', similarity: 0.85, notes: 'Both describe all-pervading unity' },
  { sourceSlug: 'tawhid', targetSlug: 'the-one', similarity: 0.89, notes: 'Both describe absolute oneness' },
  { sourceSlug: 'tawhid', targetSlug: 'great-spirit', similarity: 0.82, notes: 'Both describe unifying divine presence' },
  { sourceSlug: 'the-one', targetSlug: 'unified-field-theory', similarity: 0.76, notes: 'Both describe ultimate unifying principle' },
  { sourceSlug: 'unified-field-theory', targetSlug: 'great-spirit', similarity: 0.70, notes: 'Both describe underlying unity' },
  
  // Consciousness Cluster connections
  { sourceSlug: 'atman', targetSlug: 'buddha-nature', similarity: 0.88, notes: 'Both describe inherent pure nature of consciousness' },
  { sourceSlug: 'atman', targetSlug: 'soul', similarity: 0.85, notes: 'Both describe eternal essence of being' },
  { sourceSlug: 'atman', targetSlug: 'self', similarity: 0.80, notes: 'Both describe core identity and awareness' },
  { sourceSlug: 'buddha-nature', targetSlug: 'soul', similarity: 0.82, notes: 'Both describe inherent spiritual essence' },
  { sourceSlug: 'buddha-nature', targetSlug: 'quantum-observer', similarity: 0.75, notes: 'Both involve consciousness as fundamental' },
  { sourceSlug: 'soul', targetSlug: 'self', similarity: 0.83, notes: 'Both describe core identity' },
  { sourceSlug: 'self', targetSlug: 'quantum-observer', similarity: 0.72, notes: 'Both involve conscious awareness' },
  
  // Path/Way Cluster connections
  { sourceSlug: 'tao', targetSlug: 'dharma', similarity: 0.90, notes: 'Both describe the path to understanding reality' },
  { sourceSlug: 'tao', targetSlug: 'logos', similarity: 0.85, notes: 'Both describe the way/word as creative principle' },
  { sourceSlug: 'tao', targetSlug: 'sharia', similarity: 0.78, notes: 'Both describe the path to right living' },
  { sourceSlug: 'tao', targetSlug: 'scientific-method', similarity: 0.70, notes: 'Both describe systematic approach to truth' },
  { sourceSlug: 'dharma', targetSlug: 'logos', similarity: 0.87, notes: 'Both describe the teaching/word as path' },
  { sourceSlug: 'dharma', targetSlug: 'sharia', similarity: 0.80, notes: 'Both describe the path of righteousness' },
  { sourceSlug: 'logos', targetSlug: 'sharia', similarity: 0.82, notes: 'Both describe divine guidance' },
  { sourceSlug: 'scientific-method', targetSlug: 'dharma', similarity: 0.72, notes: 'Both describe systematic path to knowledge' },
  
  // Cross-cluster connections
  { sourceSlug: 'brahman', targetSlug: 'atman', similarity: 0.95, notes: 'Atman is Brahman - the self is the absolute' },
  { sourceSlug: 'sunyata', targetSlug: 'buddha-nature', similarity: 0.88, notes: 'Emptiness and Buddha-nature are two aspects of the same reality' },
  { sourceSlug: 'the-one', targetSlug: 'apophatic-theology', similarity: 0.90, notes: 'Both approach the ineffable through negation' },
  { sourceSlug: 'tao', targetSlug: 'wu', similarity: 0.92, notes: 'Tao emerges from Wu - the Way from the Void' }
];

async function upsertConcepts() {
  const supabase = createServiceClient();
  console.log(`🔎 Ensuring ${CONCEPTS.length} concepts...`);
  
  for (const concept of CONCEPTS) {
    const { data: existing } = await supabase
      .from('convergence_concepts')
      .select('id, slug')
      .eq('slug', concept.slug)
      .maybeSingle();
    
    if (existing) {
      // Update existing concept
      const { error } = await supabase
        .from('convergence_concepts')
        .update({
          name: concept.name,
          tradition: concept.tradition,
          era: concept.era,
          short_definition: concept.short_definition,
          primary_sources: concept.primary_sources || [],
          tags: concept.tags || []
        })
        .eq('id', existing.id);
      
      if (error) {
        console.error(`❌ Error updating ${concept.slug}:`, error);
        throw error;
      }
      console.log(`✓ ${concept.slug} (updated)`);
    } else {
      // Insert new concept
      const { data, error } = await supabase
        .from('convergence_concepts')
        .insert(concept)
        .select('id, slug')
        .single();
      
      if (error) {
        console.error(`❌ Error inserting ${concept.slug}:`, error);
        throw error;
      }
      console.log(`+ ${concept.slug}`);
    }
  }
}

async function insertRelationships() {
  const supabase = createServiceClient();
  console.log(`\n🔗 Seeding ${RELATIONSHIPS.length} relationships...`);
  
  // Build slug->id map
  const { data: allConcepts, error: conceptsError } = await supabase
    .from('convergence_concepts')
    .select('id, slug');
  
  if (conceptsError) throw conceptsError;
  
  const bySlug = new Map((allConcepts || []).map((c) => [c.slug, c.id] as const));
  
  let inserted = 0;
  let skipped = 0;
  
  for (const rel of RELATIONSHIPS) {
    const source_id = bySlug.get(rel.sourceSlug);
    const target_id = bySlug.get(rel.targetSlug);
    
    if (!source_id || !target_id) {
      console.warn(`⚠️  Missing IDs for ${rel.sourceSlug} -> ${rel.targetSlug}, skipping`);
      skipped++;
      continue;
    }
    
    const payload = {
      source_id,
      target_id,
      similarity: rel.similarity,
      source_citation: rel.source_citation,
      notes: rel.notes
    };
    
    const { error } = await supabase
      .from('convergence_relationships')
      .insert(payload);
    
    if (error) {
      if (error.code === '23505') {
        // Unique violation - relationship already exists
        console.log(`→ ${rel.sourceSlug} -[${rel.similarity}]-> ${rel.targetSlug} (already exists)`);
        skipped++;
      } else {
        console.error(`❌ Error inserting relationship ${rel.sourceSlug} -> ${rel.targetSlug}:`, error);
        throw error;
      }
    } else {
      console.log(`→ ${rel.sourceSlug} -[${rel.similarity}]-> ${rel.targetSlug}`);
      inserted++;
    }
  }
  
  console.log(`\n✅ Inserted ${inserted} relationships, skipped ${skipped} (already exist)`);
}

async function main() {
  console.log('🌐 Seeding Convergence Concepts...\n');
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }
  
  try {
    await upsertConcepts();
    await insertRelationships();
    console.log('\n✅ Convergence seed completed successfully!');
  } catch (err: any) {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  }
}

main();
