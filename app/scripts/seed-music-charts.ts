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

type EntityInput = {
  slug: string;
  name: string;
  category: string;
  aliases?: string[];
  description?: string;
  lenses?: string[];
};

type RelationshipInput = {
  sourceSlug: string;
  targetSlug: string;
  type: string;
  weight: number;
  confidence: 'established' | 'interpretive' | 'speculative' | 'tradition';
  source_citation: string;
  notes: string;
};

type ColorOfSoundRow = {
  note: string;
  sound: string;
  light: string;
  rgb: string;
};

type MusicalChartRow = {
  pair: string;
  sourceSlug: string;
  hebrewLetters: string;
};

type HebrewLetterDefinition = {
  slug: string;
  name: string;
  aliases?: string[];
};

const EXTRA_ENTITY_TYPES: EntityTypeInput[] = [
  {
    slug: 'note',
    label: 'Musical Note',
    color: '#06b6d4',
    icon: 'note',
    description: 'Musical note classes used as correspondence entities.',
    sort_order: 50,
  },
  {
    slug: 'cosmic_principle',
    label: 'Cosmic Principle',
    color: '#6366f1',
    icon: 'cosmos',
    description: 'Non-planetary celestial or cosmological principles used in charts.',
    sort_order: 60,
  },
  {
    slug: 'hebrew_letter',
    label: 'Hebrew Letter',
    color: '#8b5cf6',
    icon: 'letter',
    description: 'Letter entities used in symbolic correspondences from the musical notes chart.',
    sort_order: 70,
  },
];

const COLOR_OF_SOUND_ROWS: ColorOfSoundRow[] = [
  {
    note: 'F',
    sound: 'Frequency (Hz): 349.2; Wavelength (cm): 98.88',
    light: 'Frequency (Hz): 384.0; Wavelength (cm): 780.8',
    rgb: 'Red 82/52; Green 0/00; Blue 0/00',
  },
  {
    note: 'F# / Gb',
    sound: 'Frequency (Hz): 370.0; Wavelength (cm): 93.33',
    light: 'Frequency (Hz): 406.8; Wavelength (cm): 736.9',
    rgb: 'Red 116/74; Green 0/00; Blue 0/00',
  },
  {
    note: 'G',
    sound: 'Frequency (Hz): 392.0; Wavelength (cm): 88.09',
    light: 'Frequency (Hz): 431.0; Wavelength (cm): 695.6',
    rgb: 'Red 179/b3; Green 0/00; Blue 0/00',
  },
  {
    note: 'G# / Ab',
    sound: 'Frequency (Hz): 415.3; Wavelength (cm): 83.15',
    light: 'Frequency (Hz): 456.6; Wavelength (cm): 656.5',
    rgb: 'Red 238/ee; Green 0/00; Blue 0/00',
  },
  {
    note: 'A',
    sound: 'Frequency (Hz): 440.0; Wavelength (cm): 78.48',
    light: 'Frequency (Hz): 483.8; Wavelength (cm): 619.7',
    rgb: 'Red 255/ff; Green 99/63; Blue 0/00',
  },
  {
    note: 'A# / Bb',
    sound: 'Frequency (Hz): 466.2; Wavelength (cm): 74.07',
    light: 'Frequency (Hz): 512.5; Wavelength (cm): 584.9',
    rgb: 'Red 255/ff; Green 236/ec; Blue 0/00',
  },
  {
    note: 'B',
    sound: 'Frequency (Hz): 493.9; Wavelength (cm): 69.92',
    light: 'Frequency (Hz): 543.0; Wavelength (cm): 552.1',
    rgb: 'Red 153/99; Green 255/ff; Blue 0/00',
  },
  {
    note: 'C',
    sound: 'Frequency (Hz): 523.2; Wavelength (cm): 65.99',
    light: 'Frequency (Hz): 575.3; Wavelength (cm): 521.1',
    rgb: 'Red 40/28; Green 255/ff; Blue 0/00',
  },
  {
    note: 'C# / Db',
    sound: 'Frequency (Hz): 554.4; Wavelength (cm): 62.29',
    light: 'Frequency (Hz): 609.5; Wavelength (cm): 491.8',
    rgb: 'Red 0/00; Green 255/ff; Blue 232/e8',
  },
  {
    note: 'D',
    sound: 'Frequency (Hz): 587.3; Wavelength (cm): 58.79',
    light: 'Frequency (Hz): 645.8; Wavelength (cm): 464.2',
    rgb: 'Red 0/00; Green 124/7c; Blue 255/ff',
  },
  {
    note: 'D# / Eb',
    sound: 'Frequency (Hz): 622.2; Wavelength (cm): 55.49',
    light: 'Frequency (Hz): 684.2; Wavelength (cm): 438.2',
    rgb: 'Red 05/05; Green 0/00; Blue 255/ff',
  },
  {
    note: 'E',
    sound: 'Frequency (Hz): 659.3; Wavelength (cm): 52.38',
    light: 'Frequency (Hz): 724.9; Wavelength (cm): 413.6',
    rgb: 'Red 69/45; Green 0/00; Blue 234/ea',
  },
];

