const fs = require('fs');
const path = require('path');

const SOURCE_SECTION_TYPES = {
  'THE ZODIAC': {
    category: 'zodiac_sign',
    type: {
      slug: 'zodiac_sign',
      label: 'Zodiac Sign',
      color: '#22c55e',
      icon: 'sign',
      description: 'Zodiac sign correspondences.',
      sort_order: 20,
    },
  },
  'THE SOLAR SYSTEM': {
    category: 'planetary_body',
    type: {
      slug: 'planetary_body',
      label: 'Planetary Body',
      color: '#f59e0b',
      icon: 'sun',
      description: 'Planets and celestial bodies used in correspondence systems.',
      sort_order: 30,
    },
  },
  'THE MOON PHASES': {
    category: 'moon_phase',
    type: {
      slug: 'moon_phase',
      label: 'Moon Phase',
      color: '#60a5fa',
      icon: 'moon',
      description: 'Moon phase correspondences.',
      sort_order: 40,
    },
  },
  'THE FULL MOONS': {
    category: 'full_moon',
    type: {
      slug: 'full_moon',
      label: 'Full Moon',
      color: '#93c5fd',
      icon: 'moon-full',
      description: 'Named and month-based full moon correspondences.',
      sort_order: 50,
    },
  },
  'THE SEASONS': {
    category: 'season',
    type: {
      slug: 'season',
      label: 'Season',
      color: '#84cc16',
      icon: 'leaf',
      description: 'Seasonal correspondences.',
      sort_order: 60,
    },
  },
  'THE DAYS OF THE WEEK': {
    category: 'weekday',
    type: {
      slug: 'weekday',
      label: 'Weekday',
      color: '#f97316',
      icon: 'calendar',
      description: 'Weekday correspondences.',
      sort_order: 70,
    },
  },
  'THE TIMES OF DAY': {
    category: 'time_of_day',
    type: {
      slug: 'time_of_day',
      label: 'Time of Day',
      color: '#fb7185',
      icon: 'clock',
      description: 'Times of day used in correspondence systems.',
      sort_order: 80,
    },
  },
  CELEBRATIONS: {
    category: 'celebration',
    type: {
      slug: 'celebration',
      label: 'Celebration',
      color: '#eab308',
      icon: 'festival',
      description: 'Holy days and ritual celebrations.',
      sort_order: 90,
    },
  },
  'THE OGHAM AND CELTIC TREE CALENDAR': {
    category: 'ogham',
    type: {
      slug: 'ogham',
      label: 'Ogham',
      color: '#14b8a6',
      icon: 'tree',
      description: 'Ogham correspondences.',
      sort_order: 100,
    },
  },
  'THE RUNES AND RUNIC HALF-MONTHS': {
    category: 'rune',
    type: {
      slug: 'rune',
      label: 'Rune',
      color: '#06b6d4',
      icon: 'rune',
      description: 'Runic correspondences.',
      sort_order: 110,
    },
  },
  'THE ELEMENTS': {
    category: 'element',
    type: {
      slug: 'element',
      label: 'Element',
      color: '#38bdf8',
      icon: 'element',
      description: 'Elemental correspondences.',
      sort_order: 120,
    },
  },
  'THE DIRECTIONS': {
    category: 'direction',
    type: {
      slug: 'direction',
      label: 'Direction',
      color: '#0ea5e9',
      icon: 'compass',
      description: 'Directional correspondences.',
      sort_order: 130,
    },
  },
  COLORS: {
    category: 'color',
    type: {
      slug: 'color',
      label: 'Color',
      color: '#ec4899',
      icon: 'color',
      description: 'Color correspondences.',
      sort_order: 140,
    },
  },
  'ENERGY: YIN AND YANG': {
    category: 'energy',
    type: {
      slug: 'energy',
      label: 'Energy',
      color: '#8b5cf6',
      icon: 'chakra',
      description: 'Energy polarities and expressions.',
      sort_order: 150,
    },
  },
  'THE CHAKRAS': {
    category: 'chakra',
    type: {
      slug: 'chakra',
      label: 'Chakra',
      color: '#8b5cf6',
      icon: 'chakra',
      description: 'Chakra correspondences.',
      sort_order: 160,
    },
  },
  NUMBERS: {
    category: 'number_symbol',
    type: {
      slug: 'number_symbol',
      label: 'Number',
      color: '#64748b',
      icon: 'hash',
      description: 'Number correspondences.',
      sort_order: 170,
    },
  },
  'THE TAROT - MAJOR ARCANA': {
    category: 'tarot',
    type: {
      slug: 'tarot',
      label: 'Tarot',
      color: '#a855f7',
      icon: 'cards',
      description: 'Tarot correspondences.',
      sort_order: 180,
    },
  },
  'THE TAROT - MINOR ARCANA SUITS': {
    category: 'tarot',
    type: {
      slug: 'tarot',
      label: 'Tarot',
      color: '#a855f7',
      icon: 'cards',
      description: 'Tarot correspondences.',
      sort_order: 181,
    },
  },
  ANIMALS: {
    category: 'animal',
    type: {
      slug: 'animal',
      label: 'Animal',
      color: '#a16207',
      icon: 'paw',
      description: 'Animals used in correspondence systems.',
      sort_order: 240,
    },
  },
  BIRDS: {
    category: 'bird',
    type: {
      slug: 'bird',
      label: 'Bird',
      color: '#0284c7',
      icon: 'bird',
      description: 'Bird correspondences.',
      sort_order: 250,
    },
  },
  'GEMSTONES AND MINERALS': {
    category: 'stone',
    type: {
      slug: 'stone',
      label: 'Stone',
      color: '#7c3aed',
      icon: 'gem',
      description: 'Gemstones and minerals used in correspondence systems.',
      sort_order: 210,
    },
  },
  'METALS AND ALLOYS': {
    category: 'metal',
    type: {
      slug: 'metal',
      label: 'Metal',
      color: '#64748b',
      icon: 'anvil',
      description: 'Metals and alloys used in correspondence systems.',
      sort_order: 220,
    },
  },
  'FROM THE SEA': {
    category: 'sea_item',
    type: {
      slug: 'sea_item',
      label: 'Sea Item',
      color: '#0ea5e9',
      icon: 'shell',
      description: 'Shells and sea-derived correspondence items.',
      sort_order: 230,
    },
  },
  'INSECTS AND MISCELLANEOUS': {
    category: 'insect_misc',
    type: {
      slug: 'insect_misc',
      label: 'Insect Misc',
      color: '#65a30d',
      icon: 'bug',
      description: 'Insect and miscellaneous creature correspondences.',
      sort_order: 280,
    },
  },
  'MARINE LIFE': {
    category: 'marine_life',
    type: {
      slug: 'marine_life',
      label: 'Marine Life',
      color: '#0f766e',
      icon: 'fish',
      description: 'Marine life correspondences.',
      sort_order: 260,
    },
  },
  TREES: {
    category: 'tree',
    type: {
      slug: 'tree',
      label: 'Tree',
      color: '#16a34a',
      icon: 'tree',
      description: 'Trees used in correspondence systems.',
      sort_order: 180,
    },
  },
  'HERBS, GARDEN PLANTS, AND SHRUBS': {
    category: 'herb_garden',
    type: {
      slug: 'herb_garden',
      label: 'Herb Garden',
      color: '#22c55e',
      icon: 'flower',
      description: 'Herbs, garden plants, and shrubs used in correspondence systems.',
      sort_order: 190,
    },
  },
  'MYTHICAL CREATURES': {
    category: 'mythical_being',
    type: {
      slug: 'mythical_being',
      label: 'Mythical Being',
      color: '#9333ea',
      icon: 'sparkles',
      description: 'Mythical creature correspondences.',
      sort_order: 290,
    },
  },
  'MISCELLANEOUS PLANTS': {
    category: 'plant_misc',
    type: {
      slug: 'plant_misc',
      label: 'Plant Misc',
      color: '#65a30d',
      icon: 'sprout',
      description: 'Miscellaneous plant correspondences.',
      sort_order: 200,
    },
  },
  REPTILES: {
    category: 'reptile',
    type: {
      slug: 'reptile',
      label: 'Reptile',
      color: '#15803d',
      icon: 'reptile',
      description: 'Reptile correspondences.',
      sort_order: 270,
    },
  },
};

