// Audit course readings against the library texts table.
//
// Prereq: drop two snapshots from Supabase next to this script:
//   curl "$URL/rest/v1/courses?select=id,title,slug,is_published,content,course_texts(id,text_id,texts(id,title,author))&order=title" \
//        -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -o scripts/courses.json
//   curl "$URL/rest/v1/texts?select=id,title,author&order=title&limit=5000" \
//        -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -o scripts/texts.json
//
// Usage: node scripts/audit-course-books.mjs

import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const courses = JSON.parse(fs.readFileSync(path.join(__dirname, 'courses.json'), 'utf8'));
const texts = JSON.parse(fs.readFileSync(path.join(__dirname, 'texts.json'), 'utf8'));

function normalize(value) {
  return (value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'"]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripLeadingArticle(v) {
  return v.replace(/^(the|a|an)\s+/i, '').trim();
}

function stripTrailingQualifier(v) {
  return v
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
    const k = normalize(v);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function scoreMatch(candidate, text) {
  const tTitle = normalize(text.title);
  const tAuthor = normalize(text.author || '');
  const cAuthor = normalize(candidate.author || '');
  let best = 0;
  for (const variant of candidate.variants) {
    const v = normalize(variant);
    if (!v) continue;
    let score = 0;
    if (tTitle === v) score += 100;
    else if (tTitle.startsWith(v)) score += 80;
    else if (tTitle.includes(v)) score += 65;
    else if (v.includes(tTitle)) score += 55;
    const words = v.split(' ').filter(Boolean);
    score += words.filter(w => tTitle.includes(w)).length * 4;
    if (cAuthor && tAuthor) {
      if (tAuthor === cAuthor) score += 30;
      else if (tAuthor.includes(cAuthor) || cAuthor.includes(tAuthor)) score += 20;
    }
    best = Math.max(best, score);
  }
  return best;
}

function findMatch(candidate, library) {
  let bestText = null;
  let bestScore = 0;
  for (const text of library) {
    const score = scoreMatch(candidate, text);
    if (score > bestScore) {
      bestScore = score;
      bestText = text;
    }
  }
  return bestScore >= 60 ? { text: bestText, score: bestScore } : null;
}

function findNearMatch(candidate, library) {
  const ranked = library
    .map(t => ({ text: t, score: scoreMatch(candidate, t) }))
    .filter(m => m.score >= 25 && m.score < 60)
    .sort((a, b) => b.score - a.score);
  return ranked[0] || null;
}

// Build per-course list of unique readings.
function extractReadings(course) {
  const weeks = course.content?.weeks || [];
  const map = new Map();
  for (const week of weeks) {
    for (const r of week?.readings || []) {
      const title = r?.title?.trim();
      if (!title) continue;
      const variants = buildVariants(title, r?.section);
      const key = normalize(title);
      if (!key || map.has(key)) continue;
      map.set(key, {
        title,
        author: r?.author?.trim() || null,
        section: r?.section?.trim() || null,
        variants,
      });
    }
  }
  return Array.from(map.values());
}

// Build set of text_ids already linked via course_texts for each course.
function linkedTextIds(course) {
  const ids = new Set();
  for (const ct of course.course_texts || []) {
    if (ct.text_id) ids.add(ct.text_id);
  }
  return ids;
}

const missingByCourse = [];
const aggregateMissing = new Map(); // key: normalize(title) -> {title, author, courses:Set}
let totalReadings = 0;
let totalMatched = 0;

for (const course of courses) {
  const readings = extractReadings(course);
  const linkedIds = linkedTextIds(course);
  const missing = [];
  for (const r of readings) {
    totalReadings++;
    const match = findMatch(r, texts);
    const linkedHit = match && linkedIds.has(match.text.id);
    if (match) {
      totalMatched++;
      continue;
    }
    const near = findNearMatch(r, texts);
    missing.push({ ...r, near });
    const key = normalize(r.title);
    if (!aggregateMissing.has(key)) {
      aggregateMissing.set(key, { title: r.title, author: r.author, courses: new Set(), near });
    }
    aggregateMissing.get(key).courses.add(course.title);
  }
  if (missing.length > 0) {
    missingByCourse.push({
      course: course.title,
      slug: course.slug,
      published: course.is_published,
      totalReadings: readings.length,
      missing,
    });
  }
}

const lines = [];
lines.push('# Course Books Missing from Library');
lines.push('');
lines.push(`_Generated ${new Date().toISOString()}_`);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- Courses scanned: **${courses.length}**`);
lines.push(`- Library texts: **${texts.length}**`);
lines.push(`- Total course readings: **${totalReadings}**`);
lines.push(`- Matched to a library text: **${totalMatched}**`);
lines.push(`- Missing readings (occurrences): **${totalReadings - totalMatched}**`);
lines.push(`- Unique missing titles: **${aggregateMissing.size}**`);
lines.push(`- Courses with at least one missing book: **${missingByCourse.length}**`);
lines.push('');
lines.push('Match logic mirrors `app/src/lib/courses/match-course-texts.ts` (fuzzy title + optional author check, threshold ≥ 60).');
lines.push('');
lines.push('> A "possible variant in library" column flags soft matches (score 25–59) — usually a transliteration or title variant of an existing text (e.g. "Tao Te Ching" vs library\'s "The Tao Teh King"). These should be reconciled by either renaming the library entry, adding an alias, or confirming they\'re different works.');
lines.push('');
lines.push('> Some entries also surface as data-quality issues in the source courses (author/title swap, IDs like `T117` in the author field, sections leaked into title/author). Those rows are worth fixing in the course content even when the underlying book exists in the library.');
lines.push('');

lines.push('## Unique Missing Titles');
lines.push('');
lines.push('| Title | Author | # courses | Possible variant in library |');
lines.push('|---|---|---|---|');
const sortedAgg = Array.from(aggregateMissing.values())
  .sort((a, b) => b.courses.size - a.courses.size || a.title.localeCompare(b.title));
for (const item of sortedAgg) {
  const author = item.author || '—';
  const near = item.near
    ? `${item.near.text.title.replace(/\|/g, '\\|')} (score ${item.near.score})`
    : '—';
  lines.push(`| ${item.title.replace(/\|/g, '\\|')} | ${author.replace(/\|/g, '\\|')} | ${item.courses.size} | ${near} |`);
}
lines.push('');

lines.push('## Missing by Course');
lines.push('');
missingByCourse.sort((a, b) => b.missing.length - a.missing.length || a.course.localeCompare(b.course));
for (const c of missingByCourse) {
  const status = c.published ? '' : ' _(unpublished)_';
  lines.push(`### ${c.course}${status}`);
  lines.push('');
  lines.push(`Slug: \`${c.slug}\` · Missing **${c.missing.length}** of ${c.totalReadings} readings`);
  lines.push('');
  for (const r of c.missing) {
    const parts = [`**${r.title}**`];
    if (r.author) parts.push(`_${r.author}_`);
    if (r.section) parts.push(`(${r.section})`);
    if (r.near) parts.push(`possibly → \`${r.near.text.title}\``);
    lines.push(`- ${parts.join(' — ')}`);
  }
  lines.push('');
}

const outDir = path.join(process.cwd(), 'docs', 'audits');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'course-books-missing.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log(`Wrote ${outPath}`);
console.log(`Courses: ${courses.length}, texts: ${texts.length}`);
console.log(`Readings ${totalReadings}, matched ${totalMatched}, missing ${totalReadings - totalMatched}`);
console.log(`Unique missing titles: ${aggregateMissing.size}`);
console.log(`Courses with missing books: ${missingByCourse.length}`);
