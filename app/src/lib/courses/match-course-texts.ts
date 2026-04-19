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

export interface MatchedCourseText {
  id: string;
  text_id: string;
  is_required: boolean;
  texts: TextMatch;
}

interface QueryableClient {
  from: (table: string) => any;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}

function looksLikeAuthorName(value: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();

  const knownAuthors = [
    'plato',
    'lao tzu',
    'marcus aurelius',
    'descartes',
    'bacon',
    'rumi',
    'eckhart',
    'william james',
    'anonymous',
    'zhuangzi',
    'ovid',
    'carl jung',
  ];

  if (knownAuthors.includes(normalized)) return true;

  return /^[a-z]+(?:\s+[a-z.]+){0,3}$/i.test(value) && !/[,:]/.test(value);
}

function getTitleCandidateFromSection(section: string | undefined): string | null {
  if (!section) return null;
  const [candidate] = section.split(',');
  const clean = candidate?.trim();
  return clean || null;
}

export function extractReadingTitles(content: CourseContentLike | null | undefined): string[] {
  const titles = new Set<string>();

  content?.weeks?.forEach((week) => {
    week?.readings?.forEach((reading) => {
      const title = reading?.title?.trim();
      const sectionTitle = getTitleCandidateFromSection(reading?.section);

      if (title && !looksLikeAuthorName(title)) {
        titles.add(title);
      }

      if (sectionTitle) {
        titles.add(sectionTitle);
      }
    });
  });

  return Array.from(titles);
}

export async function matchCourseTextsFromContent(
  client: QueryableClient,
  content: CourseContentLike | null | undefined
): Promise<MatchedCourseText[]> {
  const titles = extractReadingTitles(content);
  if (titles.length === 0) return [];

  const matches = await Promise.all(
    titles.map(async (title) => {
      const { data, error } = await client
        .from('texts')
        .select('id, title, author, cover_image_url')
        .ilike('title', `%${escapeLikePattern(title)}%`)
        .limit(1);

      if (error || !data || data.length === 0) return null;
      return data[0];
    })
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
