import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { GraphBundle } from './graph-bundle';

type CsvRow = Record<string, string>;

type EntityTypeSeed = {
  slug: string;
  label: string;
  color: string;
  icon: string;
  description: string;
  sort_order: number;
};

type RelationshipTypeSeed = {
  slug: string;
  label: string;
  color: string;
  icon: string;
  description: string;
  sort_order: number;
};

type RelationshipFieldConfig = {
  headers: string[];
  category: string;
  relationshipType: 'corresponds_to' | 'associated_with';
  splitMode?: 'list' | 'notes';
  extractor?: (value: string) => string[];
};

const ENTITY_TYPES: EntityTypeSeed[] = [
  { slug: 'note', label: 'Musical Note', color: '#06b6d4', icon: 'note', description: 'Musical note classes used in correspondence entities.', sort_order: 50 },
  { slug: 'chakra', label: 'Chakra', color: '#8b5cf6', icon: 'chakra', description: 'Energy centers and transpersonal gateways.', sort_order: 80 },
  { slug: 'mantra', label: 'Mantra', color: '#f59e0b', icon: 'sound', description: 'Seed mantras and vibrational syllables.', sort_order: 90 },
  { slug: 'mudra', label: 'Mudra', color: '#f97316', icon: 'hands', description: 'Hand seals and energetic gestures.', sort_order: 100 },
  { slug: 'yoga_pose', label: 'Yoga Pose', color: '#22c55e', icon: 'pose', description: 'Asanas and postural practices.', sort_order: 110 },
  { slug: 'sephiroth', label: 'Sephiroth', color: '#eab308', icon: 'tree', description: 'Kabbalistic sephiroth correspondences.', sort_order: 120 },
  { slug: 'guna', label: 'Guna', color: '#06b6d4', icon: 'balance', description: 'Yogic energetic qualities.', sort_order: 130 },
  { slug: 'element', label: 'Element', color: '#38bdf8', icon: 'element', description: 'Classical elements and subtle elements.', sort_order: 140 },
  { slug: 'angel', label: 'Angel', color: '#c084fc', icon: 'angel', description: 'Archangels and angelic intelligences.', sort_order: 150 },
  { slug: 'deity', label: 'Deity', color: '#d946ef', icon: 'deity', description: 'Deities, gods, and goddesses.', sort_order: 155 },
  { slug: 'orisha', label: 'Orisha', color: '#ef4444', icon: 'orisha', description: 'Orishas and related spiritual intelligences.', sort_order: 160 },
  { slug: 'archetype', label: 'Archetype', color: '#a855f7', icon: 'mask', description: 'Archetypal patterns and roles.', sort_order: 170 },
  { slug: 'sacred_geometry', label: 'Sacred Geometry', color: '#14b8a6', icon: 'geometry', description: 'Sacred geometric forms and diagrams.', sort_order: 180 },
  { slug: 'food', label: 'Food', color: '#84cc16', icon: 'food', description: 'Foods and nutritional associations.', sort_order: 190 },
  { slug: 'astrology', label: 'Astrology', color: '#6366f1', icon: 'stars', description: 'Astrological bodies, signs, and patterns.', sort_order: 200 },
  { slug: 'stone', label: 'Gemstone/Crystal', color: '#ec4899', icon: 'crystal', description: 'Gemstones and crystal correspondences.', sort_order: 210 },
];

const RELATIONSHIP_TYPES: RelationshipTypeSeed[] = [
  { slug: 'corresponds_to', label: 'Corresponds To', color: '#f59e0b', icon: 'link', description: 'A direct symbolic or structural correspondence.', sort_order: 10 },
  { slug: 'associated_with', label: 'Associated With', color: '#38bdf8', icon: 'assoc', description: 'A looser or interpretive association.', sort_order: 20 },
];

