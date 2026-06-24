/**
 * Extract per-entity snippets from a copyrighted PDF and write them to a
 * category file under app/scripts/external-passages/ in the README's
 * `## Title — Source` format.
 *
 * For each correspondence entity in --category, scans the PDF text for
 * name + alias mentions, pulls a configurable window around each mention,
 * filters for substantive paragraphs (no isolated headings, figures,
 * tables of single words), dedupes overlapping windows, then writes the
 * top N per entity to the output file.
 *
 * Run on Karade first as the validation case:
 *   pnpm exec tsx scripts/external-passages/extract-snippets.ts \
 *     --pdf "../docs/nonPD books/The Handbook of Yoruba Religious Concepts -- Baba Ifa Karade.pdf" \
 *     --category orisha \
 *     --title "The Handbook of Yoruba Religious Concepts" \
 *     --author "Baba Ifa Karade" \
 *     --genre "Yoruba/diaspora insider practice"
 *
 * Add --dry-run to see the snippet count per entity without writing the file.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

const WINDOW_CHARS = 1200; // chars of context around each mention
const MAX_SNIPPETS_PER_ENTITY = 4;
const MIN_SNIPPET_CHARS = 400; // skip windows shorter than this after trim
const OVERLAP_THRESHOLD = 0.4; // dedupe if >40% character overlap

type Args = {
  pdfPath: string;
  category: string;
  title: string;
  author: string;
  genre: string;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  const get = (k: string): string | null => {
    const idx = argv.indexOf(k);
    return idx >= 0 ? argv[idx + 1] : null;
  };
  const pdfPath = get('--pdf');
  const category = get('--category');
  const title = get('--title');
  const author = get('--author');
  const genre = get('--genre') ?? '';
  const dryRun = argv.includes('--dry-run');
  if (!pdfPath || !category || !title || !author) {
    throw new Error(
      'Usage: extract-snippets.ts --pdf <path> --category <name> --title <book> --author <name> [--genre <text>] [--dry-run]',
    );
  }
  return { pdfPath, category, title, author, genre, dryRun };
}

function createService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env in app/.env.local');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function extractFullText(pdfPath: string): Promise<string> {
  const buf = fs.readFileSync(pdfPath);
  const data = new Uint8Array(buf);
  const doc = await pdfjs
    .getDocument({ data, disableFontFace: true, useSystemFonts: false, verbosity: 0 })
    .promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const txt = content.items
      .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pages.push(txt);
  }
  await doc.cleanup();
  await doc.destroy();
  // Page separator helps when window straddles page boundaries — we'll
  // still treat it as one big string for searching.
  return pages.join('\n\n');
}

function buildSearchPhrases(name: string, aliases: string[] | null): string[] {
  const phrases = new Set<string>();
  const add = (v?: string | null) => {
    if (!v) return;
    const t = v.trim();
    if (t.length >= 3) phrases.add(t);
  };
  add(name);
  for (const a of aliases ?? []) add(a);
  // Strip parenthetical noise like "Obatala (Owner of all heads)" -> add base
  const bare = name.replace(/\s*\([^)]*\)\s*/g, '').trim();
  if (bare && bare !== name) add(bare);
  return Array.from(phrases);
}

type Window = {
  start: number;
  end: number;
  text: string;
  phrase: string;
};

function findAllMentions(text: string, phrase: string): number[] {
  const hay = text.toLowerCase();
  const needle = phrase.toLowerCase();
  const out: number[] = [];
  let idx = 0;
  while (true) {
    const found = hay.indexOf(needle, idx);
    if (found === -1) break;
    // Word boundary on both sides — skip mid-word matches.
    const before = found > 0 ? text[found - 1] : ' ';
    const after = found + needle.length < text.length ? text[found + needle.length] : ' ';
    if (!/[\w]/.test(before) && !/[\w]/.test(after)) {
      out.push(found);
    }
    idx = found + needle.length;
  }
  return out;
}

// Patterns that flag non-content (frontmatter, indexes, captions, etc.).
const FRONTMATTER_PATTERNS = [
  /Library of Congress/i,
  /Cataloging-in-Publication/i,
  /ISBN\s+[\d-]+/i,
  /Copyright\s+©/i,
  /All rights reserved/i,
  /Printed in the United States/i,
  /Table of Contents/i,
  /Acknowledgments\s+A Note to Readers/i,
  /Typeset in/i,
];

function isSubstantive(window: string, phrase: string): boolean {
  if (window.length < MIN_SNIPPET_CHARS) return false;
  // Hard reject: copyright / cataloging / TOC text.
  for (const p of FRONTMATTER_PATTERNS) {
    if (p.test(window)) return false;
  }
  // Hard reject: TOC-style chapter list ("Chapter N: Title" appearing 3+ times).
  const chapterRefs = (window.match(/Chapter\s+\d+:/g) ?? []).length;
  if (chapterRefs >= 2) return false;
  // Reject windows that are mostly short lines (tables, figure caption lists).
  const lines = window.split(/\n+/).filter((l) => l.trim().length > 0);
  if (lines.length >= 4) {
    const shortLines = lines.filter((l) => l.trim().split(/\s+/).length <= 4).length;
    if (shortLines / lines.length > 0.55) return false;
  }
  // Reject windows where the phrase appears too near an edge — likely a
  // header juxtaposition rather than body context.
  const idx = window.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx < 150 && window.length - (idx + phrase.length) < 150) return false;
  // Reject pages dominated by figure captions ("Figure N. ...").
  const figureLines = (window.match(/Figure\s+\d+\./gi) ?? []).length;
  if (figureLines >= 2) return false;
  return true;
}

