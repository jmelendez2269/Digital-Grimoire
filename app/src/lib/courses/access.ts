type CourseContent = Record<string, unknown>;

type CourseRecord = Record<string, unknown> & {
  content?: CourseContent | null;
};

const PUBLIC_CONTENT_KEYS = [
  'arc',
  'arc_position',
  'core_question',
  'course_id_tag',
  'orientation',
  'mode',
  'curator_note_public',
  'tone_safety',
  'key_tensions',
  'completion_pathways',
];

const PUBLIC_WEEK_KEYS = [
  'week_number',
  'title',
  'description',
  'week_summary',
  'core_question',
  'key_tension',
  'lens_focus',
  'week_type',
];

const PUBLIC_READING_KEYS = [
  'text_id',
  'title',
  'author',
  'section',
  'sort_order',
];

function isRecord(value: unknown): value is CourseContent {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function copyKnownKeys(source: CourseContent, keys: string[]): CourseContent {
  const target: CourseContent = {};

  for (const key of keys) {
    if (source[key] !== undefined) {
      target[key] = source[key];
    }
  }

  return target;
}

function sanitizeReadingForPreview(reading: unknown): CourseContent | null {
  if (!isRecord(reading)) return null;

  const preview = copyKnownKeys(reading, PUBLIC_READING_KEYS);

  if (isRecord(reading.tiers)) {
    const tiers: CourseContent = {};

    for (const tierName of ['keystone', 'passage', 'full']) {
      const tier = reading.tiers[tierName];
      if (isRecord(tier) && typeof tier.reference === 'string') {
        tiers[tierName] = { reference: tier.reference };
      }
    }

    if (Object.keys(tiers).length > 0) {
      preview.tiers = tiers;
    }
  }

  return Object.keys(preview).length > 0 ? preview : null;
}

function sanitizeWeekForPreview(week: unknown): CourseContent | null {
  if (!isRecord(week)) return null;

  const preview = copyKnownKeys(week, PUBLIC_WEEK_KEYS);

  if (!preview.description && typeof week.summary === 'string') {
    preview.description = week.summary;
  }

  if (Array.isArray(week.readings)) {
    const readings = week.readings
      .map(sanitizeReadingForPreview)
      .filter((reading): reading is CourseContent => reading !== null);

    if (readings.length > 0) {
      preview.readings = readings;
    }
  }

  return Object.keys(preview).length > 0 ? preview : null;
}

export function sanitizeCourseContentForPreview(content: unknown): CourseContent | null {
  if (!isRecord(content)) return null;

  const preview = copyKnownKeys(content, PUBLIC_CONTENT_KEYS);

  if (Array.isArray(content.week_summaries)) {
    preview.week_summaries = content.week_summaries;
  }

  if (Array.isArray(content.weeks)) {
    const weeks = content.weeks
      .map(sanitizeWeekForPreview)
      .filter((week): week is CourseContent => week !== null);

    if (weeks.length > 0) {
      preview.weeks = weeks;
    }
  }

  return Object.keys(preview).length > 0 ? preview : null;
}

export function sanitizeCourseForPreview<T extends CourseRecord>(course: T): T {
  return {
    ...course,
    content: sanitizeCourseContentForPreview(course.content),
  };
}