const CHAKRA_DESCRIPTION_FIELDS = [
  'Chakra Symbol',
  'Petals',
  'Chakra Sanscript',
  'Tantric Names',
  'Veda and Upanishads Name',
  'Chakra Location',
  'Vowel Sound',
  'Interval Semitones',
  'Rights',
  'Affirmation',
  'Association',
  'Energy/Motion',
  'Characterization',
  'Personality',
  'Psychological Function',
  'Resulting in',
  'Identity',
  'Orientation to Self',
  'Demon',
  'Developmental Stage',
  'Body Parts',
  'Glands',
  'Senses',
  'System',
  'Function',
  'Physical Place',
  'Balanced Chakra',
  'Underactive Chakra',
  'Overactive Chakra',
  'Illness',
  'Physical Ailment',
  'Emotional Imbalance',
  'Aromatherapy',
  'Plant Therapy',
  'Incense',
  'Essential Oil',
  'Oil Application',
  'Nutritional Therapy',
  'Physical location',
  'Crystal Index Archive',
  'Notes',
];

const RELATIONSHIP_FIELDS: RelationshipFieldConfig[] = [
  { headers: ['Seed Mantra'], category: 'mantra', relationshipType: 'associated_with', splitMode: 'list', extractor: extractSeedMantras },
  { headers: ['Musical Note'], category: 'note', relationshipType: 'corresponds_to', splitMode: 'list', extractor: extractMusicalNotes },
  { headers: ['Mudra'], category: 'mudra', relationshipType: 'associated_with', splitMode: 'list' },
  { headers: ['Yoga Poses'], category: 'yoga_pose', relationshipType: 'associated_with', splitMode: 'list' },
  { headers: ['Sephiroth'], category: 'sephiroth', relationshipType: 'corresponds_to', splitMode: 'list' },
  { headers: ['Guna'], category: 'guna', relationshipType: 'corresponds_to', splitMode: 'list' },
  { headers: ['Color'], category: 'color', relationshipType: 'corresponds_to', splitMode: 'list' },
  { headers: ['Foods'], category: 'food', relationshipType: 'associated_with', splitMode: 'list' },
  { headers: ['Astrology'], category: 'astrology', relationshipType: 'associated_with', splitMode: 'list' },
  { headers: ['Element'], category: 'element', relationshipType: 'corresponds_to', splitMode: 'list' },
  { headers: ['Metals'], category: 'metal', relationshipType: 'corresponds_to', splitMode: 'list' },
  { headers: ['Gemstones'], category: 'stone', relationshipType: 'associated_with', splitMode: 'list' },
  { headers: ['Crystals '], category: 'stone', relationshipType: 'associated_with', splitMode: 'list' },
  { headers: ['Archetype'], category: 'archetype', relationshipType: 'associated_with', splitMode: 'list' },
  { headers: ['Deities', 'Gods/Goddess/Diety'], category: 'deity', relationshipType: 'associated_with', splitMode: 'list' },
  { headers: ['Archangel'], category: 'angel', relationshipType: 'associated_with', splitMode: 'list' },
  { headers: ['Orishas'], category: 'orisha', relationshipType: 'associated_with', splitMode: 'list' },
  { headers: ['Sacred Geometry'], category: 'sacred_geometry', relationshipType: 'corresponds_to', splitMode: 'list' },
];

function parseArgs() {
  const args = process.argv.slice(2);
  let input = '';
  let output = '';

  for (let i = 0; i < args.length; i += 1) {
    if ((args[i] === '--input' || args[i] === '-i') && args[i + 1]) {
      input = args[i + 1];
      i += 1;
      continue;
    }

    if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
      output = args[i + 1];
      i += 1;
    }
  }

  if (!input) {
    throw new Error('Missing required --input <path-to-chakra-csv>');
  }

  return { input, output };
}

