// Compare the curated library-grid CSV (canonical plan) against the live `texts` table.
//
// Inputs:
//   scripts/library-grid.csv   — the curated CSV the user provided
//   scripts/texts-meta.json    — `select=id,title,author,year,publisher,license,source_url,...` snapshot
//
// Outputs:
//   docs/audits/csv-vs-db-comparison.md       — human-readable diff
//   scripts/csv-backfill.sql                  — proposed UPDATEs (license/source_url/year) for matched rows
//
// Usage: node scripts/audit-csv-vs-db.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Tiny CSV parser that handles quoted fields with embedded commas. ──────────
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const csvText = fs.readFileSync(path.join(__dirname, 'library-grid.csv'), 'utf8').replace(/^﻿/, '');
const rows = parseCSV(csvText).filter(r => r.length > 1);
const headers = rows.shift();
const idx = (name) => headers.indexOf(name);
const csvRows = rows.map(r => ({
  id: r[idx('ID')]?.trim(),
  title: r[idx('Title')]?.trim(),
  author: r[idx('Author / Translator')]?.trim() || null,
  year: r[idx('Year')]?.trim() || null,
  status: r[idx('Status')]?.trim(),
  pdStatus: r[idx('Public Domain Status')]?.trim(),
  sourceUrl: r[idx('Source URL')]?.trim() || null,
  decision: r[idx('Keep / Reframe / Remove')]?.trim(),
  origStatus: r[idx('Original Status')]?.trim(),
  reviewNotes: r[idx('Review Notes')]?.trim() || null,
})).filter(r => r.id);

const dbRows = JSON.parse(fs.readFileSync(path.join(__dirname, 'texts-meta.json'), 'utf8'));

