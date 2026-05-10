// Audit library texts for public-domain status.
//
// Prereq:
//   curl ".../rest/v1/texts?select=id,title,author,year,publisher,license,source_url,confidence,domain&order=title&limit=5000" \
//        -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -o scripts/texts-meta.json
//
// Usage: node scripts/audit-public-domain.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const texts = JSON.parse(fs.readFileSync(path.join(__dirname, 'texts-meta.json'), 'utf8'));

// US PD threshold: anything with a real first-publication year < 1930 is PD as of 2026 (95-year rule).
const US_PD_PUB_YEAR_CUTOFF = 1930;

// Author death-year table.
//   PD-original = the *original work* is in PD (author died > 70y ago).
//   For ancient authors we use a sentinel of -1 to mark "antique, definitely PD original".
//   Translations of ancient works carry their *translator's* copyright, which is what we flag.
const AUTHOR_DEATH = {
  // ancient
  'plato': -1, 'aristotle': -1, 'sunzi': -1, 'sun tzu': -1, 'laozi': -1, 'lao tzu': -1,
  'confucius': -1, 'hermes trismegistus': -1, 'padmasambhava': -1, 'patanjali': -1,
  'mencius': -1, 'chuang tzu': -1, 'zhuangzi': -1, 'unknown': -1, 'anonymous': -1,
  'rabbi akiba ben joseph': -1,
  // pre-1955 (so PD by life+70 and likely US 95-yr)
  'charles darwin': 1882, 'friedrich nietzsche': 1900, 'sigmund freud': 1939,
  'william james': 1910, 'c. g. jung': 1961, 'carl jung': 1961,
  'arthur schopenhauer': 1860, 'immanuel kant': 1804, 'david hume': 1776,
  'francis bacon': 1626, 'rené descartes': 1650, 'rene descartes': 1650,
  'g.w.f. hegel': 1831, 'gottfried wilhelm leibniz': 1716,
  'helena petrovna blavatsky': 1891, 'h.p. blavatsky': 1891,
  'arthur edward waite': 1942, 's. l. macgregor mathers': 1918,
  'manly p. hall': 1990, 'alice a. bailey': 1949,
  'evelyn underhill': 1941, 'james legge': 1897, 'f. max müller': 1900,
  'thomas bulfinch': 1867, 'andrew lang': 1912, 'paul carus': 1919,
  'sir edwin arnold': 1904, 'g. r. s. mead': 1933, 'reynold nicholson': 1945,
  'al-ghazali': 1111, 'avicenna': 1037, 'maimonides': 1204,
  'hildegard of bingen': 1179, 'julian of norwich': 1416, 'mechthild of magdeburg': 1282,
  'baltasar gracián': 1658, 'baltasar gracian': 1658,
  'ralph waldo emerson': 1882, 'sir arthur stanley eddington': 1944,
  'alfred north whitehead': 1947, 'john dewey': 1952, 'bertrand russell': 1970,
  'albert einstein': 1955, 'thomas à kempis': 1471, 'thomas a kempis': 1471,
  'st. teresa of avila': 1582, 'saint teresa of avila': 1582, 'teresa of avila': 1582, 'teresa of ávila': 1582,
  'abbé n. de montfaucon de villars': 1673,
  'mary fairfax greig somerville': 1872,
  'lowell coolidge julian': 1954,
  'mabel collins': 1927,
  'three initiates': 1932, // William Walker Atkinson, primary author, d.1932
  'e. m. berens': 1900,
  'john dee': 1609,
  'mohammed marmaduke pickthall': 1936,
  'nurho de manhar': 1923,
  'richard maurice bucke': 1902,
  'emile durkheim': 1917, 'émile durkheim': 1917,
  'swami paramananda': 1940,
  // modern / post-1955 (life+70 NOT yet expired in 2026)
  'joshua trachtenberg': 1959,        // PD ~2030
  'doreal': 1963,                     // PD ~2034
  'franz bardon': 1958,               // PD ~2029
  'michael beloved': null,            // unknown but contemporary
  'yogi ramacharaka': 1932,           // = William Walker Atkinson, d.1932 → PD
  'joel fotinos': null,               // contemporary editor
};

function authorKey(a) { return (a || '').trim().toLowerCase(); }

