import { logMetadataExtractionUsage } from './usage-tracker';
import { parseOrRepairAiJsonObject } from './ai/json';
import { getDefaultOpenRouterMetadataModel, getOpenRouterClient } from './ai/openrouter-client';

export interface DocumentMetadata {
  title: string;
  standardizedId: string;
  author?: string;
  year?: number;
  publisher?: string;
  type: string;
  domain?: string;
  tags: string[];
  lenses: string[]; // The 7 Parallax Lenses that apply to this document
  confidence: 'established' | 'interpretive' | 'speculative' | 'tradition';
  shortSummary: string;
  longSummary: string;
  curatorNote?: string; // Explanation of why this document is significant
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  }
  return [];
}

const VALID_CONFIDENCE: ReadonlyArray<DocumentMetadata['confidence']> = [
  'established', 'interpretive', 'speculative', 'tradition',
];

export function normalizeDocumentMetadata(raw: Partial<DocumentMetadata> | null | undefined): DocumentMetadata {
  const source = (raw ?? {}) as Partial<DocumentMetadata> & Record<string, unknown>;
  const confidence = VALID_CONFIDENCE.includes(source.confidence as DocumentMetadata['confidence'])
    ? (source.confidence as DocumentMetadata['confidence'])
    : 'interpretive';

  return {
    title: typeof source.title === 'string' ? source.title : 'Untitled',
    standardizedId: typeof source.standardizedId === 'string' ? source.standardizedId : '',
    author: typeof source.author === 'string' ? source.author : undefined,
    year: typeof source.year === 'number' ? source.year : undefined,
    publisher: typeof source.publisher === 'string' ? source.publisher : undefined,
    type: typeof source.type === 'string' ? source.type : 'misc',
    domain: typeof source.domain === 'string' ? source.domain : undefined,
    tags: toStringArray(source.tags),
    lenses: toStringArray(source.lenses),
    confidence,
    shortSummary: typeof source.shortSummary === 'string' ? source.shortSummary : '',
    longSummary: typeof source.longSummary === 'string' ? source.longSummary : '',
    curatorNote: typeof source.curatorNote === 'string' ? source.curatorNote : undefined,
  };
}