// ── Fuzzy matcher (mirrors the app's match-course-texts logic). ───────────────
function normalize(v) {
  return (v || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’'"]/g, '').replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
const stripArticle = v => v.replace(/^(the|a|an)\s+/i, '').trim();
const stripQual = v => v.replace(/\s*\([^)]*\)\s*$/g, '')
  .replace(/\s*[:,-]\s*(volume|vol|book|books|part|parts|selection|selections|selected).*$/i, '').trim();
function variants(t) {
  const all = [t, stripQual(t), stripArticle(t), stripArticle(stripQual(t))];
  const seen = new Set();
  return all.filter(v => { if (!v) return false; const k = normalize(v); if (!k || seen.has(k)) return false; seen.add(k); return true; });
}
function score(csv, db) {
  const dbT = normalize(db.title), dbA = normalize(db.author || '');
  const csvA = normalize(csv.author || '');
  // Strip transliteration noise.
  const dbTclean = dbT.replace(/teh\b/g, 'te').replace(/yi king/g, 'i ching').replace(/sepher/g, 'sefer');
  let best = 0;
  for (const v of variants(csv.title)) {
    const nv = normalize(v).replace(/teh\b/g, 'te').replace(/yi king/g, 'i ching').replace(/sepher/g, 'sefer');
    if (!nv) continue;
    let s = 0;
    if (dbTclean === nv) s += 100;
    else if (dbTclean.startsWith(nv)) s += 80;
    else if (dbTclean.includes(nv)) s += 65;
    else if (nv.includes(dbTclean)) s += 55;
    const titleOverlap = nv.split(' ').filter(w => w.length > 2 && dbTclean.includes(w)).length;
    s += titleOverlap * 4;
    if (csvA && dbA) {
      const csvTokens = csvA.split(' ').filter(w => w.length > 2);
      const authorOverlap = csvTokens.filter(t => dbA.includes(t)).length;
      if (authorOverlap >= 1) s += 10 + authorOverlap * 6;
    }
    // Guard rail: require at least one significant title-token overlap, otherwise this is just an
    // author-collision and should not score above the threshold.
    if (titleOverlap === 0 && s < 55) s = Math.min(s, 18);
    best = Math.max(best, s);
  }
  return best;
}

function findBestMatch(csvRow, pool, threshold) {
  let best = null, bestScore = 0;
  for (const db of pool) {
    const s = score(csvRow, db);
    if (s > bestScore) { bestScore = s; best = db; }
  }
  return bestScore >= threshold ? { db: best, score: bestScore } : null;
}

// ── Build the comparison ─────────────────────────────────────────────────────
const matches = [];               // CSV ↔ DB matched
const csvMissingFromDb = [];      // CSV rows not in DB
const dbMissingFromCsv = [];      // DB rows not referenced by any CSV row
const usedDbIds = new Set();

// Pass 1: high-confidence matches (≥ 60).
for (const csv of csvRows) {
  const m = findBestMatch(csv, dbRows.filter(d => !usedDbIds.has(d.id)), 60);
  if (m) {
    usedDbIds.add(m.db.id);
    matches.push({ csv, db: m.db, score: m.score });
  } else {
    csvMissingFromDb.push(csv);
  }
}

// Pass 2: probable variants — pair remaining CSV with remaining DB at lower threshold (≥ 20).
// Sort CSV remainders by best-available score so high-confidence pairs claim their DB row first.
const dbLeftover = dbRows.filter(d => !usedDbIds.has(d.id));
const probableVariants = [];
const stillMissingCsv = [];
const csvWithBestScore = csvMissingFromDb.map(csv => {
  let best = 0;
  for (const db of dbLeftover) best = Math.max(best, score(csv, db));
  return { csv, best };
}).sort((a, b) => b.best - a.best);
for (const { csv } of csvWithBestScore) {
  const m = findBestMatch(csv, dbLeftover.filter(d => !probableVariants.some(p => p.db.id === d.id)), 20);
  if (m) {
    probableVariants.push({ csv, db: m.db, score: m.score });
  } else {
    stillMissingCsv.push(csv);
  }
}

for (const db of dbRows) {
  if (!usedDbIds.has(db.id) && !probableVariants.some(p => p.db.id === db.id)) {
    dbMissingFromCsv.push(db);
  }
}

// Year normalization for backfill (handles "500BCE", "150CE", "13th c.", etc.)
function csvYearAsInt(y) {
  if (!y) return null;
  const m = String(y).match(/^(-?\d+)\s*(BCE|BC)?/i);
  if (!m) return null;
  let n = parseInt(m[1], 10);
  if (/BCE|BC/i.test(m[2] || '')) n = -n;
  return n;
}

// Compute proposed updates per matched row.
const updates = [];
for (const m of matches) {
  const fields = {};
  // license backfill from CSV pdStatus
  if (m.db.license == null) {
    if (m.csv.pdStatus === 'Clear') fields.license = 'public-domain';
    // 'Verify' stays null — needs human review
  }
  // source_url backfill
  if (!m.db.source_url && m.csv.sourceUrl) fields.source_url = m.csv.sourceUrl;
  // year backfill (only if DB year missing or wildly different)
  const csvYear = csvYearAsInt(m.csv.year);
  if (csvYear != null && (m.db.year == null || Math.abs(m.db.year - csvYear) > 5)) {
    // Only auto-set if DB year was null. If different, just flag.
    if (m.db.year == null) fields.year = csvYear;
  }
  if (Object.keys(fields).length > 0) updates.push({ db: m.db, fields, csv: m.csv });
}

// ── Render markdown ──────────────────────────────────────────────────────────
const lines = [];
lines.push('# CSV vs Database Comparison');
lines.push('');
lines.push(`_Generated ${new Date().toISOString()} · CSV: \`scripts/library-grid.csv\` · DB: staging \`texts\` table_`);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- CSV rows: **${csvRows.length}**`);
lines.push(`- DB texts: **${dbRows.length}**`);
lines.push(`- High-confidence matches (CSV ↔ DB, score ≥ 60): **${matches.length}**`);
lines.push(`- Probable variant pairs (score 30–59 — needs human confirmation): **${probableVariants.length}**`);
lines.push(`- CSV rows still unmatched: **${stillMissingCsv.length}**`);
lines.push(`- DB rows with no CSV counterpart: **${dbMissingFromCsv.length}**`);
lines.push(`- Matched rows with proposed metadata backfill: **${updates.length}**`);
lines.push('');

// Inconsistencies: CSV says Status=Uploaded but row not in DB.
const uploadedButMissing = stillMissingCsv.filter(r => /uploaded/i.test(r.origStatus || ''));
const queuedButPresent = matches.filter(m => /queued|needs digitiz/i.test(m.csv.origStatus || ''));

lines.push('## ⚠ CSV/DB inconsistencies');
lines.push('');
lines.push(`**${uploadedButMissing.length}** CSV rows marked \`Uploaded\` are NOT in the DB.`);
if (uploadedButMissing.length) {
  lines.push('');
  lines.push('| CSV ID | Title | Author | CSV Source URL |');
  lines.push('|---|---|---|---|');
  uploadedButMissing.forEach(r => {
    lines.push(`| ${r.id} | ${r.title.replace(/\|/g, '\\|')} | ${(r.author || '—').replace(/\|/g, '\\|')} | ${r.sourceUrl || '—'} |`);
  });
}
lines.push('');
lines.push(`**${queuedButPresent.length}** CSV rows marked \`queued\`/\`Needs Digitizing\` ARE already in the DB. CSV status should flip to \`Uploaded\`.`);
if (queuedButPresent.length) {
  lines.push('');
  lines.push('| CSV ID | Title | CSV Status | DB Title |');
  lines.push('|---|---|---|---|');
  queuedButPresent.forEach(m => {
    lines.push(`| ${m.csv.id} | ${m.csv.title.replace(/\|/g, '\\|')} | ${m.csv.origStatus} | ${m.db.title.replace(/\|/g, '\\|')} |`);
  });
}
lines.push('');