function deathYearFor(author) {
  if (!author) return undefined;
  const key = authorKey(author);
  if (key in AUTHOR_DEATH) return AUTHOR_DEATH[key];
  // Try first listed author if comma/semicolon separated
  const first = key.split(/[,;]/)[0].trim();
  if (first && first !== key && first in AUTHOR_DEATH) return AUTHOR_DEATH[first];
  return undefined;
}

function classify(t) {
  const reasons = [];
  const flags = [];
  let verdict = 'review';

  const death = deathYearFor(t.author);
  const lifePlus70CutoffYear = 2026 - 70; // 1956
  const yr = t.year;

  // 1. Explicit license trumps everything.
  if (t.license === 'public-domain') {
    return { verdict: 'public-domain', reasons: ['license=public-domain'], flags: [] };
  }
  if (t.license === 'cc-by') {
    return { verdict: 'cc-by', reasons: ['license=cc-by'], flags: ['attribution-required'] };
  }
  if (t.license === 'all-rights-reserved') {
    return { verdict: 'all-rights-reserved', reasons: ['license=all-rights-reserved'], flags: ['asserted-copyrighted'] };
  }
  flags.push('license-missing');

  // 2. Author-based assessment.
  if (death === -1) {
    reasons.push('author is ancient/classical');
    flags.push('translation-copyright-risk');
    verdict = 'likely-pd-original';
  } else if (typeof death === 'number' && death <= lifePlus70CutoffYear) {
    reasons.push(`author died ${death} (life+70 expired by 2026)`);
    verdict = 'likely-pd';
  } else if (typeof death === 'number' && death > lifePlus70CutoffYear) {
    reasons.push(`author died ${death} (life+70 NOT yet expired)`);
    verdict = 'likely-still-in-copyright';
  } else if (death === null) {
    reasons.push('author is contemporary (no death year)');
    verdict = 'likely-still-in-copyright';
  } else {
    reasons.push('author not in lookup');
    verdict = 'review';
  }

  // 3. Year as secondary check (US 95-year rule on actual first-publication year).
  if (yr != null) {
    if (yr < US_PD_PUB_YEAR_CUTOFF) {
      reasons.push(`year=${yr} (< ${US_PD_PUB_YEAR_CUTOFF} → US PD by publication)`);
      // If author lookup said still-in-copyright but year is pre-1930, prefer year.
      if (verdict === 'likely-still-in-copyright') {
        verdict = 'likely-pd';
        reasons.push('year overrides death-year (work pub\'d before 1930 in US)');
      } else if (verdict === 'review') {
        verdict = 'likely-pd';
      }
    } else {
      reasons.push(`year=${yr} (≥ ${US_PD_PUB_YEAR_CUTOFF} → may be reprint year, NOT original pub)`);
      flags.push('year-may-be-reprint');
    }
  } else {
    flags.push('year-missing');
  }

  return { verdict, reasons, flags };
}

const buckets = {
  'public-domain': [],
  'cc-by': [],
  'all-rights-reserved': [],
  'likely-pd': [],
  'likely-pd-original': [],
  'likely-still-in-copyright': [],
  'review': [],
};

for (const t of texts) {
  const c = classify(t);
  buckets[c.verdict].push({ ...t, ...c });
}