const RELATIONSHIP_TYPES = [
  {
    slug: 'corresponds_to',
    label: 'Corresponds To',
    color: '#f59e0b',
    icon: 'link',
    description: 'A direct symbolic or structural correspondence.',
    sort_order: 10,
  },
  {
    slug: 'associated_with',
    label: 'Associated With',
    color: '#38bdf8',
    icon: 'assoc',
    description: 'A looser or interpretive association.',
    sort_order: 20,
  },
  {
    slug: 'refines',
    label: 'Refines',
    color: '#8b5cf6',
    icon: 'branch',
    description: 'A subsection or refinement of a broader correspondence entry.',
    sort_order: 30,
  },
];

const FIELD_CONFIGS = [
  { labels: ['Issues, Intentions & Powers', 'Issue, Intention/Power'], category: 'issue_intention_power', relationshipType: 'corresponds_to' },
  { labels: ['Solar System'], category: 'planetary_body', relationshipType: 'corresponds_to' },
  { labels: ['Zodiac'], category: 'zodiac_sign', relationshipType: 'corresponds_to' },
  { labels: ['Moon Phase', 'Moon Phases'], category: 'moon_phase', relationshipType: 'corresponds_to' },
  { labels: ['Full Moon', 'Full Moons'], category: 'full_moon', relationshipType: 'corresponds_to' },
  { labels: ['Season', 'Seasons'], category: 'season', relationshipType: 'corresponds_to' },
  { labels: ['Day', 'Days'], category: 'weekday', relationshipType: 'corresponds_to' },
  { labels: ['Time of Day', 'Times of Day'], category: 'time_of_day', relationshipType: 'corresponds_to' },
  { labels: ['Celebration', 'Celebrations'], category: 'celebration', relationshipType: 'corresponds_to' },
  { labels: ['Ogham'], category: 'ogham', relationshipType: 'corresponds_to' },
  { labels: ['Rune', 'Runes'], category: 'rune', relationshipType: 'corresponds_to' },
  { labels: ['Element', 'Elements'], category: 'element', relationshipType: 'corresponds_to' },
  { labels: ['Energy'], category: 'energy', relationshipType: 'corresponds_to' },
  { labels: ['Direction', 'Directions'], category: 'direction', relationshipType: 'corresponds_to' },
  { labels: ['Color', 'Colors'], category: 'color', relationshipType: 'corresponds_to' },
  { labels: ['Chakra', 'Chakras'], category: 'chakra', relationshipType: 'corresponds_to' },
  { labels: ['Number', 'Numbers'], category: 'number_symbol', relationshipType: 'corresponds_to' },
  { labels: ['Tarot'], category: 'tarot', relationshipType: 'corresponds_to' },
  { labels: ['Tree', 'Trees'], category: 'tree', relationshipType: 'corresponds_to' },
  { labels: ['Herb & Garden'], category: 'herb_garden', relationshipType: 'corresponds_to' },
  { labels: ['Misc. Plant', 'Misc. Plants'], category: 'plant_misc', relationshipType: 'corresponds_to' },
  { labels: ['Gemstone/Mineral', 'Gemstones & Minerals', 'Gemstones'], category: 'stone', relationshipType: 'corresponds_to' },
  { labels: ['Metal', 'Metals'], category: 'metal', relationshipType: 'corresponds_to' },
  { labels: ['From the Sea'], category: 'sea_item', relationshipType: 'associated_with' },
  { labels: ['Goddess', 'Goddesses', 'God', 'Gods'], category: 'deity', relationshipType: 'associated_with' },
  { labels: ['Angel', 'Angels'], category: 'angel', relationshipType: 'associated_with' },
  { labels: ['Magical'], category: 'magical_being', relationshipType: 'associated_with' },
  { labels: ['Animals', 'Animal'], category: 'animal', relationshipType: 'associated_with' },
  { labels: ['Bird', 'Birds'], category: 'bird', relationshipType: 'associated_with' },
  { labels: ['Marine Life'], category: 'marine_life', relationshipType: 'associated_with' },
  { labels: ['Reptile', 'Reptiles'], category: 'reptile', relationshipType: 'associated_with' },
  { labels: ['Insect/Misc.', 'Insects & Misc.', 'Insect/Misc'], category: 'insect_misc', relationshipType: 'associated_with' },
  { labels: ['Mythical'], category: 'mythical_being', relationshipType: 'associated_with' },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if ((arg === '--input' || arg === '-i') && next) {
      parsed.input = next;
      index += 1;
      continue;
    }

    if ((arg === '--output' || arg === '-o') && next) {
      parsed.output = next;
      index += 1;
      continue;
    }

    if (arg === '--parsed-output' && next) {
      parsed.parsedOutput = next;
      index += 1;
    }
  }

  if (!parsed.input) {
    throw new Error('Missing required --input <path-to-raw-section.txt|json>');
  }

  return parsed;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\u00ad/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, ' - ')
    .replace(/>\s*/g, '')
    .replace(/\s+\/\s+/g, '/')
    .replace(/([A-Za-z])\s*\/\s*([A-Za-z])/g, '$1/$2')
    .replace(/([A-Za-z])-\s+([A-Za-z])/g, '$1-$2')
    .replace(/:\s*/g, ': ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/["'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeFieldKey(label) {
  return cleanText(label)
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[/'(),.]+/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isSentenceLikeEntityName(name) {
  if (!name || typeof name !== 'string') return false;

  const normalized = cleanText(name);
  if (!normalized) return false;

  const wordCount = normalized.split(/\s+/).length;

  if (/[!?]/.test(normalized) || /\.\s+[A-Z]/.test(normalized)) return true;
  if (normalized.length > 120 || wordCount > 18) return true;
  if (wordCount >= 10 && /,/.test(normalized) && !/[()]/.test(normalized)) return true;

  if (
    wordCount >= 7 &&
    /\b(which|touching|represents|consciousness|offering|offerings|experience|experiences|through|radiance|spectrum)\b/i.test(normalized)
  ) {
    return true;
  }

  return false;
}

function splitTopLevelList(value) {
  const items = [];
  let current = '';
  let depth = 0;

  for (const char of cleanText(value)) {
    if (char === '(') {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if ((char === ',' || char === ';') && depth === 0) {
      if (cleanText(current)) items.push(cleanText(current));
      current = '';
      continue;
    }

    current += char;
  }

  if (cleanText(current)) items.push(cleanText(current));

  return items.filter(Boolean);
}

function getFieldConfig(label) {
  return FIELD_CONFIGS.find((config) => config.labels.includes(label));
}

function createFieldRegex() {
  const labels = FIELD_CONFIGS.flatMap((config) => config.labels)
    .sort((left, right) => right.length - left.length)
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(${labels.join('|')}):`, 'g');
}

const FIELD_REGEX = createFieldRegex();

function isAllCapsHeading(line) {
  const cleaned = cleanText(line);
  if (!cleaned || cleaned.includes(':')) return false;
  if (cleaned.length > 80) return false;
  return /^[A-Z0-9/&,'(). -]+$/.test(cleaned);
}

function normalizeEntryTitle(title) {
  return cleanText(
    title
      .replace(/^\s*[-–—]\s*/, '')
      .replace(/\s+\((?:CONTINUED|CONTINTUED)\)\s*$/i, ''),
  );
}

function startsFieldBlock(line) {
  const cleaned = cleanText(line);
  if (!cleaned) return false;
  if (/^Also known as\b/i.test(cleaned)) return true;
  FIELD_REGEX.lastIndex = 0;
  return FIELD_REGEX.test(cleaned);
}

function isLowercaseEntryHeading(line) {
  const cleaned = cleanText(line);
  if (!cleaned || cleaned.includes(':')) return false;
  if (cleaned.length > 42) return false;
  if (/[,-]$/.test(cleaned)) return false;
  if (!/^[A-Za-z][A-Za-z'’/&(). -]+$/.test(cleaned)) return false;

  const wordCount = cleaned.split(/\s+/).length;
  if (wordCount > 3) return false;

  return cleaned === cleaned.toLowerCase();
}

function isSubsectionLine(line) {
  const cleaned = cleanText(line);
  if (!cleaned || cleaned.includes(':')) return false;
  if (cleaned.length > 42) return false;
  if (isAllCapsHeading(cleaned)) return false;
  if (/[,-]$/.test(cleaned)) return false;
  if (/^See separate entry for\b/i.test(cleaned)) return false;
  return /^[A-Z][A-Za-z'’/&(). -]+$/.test(cleaned);
}

function parseAliases(description) {
  const match = description.match(/also known as (.+)$/i);
  if (!match) return [];
  return splitTopLevelList(match[1].replace(/\band\b/g, ','));
}

function createEntry(title, category, sectionLabel) {
  const normalizedTitle = normalizeEntryTitle(title);
  return {
    title: normalizedTitle,
    slug: slugify(normalizedTitle),
    category,
    sectionLabel,
    description: '',
    aliases: [],
    sections: [
      {
        kind: 'main',
        title: null,
        slug: null,
        lines: [],
        description: '',
        fields: [],
      },
    ],
    parseWarnings: [],
  };
}

function getCurrentSection(entry) {
  return entry.sections[entry.sections.length - 1];
}

function sectionHasFieldContent(section) {
  return section.lines.some((line) => line.includes(':'));
}

function getLookaheadText(lines, startIndex, lineCount = 3) {
  return cleanText(lines.slice(startIndex, startIndex + lineCount).join(' '));
}

function looksLikeCelebrationDateHeading(line) {
  return /^(?:\d+(?:ST|ND|RD|TH)\s+DAY OF|[A-Z]+(?:\s+\d+(?:\s+OR\s+\d+)?)?(?:\s*[-–—]\s*.+)?)$/.test(line);
}

function parseRawLines(rawText) {
  const lines = rawText
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const entries = [];
  let currentSectionLabel = null;
  let currentEntry = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = cleanText(lines[index]);

    if (SOURCE_SECTION_TYPES[line]) {
      currentSectionLabel = line;
      currentEntry = null;
      continue;
    }

    if (/^See separate entry for\b/i.test(line)) {
      continue;
    }

    if (/^\[contents\]$/i.test(line) || /^CHAPTER\s+\w+/i.test(line)) {
      currentEntry = null;
      continue;
    }

    const nextLine = cleanText(lines[index + 1] || '');
    const looksLikeLowercaseEntryHeading = isLowercaseEntryHeading(line) && startsFieldBlock(nextLine);

    if (isAllCapsHeading(line) || looksLikeLowercaseEntryHeading) {
      let headingLine = line;

      if (
        currentSectionLabel === 'CELEBRATIONS'
        && isAllCapsHeading(line)
        && isAllCapsHeading(nextLine)
        && looksLikeCelebrationDateHeading(line)
        && startsFieldBlock(cleanText(lines[index + 2] || ''))
      ) {
        headingLine = `${line} ${nextLine}`;
        index += 1;
      }

      const isContinued = /\((?:CONTINUED|CONTINTUED)\)\s*$/i.test(line);
      const normalizedTitle = normalizeEntryTitle(headingLine);

      if (isContinued && currentEntry && currentEntry.title === normalizedTitle) {
        continue;
      }

      if (!currentSectionLabel) {
        continue;
      }

      currentEntry = createEntry(normalizedTitle, SOURCE_SECTION_TYPES[currentSectionLabel].category, currentSectionLabel);
      entries.push(currentEntry);
      continue;
    }

    if (!currentEntry) {
      continue;
    }

    const currentSection = getCurrentSection(currentEntry);
    const previousLine = index > 0 ? cleanText(lines[index - 1]) : '';
    const currentSectionHasFields = sectionHasFieldContent(currentSection);
    const nextLineStartsField = startsFieldBlock(nextLine);
    const continuesPreviousField = /[,;/-]$/.test(previousLine);

    if (isSubsectionLine(line) && currentSectionHasFields && nextLineStartsField && !continuesPreviousField) {
      currentEntry.sections.push({
        kind: 'subsection',
        title: line,
        slug: slugify(line),
        lines: [],
        description: '',
        fields: [],
      });
      continue;
    }

    currentSection.lines.push(line);
  }

  return entries;
}

function parseSectionText(section) {
  const combined = cleanText(section.lines.join(' '));
  if (!combined) return;

  const matches = Array.from(combined.matchAll(FIELD_REGEX));
  if (matches.length === 0) {
    section.description = combined;
    return;
  }

  const prefix = cleanText(combined.slice(0, matches[0].index));
  if (prefix) section.description = prefix;

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const label = match[1];
    const valueStart = match.index + match[0].length;
    const nextStart = index + 1 < matches.length ? matches[index + 1].index : combined.length;
    const value = cleanText(combined.slice(valueStart, nextStart));

    if (!value) continue;

    section.fields.push({
      label,
      values: splitTopLevelList(value),
    });
  }
}

function parseReferenceSection(payload) {
  const rawText = payload.kind === 'book-section-extraction'
    ? payload.pages.map((page) => page.text).join('\n')
    : String(payload.text || '');

  const entries = parseRawLines(rawText);

  for (const entry of entries) {
    for (const section of entry.sections) {
      parseSectionText(section);
    }

    const mainSection = entry.sections[0];
    entry.description = mainSection.description || null;
    entry.aliases = parseAliases(entry.description || '');
  }

  return {
    kind: 'book-reference-parse',
    parsedAt: new Date().toISOString(),
    source: payload.source,
    stats: {
      parsedEntryCount: entries.length,
      parsedSectionCount: entries.reduce((sum, entry) => sum + entry.sections.length, 0),
      parseWarningCount: entries.reduce((sum, entry) => sum + entry.parseWarnings.length, 0),
    },
    entries,
  };
}

function dedupeBy(items, keyOf) {
  const seen = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

function buildSourceEntity(entry, section) {
  if (section.kind === 'main') {
    return {
      slug: entry.slug,
      name: entry.title,
      category: entry.category,
      type_slug: entry.category,
      aliases: entry.aliases || [],
      description: entry.description || null,
      lenses: ['correspondence', 'symbolic'],
    };
  }

  if (isSentenceLikeEntityName(section.title)) return null;

  return {
    slug: `${entry.slug}-${section.slug}`,
    name: section.title,
    category: entry.category,
    type_slug: entry.category,
    aliases: [],
    description: section.description || null,
    lenses: ['correspondence', 'symbolic'],
  };
}

function buildBundle(parsed) {
  const entities = [];
  const relationships = new Map();
  const claims = [];

  function addRelationship(item) {
    const key = `${item.source_slug}|${item.target_slug}|${item.type}`;
    if (!relationships.has(key)) {
      relationships.set(key, item);
    }
  }

  for (const entry of parsed.entries) {
    for (const section of entry.sections) {
      const sourceEntity = buildSourceEntity(entry, section);
      if (!sourceEntity) continue;

      entities.push(sourceEntity);

      if (section.kind === 'subsection') {
        addRelationship({
          source_slug: sourceEntity.slug,
          target_slug: entry.slug,
          type: 'refines',
          relationship_type_slug: 'refines',
          weight: 0.92,
          confidence: 'tradition',
          source_citation: `${parsed.source.bookTitle}, ${parsed.source.sectionTitle}`,
          notes: `${section.title} refines ${entry.title}`,
        });
      }

      for (const field of section.fields) {
        const claimValues = dedupeBy(
          field.values.map((value) => cleanText(value)).filter(Boolean),
          (value) => value.toLowerCase(),
        );

        if (claimValues.length > 0) {
          claims.push({
            entity_slug: sourceEntity.slug,
            field_key: normalizeFieldKey(field.label),
            field_value: claimValues.join(', '),
            confidence: 'tradition',
            notes: `Imported from ${parsed.source.bookTitle}, ${parsed.source.sectionTitle} (${field.label})`,
            source: {
              title: parsed.source.bookTitle,
              citation: parsed.source.sectionTitle,
            },
          });
        }

        const config = getFieldConfig(field.label);
        if (!config) continue;

        for (const rawValue of field.values) {
          const value = cleanText(rawValue);
          if (!value || isSentenceLikeEntityName(value)) continue;

          const targetSlug = slugify(value);
          if (!targetSlug) continue;

          addRelationship({
            source_slug: sourceEntity.slug,
            target_slug: targetSlug,
            type: config.relationshipType,
            relationship_type_slug: config.relationshipType,
            weight: config.relationshipType === 'corresponds_to' ? 0.84 : 0.74,
            confidence: 'tradition',
            source_citation: `${parsed.source.bookTitle}, ${parsed.source.sectionTitle}`,
            notes: `${field.label}: ${value}`,
          });
        }
      }
    }
  }

  return {
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
      entityTypes: dedupeBy(
        parsed.entries.map((entry) => SOURCE_SECTION_TYPES[entry.sectionLabel].type),
        (type) => type.slug,
      ),
      relationshipTypes: RELATIONSHIP_TYPES,
      entities: dedupeBy(entities, (entity) => entity.slug),
      relationships: Array.from(relationships.values()),
      claims: dedupeBy(
        claims,
        (claim) => `${claim.entity_slug}|${claim.field_key}|${claim.source?.citation || ''}`,
      ),
    },
  };
}

function defaultOutputs(inputPath) {
  const absolute = path.resolve(process.cwd(), inputPath);
  const baseName = path.basename(absolute, path.extname(absolute));
  const outputDir = path.dirname(absolute);

  return {
    parsedOutput: path.join(outputDir, `${baseName}-parsed.json`),
    bundleOutput: path.join(outputDir, `${baseName}-bundle.json`),
  };
}

function loadPayload(inputPath) {
  const absolute = path.resolve(process.cwd(), inputPath);
  const ext = path.extname(absolute).toLowerCase();

  if (ext === '.json') {
    return JSON.parse(fs.readFileSync(absolute, 'utf8'));
  }

  const text = fs.readFileSync(absolute, 'utf8');
  return {
    kind: 'manual-book-reference-text',
    source: {
      bookSlug: 'llewellyns-complete-book-of-correspondences',
      bookTitle: "Llewellyn's Complete Book of Correspondences",
      sectionSlug: slugify(path.basename(absolute, ext)),
      sectionTitle: path.basename(absolute, ext),
      notes: ['Built from manually staged raw text.'],
    },
    text,
  };
}

function main() {
  const args = parseArgs();
  const inputPath = path.resolve(process.cwd(), args.input);
  const payload = loadPayload(inputPath);
  const parsedInputProvided = payload.kind === 'book-reference-parse';
  const outputs = defaultOutputs(inputPath);
  const parsedOutputPath = args.parsedOutput ? path.resolve(process.cwd(), args.parsedOutput) : outputs.parsedOutput;
  const bundleOutputPath = args.output ? path.resolve(process.cwd(), args.output) : outputs.bundleOutput;

  const parsed = parsedInputProvided ? payload : parseReferenceSection(payload);
  const bundle = buildBundle(parsed);

  if (!parsedInputProvided || args.parsedOutput) {
    fs.writeFileSync(parsedOutputPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${parsedOutputPath}`);
  }
  fs.writeFileSync(bundleOutputPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

  console.log(`Parsed ${inputPath}`);
  console.log(`Wrote ${bundleOutputPath}`);
  console.log(
    JSON.stringify(
      {
        entries: parsed.stats.parsedEntryCount,
        sections: parsed.stats.parsedSectionCount,
        parseWarnings: parsed.stats.parseWarningCount,
        entityTypes: bundle.correspondences.entityTypes.length,
        entities: bundle.correspondences.entities.length,
        relationships: bundle.correspondences.relationships.length,
      },
      null,
      2,
    ),
  );
}

main();
