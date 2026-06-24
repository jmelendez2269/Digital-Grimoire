/**
 * Quick PDF inspector for picking a sectionizer strategy. Dumps the TOC and
 * the first ~20 pages of plain text so we can see how the book is structured
 * before writing per-book extractor code.
 *
 * Usage:
 *   pnpm exec tsx scripts/external-passages/inspect-pdf.ts "docs/nonPD books/The Handbook of Yoruba Religious Concepts -- Baba Ifa Karade.pdf"
 *   pnpm exec tsx scripts/external-passages/inspect-pdf.ts "<path>" --pages 30   # peek at more pages
 *   pnpm exec tsx scripts/external-passages/inspect-pdf.ts "<path>" --start 50   # jump deeper in
 */
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) throw new Error('Usage: inspect-pdf.ts <path> [--pages N] [--start N]');
  const pdfPath = path.resolve(argv[0]);
  const pagesFlag = argv.indexOf('--pages');
  const startFlag = argv.indexOf('--start');
  const pagesToShow = pagesFlag >= 0 ? Number(argv[pagesFlag + 1]) : 15;
  const startPage = startFlag >= 0 ? Number(argv[startFlag + 1]) : 1;

  console.log(`PDF: ${pdfPath}`);
  const buf = fs.readFileSync(pdfPath);
  const data = new Uint8Array(buf);
  const doc = await pdfjs
    .getDocument({ data, disableFontFace: true, useSystemFonts: false, verbosity: 0 })
    .promise;

  console.log(`Pages: ${doc.numPages}`);

  // Try to get the outline (TOC). Not all PDFs have one.
  try {
    const outline = await doc.getOutline();
    if (outline && outline.length > 0) {
      console.log('\n=== TOC ===');
      const printOutline = (items: any[], depth = 0) => {
        for (const it of items) {
          console.log(`${'  '.repeat(depth)}- ${it.title}`);
          if (it.items && it.items.length > 0) printOutline(it.items, depth + 1);
        }
      };
      printOutline(outline);
    } else {
      console.log('\n=== TOC === (no outline embedded)');
    }
  } catch (err) {
    console.log(`\n=== TOC === (error: ${(err as Error).message})`);
  }

  console.log(`\n=== Pages ${startPage}–${Math.min(doc.numPages, startPage + pagesToShow - 1)} text ===\n`);
  for (let i = startPage; i <= Math.min(doc.numPages, startPage + pagesToShow - 1); i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const txt = content.items
      .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    console.log(`--- p.${i} (${txt.length} chars) ---`);
    console.log(txt.slice(0, 1200));
    console.log('');
  }

  await doc.cleanup();
  await doc.destroy();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