const MUSICAL_CHART_ROWS: MusicalChartRow[] = [
  { pair: 'C/C', sourceSlug: 'stars-earth', hebrewLetters: 'Theta, Xi, Phi, Chi, Psi' },
  { pair: 'B/Db', sourceSlug: 'saturn', hebrewLetters: 'A, Rho, Sigma, Omega' },
  { pair: 'A#/D', sourceSlug: 'jupiter', hebrewLetters: 'Pi, Tau, Upsilon' },
  { pair: 'A/Eb', sourceSlug: 'mars', hebrewLetters: 'B, Nu, Omicron' },
  { pair: 'G/F', sourceSlug: 'sun', hebrewLetters: 'Iota, Kappa' },
  { pair: 'E/Ab', sourceSlug: 'venus', hebrewLetters: 'Gamma, Mu' },
  { pair: 'D#/A', sourceSlug: 'mercury', hebrewLetters: 'Delta, Epsilon, Lambda' },
  { pair: 'D/Bb', sourceSlug: 'moon', hebrewLetters: 'Zeta' },
];

const NOTE_DEFINITIONS = [
  { slug: 'c', name: 'C', aliases: ['C4', 'C5'] },
  { slug: 'b', name: 'B', aliases: ['B4'] },
  { slug: 'a', name: 'A', aliases: ['A4'] },
  { slug: 'g', name: 'G', aliases: ['G4'] },
  { slug: 'f', name: 'F', aliases: ['F4', 'F5'] },
  { slug: 'e', name: 'E', aliases: ['E5'] },
  { slug: 'd', name: 'D', aliases: ['D5'] },
  { slug: 'c-sharp-d-flat', name: 'C# / Db', aliases: ['C#', 'Db', 'C sharp', 'D flat'] },
  { slug: 'd-sharp-e-flat', name: 'D# / Eb', aliases: ['D#', 'Eb', 'D sharp', 'E flat'] },
  { slug: 'g-sharp-a-flat', name: 'G# / Ab', aliases: ['G#', 'Ab', 'G sharp', 'A flat'] },
  { slug: 'a-sharp-b-flat', name: 'A# / Bb', aliases: ['A#', 'Bb', 'A sharp', 'B flat'] },
  { slug: 'f-sharp-g-flat', name: 'F# / Gb', aliases: ['F#', 'Gb', 'F sharp', 'G flat'] },
];

const NOTE_SLUG_BY_TOKEN: Record<string, string> = {
  C: 'c',
  B: 'b',
  A: 'a',
  G: 'g',
  F: 'f',
  E: 'e',
  D: 'd',
  'Db': 'c-sharp-d-flat',
  'C#': 'c-sharp-d-flat',
  'Eb': 'd-sharp-e-flat',
  'D#': 'd-sharp-e-flat',
  'Ab': 'g-sharp-a-flat',
  'G#': 'g-sharp-a-flat',
  'Bb': 'a-sharp-b-flat',
  'A#': 'a-sharp-b-flat',
  'Gb': 'f-sharp-g-flat',
  'F#': 'f-sharp-g-flat',
};

