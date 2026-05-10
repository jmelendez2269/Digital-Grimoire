// Audit the books that course curricula reference but the library doesn't yet have,
// classifying each by likely public-domain status using author death-dates and the US 95-year rule.
//
// Prereq:
//   curl ".../courses?select=id,title,slug,is_published,content" -o scripts/courses.json
//   curl ".../texts?select=id,title,author" -o scripts/texts.json
//
// Usage: node scripts/audit-missing-pd.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const courses = JSON.parse(fs.readFileSync(path.join(__dirname, 'courses.json'), 'utf8'));
const texts = JSON.parse(fs.readFileSync(path.join(__dirname, 'texts.json'), 'utf8'));

// ── Matcher (mirrors app/src/lib/courses/match-course-texts.ts) ──────────────
function normalize(v) {
  return (v || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’'"]/g, '').replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
const stripArticle = v => v.replace(/^(the|a|an)\s+/i, '').trim();
const stripQual = v => v.replace(/\s*\([^)]*\)\s*$/g, '')
  .replace(/\s*[:,-]\s*(selected|selections|selection|chapters?|books?|parts?|tractates?|sections?|volumes?).*$/i, '').trim();

function variants(title, section) {
  const sec = section ? section.split(',')[0].trim() : null;
  const all = [title, stripQual(title), stripArticle(title), stripArticle(stripQual(title)),
    sec, sec ? stripQual(sec) : null, sec ? stripArticle(stripQual(sec)) : null];
  const seen = new Set();
  return all.filter(v => { if (!v) return false; const k = normalize(v); if (!k || seen.has(k)) return false; seen.add(k); return true; });
}

function score(cand, text) {
  const tT = normalize(text.title), tA = normalize(text.author || ''), cA = normalize(cand.author || '');
  let best = 0;
  for (const v of cand.variants) {
    const nv = normalize(v); if (!nv) continue;
    let s = 0;
    if (tT === nv) s += 100; else if (tT.startsWith(nv)) s += 80; else if (tT.includes(nv)) s += 65; else if (nv.includes(tT)) s += 55;
    s += nv.split(' ').filter(Boolean).filter(w => tT.includes(w)).length * 4;
    if (cA && tA) {
      if (tA === cA) s += 30; else if (tA.includes(cA) || cA.includes(tA)) s += 20;
    }
    best = Math.max(best, s);
  }
  return best;
}
function matched(cand) { return texts.some(t => score(cand, t) >= 60); }

// ── Author death-date / classifier ────────────────────────────────────────────
const AUTHOR_DEATH = {
  'plato': -1, 'aristotle': -1, 'sunzi': -1, 'sun tzu': -1, 'laozi': -1, 'lao tzu': -1,
  'confucius': -1, 'hermes trismegistus': -1, 'padmasambhava': -1, 'patanjali': -1,
  'mencius': -1, 'chuang tzu': -1, 'zhuangzi': -1, 'unknown': -1, 'anonymous': -1, 'various': -1,
  'rabbi akiba ben joseph': -1, 'euclid': -1, 'al-ghazali': 1111, 'avicenna': 1037,
  'maimonides': 1204, 'ibn rushd': 1198, 'ibn arabi': 1240, 'al-ghazali (al)': 1111,
  'hildegard of bingen': 1179, 'julian of norwich': 1416, 'mechthild of magdeburg': 1282,
  'christine de pizan': 1430, 'thomas à kempis': 1471, 'thomas a kempis': 1471,
  'teresa of ávila': 1582, 'teresa of avila': 1582, 'st. teresa of ávila': 1582,
  'meister eckhart': 1328, 'st. john of the cross': 1591,
  // early modern
  'baltasar gracián': 1658, 'francis bacon': 1626, 'rené descartes': 1650, 'rene descartes': 1650,
  'johannes kepler': 1630, 'johann valentin andreae': 1654,
  // Enlightenment / 19c
  'arthur schopenhauer': 1860, 'immanuel kant': 1804, 'david hume': 1776,
  'g.w.f. hegel': 1831, 'gottfried wilhelm leibniz': 1716,
  'friedrich nietzsche': 1900, 'mary wollstonecraft': 1797, 'john stuart mill': 1873,
  'ralph waldo emerson': 1882, 'charles darwin': 1882,
  // late 19c / early 20c (life+70 expired)
  'sigmund freud': 1939, 'william james': 1910, 'helena petrovna blavatsky': 1891, 'h.p. blavatsky': 1891,
  'henri bergson': 1941, 'émile durkheim': 1917, 'emile durkheim': 1917,
  'edward burnett tylor': 1917, 'edward tylor': 1917, 'andrew lang': 1912, 'james mooney': 1921,
  'james legge': 1897, 'f. max müller': 1900, 'max müller': 1900, 'h. kern': 1917,
  'sir edwin arnold': 1904, 'g. r. s. mead': 1933, 'reynold nicholson': 1945,
  'alice fletcher': 1923, 'francis la flesche': 1932, 'paul carus': 1919,
  'evelyn underhill': 1941, 'arthur edward waite': 1942, 's. l. macgregor mathers': 1918,
  'lewis spence': 1955, 'p.d. ouspensky': 1947, 'p. d. ouspensky': 1947,
  'mabel collins': 1927,
  'anna kingsford': 1888, 'edward maitland': 1897,
  'e. a. wallis budge': 1934, 'e.a. wallis budge': 1934,
  // borderline (life+70 expires soon or just past)
  'manly p. hall': 1990, 'alice a. bailey': 1949,
  'mohammed marmaduke pickthall': 1936, 'thomas heath': 1940,
  'washington matthews': 1905, 'franz boas': 1942,
  'robert sutherland rattray': 1938,
  'three initiates': 1932, // primary author
  'yogi ramacharaka': 1932,
  'arthur stanley eddington': 1944, 'sir arthur stanley eddington': 1944,
  'alfred north whitehead': 1947, 'john dewey': 1952, 'bertrand russell': 1970,
  'albert einstein': 1955, 'lowell coolidge julian': 1954,
  // ⛔ post-1955 (still in copyright)
  'joshua trachtenberg': 1959, 'doreal': 1963, 'franz bardon': 1958,
  'carl jung': 1961, 'c.g. jung': 1961, 'c. g. jung': 1961,
  'thomas kuhn': 1996, 'mircea eliade': 1986, 'joseph campbell': 1987,
  'martin heidegger': 1976, 'jean-paul sartre': 1980, 'simone de beauvoir': 1986,
  'michel foucault': 1984, 'michael beloved': null,
  'joel fotinos': null, 'morley': null,
  // additional historical figures pulled from the missing-readings review list
  'henri bergson': 1941, 'philo of alexandria': 50, 'philo': 50,
  'jeanne guyon': 1717, 'madame guyon': 1717,
  'franz hartmann': 1912, 'margery kempe': 1438,
  'ibn arabi': 1240, 'al-ghazali (al)': 1111,
};

// Title → canonical author for unambiguous works (used when author field is missing/garbled).
const TITLE_AUTHOR_HINT = [
  [/^creative evolution$/i, 'henri bergson'],
  [/tarjuman/i, 'ibn arabi'],
  [/niche for lights/i, 'al-ghazali'],
  [/incoherence of (the )?philosophers/i, 'al-ghazali'],
  [/\btertium organum\b/i, 'p.d. ouspensky'],
  [/world as will and (representation|idea)/i, 'arthur schopenhauer'],
  [/chemical wedding/i, 'johann valentin andreae'],
  [/elementary forms.*religious life/i, 'émile durkheim'],
  [/guide for the perplexed/i, 'maimonides'],
  [/works of philo/i, 'philo of alexandria'],
  [/autobiography of madame guyon/i, 'jeanne guyon'],
  [/book of margery kempe/i, 'margery kempe'],
  [/scivias/i, 'hildegard of bingen'],
  [/revelations of divine love/i, 'julian of norwich'],
  [/flowing light of the godhead/i, 'mechthild of magdeburg'],
  [/book of the city of ladies/i, 'christine de pizan'],
  [/perfect way/i, 'anna kingsford'],
  [/interior castle|life of teresa/i, 'teresa of ávila'],
  [/magic white and black/i, 'franz hartmann'],
];

// Title-based ancient/PD heuristics for cases where the author field is malformed
// (e.g. "T122" for Rig Veda, missing/truncated authors for sacred-text collections).
const TITLE_ANCIENT_PATTERNS = [
  /\brig veda\b/i, /\bhebrew bible\b/i, /\bnew testament\b/i, /\bold testament\b/i,
  /\bpopol vuh\b/i, /\bbhagavad[\s-]?g[iî]ta\b/i, /\bquran\b|\bkoran\b/i,
  /\bapocryphal\b/i, /\bupanishad/i, /\bdhammapada\b/i, /\blotus sutra\b/i,
  /\bi[\s-]?ching\b/i, /\btorah\b/i, /\btalmud\b/i, /\bzohar\b/i,
  /\bisis unveiled\b/i, // Blavatsky 1877 — pre-1929
];

const lifePlus70CutoffYear = 2026 - 70; // 1956
const PD_TRANSLATORS = new Set(['james legge', 'f. max müller', 'max müller', 'h. kern', 'herbert a. giles', 'helena petrovna blavatsky', 's. l. macgregor mathers', 'paul carus', 'sir edwin arnold', 'g. r. s. mead', 'reynold nicholson', 'arthur edward waite']);

function authorKey(a) { return (a || '').trim().toLowerCase(); }

function deathYear(author) {
  const key = authorKey(author);
  if (!key) return undefined;
  if (key in AUTHOR_DEATH) return AUTHOR_DEATH[key];
  const first = key.split(/[,;]/)[0].trim();
  if (first && first in AUTHOR_DEATH) return AUTHOR_DEATH[first];
  return undefined;
}

// Try to find any known author name appearing anywhere in title/author/section.
// Handles the data-quality issue where author is sometimes a section/ID string and
// the real author leaks into title or section.
function bestAuthorMatch(reading) {
  const blob = `${reading.title || ''} || ${reading.author || ''} || ${reading.section || ''}`.toLowerCase();
  const found = [];
  for (const name of Object.keys(AUTHOR_DEATH)) {
    if (name === 'unknown' || name === 'anonymous' || name === 'various') continue;
    if (name.length < 5) continue; // avoid false hits on short keys
    if (blob.includes(name)) {
      found.push({ name, death: AUTHOR_DEATH[name] });
    }
  }
  // Prefer most specific (longest) match.
  found.sort((a, b) => b.name.length - a.name.length);
  return found[0] || null;
}

function classify(reading) {
  const reasons = [];
  let verdict = 'review';
  let resolvedAuthor = reading.author;

  // First: direct author lookup.
  let death = deathYear(reading.author);

  // Fallback: scan title + author + section blob for any known author.
  if (death === undefined) {
    const hit = bestAuthorMatch(reading);
    if (hit) {
      death = hit.death;
      resolvedAuthor = hit.name;
      reasons.push(`resolved author from text: "${hit.name}"`);
    }
  }

  // Fallback: title → known author hint.
  if (death === undefined) {
    for (const [rx, name] of TITLE_AUTHOR_HINT) {
      if (rx.test(reading.title) && name in AUTHOR_DEATH) {
        death = AUTHOR_DEATH[name];
        resolvedAuthor = name;
        reasons.push(`title hints author: "${name}"`);
        break;
      }
    }
  }

  // Fallback: title-based ancient text recognition.
  if (death === undefined) {
    if (TITLE_ANCIENT_PATTERNS.some(rx => rx.test(reading.title))) {
      death = -1;
      reasons.push('matched ancient/classical title pattern');
    }
  }

  if (death === -1) {
    verdict = 'pd-original-translation-risk';
    reasons.push('ancient/classical author — original is PD');
    if (reading.author && PD_TRANSLATORS.has(authorKey(reading.author))) {
      reasons.push('looks like a known PD-era translator');
    }
  } else if (typeof death === 'number' && death <= lifePlus70CutoffYear) {
    verdict = 'likely-pd';
    reasons.push(`author died ${death} (life+70 expired)`);
  } else if (typeof death === 'number') {
    verdict = 'likely-still-in-copyright';
    reasons.push(`author died ${death} (life+70 NOT expired)`);
  } else if (death === null) {
    verdict = 'likely-still-in-copyright';
    reasons.push('author is contemporary');
  } else {
    verdict = 'review';
    reasons.push('author not in lookup');
  }

  return { verdict, reasons, resolvedAuthor };
}

// ── Extract missing readings ─────────────────────────────────────────────────
const aggregate = new Map(); // normalized title -> { title, author, courses:Set, verdict, reasons }

for (const course of courses) {
  const seen = new Set();
  for (const week of course.content?.weeks || []) {
    for (const r of week?.readings || []) {
      const title = r?.title?.trim(); if (!title) continue;
      const k = normalize(title); if (!k || seen.has(k)) continue; seen.add(k);
      const cand = { title, author: r?.author?.trim() || null, section: r?.section?.trim() || null, variants: variants(title, r?.section) };
      if (matched(cand)) continue;
      if (!aggregate.has(k)) {
        const { verdict, reasons, resolvedAuthor } = classify(cand);
        aggregate.set(k, { title, author: cand.author, resolvedAuthor, section: cand.section, courses: new Set(), verdict, reasons });
      }
      aggregate.get(k).courses.add(course.title);
    }
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
const buckets = { 'likely-pd': [], 'pd-original-translation-risk': [], 'likely-still-in-copyright': [], 'review': [] };
for (const item of aggregate.values()) buckets[item.verdict].push(item);

const lines = [];
lines.push('# Public-Domain Audit — Books Pending Upload');
lines.push('');
lines.push(`_Generated ${new Date().toISOString()} · scope: course readings not yet matched in the library_`);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- Unique missing titles: **${aggregate.size}**`);
lines.push(`- ✅ Likely public-domain (author died ≥ 70y ago): **${buckets['likely-pd'].length}**`);
lines.push(`- ⚠ Likely PD original, **translation copyright unknown**: **${buckets['pd-original-translation-risk'].length}**`);
lines.push(`- ⛔ Likely still in copyright: **${buckets['likely-still-in-copyright'].length}**`);
lines.push(`- ❓ Needs human review (author not in lookup): **${buckets['review'].length}**`);
lines.push('');
lines.push('### Method');
lines.push('');
lines.push('1. Pulled every reading referenced in `courses.content.weeks[].readings[]`.');
lines.push('2. Used the same fuzzy matcher as the app (`matchCourseTextsFromContent`) to drop ones that are already in the library.');
lines.push(`3. Classified the rest with a hardcoded author death-date table (life+70 → PD if author died ≤ ${lifePlus70CutoffYear}).`);
lines.push('4. Ancient/classical authors: original is always PD, but the **specific translation** you upload determines copyright. Check the translator/edition before sourcing.');
lines.push('');

function row(item) {
  const title = item.title.replace(/\|/g, '\\|');
  const author = (item.author || '—').replace(/\|/g, '\\|');
  const section = (item.section || '').replace(/\|/g, '\\|');
  return `| ${title} | ${author} | ${section || '—'} | ${item.courses.size} | ${item.reasons.join(' · ').replace(/\|/g, '\\|')} |`;
}

function section(title, items, intro) {
  lines.push(`## ${title}`);
  lines.push('');
  if (intro) { lines.push(intro); lines.push(''); }
  if (items.length === 0) { lines.push('_None._'); lines.push(''); return; }
  lines.push('| Title | Author | Section/Edition | # courses | Reasoning |');
  lines.push('|---|---|---|---|---|');
  items.slice().sort((a, b) => b.courses.size - a.courses.size || a.title.localeCompare(b.title))
    .forEach(i => lines.push(row(i)));
  lines.push('');
}

section('⛔ Likely still in copyright — DO NOT UPLOAD without rights', buckets['likely-still-in-copyright'],
  'Author died after 1956 or is contemporary. These would need licensing or replacement with a PD alternative.');
section('❓ Needs human review', buckets['review'],
  'Author not in the lookup table. Manual research before upload.');
section('⚠ Likely PD original, translation copyright unknown', buckets['pd-original-translation-risk'],
  'Pick a PD translation (e.g., James Legge for Confucian/Daoist texts; Müller\'s *Sacred Books of the East*; Wallis Budge for Egyptian; pre-1929 editions on Gutenberg/sacred-texts). Modern translations from publishers like Penguin, Oxford World Classics, etc. are typically still in copyright.');
section('✅ Likely public-domain — safe to upload', buckets['likely-pd'],
  'Author died ≥ 70 years ago. Original-language work is PD; if it\'s a translation, double-check the translator is also pre-1956 (death-year shown above).');

const outDir = path.join(process.cwd(), 'docs', 'audits');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'pending-uploads-public-domain-audit.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log(`Wrote ${outPath}`);
console.log(`Missing total: ${aggregate.size}`);
console.log(`  ✅ likely-pd: ${buckets['likely-pd'].length}`);
console.log(`  ⚠ pd-original-translation-risk: ${buckets['pd-original-translation-risk'].length}`);
console.log(`  ⛔ likely-still-in-copyright: ${buckets['likely-still-in-copyright'].length}`);
console.log(`  ❓ review: ${buckets['review'].length}`);
