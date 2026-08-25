import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { notFound } from "next/navigation";
import { CourseLearnerRenderer } from "@/components/courses/CourseLearnerRenderer";
import { parseCourseMarkdown } from "@/lib/parsers/course-markdown-parser";
import type { CourseBookMetadata } from "@/lib/courses/course-book-presentation";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Matches against the whole Library catalog (small enough to fetch in one
 * shot) so `CourseBookGallery` can show real covers wherever a reading's
 * title matches a Library record, falling back to a generated cover only for
 * readings the Library doesn't hold yet.
 */
async function loadLibraryBookMetadata(): Promise<CourseBookMetadata[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("texts")
    .select("id, title, author, cover_image_url");
  if (error || !data) return [];

  return data.map((text) => ({
    textId: text.id,
    title: text.title,
    author: text.author,
    coverImageUrl: text.cover_image_url,
    href: `/library/${text.id}`,
  }));
}

export const dynamic = "force-dynamic";

const PREVIEW_SOURCES = {
  pre: "pre-how-to-hold-two-things-at-once-hybrid-review-draft.md",
  c01: "courses/c01-how-humans-know-what-they-know-revision-draft.md",
  fd01: "courses/fd01-accessible-language-review-draft.md",
} as const;

type PreviewSourceKey = keyof typeof PREVIEW_SOURCES;

function previewPath(source: PreviewSourceKey): string {
  return resolve(
    process.cwd(),
    "..",
    "..",
    "Parallax_mission_control",
    "docs",
    PREVIEW_SOURCES[source]
  );
}

export default async function LocalCourseParserPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string | string[] }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  const requestedCourse = (await searchParams).course;
  const requestedSource = Array.isArray(requestedCourse)
    ? requestedCourse[0]
    : requestedCourse;
  const selectedSource =
    requestedSource && requestedSource in PREVIEW_SOURCES
      ? (requestedSource as PreviewSourceKey)
      : undefined;
  const sourcePath =
    (selectedSource && previewPath(selectedSource)) ||
    process.env.LOCAL_COURSE_PREVIEW_PATH ||
    previewPath("pre");
  let markdown: string;
  try {
    markdown = await readFile(sourcePath, "utf8");
  } catch {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-zinc-200">
        <h1 className="text-xl font-semibold text-white">
          Local preview source not found
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Set <code>LOCAL_COURSE_PREVIEW_PATH</code> to a Course Format V2
          Markdown file, or keep Parallax Mission Control beside this
          repository.
        </p>
        <p className="mt-3 font-mono text-xs text-zinc-600">{sourcePath}</p>
      </main>
    );
  }

  const result = parseCourseMarkdown(markdown);
  if (!result.success) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-zinc-200">
        <h1 className="text-2xl font-bold text-red-300">
          Local parser preview failed
        </h1>
        <p className="mt-4">{result.error}</p>
        {result.warnings.length ? (
          <ul className="mt-4 list-disc pl-6">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </main>
    );
  }

  const bookMetadata = await loadLibraryBookMetadata();

  return (
    <CourseLearnerRenderer
      course={result.course}
      warnings={result.warnings}
      bookMetadata={bookMetadata}
      preview
      continuousPreview
    />
  );
}