function cleanText(value: string | undefined | null): string {
  return (value || '')
    .replace(/\uFEFF/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function slugify(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/["']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getFirstValue(row: CsvRow, headers: string[]): string {
  for (const header of headers) {
    const value = row[header];
    if (cleanText(value)) {
      return cleanText(value);
    }
  }
  return '';
}

function splitList(value: string): string[] {
  return cleanText(value)
    .split(/\n|;|,|\/(?=\s*[A-Z])|&/g)
    .map((item) => cleanText(item))
    .filter(Boolean)
    .filter((item) => item !== '-');
}

function parseChakraIdentity(rawName: string) {
  const cleaned = cleanText(rawName);
  const aliases = new Set<string>();

  const quotedAliases = Array.from(cleaned.matchAll(/["']([^"']+)["']/g)).map((match) => cleanText(match[1]));
  quotedAliases.forEach((alias) => aliases.add(alias));

  let canonical = cleaned
    .replace(/["'][^"']+["']/g, '')
    .split(',')[0]
    .replace(/\s+or\s+$/i, '')
    .trim();

  if (!canonical) {
    canonical = cleaned;
  }

  const commaParts = cleaned
    .split(',')
    .map((part) => cleanText(part))
    .filter(Boolean);

  for (const part of commaParts.slice(1)) {
    aliases.add(part);
  }

  const remainder = cleaned.replace(canonical, '').trim();
  if (remainder) {
    splitList(remainder).forEach((alias) => aliases.add(alias));
  }

  aliases.delete(canonical);

  return {
    name: canonical,
    aliases: Array.from(aliases).filter(Boolean),
  };
}

function extractSeedMantras(value: string): string[] {
  return splitList(value)
    .map((item) => item.replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

function extractMusicalNotes(value: string): string[] {
  const noteMatches = cleanText(value).match(/\b([A-G](?:#|b)?)\b/g) || [];
  return Array.from(new Set(noteMatches.map((item) => normalizeNoteName(item))));
}

function normalizeNoteName(note: string): string {
  const cleaned = cleanText(note);
  const replacements: Record<string, string> = {
    Db: 'C# / Db',
    Eb: 'D# / Eb',
    Gb: 'F# / Gb',
    Ab: 'G# / Ab',
    Bb: 'A# / Bb',
    'C#': 'C# / Db',
    'D#': 'D# / Eb',
    'F#': 'F# / Gb',
    'G#': 'G# / Ab',
    'A#': 'A# / Bb',
  };
  return replacements[cleaned] || cleaned;
}

function noteSlug(note: string): string {
  const normalized = normalizeNoteName(note);
  const mapping: Record<string, string> = {
    C: 'c',
    D: 'd',
    E: 'e',
    F: 'f',
    G: 'g',
    A: 'a',
    B: 'b',
    'C# / Db': 'c-sharp-d-flat',
    'D# / Eb': 'd-sharp-e-flat',
    'F# / Gb': 'f-sharp-g-flat',
    'G# / Ab': 'g-sharp-a-flat',
    'A# / Bb': 'a-sharp-b-flat',
  };
  return mapping[normalized] || slugify(normalized);
}

function buildChakraDescription(row: CsvRow): string {
  const sections = CHAKRA_DESCRIPTION_FIELDS
    .map((header) => {
      const value = cleanText(row[header]);
      return value ? `${header}: ${value}` : '';
    })
    .filter(Boolean);

  return sections.join('\n\n');
}

function buildAliases(row: CsvRow): string[] {
  const identity = parseChakraIdentity(row['Chakra Name'] || '');
  const aliases = [
    ...identity.aliases,
    ...splitList(row['Chakra Sanscript'] || ''),
    ...splitList(row['Tantric Names'] || ''),
    ...splitList(row['Veda and Upanishads Name'] || ''),
  ];

  return Array.from(new Set(aliases.filter(Boolean)));
}

function inferColor(row: CsvRow): string | null {
  const colorField = cleanText(row['Color']);
  const normalizedName = cleanText(row['Chakra Name']);
  const lower = `${normalizedName} ${colorField}`.toLowerCase();

  if (lower.includes('root')) return '#b91c1c';
  if (lower.includes('sacral')) return '#ea580c';
  if (lower.includes('solar plexus')) return '#eab308';
  if (lower.includes('heart')) return '#22c55e';
  if (lower.includes('throat')) return '#3b82f6';
  if (lower.includes('third eye')) return '#6366f1';
  if (lower.includes('crown')) return '#8b5cf6';
  if (lower.includes('earth star')) return '#52525b';
  if (lower.includes('soul star')) return '#c084fc';
  if (lower.includes('stellar')) return '#0ea5e9';
  if (lower.includes('universal')) return '#fbbf24';
  if (lower.includes('divine gateway')) return '#e5e7eb';
  return null;
}

function relationshipTargetSlug(category: string, name: string): string {
  if (category === 'note') {
    return noteSlug(name);
  }
  return slugify(name);
}

function dedupeBySlug<T extends { slug: string }>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    if (!seen.has(item.slug)) {
      seen.set(item.slug, item);
    }
  }
  return Array.from(seen.values());
}

function dedupeRelationships<T extends { source_slug: string; target_slug: string; type: string }>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    const key = `${item.source_slug}=>${item.target_slug}=>${item.type}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

function buildBundle(rows: CsvRow[], sourceLabel: string): GraphBundle {
  const entities: GraphBundle['correspondences']['entities'] = [];
  const relationships: GraphBundle['correspondences']['relationships'] = [];
  const entityTypes = [...ENTITY_TYPES];
  const relationshipTypes = [...RELATIONSHIP_TYPES];

  for (const row of rows) {
    const identity = parseChakraIdentity(row['Chakra Name'] || '');
    const chakraName = identity.name;
    if (!chakraName) {
      continue;
    }

    const chakraSlug = slugify(chakraName);
    const chakraDescription = buildChakraDescription(row);
    const chakraAliases = buildAliases(row);

    entities.push({
      slug: chakraSlug,
      name: chakraName,
      category: 'chakra',
      type_slug: 'chakra',
      aliases: chakraAliases,
      description: chakraDescription || null,
      lenses: ['symbolic', 'healing'],
    });

    for (const config of RELATIONSHIP_FIELDS) {
      const rawValue = getFirstValue(row, config.headers);
      if (!rawValue) {
        continue;
      }

      const values = config.extractor ? config.extractor(rawValue) : splitList(rawValue);
      for (const value of values) {
        const targetName = cleanText(value);
        if (!targetName) {
          continue;
        }

        const targetSlug = relationshipTargetSlug(config.category, targetName);
        if (!targetSlug || targetSlug === chakraSlug) {
          continue;
        }

        entities.push({
          slug: targetSlug,
          name: config.category === 'note' ? normalizeNoteName(targetName) : targetName,
          category: config.category,
          type_slug: config.category,
          aliases: [],
          description: null,
          lenses: ['symbolic'],
        });

        relationships.push({
          source_slug: chakraSlug,
          target_slug: targetSlug,
          type: config.relationshipType,
          relationship_type_slug: config.relationshipType,
          weight: config.relationshipType === 'corresponds_to' ? 0.82 : 0.72,
          confidence: 'tradition',
          source_citation: sourceLabel,
          notes: `${chakraName} -> ${targetName} (from ${config.headers[0]})`,
        });
      }
    }
  }

  const dedupedEntities = dedupeBySlug(entities).map((entity) => {
    if (entity.category === 'chakra') {
      return {
        ...entity,
        description: entity.description,
      };
    }

    return entity;
  });

  const bundle: GraphBundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: {
      supabaseUrl: null,
      projectRef: null,
    },
    convergence: {
      traditions: [],
      concepts: [],
      relationships: [],
    },
    correspondences: {
      entityTypes,
      relationshipTypes,
      entities: dedupedEntities,
      relationships: dedupeRelationships(relationships),
    },
  };

  return bundle;
}

async function main() {
  const { input, output } = parseArgs();
  const inputPath = path.resolve(process.cwd(), input);
  const csvText = fs.readFileSync(inputPath, 'utf8');
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true,
  }) as CsvRow[];

  const sourceLabel = path.basename(inputPath);
  const bundle = buildBundle(rows, sourceLabel);
  const outputPath = output
    ? path.resolve(process.cwd(), output)
    : path.resolve(process.cwd(), '..', 'graph-bundles', `${path.basename(inputPath, path.extname(inputPath))}-bundle.json`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

  console.log(`Built chakra graph bundle from ${inputPath}`);
  console.log(`Wrote ${outputPath}`);
  console.log(
    JSON.stringify(
      {
        rows: rows.length,
        correspondenceEntityTypes: bundle.correspondences.entityTypes.length,
        correspondenceEntities: bundle.correspondences.entities.length,
        correspondenceRelationships: bundle.correspondences.relationships.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('Chakra bundle build failed:', error);
  process.exit(1);
});
