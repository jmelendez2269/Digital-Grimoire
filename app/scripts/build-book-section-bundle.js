const fs = require('fs');
const path = require('path');

const ENTRY_TYPE = {
  slug: 'issue_intention_power',
  label: 'Issue/Intention/Power',
  color: '#f59e0b',
  icon: 'sparkles',
  description: 'Issue, intention, or power entries from correspondence sourcebooks.',
  sort_order: 10,
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
    description: 'A subsection or refinement of a broader issue/intention/power.',
    sort_order: 30,
  },
  {
    slug: 'shares_correspondence_with',
    label: 'Shares Correspondence With',
    color: '#14b8a6',
    icon: 'network',
    description: 'A derived relationship between issue/intention/power nodes with strong shared correspondences.',
    sort_order: 40,
  },
];

const FIELD_CONFIGS = [
  { labels: ['Solar System'], category: 'planetary_body', relationshipType: 'corresponds_to', color: '#f59e0b', icon: 'sun', sortOrder: 20, description: 'Planets and other solar system bodies.' },
  { labels: ['Zodiac'], category: 'zodiac_sign', relationshipType: 'corresponds_to', color: '#22c55e', icon: 'sign', sortOrder: 30, description: 'Zodiac signs.' },
  { labels: ['Moon Phase', 'Moon Phases'], category: 'moon_phase', relationshipType: 'corresponds_to', color: '#60a5fa', icon: 'moon', sortOrder: 40, description: 'Moon phases.' },
  { labels: ['Full Moon', 'Full Moons'], category: 'full_moon', relationshipType: 'corresponds_to', color: '#93c5fd', icon: 'moon-full', sortOrder: 50, description: 'Named or month-based full moon correspondences.' },
  { labels: ['Season', 'Seasons'], category: 'season', relationshipType: 'corresponds_to', color: '#84cc16', icon: 'leaf', sortOrder: 60, description: 'Seasonal correspondences.' },
  { labels: ['Day', 'Days'], category: 'weekday', relationshipType: 'corresponds_to', color: '#f97316', icon: 'calendar', sortOrder: 70, description: 'Weekday correspondences.' },
  { labels: ['Time of Day'], category: 'time_of_day', relationshipType: 'corresponds_to', color: '#fb7185', icon: 'clock', sortOrder: 80, description: 'Times of day.' },
  { labels: ['Celebration', 'Celebrations'], category: 'celebration', relationshipType: 'corresponds_to', color: '#eab308', icon: 'festival', sortOrder: 90, description: 'Holy days and seasonal celebrations.' },
  { labels: ['Ogham'], category: 'ogham', relationshipType: 'corresponds_to', color: '#14b8a6', icon: 'tree', sortOrder: 100, description: 'Ogham correspondences.' },
  { labels: ['Rune', 'Runes'], category: 'rune', relationshipType: 'corresponds_to', color: '#06b6d4', icon: 'rune', sortOrder: 110, description: 'Runic correspondences.' },
  { labels: ['Element', 'Elements'], category: 'element', relationshipType: 'corresponds_to', color: '#38bdf8', icon: 'element', sortOrder: 120, description: 'Elemental correspondences.' },
  { labels: ['Direction', 'Directions'], category: 'direction', relationshipType: 'corresponds_to', color: '#0ea5e9', icon: 'compass', sortOrder: 130, description: 'Directional correspondences.' },
  { labels: ['Color', 'Colors'], category: 'color', relationshipType: 'corresponds_to', color: '#ec4899', icon: 'color', sortOrder: 140, description: 'Color correspondences.' },
  { labels: ['Chakra', 'Chakras'], category: 'chakra', relationshipType: 'corresponds_to', color: '#8b5cf6', icon: 'chakra', sortOrder: 150, description: 'Chakra correspondences.' },
  { labels: ['Number', 'Numbers'], category: 'number_symbol', relationshipType: 'corresponds_to', color: '#64748b', icon: 'hash', sortOrder: 160, description: 'Number correspondences.' },
  { labels: ['Tarot'], category: 'tarot', relationshipType: 'corresponds_to', color: '#a855f7', icon: 'cards', sortOrder: 170, description: 'Tarot correspondences.' },
  { labels: ['Trees', 'Tree'], category: 'tree', relationshipType: 'corresponds_to', color: '#16a34a', icon: 'tree', sortOrder: 180, description: 'Trees used in correspondences.' },
  { labels: ['Plants', 'Plant'], category: 'plant_misc', relationshipType: 'corresponds_to', color: '#65a30d', icon: 'sprout', sortOrder: 185, description: 'General plant correspondences.' },
  { labels: ['Herb & Garden'], category: 'herb_garden', relationshipType: 'corresponds_to', color: '#22c55e', icon: 'flower', sortOrder: 190, description: 'Herbs and cultivated flowers.' },
  { labels: ['Misc. Plant', 'Misc. Plants'], category: 'plant_misc', relationshipType: 'corresponds_to', color: '#65a30d', icon: 'sprout', sortOrder: 200, description: 'Miscellaneous plant correspondences.' },
  { labels: ['Gemstone/Mineral', 'Gemstones & Minerals'], category: 'stone', relationshipType: 'corresponds_to', color: '#ec4899', icon: 'crystal', sortOrder: 210, description: 'Gemstone and mineral correspondences.' },
  { labels: ['Metal', 'Metals'], category: 'metal', relationshipType: 'corresponds_to', color: '#94a3b8', icon: 'metal', sortOrder: 220, description: 'Metal correspondences.' },
  { labels: ['From the Sea'], category: 'sea_item', relationshipType: 'associated_with', color: '#0ea5e9', icon: 'shell', sortOrder: 230, description: 'Shells and other sea-derived correspondences.' },
  { labels: ['Goddess', 'Goddesses', 'God', 'Gods'], category: 'deity', relationshipType: 'associated_with', color: '#d946ef', icon: 'deity', sortOrder: 240, description: 'Deities and divine figures.' },
  { labels: ['Angel', 'Angels'], category: 'angel', relationshipType: 'associated_with', color: '#c084fc', icon: 'angel', sortOrder: 250, description: 'Angelic correspondences.' },
  { labels: ['Magical'], category: 'magical_being', relationshipType: 'associated_with', color: '#7c3aed', icon: 'wand', sortOrder: 260, description: 'Magical beings and forces.' },
  { labels: ['Animals', 'Animal'], category: 'animal', relationshipType: 'associated_with', color: '#84cc16', icon: 'paw', sortOrder: 270, description: 'Animal correspondences.' },
  { labels: ['Bird', 'Birds'], category: 'bird', relationshipType: 'associated_with', color: '#facc15', icon: 'bird', sortOrder: 280, description: 'Bird correspondences.' },
  { labels: ['Marine Life'], category: 'marine_life', relationshipType: 'associated_with', color: '#06b6d4', icon: 'fish', sortOrder: 290, description: 'Marine life correspondences.' },
  { labels: ['Reptile', 'Reptiles'], category: 'reptile', relationshipType: 'associated_with', color: '#10b981', icon: 'reptile', sortOrder: 300, description: 'Reptile and amphibian correspondences.' },
  { labels: ['Insect/Misc.', 'Insects & Misc.'], category: 'insect_misc', relationshipType: 'associated_with', color: '#f59e0b', icon: 'bug', sortOrder: 310, description: 'Insect and miscellaneous creature correspondences.' },
  { labels: ['Mythical'], category: 'mythical_being', relationshipType: 'associated_with', color: '#8b5cf6', icon: 'dragon', sortOrder: 320, description: 'Mythical being correspondences.' },
];

