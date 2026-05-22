// Attach per-reading Reading Digests (the "if you skip the source, here is what
// mattered" long-form artifact) onto course content for the learn page.
//
// Digests live in the `reading_blurbs` table keyed by the stable `reading_id`
// slug on each reading. Internal column names stay blurb_live / blurb_draft;
// everything user-facing says "Reading Digest". Seekers see the live digest;
// admins additionally get the pending draft so they can preview it on the real
// learn surface before promoting it in /admin/reading-blurbs.

export type DigestStatus = 'none' | 'draft_pending' | 'live' | 'draft_rejected';

export interface ReadingBlurbRow {
  reading_id: string;
  blurb_live: string | null;
  blurb_draft: string | null;
  status: DigestStatus | null;
}

interface ReadingLike {
  reading_id?: string;
  [key: string]: unknown;
}

interface WeekLike {
  readings?: ReadingLike[];
  [key: string]: unknown;
}

interface ContentLike {
  weeks?: WeekLike[];
  [key: string]: unknown;
}

/**
 * Returns a copy of `content` where each reading with a matching reading_blurbs
 * row gains:
 *   - `digest`        the live digest (always, when present)
 *   - `digest_draft`  the pending draft (admins only, when `includeDrafts`)
 *   - `digest_status` the row status (admins only, when `includeDrafts`)
 *
 * Readings without a row, or a row with nothing to show, are returned untouched.
 */
export function attachReadingDigests<T extends ContentLike | null | undefined>(
  content: T,
  blurbs: ReadingBlurbRow[],
  options: { includeDrafts: boolean },
): T {
  if (!content || !Array.isArray(content.weeks) || blurbs.length === 0) return content;

  const byReadingId = new Map<string, ReadingBlurbRow>();
  for (const row of blurbs) {
    if (row.reading_id) byReadingId.set(row.reading_id, row);
  }
  if (byReadingId.size === 0) return content;

  const weeks = content.weeks.map((week) => {
    if (!week?.readings) return week;

    const readings = week.readings.map((reading) => {
      const id = reading?.reading_id;
      if (!id) return reading;
      const row = byReadingId.get(id);
      if (!row) return reading;

      const next: ReadingLike = { ...reading };
      if (row.blurb_live) next.digest = row.blurb_live;
      if (options.includeDrafts) {
        if (row.blurb_draft) next.digest_draft = row.blurb_draft;
        if (row.status) next.digest_status = row.status;
      }
      return next;
    });

    return { ...week, readings };
  });

  return { ...content, weeks } as T;
}
