import * as path from 'path';
import * as dotenv from 'dotenv';
import { createServiceClient } from '../src/lib/supabase/service';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

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

async function upsertEntities() {
  const supabase = createServiceClient();
  console.log(`🔎 Ensuring ${ENTITIES.length} entities...`);
  for (const e of ENTITIES) {
    const { data: existing } = await supabase
      .from('correspondences')
      .select('id, slug')
      .eq('slug', e.slug)
      .maybeSingle();
    if (existing) {
      // update minimal fields
      await supabase.from('correspondences').update({ name: e.name, category: e.category, aliases: e.aliases || [], lenses: e.lenses || [], description: e.description }).eq('id', existing.id);
      console.log(`✓ ${e.slug} (update)`);
    } else {
      const { data, error } = await supabase.from('correspondences').insert(e).select('id, slug').single();
      if (error) throw error;
      console.log(`+ ${e.slug}`);
    }
  }
}

async function insertEdges() {
  const supabase = createServiceClient();
  console.log(`🔗 Seeding ${EDGES.length} relationships...`);
  // Build slug->id map
  const { data: allEntities, error: entsErr } = await supabase.from('correspondences').select('id, slug');
  if (entsErr) throw entsErr;
  const bySlug = new Map((allEntities || []).map((e) => [e.slug, e.id] as const));

  for (const edge of EDGES) {
    const source_id = bySlug.get(edge.sourceSlug);
    const target_id = bySlug.get(edge.targetSlug);
    if (!source_id || !target_id) {
      console.warn(`! Missing ids for ${edge.sourceSlug} -> ${edge.targetSlug}, skipping`);
      continue;
    }
    const payload = {
      source_id,
      target_id,
      type: edge.type,
      weight: edge.weight ?? 0.5,
      confidence: edge.confidence ?? 'tradition',
      source_citation: edge.source_citation,
      notes: edge.notes,
    };
    const { error } = await supabase.from('correspondence_relationships').insert(payload);
    if (error && error.code !== '23505') { // unique violation if already exists
      throw error;
    }
    console.log(`→ ${edge.sourceSlug} -[${edge.type}]-> ${edge.targetSlug}`);
  }
}

async function main() {
  console.log('📚 Seeding correspondences...');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }
  await upsertEntities();
  await insertEdges();
  console.log('✅ Done.');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});


