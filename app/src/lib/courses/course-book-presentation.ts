import type {
  CourseContent,
  CourseReading,
} from "@/lib/parsers/course-markdown-parser";

export interface CourseBookMetadata {
  textId?: string | null;
  title: string;
  author?: string | null;
  coverImageUrl?: string | null;
  href?: string | null;
}

export interface CourseBookDisplay {
  key: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  href: string | null;
  weekNumbers: number[];
  weekAssignments: Array<{
    weekNumber: number;
    readingOrder: number;
  }>;
}

export interface CourseBookWeekGroup {
  weekNumber: number;
  books: CourseBookDisplay[];
}

type EnrichedCourseReading = CourseReading & {
  text_id?: string;
};

export function normalizeBookTitle(title: string): string {
  return title
    .normalize("NFKD")
    // Strip combining diacritics (from names/titles like "Sūtras" or
    // "Patañjali") before collapsing punctuation. Left in place, each mark
    // sits between two letters as its own non-alphanumeric character and
    // gets turned into a stray space, silently splitting words in two
    // ("sutras" -> "su tras") and breaking every match against an
    // undiacriticized reading title.
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Curated equivalences the parser's syllabus title can't reach by
 * normalizing text alone — a different historical translation title, or a
 * short-form reference to one selection inside a larger catalog anthology.
 * Each entry reflects a specific, reviewed editorial decision (see the C01/
 * FD01 source-and-catalog audits) rather than a guess, so keep this list to
 * confirmed cases only.
 */
const KNOWN_TITLE_ALIASES: Record<string, string> = {
  // Edwin Arnold's verse translation of the Bhagavad Gita was published
  // under this title; the catalog holds no record titled "Bhagavad Gita".
  "bhagavad gita": "song celestial or bhagavad gita from the mahabharata",
  // The catalog's 1650 Everard translation of the Corpus Hermeticum is
  // catalogued under its historical English title.
  "poemandres corpus hermeticum i": "divine pymander",
  // Jung's early book-length study of symbols and libido transformation;
  // the syllabus intentionally left this generic pending a named edition.
  "selected early work on symbols": "psychology of the unconscious",
  // These are individual myths/chapters selected from Berens's anthology,
  // not standalone catalog works.
  "prometheus and demeter persephone": "myths and legends of ancient greece and rome",
  perseus: "myths and legends of ancient greece and rome",
  "perseus and medusa": "myths and legends of ancient greece and rome",
  // Selected from Bulfinch's anthology under its "Age of Fable" volume title.
  "perseus and the gorgon": "bulfinch s mythology the age of fable",
};

function readingKey(reading: Pick<CourseReading, "title">): string {
  return normalizeBookTitle(reading.title);
}

const MIN_LENIENT_MATCH_LENGTH = 6;
const MIN_SINGLE_WORD_MATCH_LENGTH = 8;

/**
 * Beyond an exact normalized title, treat a reading and a catalog record as
 * the same work when one normalized title is a whole-word prefix of the
 * other. This covers the common case where the syllabus uses a short title
 * ("The Kybalion") and the catalog holds the full historical title
 * ("The Kybalion: A Study of the Hermetic Philosophy of Ancient Egypt and
 * Greece"). A single common word ("Ethics") is too weak a signal on its own —
 * it would wrongly match Spinoza's "Ethics" against "The Ethics of Belief" —
 * so a lone word must be distinctively long; a multi-word phrase only needs
 * the general minimum.
 */
function isLenientTitleMatch(a: string, b: string): boolean {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  const isSingleWord = !shorter.includes(" ");
  const minLength = isSingleWord
    ? MIN_SINGLE_WORD_MATCH_LENGTH
    : MIN_LENIENT_MATCH_LENGTH;
  if (shorter.length < minLength) return false;
  return longer === shorter || longer.startsWith(`${shorter} `);
}

/**
 * A catalog title's colon/dash-separated subtitle is often itself a
 * recognized standalone title ("Bulfinch's Mythology: The Age of Fable"
 * holding a reading assigned simply as "The Age of Fable"). Segmenting on
 * those separators lets a reading match the subtitle half without loosening
 * the whole-title prefix check above.
 */
function titleSegments(title: string): string[] {
  return title
    .split(/:|—|(?:\s-\s)/)
    // Trim before normalizing: normalizeBookTitle only strips a leading
    // "the " when it's the very first thing in the string, and a
    // colon-split segment like " The Age of Fable" starts with a space.
    .map((segment) => normalizeBookTitle(segment.trim()))
    .filter(Boolean);
}

function findLenientMetadataMatch(
  key: string,
  metadata: readonly CourseBookMetadata[]
): CourseBookMetadata | undefined {
  const aliasTarget = KNOWN_TITLE_ALIASES[key];
  if (aliasTarget) {
    const aliasMatch = metadata.find(
      (item) => normalizeBookTitle(item.title) === aliasTarget
    );
    if (aliasMatch) return aliasMatch;
  }
  return (
    metadata.find((item) =>
      isLenientTitleMatch(key, normalizeBookTitle(item.title))
    ) ??
    metadata.find((item) =>
      titleSegments(item.title).some(
        (segment) => key === segment || isLenientTitleMatch(key, segment)
      )
    )
  );
}

/**
 * Builds the learner-facing bibliography without requiring a database.
 *
 * Parsed readings always remain visible. Verified library metadata is merged
 * when a caller has it: first by text ID, then an exact normalized title,
 * then a curated alias, then a lenient whole-word title-prefix match.
 */
export function buildCourseBookDisplay(
  content: CourseContent | null,
  metadata: readonly CourseBookMetadata[] = []
): CourseBookDisplay[] {
  if (!content?.weeks?.length) return [];

  const metadataByTextId = new Map<string, CourseBookMetadata>();
  const metadataByTitle = new Map<string, CourseBookMetadata>();
  for (const item of metadata) {
    if (item.textId) metadataByTextId.set(item.textId, item);
    metadataByTitle.set(normalizeBookTitle(item.title), item);
  }

  const books = new Map<string, CourseBookDisplay>();
  const sortedWeeks = content.weeks
    .slice()
    .sort((a, b) => a.week_number - b.week_number);

  for (const week of sortedWeeks) {
    for (const [readingOrder, rawReading] of (week.readings ?? []).entries()) {
      const reading = rawReading as EnrichedCourseReading;
      const key = readingKey(reading);
      const existing = books.get(key);

      if (existing) {
        if (!existing.weekNumbers.includes(week.week_number)) {
          existing.weekNumbers.push(week.week_number);
          existing.weekAssignments.push({
            weekNumber: week.week_number,
            readingOrder,
          });
        }
        continue;
      }

      const match =
        (reading.text_id && metadataByTextId.get(reading.text_id)) ||
        metadataByTitle.get(key) ||
        findLenientMetadataMatch(key, metadata);
      const textId = reading.text_id || match?.textId || null;

      books.set(key, {
        key,
        // The syllabus title is learner-facing and remains authoritative even
        // when the matched library record is a broader edition or collection.
        title: reading.title,
        author: match?.author || reading.author || null,
        coverImageUrl: match?.coverImageUrl || null,
        href:
          match?.href ||
          (textId ? `/library/${textId}` : reading.direct_url || null),
        weekNumbers: [week.week_number],
        weekAssignments: [
          {
            weekNumber: week.week_number,
            readingOrder,
          },
        ],
      });
    }
  }

  return [...books.values()];
}

/**
 * Rebuilds the weekly shelves from the deduplicated bibliography while
 * preserving each week's original reading order.
 */
export function groupCourseBooksByWeek(
  books: readonly CourseBookDisplay[]
): CourseBookWeekGroup[] {
  const groups = new Map<
    number,
    Array<{
      book: CourseBookDisplay;
      readingOrder: number;
      bibliographyOrder: number;
    }>
  >();

  books.forEach((book, bibliographyOrder) => {
    for (const assignment of book.weekAssignments) {
      const entries = groups.get(assignment.weekNumber) ?? [];
      entries.push({
        book,
        readingOrder: assignment.readingOrder,
        bibliographyOrder,
      });
      groups.set(assignment.weekNumber, entries);
    }
  });

  return [...groups.entries()]
    .sort(([leftWeek], [rightWeek]) => leftWeek - rightWeek)
    .map(([weekNumber, entries]) => ({
      weekNumber,
      books: entries
        .sort(
          (left, right) =>
            left.readingOrder - right.readingOrder ||
            left.bibliographyOrder - right.bibliographyOrder
        )
        .map((entry) => entry.book),
    }));
}