function isRetryableOpenRouterError(error: unknown): boolean {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status?: number }).status)
    : undefined;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return status === 429 ||
    status === 503 ||
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('provider returned error') ||
    message.includes('temporarily unavailable');
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function extractMetadata(
  ocrText: string,
  filename: string = 'document',
  userId?: string,
  documentId?: string,
  knownTitle?: string,
  knownAuthor?: string
): Promise<{ metadata: DocumentMetadata; rawOutput: string }> {
  const openai = getOpenRouterClient();
  const model = getDefaultOpenRouterMetadataModel();

  console.log(`🤖 Calling OpenRouter (${model}) for metadata extraction...`);

  const completionRequest = {
    model,
    messages: [
      {
        role: 'system' as const,
        content: `You are a document metadata extraction expert. Extract metadata from OCR text and classify documents into these 20 types:
book_esoteric, book_spiritual, book_psychology, book_science, article_scholarly, 
anthropology, reference_table, historical, mythology, medical_overview, commentary, 
webpage, dictionary, astrology, ritual_guide, diagram, transcript, summary, speculative, misc

The 7 Parallax Lenses represent different perspectives for understanding knowledge:
1. scientific - Physics, biology, cosmology, empirical evidence, natural sciences
2. psychological - Jungian archetypes, cognitive science, shadow work, depth psychology
3. philosophical - Metaphysics, ethics, epistemology, ontology, philosophical inquiry
4. religious_spiritual - Comparative theology, mysticism, sacred texts, spiritual practices
5. historical_anthropological - Cultural evolution, mythology, ritual context, human history
6. symbolic_occult - Correspondences, alchemy, astrology, esoteric symbolism
7. mathematical - Sacred geometry, numerology, patterns, universal ratios, mathematical principles

Documents can (and often should) relate to multiple lenses.

Always respond with valid JSON only.`
      },
      {
        role: 'user' as const,
        content: `Extract metadata and return JSON for the following document.
${knownTitle ? `\nKNOWN TITLE (Priority): "${knownTitle}"` : ''}
${knownAuthor ? `\nKNOWN AUTHOR (Priority): "${knownAuthor}"` : ''}

INSTRUCTIONS:
1. Use the provided KNOWN TITLE and KNOWN AUTHOR as the ground truth if they are present.
2. If the OCR Text provided below is empty or insufficient, use your internal knowledge about this book/document to populate the metadata fields (summary, tags, lenses, domain, etc.). 
3. Ensure the return format is valid JSON.

FIELDS TO EXTRACT:
- title (string, required): Full title of the document (use provided known title)
- standardizedId (string, required): Generate a unique ID in format: type_shortname_author_year
  * Use the document type (e.g., book_esoteric)
  * Add shortened document name (2-3 key words from title, no articles)
  * Add author's last name if available
  * Add year if available
  * All lowercase, separated by underscores
  * Example format: "book_esoteric_[short_title]_[author_lastname]_[year]" (e.g. "book_esoteric_kybalion_three_initiates_1908")
  * IMPORTANT: Generate the ID from the ACTUAL document being processed, not from any example.
- author (string, optional): Full name of the author (use provided known author)
- year (number, optional)
- publisher (string, optional)
- type (one of the 20 types above, required)
- domain (string, optional: e.g., "astrology", "psychology", "anthropology")
- tags (array of strings, required, 3-5 relevant tags)
- lenses (array of strings, required): Which of the 7 Parallax Lenses apply to this document?
  * Choose from: scientific, psychological, philosophical, religious_spiritual, historical_anthropological, symbolic_occult, mathematical
  * Most documents should have 2-4 lenses
- confidence (string: "established", "interpretive", "speculative", or "tradition", required)
- shortSummary (string, required): A concise 2-3 sentence description
- longSummary (string, required): A detailed 1-2 paragraph summary
- curatorNote (string, optional): Why this document belongs in the project. 1-2 sentences.

${ocrText ? `OCR Text (first 3000 chars):\n${ocrText.substring(0, 3000)}` : `NOTE: No OCR text available. Generate metadata based ONLY on the filename "${filename}"${knownTitle ? ` and the known title "${knownTitle}"` : ''}${knownAuthor ? ` and the known author "${knownAuthor}"` : ''}. Do NOT invent or assume the document is any specific well-known work.`}

Respond with valid JSON only, no markdown code blocks.`
      }
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" as const }
  };

  let completion;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      completion = await openai.chat.completions.create(completionRequest);
      break;
    } catch (error) {
      if (attempt === 3 || !isRetryableOpenRouterError(error)) {
        throw error;
      }

      const delayMs = attempt === 1 ? 1000 : 2500;
      console.warn(`OpenRouter metadata attempt ${attempt} failed with a retryable provider error. Retrying in ${delayMs}ms...`);
      await wait(delayMs);
    }
  }

  if (!completion) {
    throw new Error('OpenRouter metadata extraction did not return a completion');
  }

  const responseText = completion.choices[0].message.content;
  if (!responseText) {
    throw new Error('Empty response from OpenRouter');
  }

  console.log('✅ OpenRouter metadata response received');
  console.log('📄 LLM Raw Output:');
  console.log('='.repeat(80));
  console.log(responseText);
  console.log('='.repeat(80));

  const parsed = await parseOrRepairAiJsonObject<DocumentMetadata>(responseText, {
    client: openai,
    model,
    label: 'OpenRouter metadata extraction',
  });
  const metadata = normalizeDocumentMetadata(parsed);
  console.log('📋 Parsed Metadata:', JSON.stringify(metadata, null, 2));

  // Log token usage for tracking
  await logMetadataExtractionUsage({
    inputTokens: completion.usage?.prompt_tokens || 0,
    outputTokens: completion.usage?.completion_tokens || 0,
    userId,
    documentId,
    success: true,
    model: completion.model || model,
  });

  return { metadata, rawOutput: responseText };
}

