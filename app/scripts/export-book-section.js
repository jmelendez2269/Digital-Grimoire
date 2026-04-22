const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    notes: [],
    bookSlug: 'llewellyns-complete-book-of-correspondences',
    bookTitle: "Llewellyn's Complete Book of Correspondences",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if ((arg === '--pdf' || arg === '-p') && next) {
      parsed.pdfPath = next;
      index += 1;
      continue;
    }

    if ((arg === '--start' || arg === '-s') && next) {
      parsed.startPage = Number(next);
      index += 1;
      continue;
    }

    if ((arg === '--end' || arg === '-e') && next) {
      parsed.endPage = Number(next);
      index += 1;
      continue;
    }

    if (arg === '--slug' && next) {
      parsed.slug = next;
      index += 1;
      continue;
    }

    if (arg === '--title' && next) {
      parsed.title = next;
      index += 1;
      continue;
    }

    if (arg === '--wave' && next) {
      parsed.wave = next;
      index += 1;
      continue;
    }

    if (arg === '--book-slug' && next) {
      parsed.bookSlug = next;
      index += 1;
      continue;
    }

    if (arg === '--book-title' && next) {
      parsed.bookTitle = next;
      index += 1;
      continue;
    }

    if (arg === '--output-dir' && next) {
      parsed.outputDir = next;
      index += 1;
      continue;
    }

    if (arg === '--note' && next) {
      parsed.notes.push(next);
      index += 1;
    }
  }

  if (!parsed.pdfPath) {
    throw new Error('Missing required --pdf <path-to-pdf>');
  }

  if (!parsed.startPage || !parsed.endPage) {
    throw new Error('Missing required --start <page> and/or --end <page>');
  }

  if (!parsed.slug) {
    throw new Error('Missing required --slug <section-slug>');
  }

  if (!parsed.title) {
    throw new Error('Missing required --title <section-title>');
  }

  return parsed;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\u00ad/g, '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pageTextFromItems(items) {
  const text = items
    .map((item) => item.str || '')
    .join(' ')
    .replace(/ +/g, ' ');

  return cleanText(text);
}

function countWords(value) {
  return cleanText(value)
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function buildTextArtifact({ bookTitle, title, startPage, endPage, pages }) {
  const header = [
    `${bookTitle}`,
    `${title}`,
    `PDF pages ${startPage}-${endPage}`,
    '',
  ].join('\n');

  const body = pages
    .map((page) => [`=== PAGE ${page.pageNumber} ===`, page.text, ''].join('\n'))
    .join('\n');

  return `${header}${body}`.trimEnd() + '\n';
}

async function main() {
  const args = parseArgs();
  const pdfBuffer = fs.readFileSync(args.pdfPath);
  const pdfData = new Uint8Array(pdfBuffer);
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

  if (args.startPage < 1 || args.endPage > pdf.numPages || args.startPage > args.endPage) {
    throw new Error(`Invalid page range ${args.startPage}-${args.endPage} for PDF with ${pdf.numPages} pages.`);
  }

  const pages = [];

  for (let pageNumber = args.startPage; pageNumber <= args.endPage; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = pageTextFromItems(content.items);

    pages.push({
      pageNumber,
      order: pageNumber - args.startPage + 1,
      charCount: text.length,
      wordCount: countWords(text),
      text,
    });
  }

  const totalChars = pages.reduce((sum, page) => sum + page.charCount, 0);
  const totalWords = pages.reduce((sum, page) => sum + page.wordCount, 0);

  const outputDir = args.outputDir
    ? path.resolve(process.cwd(), args.outputDir)
    : path.resolve(process.cwd(), '..', 'graph-bundles', 'books', args.bookSlug);

  fs.mkdirSync(outputDir, { recursive: true });

  const basePath = path.join(outputDir, args.slug);
  const jsonPath = `${basePath}.json`;
  const textPath = `${basePath}.txt`;

  const sectionPayload = {
    kind: 'book-section-extraction',
    extractedAt: new Date().toISOString(),
    source: {
      bookSlug: args.bookSlug,
      bookTitle: args.bookTitle,
      pdfPath: args.pdfPath,
      pdfPageCount: pdf.numPages,
      sectionSlug: args.slug,
      sectionTitle: args.title,
      wave: args.wave || null,
      startPage: args.startPage,
      endPage: args.endPage,
      pageCount: pages.length,
      notes: args.notes,
    },
    stats: {
      totalChars,
      totalWords,
      averageCharsPerPage: Math.round(totalChars / pages.length),
      averageWordsPerPage: Math.round(totalWords / pages.length),
    },
    graphReady: {
      sourceCitationTemplate: `${args.bookTitle}, ${args.title}, p.{page}`,
      suggestedEntityPasses: [
        'issues_intentions_powers',
        'colors',
        'plants',
        'minerals',
        'animals',
        'deities_beings',
        'astrology_time',
        'ritual_tools_misc',
      ],
      suggestedRelationshipTypes: ['corresponds_to', 'associated_with'],
      suggestedChunkSizePages: 12,
      stagingStatus: 'raw_extracted',
    },
    pages,
  };

  fs.writeFileSync(jsonPath, `${JSON.stringify(sectionPayload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    textPath,
    buildTextArtifact({
      bookTitle: args.bookTitle,
      title: args.title,
      startPage: args.startPage,
      endPage: args.endPage,
      pages,
    }),
    'utf8',
  );

  console.log(
    JSON.stringify(
      {
        jsonPath,
        textPath,
        pageCount: pages.length,
        pdfPageCount: pdf.numPages,
        totalChars,
        totalWords,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('Book section export failed:', error);
  process.exit(1);
});