const HEBREW_LETTER_DEFINITIONS: HebrewLetterDefinition[] = [
  { slug: 'aleph', name: 'Aleph', aliases: ['A'] },
  { slug: 'beth', name: 'Beth', aliases: ['B'] },
  { slug: 'gamma', name: 'Gamma' },
  { slug: 'delta', name: 'Delta' },
  { slug: 'epsilon', name: 'Epsilon' },
  { slug: 'zeta', name: 'Zeta' },
  { slug: 'theta', name: 'Theta' },
  { slug: 'iota', name: 'Iota' },
  { slug: 'kappa', name: 'Kappa' },
  { slug: 'lambda', name: 'Lambda' },
  { slug: 'mu', name: 'Mu' },
  { slug: 'nu', name: 'Nu' },
  { slug: 'xi', name: 'Xi' },
  { slug: 'omicron', name: 'Omicron' },
  { slug: 'pi', name: 'Pi' },
  { slug: 'rho', name: 'Rho' },
  { slug: 'sigma', name: 'Sigma' },
  { slug: 'tau', name: 'Tau' },
  { slug: 'upsilon', name: 'Upsilon' },
  { slug: 'phi', name: 'Phi' },
  { slug: 'chi', name: 'Chi' },
  { slug: 'psi', name: 'Psi' },
  { slug: 'omega', name: 'Omega' },
];

const HEBREW_LETTER_SLUG_BY_TOKEN: Record<string, string> = {
  A: 'aleph',
  B: 'beth',
  Gamma: 'gamma',
  Delta: 'delta',
  Epsilon: 'epsilon',
  Zeta: 'zeta',
  Theta: 'theta',
  Iota: 'iota',
  Kappa: 'kappa',
  Lambda: 'lambda',
  Mu: 'mu',
  Nu: 'nu',
  Xi: 'xi',
  Omicron: 'omicron',
  Pi: 'pi',
  Rho: 'rho',
  Sigma: 'sigma',
  Tau: 'tau',
  Upsilon: 'upsilon',
  Phi: 'phi',
  Chi: 'chi',
  Psi: 'psi',
  Omega: 'omega',
};

function buildNoteDescription(row: ColorOfSoundRow) {
  return [
    'Source: The Color of Sound chart.',
    `Sound: ${row.sound}.`,
    `Light: ${row.light}.`,
    `RGB: ${row.rgb}.`,
  ].join('\n');
}

async function upsertEntityTypes() {
  const supabase = createServiceClient();
  for (const entityType of EXTRA_ENTITY_TYPES) {
    const { error } = await supabase
      .from('correspondence_entity_types')
      .upsert(entityType, { onConflict: 'slug' });
    if (error) throw error;
  }
}

async function upsertEntities() {
  const supabase = createServiceClient();
  const { data: typeRows, error: typeError } = await supabase
    .from('correspondence_entity_types')
    .select('id, slug');
  if (typeError) throw typeError;
  const typeBySlug = new Map((typeRows || []).map((row) => [row.slug, row.id] as const));

  const noteDescriptionBySlug = new Map(
    COLOR_OF_SOUND_ROWS.map((row) => {
      const note = NOTE_DEFINITIONS.find((entry) => entry.name === row.note);
      if (!note) throw new Error(`Missing note definition for color row ${row.note}`);
      return [note.slug, buildNoteDescription(row)] as const;
    }),
  );

  const noteEntities: EntityInput[] = NOTE_DEFINITIONS.map((note) => ({
    slug: note.slug,
    name: note.name,
    category: 'note',
    aliases: note.aliases,
    description: noteDescriptionBySlug.get(note.slug) || 'Source: The Color of Sound chart.',
    lenses: ['symbolic', 'scientific'],
  }));

  const specialEntities: EntityInput[] = [
    {
      slug: 'stars-earth',
      name: 'Stars & Earth',
      category: 'cosmic_principle',
      aliases: ['Stars and Earth'],
      description: 'Cosmic principle from the Musical Notes chart used in place of a planetary correspondence for the C/C row.',
      lenses: ['symbolic'],
    },
  ];

  const hebrewLetterEntities: EntityInput[] = HEBREW_LETTER_DEFINITIONS.map((letter) => ({
    slug: letter.slug,
    name: letter.name,
    category: 'hebrew_letter',
    aliases: letter.aliases || [],
    description: 'Hebrew-letter correspondence entity sourced from the Musical Notes chart.',
    lenses: ['symbolic'],
  }));

  for (const entity of [...noteEntities, ...specialEntities, ...hebrewLetterEntities]) {
    const { error } = await supabase
      .from('correspondences')
      .upsert(
        {
          ...entity,
          aliases: entity.aliases || [],
          lenses: entity.lenses || [],
          type_id: typeBySlug.get(entity.category) || null,
        },
        { onConflict: 'slug' },
      );
    if (error) throw error;
  }
}