lines.push('## ⚠ Probable variant pairs (review and confirm)');
lines.push('');
lines.push('CSV rows whose title appears to be a different edition/translation of a DB row already present. Likely the CSV `Source URL` should be backfilled into the DB row, but the DB title may need renaming or these may be intentional separate editions.');
lines.push('');
if (probableVariants.length === 0) {
  lines.push('_None._');
} else {
  lines.push('| CSV ID | CSV Title | CSV Author | DB Title | DB Author | DB Year | Score |');
  lines.push('|---|---|---|---|---|---|---|');
  probableVariants.sort((a, b) => b.score - a.score);
  for (const p of probableVariants) {
    lines.push(`| ${p.csv.id} | ${p.csv.title.replace(/\|/g, '\\|')} | ${(p.csv.author || '—').replace(/\|/g, '\\|')} | ${p.db.title.replace(/\|/g, '\\|')} | ${(p.db.author || '—').replace(/\|/g, '\\|')} | ${p.db.year ?? '—'} | ${p.score} |`);
  }
}
lines.push('');

lines.push('## CSV rows missing from the DB');
lines.push('');
lines.push('Books that the curated plan lists but staging doesn\'t have AND no probable variant was found. Grouped by CSV `Original Status`.');
lines.push('');
const groups = new Map();
for (const r of stillMissingCsv) {
  const k = r.origStatus || '(blank)';
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
for (const [status, items] of [...groups.entries()].sort()) {
  lines.push(`### Original Status: \`${status}\` (${items.length})`);
  lines.push('');
  lines.push('| CSV ID | Title | Author | Year | PD | Source URL | Decision |');
  lines.push('|---|---|---|---|---|---|---|');
  items.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  for (const r of items) {
    lines.push(`| ${r.id} | ${r.title.replace(/\|/g, '\\|')} | ${(r.author || '—').replace(/\|/g, '\\|')} | ${r.year || '—'} | ${r.pdStatus || '—'} | ${r.sourceUrl || '—'} | ${r.decision || '—'} |`);
  }
  lines.push('');
}

lines.push('## DB rows not in the CSV');
lines.push('');
if (dbMissingFromCsv.length === 0) {
  lines.push('_None — every DB text matches a CSV row._');
} else {
  lines.push('Texts present in staging that the curated CSV doesn\'t reference. Could be older uploads, near-duplicates the matcher missed, or rows that should be added to the CSV.');
  lines.push('');
  lines.push('| DB ID | Title | Author | Year |');
  lines.push('|---|---|---|---|');
  dbMissingFromCsv.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  for (const r of dbMissingFromCsv) {
    lines.push(`| \`${r.id.slice(0, 8)}…\` | ${(r.title || '').replace(/\|/g, '\\|')} | ${(r.author || '—').replace(/\|/g, '\\|')} | ${r.year ?? '—'} |`);
  }
}
lines.push('');

lines.push('## Proposed metadata backfill (matched rows)');
lines.push('');
lines.push(`The CSV has authoritative \`Public Domain Status\`, \`Source URL\`, and \`Year\` data. Where the DB row is missing those fields and the CSV row marks PD status as \`Clear\`, we can backfill. SQL is written to \`scripts/csv-backfill.sql\` — review before running.`);
lines.push('');
lines.push(`- Rows getting \`license = 'public-domain'\` set: **${updates.filter(u => u.fields.license).length}**`);
lines.push(`- Rows getting \`source_url\` set: **${updates.filter(u => u.fields.source_url).length}**`);
lines.push(`- Rows getting \`year\` set: **${updates.filter(u => u.fields.year != null).length}**`);
lines.push('');

// Items where CSV pdStatus = "Verify" — flag for human review, don't auto-set license.
const needsVerify = matches.filter(m => m.csv.pdStatus === 'Verify');
lines.push(`### Held back: CSV PD Status = \`Verify\` (${needsVerify.length})`);
lines.push('');
lines.push('License will NOT be auto-set for these — needs human confirmation first.');
lines.push('');
if (needsVerify.length) {
  lines.push('| CSV ID | Title | Author | Notes |');
  lines.push('|---|---|---|---|');
  for (const m of needsVerify) {
    lines.push(`| ${m.csv.id} | ${m.csv.title.replace(/\|/g, '\\|')} | ${(m.csv.author || '—').replace(/\|/g, '\\|')} | ${m.csv.reviewNotes || '—'} |`);
  }
}
lines.push('');

const mdPath = path.join(process.cwd(), 'docs', 'audits', 'csv-vs-db-comparison.md');
fs.mkdirSync(path.dirname(mdPath), { recursive: true });
fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');

// ── Render SQL ───────────────────────────────────────────────────────────────
const sql = [];
sql.push('-- CSV → texts table backfill, generated by scripts/audit-csv-vs-db.mjs');
sql.push(`-- ${new Date().toISOString()}`);
sql.push(`-- ${updates.length} rows. Review before running. Wrap in BEGIN/COMMIT to be safe.`);
sql.push('');
sql.push('BEGIN;');
for (const u of updates) {
  const sets = [];
  if (u.fields.license) sets.push(`license = '${u.fields.license}'`);
  if (u.fields.source_url) sets.push(`source_url = '${u.fields.source_url.replace(/'/g, "''")}'`);
  if (u.fields.year != null) sets.push(`year = ${u.fields.year}`);
  sql.push(`-- ${u.csv.id}  ${u.csv.title}`);
  sql.push(`UPDATE texts SET ${sets.join(', ')} WHERE id = '${u.db.id}';`);
}
sql.push('');
sql.push('-- COMMIT;  -- uncomment to apply');
sql.push('ROLLBACK;');

const sqlPath = path.join(__dirname, 'csv-backfill.sql');
fs.writeFileSync(sqlPath, sql.join('\n'), 'utf8');

console.log(`Wrote ${mdPath}`);
console.log(`Wrote ${sqlPath}`);
console.log(`Matched ${matches.length}/${csvRows.length} CSV rows.`);
console.log(`CSV missing from DB: ${csvMissingFromDb.length}`);
console.log(`DB missing from CSV: ${dbMissingFromCsv.length}`);
console.log(`Proposed updates: ${updates.length}`);
