// Audit library books that are not currently used in course reading lists.
//
// Inputs:
// - scripts/courses.json: Supabase course snapshot with content.weeks[].readings[]
// - scripts/texts.json: Supabase text snapshot
// - scripts/library-grid.csv: planning metadata for library texts
//
// Usage:
//   node scripts/audit-unused-course-books.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const courses = JSON.parse(fs.readFileSync(path.join(__dirname, 'courses.json'), 'utf8'));
const texts = JSON.parse(fs.readFileSync(path.join(__dirname, 'texts.json'), 'utf8'));
const csv = fs.readFileSync(path.join(__dirname, 'library-grid.csv'), 'utf8');

function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  const [headers, ...body] = rows;
  return body
    .filter(r => r.some(Boolean))
    .map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] || ''])));
}

function normalize(value) {
  return (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'"]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TITLE_STOPWORDS = new Set(['the', 'a', 'an', 'of', 'and']);

function meaningfulTitleWords(value) {
  return normalize(value)
    .split(' ')
    .filter(word => word && !TITLE_STOPWORDS.has(word));
}

function stripLeadingArticle(value) {
  return value.replace(/^(the|a|an)\s+/i, '').trim();
}

function stripTrailingQualifier(value) {
  return value
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s*[:,-]\s*(selected|selections|selection|chapters?|books?|parts?|tractates?|sections?|volumes?).*$/i, '')
    .trim();
}

function buildVariants(title, section) {
  const sectionTitle = section ? section.split(',')[0].trim() : null;
  const stripped = stripTrailingQualifier(title);
  const strippedSection = sectionTitle ? stripTrailingQualifier(sectionTitle) : null;
  const all = [
    title,
    stripped,
    stripLeadingArticle(title),
    stripLeadingArticle(stripped),
    sectionTitle,
    strippedSection,
    strippedSection ? stripLeadingArticle(strippedSection) : null,
  ];
  const seen = new Set();
  return all.filter(v => {
    if (!v) return false;
    const key = normalize(v);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreMatch(candidate, text) {
  const textTitle = normalize(text.title);
  const textAuthor = normalize(text.author || '');
  const candidateAuthor = normalize(candidate.author || '');
  let best = 0;

  for (const variant of candidate.variants) {
    const variantTitle = normalize(variant);
    if (!variantTitle) continue;
    let score = 0;

    if (textTitle === variantTitle) score += 100;
    else if (textTitle.startsWith(variantTitle)) score += 80;
    else if (textTitle.includes(variantTitle)) score += 65;
    else if (variantTitle.includes(textTitle)) score += 55;

    const textMeaningful = meaningfulTitleWords(text.title).join(' ');
    const variantMeaningful = meaningfulTitleWords(variant).join(' ');
    if (textMeaningful && textMeaningful === variantMeaningful) score += 95;
    else if (textMeaningful.includes(variantMeaningful)) score += 75;
    else if (variantMeaningful.includes(textMeaningful)) score += 60;

    const words = variantTitle.split(' ').filter(Boolean);
    score += words.filter(w => textTitle.includes(w)).length * 4;
    if (candidateAuthor && textAuthor) {
      if (textAuthor === candidateAuthor) score += 30;
      else if (textAuthor.includes(candidateAuthor) || candidateAuthor.includes(textAuthor)) score += 20;
    }
    best = Math.max(best, score);
  }

  return best;
}

function extractReadings(course) {
  const readings = [];
  for (const week of course.content?.weeks || []) {
    for (const reading of week?.readings || []) {
      const title = reading?.title?.trim();
      if (!title) continue;
      readings.push({
        course: course.title,
        slug: course.slug,
        week: week.week_number || week.week || null,
        title,
        author: reading?.author?.trim() || null,
        section: reading?.section?.trim() || null,
        variants: buildVariants(title, reading?.section),
      });
    }
  }
  return readings;
}

const KNOWN_TITLE_ALIASES = new Map([
  ['sefer yetzirah saadias commentary', ['sepher yetzirah', 'sefer yetzirah']],
  ['the tao teh king or the tao and its characteristics', ['tao te ching', 'the tao te ching']],
  ['the yi king', ['i ching', 'the i ching']],
  ['the world as will and idea vol 2 of 3', ['the world as will and representation']],
  ['the book of the dead the papyrus of ani in the british museum', ['the egyptian book of the dead']],
  ['thus spake zarathustra a book for all and none', ['thus spoke zarathustra']],
  ['the harmony of the world harmonice mundi', ['harmonices mundi book v']],
  ['the hermetic museum vol i', ['the hermetic museum volume 1']],
  ['dialogues concerning natural religion', ['the natural history of religion']],
]);

function meaningfulOverlap(a, b) {
  const aWords = new Set(meaningfulTitleWords(a).filter(word => word.length > 2));
  const bWords = new Set(meaningfulTitleWords(b).filter(word => word.length > 2));
  return [...aWords].filter(word => bWords.has(word)).length;
}

function aliasMatches(text, reading) {
  const aliases = KNOWN_TITLE_ALIASES.get(normalize(text.title)) || [];
  const readingTitle = normalize(reading.title);
  return aliases.some(alias => {
    const normalizedAlias = normalize(alias);
    return readingTitle === normalizedAlias ||
      readingTitle.includes(normalizedAlias) ||
      normalizedAlias.includes(readingTitle);
  });
}

const metadataRows = parseCsv(csv);
const metadataByTitle = new Map(metadataRows.map(row => [normalize(row.Title), row]));
const readings = courses.flatMap(extractReadings);
const usesByTextId = new Map();
const nearUsesByTextId = new Map();

for (const reading of readings) {
  let best = null;
  for (const text of texts) {
    const score = scoreMatch(reading, text);
    if (!best || score > best.score) best = { text, score };
  }
  if (best?.score >= 60) {
    const existing = usesByTextId.get(best.text.id) || [];
    existing.push({ ...reading, score: best.score });
    usesByTextId.set(best.text.id, existing);
  } else if (best?.score >= 25) {
    const existing = nearUsesByTextId.get(best.text.id) || [];
    existing.push({ ...reading, score: best.score });
    nearUsesByTextId.set(best.text.id, existing);
  }
}

function findMetadata(text) {
  const exact = metadataByTitle.get(normalize(text.title));
  if (exact) return exact;

  const candidate = {
    title: text.title,
    author: text.author,
    variants: buildVariants(text.title, null),
  };
  let best = null;
  for (const row of metadataRows) {
    const score = scoreMatch(candidate, {
      title: row.Title,
      author: row['Author / Translator'],
    });
    if (!best || score > best.score) best = { row, score };
  }

  return best?.score >= 60 ? best.row : {};
}

const unused = texts
  .filter(text => !usesByTextId.has(text.id))
  .map(text => {
    const meta = findMetadata(text);
    const nearUses = readings
      .map(reading => {
        const aliased = aliasMatches(text, reading);
        return {
          ...reading,
          score: aliased ? 59 : scoreMatch(reading, text),
          aliased,
        };
      })
      .filter(reading =>
        reading.aliased ||
        (reading.score >= 30 && reading.score < 60 && meaningfulOverlap(text.title, reading.title) > 0)
      )
      .sort((a, b) => b.score - a.score);
    const nearCourseTitles = [...new Set(nearUses.map(use => use.course))].sort();
    return {
      ...text,
      idTag: meta.ID || '',
      tradition: meta.Tradition || '',
      domain: meta.Domain || '',
      priority: meta.Priority || '',
      layer: meta.Layer || '',
      status: meta.Status || '',
      publicDomainStatus: meta['Public Domain Status'] || '',
      sourceUrl: meta['Source URL'] || '',
      nearUses,
      nearCourseTitles,
    };
  })
  .sort((a, b) =>
    Number(Boolean(b.nearUses.length)) - Number(Boolean(a.nearUses.length)) ||
    (a.tradition || 'zzz').localeCompare(b.tradition || 'zzz') ||
    (a.domain || 'zzz').localeCompare(b.domain || 'zzz') ||
    a.title.localeCompare(b.title)
  );

const titleCleanup = unused.filter(text => text.nearUses.length > 0);
const trulyUnused = unused.filter(text => text.nearUses.length === 0);

const byTradition = new Map();
const byDomain = new Map();
for (const text of unused) {
  const tradition = text.tradition || 'Unmapped in CSV';
  const domain = text.domain || 'Unmapped in CSV';
  byTradition.set(tradition, (byTradition.get(tradition) || 0) + 1);
  byDomain.set(domain, (byDomain.get(domain) || 0) + 1);
}

function tableEscape(value) {
  return String(value || '-').replace(/\|/g, '\\|');
}

function countsTable(map, label) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => `| ${tableEscape(name)} | ${count} |`)
    .join('\n');
}

const courseIdeas = [
  {
    title: 'The Body, Breath, and Practice',
    lane: 'Beginner/Foundation track',
    trackPlacement: 'Foundation Door: Embodied Knowing',
    readiness: 'Good beginner course if framed around direct experience, breath, attention, and disciplined response rather than advanced ritual theory.',
    relationship: 'Pairs naturally with Nature, Evolution, and the Living Cosmos. Nature gives the organism/cosmos frame; Body, Breath, and Practice brings it into lived practice.',
    books: ['The Science of Breath: The Essential Works of Yogi', 'The Art of War', 'Light On The Path and Through the Gates of Gold', 'Beyond the Pleasure Principle', 'Evidence as to Man\'s Place in Nature'],
    why: 'Builds on C01/C02 by asking what disciplined bodies, breath, instinct, and trained response know that concepts alone cannot reach.',
  },
  {
    title: 'Nature, Evolution, and the Living Cosmos',
    lane: 'Beginner/Foundation track',
    trackPlacement: 'Foundation Door: Nature and Scale',
    readiness: 'Strong beginner course because it starts from observable life, bodies, evolution, heavens, light, and place before asking heavier metaphysical questions.',
    relationship: 'The most grounded entry point in the unused set. It can prepare students for C04 later without requiring them to begin inside epistemology.',
    books: ['The Descent of Man, and Selection in Relation to Sex', 'Evidence as to Man\'s Place in Nature', 'Mechanism of the Heavens', 'The Principles of Light and Color', 'A Treatise on the Circle and the Sphere'],
    why: 'Lets the unused science shelf breathe: evolution, astronomy, optics, geometry, embodiment, and cosmic scale as a counterweight to purely symbolic knowing.',
  },
  {
    title: 'Ritual, Magic, and the Architecture of Practice',
    lane: 'Advanced/Practice track',
    trackPlacement: 'Practice Door: Ritual Systems',
    readiness: 'Not beginner. This should come after students have symbolic literacy and strong discernment guardrails.',
    relationship: 'Middle course in an Esoteric Practice track: tradition context first, ritual architecture second, modern invention and critique third.',
    books: ['The Book of Ceremonial Magic', 'Jewish Magic and Superstition', 'The Practice of Magical Evocation: A Complete Course', 'Christian Astrology - Volume II', 'Comte de Gabalis'],
    why: 'Turns symbolic systems into operating procedures while preserving the curriculum’s discernment frame: what rituals claim, what they do psychologically, and what traditions require before practice.',
  },
  {
    title: 'Mythic Imagination: From Classical Pattern to Personal Meaning',
    lane: 'Beginner/Foundation track',
    trackPlacement: 'Foundation Door: Story and Symbol',
    readiness: 'Probably the easiest beginner course in the set. It can meet people through stories before asking them to hold complex multi-lens theory.',
    relationship: 'Works as the front door to C02, but does not need to be subordinate to C02. It can stand as a first course for myth-oriented learners.',
    books: ['Bulfinch\'s Mythology', 'Bulfinch\'s Mythology: The Age of Fable', 'Essays by Ralph Waldo Emerson', 'The Art of Worldly Wisdom: A Pocket Oracle'],
    why: 'Uses the unused myth and essay material for a lighter but still serious course on mythic literacy, imagination, moral style, and self-authorship.',
  },
  {
    title: 'Rosicrucians, Theosophy, and Modern Esoteric Invention',
    lane: 'Advanced/History track',
    trackPlacement: 'Practice Door: Modern Esoteric History',
    readiness: 'Not beginner unless heavily reframed. Best after students have enough context to distinguish tradition, reception, invention, and modern mythmaking.',
    relationship: 'Final course in the Esoteric Practice/Invention track. It asks students to evaluate modern esoteric claims without flattening them into fraud or truth.',
    books: ['The Real History of the Rosicrucians', 'The Veil of Isis', 'The Emerald Tablets of Thoth the Atlantean', 'Comte de Gabalis', 'Light On The Path and Through the Gates of Gold'],
    why: 'A clean way to use the modern esoteric shelf without pretending all sources have the same status: lineage, invention, reception, mythmaking, and verification.',
  },
  {
    title: 'Strategy, Power, and Discernment',
    lane: 'Beginner/Foundation or Practical track',
    trackPlacement: 'Foundation Door: Discernment Under Pressure',
    readiness: 'Can be beginner if practical and scenario-based. It should be framed as discernment, timing, restraint, and self-command rather than conquest.',
    relationship: 'Completes the beginner foundation set by asking what wisdom looks like when there are stakes, conflict, fear, or urgency.',
    books: ['The Art of War', 'The Art of Worldly Wisdom: A Pocket Oracle', 'Essays by Ralph Waldo Emerson', 'Beyond the Pleasure Principle'],
    why: 'A sharper practical course on power literacy: when to yield, resist, govern the self, negotiate, or refuse.',
  },
  {
    title: 'Form, Number, and Vision',
    lane: 'Visual/Mathematical track',
    trackPlacement: 'Foundation or Intermediate Door: Pattern and Perception',
    readiness: 'Could be beginner if taught visually and experientially; intermediate if taught as sacred geometry theory.',
    relationship: 'Connects the science/nature cluster with the symbol/myth cluster through perception: form, light, heavens, color, and proportion.',
    books: ['A Treatise on the Circle and the Sphere', 'Mechanism of the Heavens', 'The Principles of Light and Color', 'Christian Astrology - Volume II'],
    why: 'Builds from C13 into a more visual and technical exploration of form: circles, spheres, heavens, optics, color, and astrological geometry.',
  },
  {
    title: 'Jewish Esoteric Practice: Text, Law, Folk Religion',
    lane: 'Advanced/Tradition-specific track',
    trackPlacement: 'Practice Door: Grounded Tradition Before Ritual Comparison',
    readiness: 'Not beginner. It needs careful framing, tradition-specific respect, and appropriation/discernment guardrails.',
    relationship: 'Best placed before Ritual, Magic, and the Architecture of Practice so ritual comparison starts from a grounded tradition rather than generalized occultism.',
    books: ['Jewish Magic and Superstition', 'Jewish Magic and Superstition: A Study in Folk Religion', 'Sefer Yetzirah & Saadia’s Commentary', 'The Book of Ceremonial Magic'],
    why: 'Pairs the Qabalah arc with concrete folk-practice and commentary material, while carefully distinguishing textual mysticism from later ceremonial appropriation.',
  },
];

const courseFamilies = [
  {
    title: 'Beginner / Foundation Doors',
    role: 'New entry courses that do not require the learner to start with the dense core spine.',
    sequence: ['Mythic Imagination: From Classical Pattern to Personal Meaning', 'Nature, Evolution, and the Living Cosmos', 'The Body, Breath, and Practice', 'Strategy, Power, and Discernment'],
    fit: 'These are not lesser courses. They are first doors into Prismarium: story, nature, body, and practical discernment.',
  },
  {
    title: 'Esoteric Practice / Modern Invention',
    role: 'Advanced path for ritual systems, grounded tradition, and modern esoteric history.',
    sequence: ['Jewish Esoteric Practice: Text, Law, Folk Religion', 'Ritual, Magic, and the Architecture of Practice', 'Rosicrucians, Theosophy, and Modern Esoteric Invention'],
    fit: 'This should not be a beginner path. It is where the platform can handle occult material maturely: context first, practice second, critique and invention third.',
  },
  {
    title: 'Visual / Mathematical Imagination',
    role: 'A visual-symbolic path that can be beginner-friendly or intermediate depending on framing.',
    sequence: ['Form, Number, and Vision'],
    fit: 'This path connects geometry, optics, astronomy, color, and symbolic perception. It can later expand into more visual courses or constellations.',
  },
];

const infrastructurePlan = [
  {
    phase: 'Phase 1: Editorial taxonomy before schema work',
    action: 'Define course families in planning docs: Core Spine, Beginner/Foundation Doors, Advanced Practice Tracks, Visual/Mathematical Imagination, and future Constellations.',
    why: 'The curriculum needs language before the database needs columns. This prevents us from building the wrong abstraction.',
  },
  {
    phase: 'Phase 2: Metadata-only implementation',
    action: 'Add family/track fields inside course content JSON first: course_family, track_slug, track_order, recommended_level, entry_point, prerequisites, and related_course_slugs.',
    why: 'The current course infrastructure already stores rich JSON content, so we can test the model without a migration.',
  },
  {
    phase: 'Phase 3: Catalog UI support',
    action: 'Update the courses page to group/filter by course family instead of showing one flat sequence only.',
    why: 'Learners should see multiple doors into the system, not a single intimidating ladder.',
  },
  {
    phase: 'Phase 4: Admin/editor support',
    action: 'Add fields to the course admin editor/importer so track metadata can be maintained without hand-editing JSON.',
    why: 'Once the model feels right, editors need stable controls.',
  },
  {
    phase: 'Phase 5: Optional database normalization',
    action: 'Only after the model proves itself, add course_tracks/course_families tables or a course_track_membership table if filtering, analytics, or many-to-many placement requires it.',
    why: 'Avoid overbuilding now. Some courses may belong to multiple paths, so the normalized model should wait until real usage tells us what shape it needs.',
  },
];

const lines = [];
lines.push('# Unused Course Books Audit');
lines.push('');
lines.push(`_Generated ${new Date().toISOString()} from \`scripts/courses.json\`, \`scripts/texts.json\`, and \`scripts/library-grid.csv\`._`);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- Courses scanned: **${courses.length}**`);
lines.push(`- Library texts scanned: **${texts.length}**`);
lines.push(`- Course reading occurrences scanned: **${readings.length}**`);
lines.push(`- Library texts matched to at least one course reading: **${usesByTextId.size}**`);
lines.push(`- Library texts not matched to any current course reading: **${unused.length}**`);
lines.push(`- Likely title/alias cleanup rather than true curriculum gaps: **${titleCleanup.length}**`);
lines.push(`- Strongly unused, with no near-match course demand: **${trulyUnused.length}**`);
lines.push('');
lines.push('The course export currently has no explicit `course_texts` links, so this audit uses the same fuzzy title/author matching approach as `scripts/audit-course-books.mjs`: a reading counts as using a library text when the best score is at least 60.');
lines.push('');
lines.push('Near matches below the threshold are marked as title/alias cleanup. These are books that may be conceptually used by a course but not reliably matched by the current data.');
lines.push('');
lines.push('## Unused by Tradition');
lines.push('');
lines.push('| Tradition | Unused books |');
lines.push('|---|---:|');
lines.push(countsTable(byTradition, 'Tradition'));
lines.push('');
lines.push('## Unused by Domain');
lines.push('');
lines.push('| Domain | Unused books |');
lines.push('|---|---:|');
lines.push(countsTable(byDomain, 'Domain'));
lines.push('');
lines.push('## Title/Alias Cleanup');
lines.push('');
lines.push('These books appear unused by strict matching, but course readings point near them. Fixing aliases, course titles, or metadata would likely convert them from "unused" to "used."');
lines.push('');
lines.push('| ID | Library title | Author | Near course demand | Best course-reading title |');
lines.push('|---|---|---|---|---|');
for (const text of titleCleanup) {
  const bestNear = [...text.nearUses].sort((a, b) => b.score - a.score)[0];
  lines.push(`| ${tableEscape(text.idTag)} | ${tableEscape(text.title)} | ${tableEscape(text.author)} | ${tableEscape(text.nearCourseTitles.join('; '))} | ${tableEscape(bestNear ? `${bestNear.title} (${bestNear.score})` : '-')} |`);
}
lines.push('');
lines.push('## Strongly Unused Books');
lines.push('');
lines.push('These have no strict course match and no near-match course reading demand in the current export.');
lines.push('');
lines.push('| ID | Title | Author | Tradition | Domain | Priority | Layer | PD status |');
lines.push('|---|---|---|---|---|---|---|---|');
for (const text of trulyUnused) {
  lines.push(`| ${tableEscape(text.idTag)} | ${tableEscape(text.title)} | ${tableEscape(text.author)} | ${tableEscape(text.tradition)} | ${tableEscape(text.domain)} | ${tableEscape(text.priority)} | ${tableEscape(text.layer)} | ${tableEscape(text.publicDomainStatus)} |`);
}
lines.push('');
lines.push('## Curriculum Reframe');
lines.push('');
lines.push('The unused books should not all be forced into the existing 15-course spine. Several of them are better understood as new entry doors or separate tracks. This is especially true for the nature, body, myth, and strategy material: those courses can be beginner-friendly foundations rather than awkward insertions between advanced courses.');
lines.push('');
lines.push('Recommended model: keep the current core spine intact, then add course families around it.');
lines.push('');
lines.push('- **Core Spine**: the existing Prismarium sequence for deep multi-lens synthesis.');
lines.push('- **Beginner / Foundation Doors**: gentler first courses organized around story, nature, body, and practical discernment.');
lines.push('- **Advanced Practice Tracks**: tradition-specific, ritual, and modern esoteric material that needs stronger guardrails.');
lines.push('- **Visual / Mathematical Imagination**: form, light, geometry, astronomy, and symbolic perception.');
lines.push('');
lines.push('## Proposed Course Families');
lines.push('');
for (const family of courseFamilies) {
  lines.push(`### ${family.title}`);
  lines.push('');
  lines.push(`- Role: ${family.role}`);
  lines.push(`- Suggested sequence: ${family.sequence.join(' -> ')}`);
  lines.push(`- How it fits: ${family.fit}`);
  lines.push('');
}
lines.push('## Candidate Course Placement');
lines.push('');
lines.push('| Course candidate | Family / door | Beginner readiness | Relationship to the other candidates |');
lines.push('|---|---|---|---|');
for (const idea of courseIdeas) {
  lines.push(`| ${tableEscape(idea.title)} | ${tableEscape(idea.trackPlacement)} | ${tableEscape(idea.readiness)} | ${tableEscape(idea.relationship)} |`);
}
lines.push('');
lines.push('## Infrastructure Integration Plan');
lines.push('');
lines.push('The current course infrastructure appears built around individual courses and a mostly flat catalog. Before implementing tracks in the product, treat this as a staged rollout.');
lines.push('');
for (const item of infrastructurePlan) {
  lines.push(`### ${item.phase}`);
  lines.push('');
  lines.push(`- Action: ${item.action}`);
  lines.push(`- Why: ${item.why}`);
  lines.push('');
}
lines.push('## Course Candidates');
lines.push('');
for (const idea of courseIdeas) {
  const available = idea.books.filter(title => unused.some(text => normalize(text.title) === normalize(title)));
  const partial = idea.books.filter(title => !available.includes(title));
  lines.push(`### ${idea.title}`);
  lines.push('');
  lines.push(`- Lane: ${idea.lane}`);
  lines.push(`- Family / door: ${idea.trackPlacement}`);
  lines.push(`- Beginner readiness: ${idea.readiness}`);
  lines.push(`- Relationship to the other candidates: ${idea.relationship}`);
  lines.push(`- Unused anchor books: ${available.length ? available.join('; ') : 'none found by exact title'}`);
  if (partial.length) lines.push(`- Already-used or title-variant support books: ${partial.join('; ')}`);
  lines.push(`- Why now: ${idea.why}`);
  lines.push('');
}

const outPath = path.join(root, 'docs', 'audits', 'unused-course-books-audit.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log(`Wrote ${outPath}`);
console.log(`Courses: ${courses.length}`);
console.log(`Texts: ${texts.length}`);
console.log(`Readings: ${readings.length}`);
console.log(`Used texts: ${usesByTextId.size}`);
console.log(`Unused texts: ${unused.length}`);
console.log(`Title/alias cleanup texts: ${titleCleanup.length}`);
console.log(`Strongly unused texts: ${trulyUnused.length}`);
console.log('');
console.log('Top unused traditions:');
for (const [name, count] of Array.from(byTradition.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`- ${name}: ${count}`);
}
