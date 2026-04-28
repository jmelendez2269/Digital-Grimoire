interface CourseReadingLike {
  title?: string;
  author?: string;
  section?: string;
}

interface CourseWeekLike {
  readings?: CourseReadingLike[];
}

interface CourseContentLike {
  weeks?: CourseWeekLike[];
}

interface TextMatch {
  id: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
}

interface ReadingCandidate {
  title: string;
  author?: string;
  variants: string[];
}

export interface MatchedCourseText {
  id: string;
  text_id: string;
  is_required: boolean;
  texts: TextMatch;
}

interface QueryableClient {
  from: (table: string) => {
    select: (columns: string) => {
      ilike: (column: string, pattern: string) => {
        limit: (count: number) => Promise<{ data: TextMatch[] | null; error: unknown }>;
      };
    };
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}

function normalizeForComparison(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'"]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripLeadingArticle(value: string): string {
  return value.replace(/^(the|a|an)\s+/i, '').trim();
}

function stripTrailingQualifier(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s*[:,-]\s*(selected|selections|selection|chapters?|books?|parts?|tractates?|sections?|volumes?).*$/i, '')
    .trim();
}

function dedupeNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;

    const key = normalizeForComparison(trimmed);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    deduped.push(trimmed);
  }

  return deduped;
}

function getTitleCandidateFromSection(section: string | undefined): string | null {
  if (!section) return null;
  const [candidate] = section.split(',');
  const clean = candidate?.trim();
  return clean || null;
}

function buildTitleVariants(title: string, section?: string): string[] {
  const sectionTitle = getTitleCandidateFromSection(section);
  const strippedTitle = stripTrailingQualifier(title);
  const strippedSectionTitle = sectionTitle ? stripTrailingQualifier(sectionTitle) : null;

  return dedupeNonEmpty([
    title,
    strippedTitle,
    stripLeadingArticle(title),
    stripLeadingArticle(strippedTitle),
    sectionTitle,
    strippedSectionTitle,
    strippedSectionTitle ? stripLeadingArticle(strippedSectionTitle) : null,
  ]);
}

function extractReadingCandidates(content: CourseContentLike | null | undefined): ReadingCandidate[] {
  const candidates = new Map<string, ReadingCandidate>();

  content?.weeks?.forEach((week) => {
    week?.readings?.forEach((reading) => {
      const title = reading?.title?.trim();
      if (!title) return;

      const variants = buildTitleVariants(title, reading?.section);
      if (variants.length === 0) return;

      const key = normalizeForComparison(title);
      if (!key) return;

      candidates.set(key, {
        title,
        author: reading?.author?.trim() || undefined,
        variants,
      });
    });
  });

  return Array.from(candidates.values());
}

function scoreTextMatch(candidate: ReadingCandidate, text: TextMatch): number {
  const normalizedTextTitle = normalizeForComparison(text.title);
  const normalizedTextAuthor = normalizeForComparison(text.author || '');
  const normalizedCandidateAuthor = normalizeForComparison(candidate.author || '');

  let bestScore = 0;

  for (const variant of candidate.variants) {
    const normalizedVariant = normalizeForComparison(variant);
    if (!normalizedVariant) continue;

    let score = 0;

    if (normalizedTextTitle === normalizedVariant) score += 100;
    else if (normalizedTextTitle.startsWith(normalizedVariant)) score += 80;
    else if (normalizedTextTitle.includes(normalizedVariant)) score += 65;
    else if (normalizedVariant.includes(normalizedTextTitle)) score += 55;

    const variantWords = normalizedVariant.split(' ').filter(Boolean);
    const sharedWords = variantWords.filter((word) => normalizedTextTitle.includes(word));
    score += sharedWords.length * 4;

    if (normalizedCandidateAuthor && normalizedTextAuthor) {
      if (normalizedTextAuthor === normalizedCandidateAuthor) score += 30;
      else if (
        normalizedTextAuthor.includes(normalizedCandidateAuthor) ||
        normalizedCandidateAuthor.includes(normalizedTextAuthor)
      ) {
        score += 20;
      }
    }

    bestScore = Math.max(bestScore, score);
  }

  return bestScore;
}

async function findBestTextMatch(
  client: QueryableClient,
  candidate: ReadingCandidate
): Promise<TextMatch | null> {
  const variants = candidate.variants.slice(0, 5);
  const seen = new Map<string, TextMatch>();

  for (const variant of variants) {
    const { data, error } = await client
      .from('texts')
      .select('id, title, author, cover_image_url')
      .ilike('title', `%${escapeLikePattern(variant)}%`)
      .limit(8);

    if (error || !data || data.length === 0) continue;

    for (const text of data as TextMatch[]) {
      seen.set(text.id, text);
    }
  }

  const rankedMatches = Array.from(seen.values())
    .map((text) => ({
      text,
      score: scoreTextMatch(candidate, text),
    }))
    .filter((match) => match.score >= 60)
    .sort((a, b) => b.score - a.score);

  return rankedMatches[0]?.text || null;
}

export function extractReadingTitles(content: CourseContentLike | null | undefined): string[] {
  return extractReadingCandidates(content).flatMap((candidate) => candidate.variants);
}

export async function matchCourseTextsFromContent(
  client: QueryableClient,
  content: CourseContentLike | null | undefined
): Promise<MatchedCourseText[]> {
  const candidates = extractReadingCandidates(content);
  if (candidates.length === 0) return [];

  const matches = await Promise.all(
    candidates.map((candidate) => findBestTextMatch(client, candidate))
  );

  const uniqueMatches = Array.from(
    new Map(matches.filter((match): match is TextMatch => Boolean(match)).map((match) => [match.id, match])).values()
  );

  return uniqueMatches.map((text) => ({
    id: `matched-${text.id}`,
    text_id: text.id,
    is_required: true,
    texts: text,
  }));
}