const CONNECTOR_WORDS = new Set(['and', 'or', 'of', 'the', 'to', 'for', 'from', 'with', 'without', 'into']);
const SUBSECTION_STARTERS = [
  'To',
  'For',
  'From',
  'Self',
  'Inner',
  'Mental',
  'Physical',
  'Spiritual',
  'Emotional',
  'Sexual',
  'Hidden',
  'Protect',
  'Balance',
  'Calm',
  'Contact',
  'Hunt',
  'Animal',
  'Angelic',
  'Messages',
  'Encourage',
  'Open',
  'True',
  'Black',
  'Crone',
  'Dragon',
  'Elf',
  'Fairy',
  'Defensive',
  'Angel',
  'Moon',
  'Night',
  'Solar',
  'Sex',
  'Attract',
  'Unconditional',
  'Divine',
  'Occult',
  'Past',
  'Future',
  'Career',
  'Home',
  'Family',
  'Psychic',
  'Dream',
  'Travel',
  'Fertility',
  'Growth',
  'Healing',
  'Luck',
  'Protection',
  'Prosperity',
  'Strength',
  'Success',
  'Willpower',
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
    throw new Error('Missing required --input <path-to-section-json>');
  }

  return parsed;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\u00ad/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSentenceLikeEntityName(value) {
  const normalized = cleanText(value);
  if (!normalized) {
    return false;
  }

  const wordCount = normalized.split(/\s+/).length;

  if (/[!?]/.test(normalized) || /\.\s+[A-Z]/.test(normalized)) {
    return true;
  }

  if (normalized.length > 120 || wordCount > 18) {
    return true;
  }

  if (wordCount >= 10 && normalized.includes(',') && !/[()]/.test(normalized)) {
    return true;
  }

  if (
    wordCount >= 7 &&
    /\b(which|touching|represents|consciousness|offering|offerings|experience|experiences|through|radiance|spectrum)\b/i.test(normalized)
  ) {
    return true;
  }

  return false;
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[“”‘’"'`]/g, '')
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

function titleCaseUpperText(value) {
  const lower = cleanText(value).toLowerCase();
  const words = lower.split(/(\s+|\/|\(|\)|,|-)/);

  let shouldCapitalize = true;
  return words
    .map((part) => {
      if (!part || /^\s+$/.test(part)) {
        return part;
      }

      if (/^[\/(),-]$/.test(part)) {
        shouldCapitalize = part !== "'";
        return part;
      }

      const normalized = part.toLowerCase();
      if (shouldCapitalize || !CONNECTOR_WORDS.has(normalized)) {
        shouldCapitalize = false;
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
      }

      return normalized;
    })
    .join('')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');
}

function normalizeHeading(rawHeading) {
  const withoutContinued = cleanText(rawHeading).replace(/\s*\(CONTINUED\)\s*$/i, '');
  return {
    raw: cleanText(rawHeading),
    key: withoutContinued,
    display: titleCaseUpperText(withoutContinued),
    isContinued: /\(CONTINUED\)\s*$/i.test(cleanText(rawHeading)),
  };
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
      if (cleanText(current)) {
        items.push(cleanText(current));
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (cleanText(current)) {
    items.push(cleanText(current));
  }

  return items.filter(Boolean);
}

function fieldPattern() {
  const labels = FIELD_CONFIGS.flatMap((config) => config.labels)
    .sort((left, right) => right.length - left.length)
    .map((label) => escapeRegex(label));
  return new RegExp(`(${labels.join('|')}):`, 'g');
}

const FIELD_REGEX = fieldPattern();
const ENTRY_HEADING_REGEX = new RegExp(
  `([A-Z][A-Z/&,'’\\- ]{2,}(?:\\([A-Z0-9 ,/'’.\\-]+\\))?(?:/[A-Z][A-Z/&,'’\\- ]{2,}(?:\\([A-Z0-9 ,/'’.\\-]+\\))?)*)\\s+(?=${FIELD_CONFIGS.flatMap((config) => config.labels).sort((left, right) => right.length - left.length).map((label) => `${escapeRegex(label)}:`).join('|')})`,
  'g',
);

function getFieldConfig(label) {
  return FIELD_CONFIGS.find((config) => config.labels.includes(label));
}

function isProbableSubsectionHeading(candidate) {
  const cleaned = cleanText(candidate);
  if (!cleaned || cleaned.length > 48 || cleaned.includes(',')) {
    return false;
  }

  const words = cleaned.split(/\s+/);
  if (words.length < 2 && !cleaned.includes('-') && !SUBSECTION_STARTERS.includes(cleaned.split('-')[0])) {
    return false;
  }

  const starter = words[0].replace(/[^A-Za-z-]/g, '').split('-')[0];
  if (!SUBSECTION_STARTERS.includes(starter)) {
    return false;
  }

  return words.every((word, index) => {
    const stripped = word.replace(/[^A-Za-z-]/g, '');
    if (!stripped) return true;
    if (index === 0) return /^[A-Z]/.test(stripped);
    return /^[A-Z]/.test(stripped) || CONNECTOR_WORDS.has(stripped.toLowerCase());
  });
}

function splitListSuffixIntoHeading(cleaned) {
  if (!cleaned.includes(',')) {
    return null;
  }

  const match = cleaned.match(
    /^(.*?,\s*[A-Z][A-Za-z'â€™-]+)\s+([A-Z][A-Za-z'â€™/-]*(?:\s+(?:[A-Z][A-Za-z'â€™/-]*|and|or|of|the|to|for|from|with|without|into)){2,5})$/,
  );

  if (!match) {
    return null;
  }

  const value = cleanText(match[1]);
  const nextSubsection = cleanText(match[2]);
  if (!value || !nextSubsection || !isProbableSubsectionHeading(nextSubsection)) {
    return null;
  }

  return {
    value,
    nextSubsection,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function splitTrailingSubsection(rawValue) {
  const cleaned = cleanText(rawValue);
  if (!cleaned) {
    return { value: '', nextSubsection: null };
  }

  for (const starter of SUBSECTION_STARTERS) {
    const pattern = new RegExp(`^(.*?)(?:\\s+)(${starter}(?:[- ][A-Za-z'’/]+)*(?:\\s+(?:[A-Z][A-Za-z'’/-]*|and|or|of|the|to|for|from|with|without|into)){0,5})$`);
    const match = cleaned.match(pattern);
    if (!match) {
      continue;
    }

    const value = cleanText(match[1]);
    const candidate = cleanText(match[2]);
    if (!value || !isProbableSubsectionHeading(candidate)) {
      continue;
    }

    return {
      value,
      nextSubsection: candidate,
    };
  }

  return { value: cleaned, nextSubsection: null };
}

function splitTrailingSubsectionV2(rawValue) {
  const cleaned = cleanText(rawValue);
  if (!cleaned) {
    return { value: '', nextSubsection: null };
  }

  for (const starter of SUBSECTION_STARTERS) {
    const pattern = new RegExp(
      `^(.*?)(?:\\s+)(${starter}(?:[- ][A-Za-z'â€™/]+)*(?:\\s+(?:[A-Z][A-Za-z'â€™\\/-]*|and|or|of|the|to|for|from|with|without|into)){0,6})$`,
      'i',
    );
    const match = cleaned.match(pattern);
    if (!match) {
      continue;
    }

    const value = cleanText(match[1]);
    const candidate = cleanText(match[2]);
    if (!value || !isProbableSubsectionHeading(candidate)) {
      continue;
    }

    return {
      value,
      nextSubsection: candidate,
    };
  }

  const listSuffixSplit = splitListSuffixIntoHeading(cleaned);
  if (listSuffixSplit) {
    return listSuffixSplit;
  }

  return { value: cleaned, nextSubsection: null };
}

function isLikelyFragmentValue(category, value) {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return true;
  }

  if (cleaned.includes(':')) {
    return true;
  }

  if (/^[a-z]/.test(cleaned) && /^(and|or|of|the|to|for|from|with|without|into)\b/.test(cleaned)) {
    return true;
  }

  if (cleaned === cleaned.toLowerCase() && category !== 'issue_intention_power') {
    return true;
  }

  if (/^(all\s+plants?|all\s+animals?|all\s+birds?)\b/i.test(cleaned)) {
    return true;
  }

  return false;
}

function stripContinuationPrefix(text, entry) {
  const cleaned = cleanText(text);
  if (!cleaned) {
    return '';
  }

  const exactPrefix = new RegExp(`^${escapeRegex(entry.key)}\\s*\\(CONTINUED\\)\\s*`, 'i');
  const exactStripped = cleaned.replace(exactPrefix, '');
  if (exactStripped !== cleaned) {
    return exactStripped;
  }

  return cleaned.replace(/^[A-Z/&,'â€™.\- ]+\(CONTINUED\)\s*/i, '');
}

function createEntry(normalizedHeading, pageNumber) {
  return {
    key: normalizedHeading.key,
    rawHeading: normalizedHeading.raw,
    title: normalizedHeading.display,
    slug: slugify(normalizedHeading.display),
    pageNumbers: [pageNumber],
    sections: [
      {
        kind: 'main',
        title: null,
        slug: null,
        pageNumbers: [pageNumber],
        fields: [],
      },
    ],
    parseWarnings: [],
  };
}

function getOrCreateSection(entry, title, pageNumber) {
  const cleanedTitle = cleanText(title);
  const existing = entry.sections.find((section) => section.title === cleanedTitle);
  if (existing) {
    if (!existing.pageNumbers.includes(pageNumber)) {
      existing.pageNumbers.push(pageNumber);
    }
    return existing;
  }

  const section = {
    kind: 'subsection',
    title: cleanedTitle,
    slug: slugify(cleanedTitle),
    pageNumbers: [pageNumber],
    fields: [],
  };
  entry.sections.push(section);
  return section;
}

function addField(section, label, rawValue, pageNumber) {
  const cleaned = cleanText(rawValue);
  if (!cleaned) {
    return;
  }

  const existing = section.fields.find((field) => field.label === label);
  if (existing) {
    existing.values.push(cleaned);
    if (!existing.pageNumbers.includes(pageNumber)) {
      existing.pageNumbers.push(pageNumber);
    }
    return;
  }

  section.fields.push({
    label,
    values: [cleaned],
    pageNumbers: [pageNumber],
  });
}

function appendToLastField(section, prefix, pageNumber) {
  const cleaned = cleanText(prefix);
  if (!cleaned || section.fields.length === 0) {
    return false;
  }

  const lastField = section.fields[section.fields.length - 1];
  const lastIndex = lastField.values.length - 1;
  lastField.values[lastIndex] = `${lastField.values[lastIndex]}, ${cleaned}`;
  if (!lastField.pageNumbers.includes(pageNumber)) {
    lastField.pageNumbers.push(pageNumber);
  }
  return true;
}

function parseChunkIntoEntry(entry, chunkText, pageNumber) {
  if (!entry.pageNumbers.includes(pageNumber)) {
    entry.pageNumbers.push(pageNumber);
  }

  const normalizedChunk = cleanText(chunkText);
  if (!normalizedChunk) {
    return;
  }

  const matches = Array.from(chunkText.matchAll(FIELD_REGEX));
  if (matches.length === 0) {
    if (!new RegExp(`^${escapeRegex(entry.key)}\\s*\\(CONTINUED\\)$`, 'i').test(normalizedChunk)) {
      entry.parseWarnings.push({
        pageNumber,
        message: `Unparsed text chunk: ${normalizedChunk.slice(0, 160)}`,
      });
    }
    return;
  }

  let currentSection = entry.sections[0];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const label = match[1];
    const valueStart = match.index + match[0].length;
    const nextStart = index + 1 < matches.length ? matches[index + 1].index : chunkText.length;
    const prefix = index === 0 ? chunkText.slice(0, match.index) : '';
    if (prefix && cleanText(prefix)) {
      const cleanedPrefix = stripContinuationPrefix(prefix, entry);
      if (cleanedPrefix) {
        if (isProbableSubsectionHeading(cleanedPrefix)) {
          currentSection = getOrCreateSection(entry, cleanedPrefix, pageNumber);
        } else if (!appendToLastField(currentSection, cleanedPrefix, pageNumber)) {
          entry.parseWarnings.push({
            pageNumber,
            message: `Dropped continuation prefix: ${cleanedPrefix.slice(0, 160)}`,
          });
        }
      }
    }

    const rawValue = chunkText.slice(valueStart, nextStart);
    const split = splitTrailingSubsectionV2(rawValue);
    addField(currentSection, label, split.value, pageNumber);

    if (split.nextSubsection) {
      currentSection = getOrCreateSection(entry, split.nextSubsection, pageNumber);
    }
  }
}

function splitPageIntoChunks(pageText) {
  const matches = Array.from(pageText.matchAll(ENTRY_HEADING_REGEX));
  if (matches.length === 0) {
    return [];
  }

  return matches.map((match) => {
    const start = match.index;
    const heading = match[1];
    const body = pageText.slice(start + heading.length).trim();
    return {
      heading,
      body,
    };
  });
}

function parseSectionExtraction(payload) {
  const parsed = {
    kind: 'book-section-parse',
    parsedAt: new Date().toISOString(),
    source: payload.source,
    stats: {
      inputPageCount: payload.pages.length,
      parsedEntryCount: 0,
      parsedSectionCount: 0,
      parseWarningCount: 0,
    },
    entries: [],
  };

  let currentEntry = null;

  for (const page of payload.pages) {
    const chunks = splitPageIntoChunks(page.text);

    if (chunks.length === 0) {
      if (!currentEntry) {
        continue;
      }
      parseChunkIntoEntry(currentEntry, page.text, page.pageNumber);
      continue;
    }

    for (const chunk of chunks) {
      const heading = normalizeHeading(chunk.heading);
      const canReuseContinuedEntry =
        heading.isContinued &&
        currentEntry &&
        (
          currentEntry.key === heading.key ||
          currentEntry.key.startsWith(`${heading.key} (`)
        );

      if (!canReuseContinuedEntry) {
        currentEntry = createEntry(heading, page.pageNumber);
        parsed.entries.push(currentEntry);
      } else if (!currentEntry.pageNumbers.includes(page.pageNumber)) {
        currentEntry.pageNumbers.push(page.pageNumber);
      }

      parseChunkIntoEntry(currentEntry, chunk.body, page.pageNumber);
    }
  }

  parsed.stats.parsedEntryCount = parsed.entries.length;
  parsed.stats.parsedSectionCount = parsed.entries.reduce((sum, entry) => sum + entry.sections.length, 0);
  parsed.stats.parseWarningCount = parsed.entries.reduce((sum, entry) => sum + entry.parseWarnings.length, 0);
  return parsed;
}

function cleanSectionCarryovers(parsed) {
  const joinableSectionWords = new Set(['From', 'To', 'For', 'With', 'Without', 'Into', 'Of', 'And', 'Or']);

  for (const entry of parsed.entries) {
    for (let index = 0; index < entry.sections.length - 1; index += 1) {
      const current = entry.sections[index];
      const next = entry.sections[index + 1];
      if (!next.title || current.fields.length === 0) {
        continue;
      }

      const firstWord = cleanText(next.title).split(/\s+/)[0];
      if (!SUBSECTION_STARTERS.includes(firstWord)) {
        continue;
      }

      const lastField = current.fields[current.fields.length - 1];
      lastField.values = lastField.values.map((value) =>
        cleanText(value).replace(new RegExp(`\\s+${escapeRegex(firstWord)}$`), ''),
      );

      if (joinableSectionWords.has(next.title)) {
        const currentLastValue = lastField.values[lastField.values.length - 1];
        const trailingWord = cleanText(currentLastValue).split(/\s+/).at(-1);
        if (SUBSECTION_STARTERS.includes(trailingWord)) {
          lastField.values[lastField.values.length - 1] = cleanText(currentLastValue).replace(
            new RegExp(`\\s+${escapeRegex(trailingWord)}$`),
            '',
          );
          next.title = `${trailingWord} ${next.title}`;
          next.slug = slugify(next.title);
        }
      }
    }
  }

  return parsed;
}

function collectEntityTypeSeeds() {
  const seeds = [ENTRY_TYPE];

  for (const config of FIELD_CONFIGS) {
    if (!seeds.find((seed) => seed.slug === config.category)) {
      seeds.push({
        slug: config.category,
        label: titleCaseUpperText(config.category.replace(/_/g, ' ')),
        color: config.color,
        icon: config.icon,
        description: config.description,
        sort_order: config.sortOrder,
      });
    }
  }

  return seeds;
}

function summarizeSection(section) {
  return section.fields
    .map((field) => `${field.label}: ${field.values.join('; ')}`)
    .join('\n\n');
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

function buildTargetEntity(category, value) {
  if (isSentenceLikeEntityName(value) || isLikelyFragmentValue(category, value)) {
    return null;
  }

  return {
    slug: slugify(`${category}-${value}`),
    name: value,
    category,
    type_slug: category,
    aliases: [],
    description: null,
    lenses: ['symbolic'],
  };
}

function buildIssueEntity(entry, section) {
  if (section.kind === 'subsection' && isSentenceLikeEntityName(section.title)) {
    return null;
  }

  if (section.kind === 'main') {
    return {
      slug: entry.slug,
      name: entry.title,
      category: 'issue_intention_power',
      type_slug: 'issue_intention_power',
      aliases: [],
      description: summarizeSection(section) || null,
      lenses: ['correspondence', 'ritual'],
    };
  }

  return {
    slug: `${entry.slug}-${section.slug}`,
    name: `${entry.title} - ${section.title}`,
    category: 'issue_intention_power',
    type_slug: 'issue_intention_power',
    aliases: [section.title],
    description: summarizeSection(section) || null,
    lenses: ['correspondence', 'ritual'],
  };
}

function deriveSharedCorrespondenceRelationships(issueTargetsBySlug, targetStatsBySlug, parsed) {
  const issueSlugs = Array.from(issueTargetsBySlug.keys());
  const derivedRelationships = [];
  const maxLinksPerIssue = 12;
  const candidateLinksByIssue = new Map();

  function queueCandidate(sourceSlug, candidate) {
    if (!candidateLinksByIssue.has(sourceSlug)) {
      candidateLinksByIssue.set(sourceSlug, []);
    }
    candidateLinksByIssue.get(sourceSlug).push(candidate);
  }

  for (let sourceIndex = 0; sourceIndex < issueSlugs.length; sourceIndex += 1) {
    const sourceSlug = issueSlugs[sourceIndex];
    const sourceTargets = issueTargetsBySlug.get(sourceSlug);

    if (!sourceTargets || sourceTargets.size < 3) {
      continue;
    }

    const sourceTargetSlugs = Array.from(sourceTargets.keys());
    const sourceWeightTotal = sourceTargetSlugs.reduce((sum, targetSlug) => {
      const targetCount = targetStatsBySlug.get(targetSlug)?.issueCount || 1;
      return sum + (1 / Math.sqrt(targetCount));
    }, 0);

    for (let targetIndex = sourceIndex + 1; targetIndex < issueSlugs.length; targetIndex += 1) {
      const targetSlug = issueSlugs[targetIndex];
      const targetTargets = issueTargetsBySlug.get(targetSlug);

      if (!targetTargets || targetTargets.size < 3) {
        continue;
      }

      if (sourceSlug === targetSlug || sourceSlug.startsWith(`${targetSlug}-`) || targetSlug.startsWith(`${sourceSlug}-`)) {
        continue;
      }

      const sharedTargets = [];
      let sharedWeight = 0;

      for (const targetTargetSlug of targetTargets.keys()) {
        if (!sourceTargets.has(targetTargetSlug)) {
          continue;
        }

        sharedTargets.push(targetTargetSlug);
        const targetCount = targetStatsBySlug.get(targetTargetSlug)?.issueCount || 1;
        sharedWeight += 1 / Math.sqrt(targetCount);
      }

      if (sharedTargets.length < 3) {
        continue;
      }

      const targetWeightTotal = Array.from(targetTargets.keys()).reduce((sum, targetTargetSlug) => {
        const targetCount = targetStatsBySlug.get(targetTargetSlug)?.issueCount || 1;
        return sum + (1 / Math.sqrt(targetCount));
      }, 0);

      const rarityWeightedSimilarity = sharedWeight / Math.max(sourceWeightTotal, targetWeightTotal);
      if (rarityWeightedSimilarity < 0.26 || sharedWeight < 1.35) {
        continue;
      }

      const sharedTargetNames = sharedTargets
        .map((targetTargetSlug) => sourceTargets.get(targetTargetSlug)?.name || targetTargets.get(targetTargetSlug)?.name || targetTargetSlug)
        .slice(0, 4);

      const candidate = {
        relationship: {
          source_slug: sourceSlug,
          target_slug: targetSlug,
          type: 'shares_correspondence_with',
          relationship_type_slug: 'shares_correspondence_with',
          weight: Math.min(0.92, Math.max(0.38, Number(rarityWeightedSimilarity.toFixed(3)))),
          confidence: 'interpretive',
          source_citation: `${parsed.source.bookTitle}, derived from shared correspondences in ${parsed.source.sectionTitle}`,
          notes: `Shared ${sharedTargets.length} correspondences (${sharedTargetNames.join(', ')})`,
        },
        sharedCount: sharedTargets.length,
        score: rarityWeightedSimilarity,
      };

      queueCandidate(sourceSlug, candidate);
      queueCandidate(targetSlug, candidate);
    }
  }

  const selectedKeys = new Set();

  for (const issueSlug of issueSlugs) {
    const candidates = (candidateLinksByIssue.get(issueSlug) || [])
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        if (right.sharedCount !== left.sharedCount) {
          return right.sharedCount - left.sharedCount;
        }
        return `${left.relationship.source_slug}|${left.relationship.target_slug}`.localeCompare(
          `${right.relationship.source_slug}|${right.relationship.target_slug}`,
        );
      })
      .slice(0, maxLinksPerIssue);

    for (const candidate of candidates) {
      const key = `${candidate.relationship.source_slug}|${candidate.relationship.target_slug}|${candidate.relationship.type}`;
      if (!selectedKeys.has(key)) {
        selectedKeys.add(key);
        derivedRelationships.push(candidate.relationship);
      }
    }
  }

  return derivedRelationships;
}

function buildBundle(parsed) {
  const entityTypes = collectEntityTypeSeeds();
  const entities = [];
  const relationshipMap = new Map();
  const claims = [];
  const issueTargetsBySlug = new Map();
  const targetStatsBySlug = new Map();

  function addRelationship(item) {
    const key = `${item.source_slug}|${item.target_slug}|${item.type}`;
    if (!relationshipMap.has(key)) {
      relationshipMap.set(key, item);
      return;
    }

    const existing = relationshipMap.get(key);
    const notes = new Set([existing.notes, item.notes].filter(Boolean));
    const citations = new Set([existing.source_citation, item.source_citation].filter(Boolean));
    existing.notes = Array.from(notes).join(' | ');
    existing.source_citation = Array.from(citations).join(' | ');
    existing.weight = Math.max(existing.weight, item.weight);
  }

  for (const entry of parsed.entries) {
    for (const section of entry.sections) {
      const issueEntity = buildIssueEntity(entry, section);
      if (!issueEntity) {
        continue;
      }
      entities.push(issueEntity);

      if (section.kind === 'subsection') {
        addRelationship({
          source_slug: issueEntity.slug,
          target_slug: entry.slug,
          type: 'refines',
          relationship_type_slug: 'refines',
          weight: 0.92,
          confidence: 'tradition',
          source_citation: `${parsed.source.bookTitle}, ${parsed.source.sectionTitle}, p.${section.pageNumbers[0]}`,
          notes: `${section.title} refines ${entry.title}`,
        });
      }

      for (const field of section.fields) {
        const claimValues = dedupeBy(
          field.values.flatMap((value) => splitTopLevelList(value).map((item) => cleanText(item))).filter(Boolean),
          (item) => item.toLowerCase(),
        );

        if (claimValues.length > 0) {
          const pageSuffix = field.pageNumbers?.length ? `, p.${field.pageNumbers.join(',')}` : '';
          claims.push({
            entity_slug: issueEntity.slug,
            field_key: normalizeFieldKey(field.label),
            field_value: claimValues.join(', '),
            confidence: 'tradition',
            notes: `Imported from ${parsed.source.bookTitle}, ${parsed.source.sectionTitle}${pageSuffix} (${field.label})`,
            source: {
              title: parsed.source.bookTitle,
              citation: parsed.source.sectionTitle,
            },
          });
        }

        const config = getFieldConfig(field.label);
        if (!config) {
          continue;
        }

        const relationshipType = config.relationshipType;
        const values = dedupeBy(
          field.values.flatMap((value) => splitTopLevelList(value).map((item) => cleanText(item))).filter(Boolean),
          (item) => item.toLowerCase(),
        );

        for (const value of values) {
          const target = buildTargetEntity(config.category, value);
          if (!target) {
            continue;
          }
          entities.push(target);

          const sourceSlug = issueEntity.slug;
          const citationPages = field.pageNumbers.join(',');
          addRelationship({
            source_slug: sourceSlug,
            target_slug: target.slug,
            type: relationshipType,
            relationship_type_slug: relationshipType,
            weight: relationshipType === 'corresponds_to' ? 0.84 : 0.74,
            confidence: 'tradition',
            source_citation: `${parsed.source.bookTitle}, ${parsed.source.sectionTitle}, p.${citationPages}`,
            notes: `${field.label}: ${value}`,
          });

          if (relationshipType === 'corresponds_to') {
            if (!issueTargetsBySlug.has(sourceSlug)) {
              issueTargetsBySlug.set(sourceSlug, new Map());
            }
            issueTargetsBySlug.get(sourceSlug).set(target.slug, {
              name: target.name,
              category: target.category,
            });

            if (!targetStatsBySlug.has(target.slug)) {
              targetStatsBySlug.set(target.slug, {
                issueCount: 0,
              });
            }
          }
        }
      }
    }
  }

  for (const targetSlugs of issueTargetsBySlug.values()) {
    for (const targetSlug of targetSlugs.keys()) {
      const stats = targetStatsBySlug.get(targetSlug);
      if (stats) {
        stats.issueCount += 1;
      }
    }
  }

  for (const relationship of deriveSharedCorrespondenceRelationships(issueTargetsBySlug, targetStatsBySlug, parsed)) {
    addRelationship(relationship);
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
      entityTypes,
      relationshipTypes: RELATIONSHIP_TYPES,
      entities: dedupeBy(entities, (entity) => entity.slug),
      relationships: Array.from(relationshipMap.values()),
      claims: dedupeBy(
        claims,
        (claim) => `${claim.entity_slug}|${claim.field_key}|${claim.source?.citation || ''}`,
      ),
    },
  };
}

function defaultOutputs(inputPath) {
  const absolute = path.resolve(process.cwd(), inputPath);
  const baseName = path.basename(absolute, '.json');
  const outputDir = path.dirname(absolute);

  return {
    parsedOutput: path.join(outputDir, `${baseName}-parsed.json`),
    bundleOutput: path.join(outputDir, `${baseName}-bundle.json`),
  };
}

function main() {
  const args = parseArgs();
  const inputPath = path.resolve(process.cwd(), args.input);
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const parsedInputProvided = raw.kind === 'book-section-parse';
  const outputs = defaultOutputs(inputPath);
  const parsedOutputPath = args.parsedOutput ? path.resolve(process.cwd(), args.parsedOutput) : outputs.parsedOutput;
  const bundleOutputPath = args.output ? path.resolve(process.cwd(), args.output) : outputs.bundleOutput;

  const parsed = parsedInputProvided ? raw : cleanSectionCarryovers(parseSectionExtraction(raw));
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
