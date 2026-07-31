export type CoursePathPollStatus = "draft" | "open" | "closed" | "archived";

export type PublicCoursePathPollStatus = Extract<
  CoursePathPollStatus,
  "open" | "closed"
>;

export type CoursePathAudienceResultKind =
  | "pending"
  | "leader"
  | "tie"
  | "no_votes";

export interface CoursePathPollOptionView {
  optionId: string;
  courseSlug: string;
  code: string;
  title: string;
  coreQuestion: string;
  href: string;
  voteCount: number | null;
  percentage: number | null;
  isAudienceLeader: boolean;
}

export interface CoursePathAudienceResultView {
  kind: CoursePathAudienceResultKind;
  leaderCourseSlug: string | null;
}

export interface CoursePathEditorialDecisionView {
  courseSlug: string;
  note: string | null;
}

/**
 * The only ballot shape that may cross the public Server Component boundary.
 * It deliberately excludes internal poll IDs, actor IDs, timestamps, hashes,
 * network data, rate buckets, and internal draft/archive lifecycle state.
 * Archived ballots are exposed only as closed, read-only final results.
 */
export interface CoursePathPollView {
  slug: string;
  question: string;
  status: PublicCoursePathPollStatus;
  viewerChoiceOptionId: string | null;
  resultsVisible: boolean;
  totalVotes: number | null;
  options: [CoursePathPollOptionView, CoursePathPollOptionView];
  audienceResult: CoursePathAudienceResultView;
  editorialDecision: CoursePathEditorialDecisionView | null;
}

export type CoursePathVoteActionCode =
  | "accepted"
  | "invalid"
  | "not_available"
  | "rate_limited";

