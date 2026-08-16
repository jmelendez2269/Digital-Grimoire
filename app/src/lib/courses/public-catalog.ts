import type { Course } from "@/components/courses/CoursesCatalogClient";

export const PUBLIC_CATALOG_SELECT = `
  id,
  title,
  slug,
  description,
  premise,
  learning_outcomes,
  course_type,
  level,
  duration_weeks,
  is_published,
  created_at,
  course_id_tag:content->course_id_tag,
  core_question:content->core_question,
  arc:content->arc,
  arc_position:content->arc_position,
  curator_note_public:content->curator_note_public,
  key_tensions:content->key_tensions,
  completion_pathways:content->completion_pathways
`;

export const PUBLIC_CATALOG_FALLBACK_SELECT = `
  id,
  title,
  slug,
  description,
  premise,
  learning_outcomes,
  course_type,
  level,
  duration_weeks,
  is_published,
  created_at
`;

export interface PublicCatalogRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  premise: string | null;
  learning_outcomes: string[] | null;
  course_type: Course["course_type"];
  level: Course["level"];
  duration_weeks: number | null;
  is_published: boolean;
  created_at: string;
  course_id_tag: unknown;
  core_question: unknown;
  arc: unknown;
  arc_position: unknown;
  curator_note_public: unknown;
  key_tensions: unknown;
  completion_pathways: unknown;
  course_texts?: Course["course_texts"];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function shapePublicCatalogCourse(row: PublicCatalogRow): Course {
  const arcPosition =
    typeof row.arc_position === "number"
      ? row.arc_position
      : Number(row.arc_position);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    premise: row.premise,
    learning_outcomes: row.learning_outcomes,
    course_type: row.course_type,
    level: row.level,
    duration_weeks: row.duration_weeks,
    is_published: row.is_published,
    created_at: row.created_at,
    content: {
      course_id_tag: optionalString(row.course_id_tag),
      core_question: optionalString(row.core_question),
      arc: optionalString(row.arc),
      arc_position: Number.isFinite(arcPosition) ? arcPosition : undefined,
      curator_note_public: optionalString(row.curator_note_public),
      key_tensions: Array.isArray(row.key_tensions)
        ? row.key_tensions
            .map((value) => {
              const tension = value as Record<string, unknown>;
              const label = optionalString(tension.label);
              const description = optionalString(tension.description);
              return label && description ? { label, description } : null;
            })
            .filter(
              (value): value is { label: string; description: string } =>
                value !== null
            )
        : undefined,
      completion_pathways: Array.isArray(row.completion_pathways)
        ? row.completion_pathways
            .map((value) => {
              const pathway = value as Record<string, unknown>;
              const code = optionalString(pathway.code);
              const title = optionalString(pathway.title);
              return code && title ? { code, title } : null;
            })
            .filter(
              (value): value is { code: string; title: string } =>
                value !== null
            )
        : undefined,
    },
    // Cover stacks are intentionally omitted from the initial catalog. The
    // old relation accounted for roughly 3 MB of a 3.5 MB response.
    course_texts: [],
  };
}