function dedupeWindows(windows: Window[]): Window[] {
  // Sort by start so overlapping windows are adjacent.
  const sorted = [...windows].sort((a, b) => a.start - b.start);
  const kept: Window[] = [];
  for (const w of sorted) {
    let keep = true;
    for (const k of kept) {
      const overlapStart = Math.max(w.start, k.start);
      const overlapEnd = Math.min(w.end, k.end);
      const overlapLen = Math.max(0, overlapEnd - overlapStart);
      const minLen = Math.min(w.end - w.start, k.end - k.start);
      if (minLen > 0 && overlapLen / minLen > OVERLAP_THRESHOLD) {
        keep = false;
        break;
      }
    }
    if (keep) kept.push(w);
  }
  return kept;
}

function pickTopWindows(windows: Window[], n: number): Window[] {
  // Rank by length descending (longer windows have more substantive context).
  return [...windows].sort((a, b) => b.text.length - a.text.length).slice(0, n);
}

function trimToSentenceBoundaries(window: string): string {
  // Trim leading partial sentence (start at first capital letter after a
  // sentence-ending punctuation or beginning).
  const startMatch = window.match(/(?:^|[.!?]\s+)([A-Z])/);
  let s = window;
  if (startMatch && startMatch.index !== undefined) {
    const startIdx = startMatch.index + (startMatch[0].length - 1);
    if (startIdx > 0 && startIdx < window.length - 200) s = window.slice(startIdx);
  }
  // Trim trailing partial sentence.
  const lastPunct = Math.max(s.lastIndexOf('.'), s.lastIndexOf('!'), s.lastIndexOf('?'));
  if (lastPunct > s.length - 300 && lastPunct > 200) s = s.slice(0, lastPunct + 1);
  return s.trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createService();

  // Fetch the category's entities (only missing ones — we don't overwrite
  // approved narratives).
  const { data: entities, error } = await supabase
    .from('correspondences')
    .select('id, name, aliases, narrative_status')
    .eq('category', args.category)
    .order('name', { ascending: true });
  if (error) throw new Error(`fetch ${args.category}: ${error.message}`);
  if (!entities || entities.length === 0) {
    console.log(`No entities in category ${args.category}.`);
    return;
  }
  console.log(`Loaded ${entities.length} entities in '${args.category}'.`);

  console.log(`Extracting text from ${args.pdfPath}...`);
  const fullText = await extractFullText(path.resolve(args.pdfPath));
  console.log(`  ${fullText.length.toLocaleString()} chars extracted.`);

  // For each entity, find windows around every name/alias mention.
  const perEntity = new Map<string, Window[]>();
  for (const ent of entities) {
    const phrases = buildSearchPhrases(ent.name, ent.aliases);
    const windows: Window[] = [];
    for (const phrase of phrases) {
      const positions = findAllMentions(fullText, phrase);
      for (const pos of positions) {
        const start = Math.max(0, pos - WINDOW_CHARS / 2);
        const end = Math.min(fullText.length, pos + phrase.length + WINDOW_CHARS / 2);
        const text = fullText.slice(start, end);
        if (isSubstantive(text, phrase)) {
          windows.push({ start, end, text, phrase });
        }
      }
    }
    const deduped = dedupeWindows(windows);
    const top = pickTopWindows(deduped, MAX_SNIPPETS_PER_ENTITY);
    perEntity.set(ent.name, top);
    console.log(
      `  ${ent.name}: ${windows.length} raw → ${deduped.length} deduped → ${top.length} kept (phrases tried: ${phrases.length})`,
    );
  }

  // Assemble output.
  const lines: string[] = [];
  lines.push(`# ${args.category}`);
  lines.push('');
  lines.push(
    `<!-- Drafting-only grounding extracted from ${args.title} by ${args.author}. -->`,
  );
  lines.push(`<!-- Not stored in DB; not synced to production. Local only. -->`);
  lines.push('');
  for (const ent of entities) {
    const windows = perEntity.get(ent.name) ?? [];
    if (windows.length === 0) continue;
    for (const w of windows) {
      lines.push(`## ${ent.name} — From "${args.title}" by ${args.author}`);
      if (args.genre) lines.push(`genre: ${args.genre}`);
      lines.push(trimToSentenceBoundaries(w.text));
      lines.push('');
    }
  }
  const outPath = path.resolve(__dirname, `${args.category}.md`);
  if (args.dryRun) {
    console.log(`\n--- DRY RUN — would write to ${outPath} ---`);
    console.log(`${lines.length} lines, ${lines.join('\n').length.toLocaleString()} chars`);
    console.log('\nFirst 80 lines:');
    console.log(lines.slice(0, 80).join('\n'));
  } else {
    fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
    console.log(`\n✓ Wrote ${outPath} — ${lines.join('\n').length.toLocaleString()} chars`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
