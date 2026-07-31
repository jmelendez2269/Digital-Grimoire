type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null
    ? (value as UnknownRecord)
    : null;
}

function countCorpusWorks(metadata: UnknownRecord): number | null {
  const corpus = asRecord(metadata.corpus);
  const groups = Array.isArray(corpus?.groups) ? corpus.groups : [];

  if (groups.length === 0) return null;

  return groups.reduce((total, rawGroup) => {
    const group = asRecord(rawGroup);
    if (!group) return total;

    const works = Array.isArray(group.works)
      ? group.works
      : Array.isArray(group.items)
        ? group.items
        : [];

    return total + works.length;
  }, 0);
}

/**
 * The texts table can contain large or reader-only values inside metadata.
 * Public catalog responses retain only presentation fields used by the cards.
 */
export function sanitizePublicLibraryMetadata(
  value: unknown
): Record<string, string | number | boolean> {
  const metadata = asRecord(value);
  if (!metadata) return {};

  const safe: Record<string, string | number | boolean> = {};

  if (
    typeof metadata.cover_position === "string" &&
    metadata.cover_position.length <= 80
  ) {
    safe.cover_position = metadata.cover_position;
  }

  if (metadata.isCorpusCollection === true) {
    safe.isCorpusCollection = true;
    const corpusWorkCount = countCorpusWorks(metadata);
    if (corpusWorkCount !== null) {
      safe.corpusWorkCount = corpusWorkCount;
    }
  }

  return safe;
}

/**
 * PostgREST `.or()` filters use punctuation as query syntax. Public search
 * accepts readable text while stripping those control characters.
 */
export function sanitizePublicCatalogSearch(value: string | null): string {
  return (value ?? "")
    .replace(/[,%_().]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
