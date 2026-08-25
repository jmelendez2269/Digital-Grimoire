import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  attachTextIdsToReadings,
  matchCourseTextsFromContent,
} from "../src/lib/courses/match-course-texts";
import { resolveCourseImportPublicationState } from "../src/lib/courses/course-import-publication";
import { parseCourseMarkdown } from "../src/lib/parsers/course-markdown-parser";

const FD01_SLUG =
  "fd01-mythic-imagination-from-classical-pattern-to-personal-meaning";
const DEFAULT_SOURCE =
  "C:\\Projects\\Parallax_mission_control\\docs\\courses\\fd01-recreation-draft.md";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function projectRef(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function weekCount(content: unknown): number {
  if (!content || typeof content !== "object") return 0;
  const weeks = (content as { weeks?: unknown }).weeks;
  return Array.isArray(weeks) ? weeks.length : 0;
}

function readingCount(content: unknown): number {
  if (!content || typeof content !== "object") return 0;
  const weeks = (content as { weeks?: unknown }).weeks;
  if (!Array.isArray(weeks)) return 0;
  return weeks.reduce((total, week) => {
    if (!week || typeof week !== "object") return total;
    const readings = (week as { readings?: unknown }).readings;
    return total + (Array.isArray(readings) ? readings.length : 0);
  }, 0);
}

function weekTitles(content: unknown): string[] {
  if (!content || typeof content !== "object") return [];
  const weeks = (content as { weeks?: unknown }).weeks;
  if (!Array.isArray(weeks)) return [];
  return weeks.map((week) => {
    if (!week || typeof week !== "object") return "";
    const title = (week as { title?: unknown }).title;
    return typeof title === "string" ? title : "";
  });
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
}

function jsonHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function diffValues(
  current: unknown,
  candidate: unknown,
  location = "content",
): Array<{ path: string; current: unknown; candidate: unknown }> {
  if (Object.is(current, candidate)) return [];
  if (Array.isArray(current) && Array.isArray(candidate)) {
    return Array.from(
      { length: Math.max(current.length, candidate.length) },
      (_, index) => diffValues(current[index], candidate[index], `${location}[${index}]`),
    ).flat();
  }
  if (
    current && candidate &&
    typeof current === "object" && typeof candidate === "object" &&
    !Array.isArray(current) && !Array.isArray(candidate)
  ) {
    const currentRecord = current as Record<string, unknown>;
    const candidateRecord = candidate as Record<string, unknown>;
    return [...new Set([...Object.keys(currentRecord), ...Object.keys(candidateRecord)])]
      .sort()
      .flatMap((key) =>
        diffValues(currentRecord[key], candidateRecord[key], `${location}.${key}`),
      );
  }
  return [{ path: location, current, candidate }];
}

async function main() {
  const sourcePath = path.resolve(process.argv[2] || DEFAULT_SOURCE);
  const markdown = fs.readFileSync(sourcePath, "utf8");
  const parsed = parseCourseMarkdown(markdown);
  if (!parsed.success) {
    throw new Error(`FD01 parse failed: ${parsed.error}`);
  }
  if (parsed.course.slug !== FD01_SLUG) {
    throw new Error(`Refusing unexpected course slug: ${parsed.course.slug}`);
  }

  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const db = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing, error: courseError } = await db
    .from("courses")
    .select("id,title,slug,duration_weeks,is_published,content,updated_at")
    .eq("slug", FD01_SLUG)
    .maybeSingle();
  if (courseError) throw new Error(`FD01 course lookup failed: ${courseError.message}`);

  const matches = await matchCourseTextsFromContent(
    db as Parameters<typeof matchCourseTextsFromContent>[0],
    parsed.course.content,
  );
  const matchIds = matches.map((match) => match.text_id);
  const { data: textRows, error: textError } = matchIds.length
    ? await db
        .from("texts")
        .select(
          "id,title,author,year,publisher,license,source_url,source_format,status",
        )
        .in("id", matchIds)
    : { data: [], error: null };
  if (textError) throw new Error(`FD01 text metadata lookup failed: ${textError.message}`);

  const matchedContent = attachTextIdsToReadings(
    parsed.course.content,
    matches.map((match) => match.texts),
  );
  const assignments = matchedContent.weeks.flatMap((week) =>
    week.readings.map((reading) => {
      const enrichedReading = reading as typeof reading & { text_id?: string };
      return {
        week: week.week_number,
        title: reading.title,
        author: reading.author,
        textId: enrichedReading.text_id || null,
      };
    }),
  );

  const currentProjectRef = projectRef(url);
  const configuredProductionRef = projectRef(process.env.PROD_SUPABASE_URL);
  const productionReadOnly = Boolean(
    currentProjectRef && configuredProductionRef === currentProjectRef,
  );
  const contentChanges = existing
    ? diffValues(existing.content, parsed.course.content)
    : [];

  const metadata = (textRows ?? []).map((text) => ({
    id: text.id,
    title: text.title,
    author: text.author,
    year: text.year,
    publisher: text.publisher,
    license: text.license,
    sourceUrl: text.source_url,
    sourceFormat: text.source_format,
    status: text.status,
    blockers: [
      !text.year && "missing year",
      !text.publisher && "missing publisher",
      !text.license && "missing license",
      !text.source_url && "missing source URL",
    ].filter(Boolean),
  }));

  console.log(
    JSON.stringify(
      {
        rehearsal: "FD01 course refresh",
        mode: "read-only",
        writesPerformed: false,
        productionReadOnly,
        projectRef: currentProjectRef,
        source: {
          path: sourcePath,
          sha256: createHash("sha256").update(markdown).digest("hex"),
          warnings: parsed.warnings,
        },
        candidate: {
          title: parsed.course.title,
          slug: parsed.course.slug,
          durationWeeks: parsed.course.duration_weeks,
          weekCount: parsed.course.content.weeks.length,
          readingAssignments: assignments.length,
          matchedAssignments: assignments.filter((reading) => reading.textId).length,
          unmatchedAssignments: assignments.filter((reading) => !reading.textId),
          contentSha256: jsonHash(parsed.course.content),
        },
        existing: existing
          ? {
              id: existing.id,
              title: existing.title,
              slug: existing.slug,
              durationWeeks: existing.duration_weeks,
              weekCount: weekCount(existing.content),
              readingAssignments: readingCount(existing.content),
              isPublished: existing.is_published,
              updatedAt: existing.updated_at,
              contentSha256: jsonHash(existing.content),
            }
          : null,
        proposedUpdate: existing
          ? {
              targetId: existing.id,
              preservesSlug: existing.slug === parsed.course.slug,
              preservesPublicationState: true,
              publicationState: resolveCourseImportPublicationState({
                existingPublished: existing.is_published,
                publishImmediately: false,
              }),
              contentMatches: jsonHash(existing.content) === jsonHash(parsed.course.content),
              contentChangeCount: contentChanges.length,
              contentChanges: contentChanges.slice(0, 100),
              weekCountChange: `${weekCount(existing.content)} -> ${parsed.course.content.weeks.length}`,
              readingAssignmentChange: `${readingCount(existing.content)} -> ${assignments.length}`,
              weekTitleChanges: weekTitles(existing.content).flatMap((title, index) => {
                const candidateTitle = parsed.course.content.weeks[index]?.title || "";
                return title === candidateTitle
                  ? []
                  : [{ week: index + 1, current: title, candidate: candidateTitle }];
              }),
            }
          : null,
        catalogMetadata: metadata,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