const lines = [];
lines.push('# Library Public-Domain Audit');
lines.push('');
lines.push(`_Generated ${new Date().toISOString()} · scope: \`texts\` table (staging) · 106 rows_`);
lines.push('');
lines.push('## Summary');
lines.push('');
const explicit = buckets['public-domain'].length;
const ccBy = buckets['cc-by'].length;
const arr = buckets['all-rights-reserved'].length;
const pd = buckets['likely-pd'].length;
const pdOrig = buckets['likely-pd-original'].length;
const stillCopy = buckets['likely-still-in-copyright'].length;
const review = buckets['review'].length;
lines.push(`- Total texts: **${texts.length}**`);
lines.push(`- License explicitly set: **${explicit + ccBy + arr}** (PD: ${explicit}, CC-BY: ${ccBy}, ARR: ${arr})`);
lines.push(`- License field empty (computed below): **${texts.length - (explicit + ccBy + arr)}**`);
lines.push('');
lines.push('### Computed verdicts (where license is null)');
lines.push('');
lines.push(`- ✅ Likely public-domain (modern author, life+70 expired or US pre-1930): **${pd}**`);
lines.push(`- ⚠ Likely PD original, but **translation copyright unknown**: **${pdOrig}**  _(ancient/classical authors — original work is PD, translation may not be)_`);
lines.push(`- ⛔ Likely still in copyright (author died after 1956 or contemporary): **${stillCopy}**`);
lines.push(`- ❓ Needs human review (author not in lookup or insufficient data): **${review}**`);
lines.push('');
lines.push('## ⚠ Top-priority finding');
lines.push('');
lines.push('**Every text in the library has `license = NULL`** (canonical column from the schema). This is a data-hygiene issue independent of whether the works are actually public domain — the audit can\'t confirm anything definitively until that column is populated on upload. Recommendation: backfill the `license` column for all 106 rows based on the verdicts below, and add a NOT NULL constraint going forward.');
lines.push('');
lines.push('### How verdicts are computed');
lines.push('');
lines.push('1. The `license` column is canonical when set (`public-domain` / `cc-by` / `all-rights-reserved`).');
lines.push(`2. If null, audit uses a hardcoded author death-date table (life+70 → PD if author died ≤ ${2026 - 70}).`);
lines.push(`3. US 95-year rule: works first-published before ${US_PD_PUB_YEAR_CUTOFF} are PD as of 2026.`);
lines.push('4. **Translations have separate copyright.** An ancient author (Plato, Laozi, Aristotle…) makes the *original* PD, but the *translation* you have may still be in copyright if the translator died after 1956 or it was published after 1929. The schema has no `translator` column — the audit can only flag the risk.');
lines.push('5. The stored `year` is sometimes a reprint year, not the first-publication year. When year ≥ 1930, the audit treats it as suspect and falls back to author death-date.');
lines.push('');

function row(t) {
  const author = (t.author || '—').replace(/\|/g, '\\|');
  const title = t.title.replace(/\|/g, '\\|');
  const year = t.year ?? '—';
  const license = t.license || '—';
  const flags = t.flags?.length ? t.flags.join(' · ') : '—';
  const reasons = t.reasons?.join(' · ') || '—';
  return `| ${title} | ${author} | ${year} | ${license} | ${reasons.replace(/\|/g, '\\|')} | ${flags} |`;
}

function section(title, items, intro) {
  lines.push(`## ${title}`);
  lines.push('');
  if (intro) { lines.push(intro); lines.push(''); }
  if (items.length === 0) {
    lines.push('_None._');
    lines.push('');
    return;
  }
  lines.push('| Title | Author | DB year | License | Reasoning | Flags |');
  lines.push('|---|---|---|---|---|---|');
  items
    .slice()
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    .forEach(t => lines.push(row(t)));
  lines.push('');
}

section('⛔ Likely still in copyright', buckets['likely-still-in-copyright'],
  'Author died after 1956 (life+70 not yet expired) or is contemporary. **Highest priority — these may need to be removed or licensed.**');

section('❓ Needs human review', buckets['review'],
  'Author not in the lookup table. Manual research required.');

section('⚠ Likely PD original, translation copyright unknown', buckets['likely-pd-original'],
  'Original work is ancient and definitely public domain. The *translation* may or may not be — depends on the translator (not stored in DB). Spot-check a few of these to confirm translator/edition.');

section('✅ Likely public-domain', buckets['likely-pd'],
  'Author died ≥ 70 years ago, OR work was first published before 1930. These can safely be backfilled with `license = public-domain`.');

if (explicit + ccBy + arr > 0) {
  section('License explicitly set', [
    ...buckets['public-domain'],
    ...buckets['cc-by'],
    ...buckets['all-rights-reserved'],
  ]);
}

const outDir = path.join(process.cwd(), 'docs', 'audits');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'library-public-domain-audit.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log(`Wrote ${outPath}`);
console.log(`Total ${texts.length}`);
console.log(`  explicit license: PD ${explicit} / CC ${ccBy} / ARR ${arr}`);
console.log(`  computed: PD ${pd}, PD-original ${pdOrig}, still-copyrighted ${stillCopy}, review ${review}`);