export interface CoursePathVoteActionResult {
  ok: boolean;
  code: CoursePathVoteActionCode;
  message: string;
  poll: CoursePathPollView | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const AUDIENCE_RESULTS = new Set<CoursePathAudienceResultKind>([
  "pending",
  "leader",
  "tie",
  "no_votes",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maxLength) return null;
  return cleaned;
}

function cleanNullableText(
  value: unknown,
  maxLength: number,
): string | null | undefined {
  if (value === null || value === undefined) return null;
  const cleaned = cleanText(value, maxLength);
  return cleaned ?? undefined;
}

function cleanCount(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null;
}

function cleanPercentage(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value >= 0 && value <= 100 ? value : null;
}

function parseOption(
  value: unknown,
  revealResults: boolean,
): CoursePathPollOptionView | null {
  if (!isRecord(value)) return null;

  const optionId = cleanText(value.optionId, 64);
  const courseSlug = cleanText(value.courseSlug, 160);
  const code = cleanText(value.code, 24);
  const title = cleanText(value.title, 240);
  const coreQuestion =
    typeof value.coreQuestion === "string"
      ? value.coreQuestion.trim().slice(0, 500)
      : "";
  const href = cleanText(value.href, 220);

  if (
    !optionId ||
    !UUID_PATTERN.test(optionId) ||
    !courseSlug ||
    !SLUG_PATTERN.test(courseSlug) ||
    !code ||
    !title ||
    href !== `/courses/${courseSlug}`
  ) {
    return null;
  }

  return {
    optionId,
    courseSlug,
    code,
    title,
    coreQuestion,
    href,
    voteCount: revealResults ? cleanCount(value.voteCount) : null,
    percentage: revealResults ? cleanPercentage(value.percentage) : null,
    isAudienceLeader: value.isAudienceLeader === true,
  };
}

/**
 * Treat database JSON as untrusted and rebuild the public shape from an
 * allowlist. Results visibility is derived again here so an accidental query
 * change cannot reveal live totals before this browser votes.
 */
export function parseCoursePathPollView(
  value: unknown,
): CoursePathPollView | null {
  if (!isRecord(value)) return null;

  const slug = cleanText(value.slug, 160);
  const question = cleanText(value.question, 240);
  const status =
    value.status === "open" || value.status === "closed" ? value.status : null;
  const viewerChoiceOptionId =
    value.viewerChoiceOptionId === null ||
    value.viewerChoiceOptionId === undefined
      ? null
      : cleanText(value.viewerChoiceOptionId, 64);

  if (
    !slug ||
    !SLUG_PATTERN.test(slug) ||
    !question ||
    !status ||
    (viewerChoiceOptionId !== null &&
      !UUID_PATTERN.test(viewerChoiceOptionId))
  ) {
    return null;
  }

  const resultsVisible =
    status === "closed" || viewerChoiceOptionId !== null;
  if (!Array.isArray(value.options) || value.options.length !== 2) return null;

  const firstOption = parseOption(value.options[0], resultsVisible);
  const secondOption = parseOption(value.options[1], resultsVisible);
  if (
    !firstOption ||
    !secondOption ||
    firstOption.optionId === secondOption.optionId ||
    firstOption.courseSlug === secondOption.courseSlug
  ) {
    return null;
  }
  if (
    resultsVisible &&
    (firstOption.voteCount === null ||
      firstOption.percentage === null ||
      secondOption.voteCount === null ||
      secondOption.percentage === null)
  ) {
    return null;
  }

  const optionIds = new Set([firstOption.optionId, secondOption.optionId]);
  if (
    viewerChoiceOptionId !== null &&
    !optionIds.has(viewerChoiceOptionId)
  ) {
    return null;
  }

  const audienceRecord = isRecord(value.audienceResult)
    ? value.audienceResult
    : {};
  const audienceKind = AUDIENCE_RESULTS.has(
    audienceRecord.kind as CoursePathAudienceResultKind,
  )
    ? (audienceRecord.kind as CoursePathAudienceResultKind)
    : "pending";
  const audienceLeaderSlug = cleanNullableText(
    audienceRecord.leaderCourseSlug,
    160,
  );
  if (audienceLeaderSlug === undefined) return null;

  const courseSlugs = new Set([
    firstOption.courseSlug,
    secondOption.courseSlug,
  ]);
  if (
    audienceLeaderSlug !== null &&
    !courseSlugs.has(audienceLeaderSlug)
  ) {
    return null;
  }

  const normalizedAudienceKind =
    status === "open" ? "pending" : audienceKind;
  if (status === "closed" && normalizedAudienceKind === "pending") {
    return null;
  }
  const normalizedLeaderSlug =
    normalizedAudienceKind === "leader" ? audienceLeaderSlug : null;
  if (
    normalizedAudienceKind === "leader" &&
    normalizedLeaderSlug === null
  ) {
    return null;
  }

  firstOption.isAudienceLeader =
    normalizedAudienceKind === "leader" &&
    firstOption.courseSlug === normalizedLeaderSlug;
  secondOption.isAudienceLeader =
    normalizedAudienceKind === "leader" &&
    secondOption.courseSlug === normalizedLeaderSlug;

  let editorialDecision: CoursePathEditorialDecisionView | null = null;
  if (
    status === "closed" &&
    value.editorialDecision !== null &&
    value.editorialDecision !== undefined
  ) {
    if (!isRecord(value.editorialDecision)) return null;
    const courseSlug = cleanText(value.editorialDecision.courseSlug, 160);
    const note = cleanNullableText(value.editorialDecision.note, 1000);
    if (!courseSlug || !courseSlugs.has(courseSlug) || note === undefined) {
      return null;
    }
    editorialDecision = { courseSlug, note };
  }

  const totalVotes = resultsVisible ? cleanCount(value.totalVotes) : null;
  if (resultsVisible && totalVotes === null) return null;

  return {
    slug,
    question,
    status,
    viewerChoiceOptionId,
    resultsVisible,
    totalVotes,
    options: [firstOption, secondOption],
    audienceResult: {
      kind: normalizedAudienceKind,
      leaderCourseSlug: normalizedLeaderSlug,
    },
    editorialDecision,
  };
}