function buildRelationships(): RelationshipInput[] {
  const relationships: RelationshipInput[] = [];

  for (const row of MUSICAL_CHART_ROWS) {
    const [ascendingTokenRaw, descendingTokenRaw] = row.pair.split('/');
    const ascendingToken = ascendingTokenRaw.trim();
    const descendingToken = descendingTokenRaw.trim();
    const ascendingSlug = NOTE_SLUG_BY_TOKEN[ascendingToken];
    const descendingSlug = NOTE_SLUG_BY_TOKEN[descendingToken];

    if (!ascendingSlug || !descendingSlug) {
      throw new Error(`Could not normalize note pair ${row.pair}`);
    }

    if (ascendingSlug === descendingSlug) {
      relationships.push({
        sourceSlug: row.sourceSlug,
        targetSlug: ascendingSlug,
        type: 'associated_with',
        weight: 0.78,
        confidence: 'tradition',
        source_citation: 'Musical Notes chart',
        notes: `Ascending/descending note pair ${row.pair}. Hebrew letters: ${row.hebrewLetters}.`,
      });
    } else {
      relationships.push({
        sourceSlug: row.sourceSlug,
        targetSlug: ascendingSlug,
        type: 'associated_with',
        weight: 0.78,
        confidence: 'tradition',
        source_citation: 'Musical Notes chart',
        notes: `Ascending note in pair ${row.pair}. Hebrew letters: ${row.hebrewLetters}.`,
      });
      relationships.push({
        sourceSlug: row.sourceSlug,
        targetSlug: descendingSlug,
        type: 'associated_with',
        weight: 0.72,
        confidence: 'tradition',
        source_citation: 'Musical Notes chart',
        notes: `Descending note in pair ${row.pair}. Hebrew letters: ${row.hebrewLetters}.`,
      });
    }

    for (const token of row.hebrewLetters.split(',').map((value) => value.trim()).filter(Boolean)) {
      const letterSlug = HEBREW_LETTER_SLUG_BY_TOKEN[token];
      if (!letterSlug) {
        throw new Error(`Missing Hebrew-letter mapping for token "${token}" in row ${row.pair}`);
      }

      relationships.push({
        sourceSlug: ascendingSlug,
        targetSlug: letterSlug,
        type: 'associated_with',
        weight: 0.64,
        confidence: 'tradition',
        source_citation: 'Musical Notes chart',
        notes: `Ascending note in pair ${row.pair} shares this letter correspondence.`,
      });

      if (descendingSlug !== ascendingSlug) {
        relationships.push({
          sourceSlug: descendingSlug,
          targetSlug: letterSlug,
          type: 'associated_with',
          weight: 0.64,
          confidence: 'tradition',
          source_citation: 'Musical Notes chart',
          notes: `Descending note in pair ${row.pair} shares this letter correspondence.`,
        });
      }
    }
  }

  return relationships;
}

async function upsertRelationships() {
  const supabase = createServiceClient();
  const { data: entities, error: entityError } = await supabase
    .from('correspondences')
    .select('id, slug');
  if (entityError) throw entityError;
  const idBySlug = new Map((entities || []).map((row) => [row.slug, row.id] as const));

  const { data: relationshipTypes, error: relTypeError } = await supabase
    .from('correspondence_relationship_types')
    .select('id, slug');
  if (relTypeError) throw relTypeError;
  const relationshipTypeIdBySlug = new Map((relationshipTypes || []).map((row) => [row.slug, row.id] as const));

  for (const relationship of buildRelationships()) {
    const source_id = idBySlug.get(relationship.sourceSlug);
    const target_id = idBySlug.get(relationship.targetSlug);
    if (!source_id || !target_id) {
      throw new Error(`Missing source or target entity for ${relationship.sourceSlug} -> ${relationship.targetSlug}`);
    }

    const { error } = await supabase
      .from('correspondence_relationships')
      .upsert(
        {
          source_id,
          target_id,
          type: relationship.type,
          relationship_type_id: relationshipTypeIdBySlug.get(relationship.type) || null,
          weight: relationship.weight,
          confidence: relationship.confidence,
          source_citation: relationship.source_citation,
          notes: relationship.notes,
        },
        { onConflict: 'source_id,target_id,type' },
      );
    if (error) throw error;
  }
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in app/.env.local');
  }

  console.log('Seeding music chart entities and relationships...');
  await upsertEntityTypes();
  await upsertEntities();
  await upsertRelationships();
  console.log('Done.');
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
