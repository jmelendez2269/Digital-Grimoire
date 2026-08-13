import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { parseCourseMarkdown } from "../src/lib/parsers/course-markdown-parser";

const COURSE_ID = "a8cd1728-ff6b-4f76-98e6-61bd86ae6a2c";
const COURSE_SLUG = "pre-how-to-hold-two-things-at-once";
const FIXTURE_EMAIL = "lean-l1-05-reader@example.test";
const FIXTURE_MARKER = "lean-l1-05-local";
const FILLER_PREFIX = "LEAN-L1-05 cap fixture";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(url)) {
  throw new Error(`Refusing non-local Supabase URL: ${url}`);
}

const service = createClient(url, required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fixtureUserId(): Promise<string | null> {
  const { data, error } = await service
    .from("users")
    .select("id")
    .eq("email", FIXTURE_EMAIL)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function setup(manuscriptArg: string | undefined) {
  const password = required("LEAN_L1_05_PASSWORD");
  const manuscriptPath = path.resolve(
    manuscriptArg ??
      "C:\\Projects\\Parallax_mission_control\\docs\\pre-how-to-hold-two-things-at-once-hybrid-review-draft.md",
  );
  const parsed = parseCourseMarkdown(fs.readFileSync(manuscriptPath, "utf8"));
  if (!parsed.success) throw new Error(`PRE parse failed: ${parsed.error}`);
  if (parsed.course.slug !== COURSE_SLUG) {
    throw new Error(`Unexpected PRE slug: ${parsed.course.slug}`);
  }

  const { data: existingCourse, error: courseReadError } = await service
    .from("courses")
    .select("id, content")
    .eq("slug", COURSE_SLUG)
    .maybeSingle();
  if (courseReadError) throw courseReadError;
  if (existingCourse && existingCourse.content?.__lean_l1_05_fixture !== FIXTURE_MARKER) {
    throw new Error("Refusing to replace an untagged PRE course row");
  }

  const content = {
    ...parsed.course.content,
    __lean_l1_05_fixture: FIXTURE_MARKER,
  };
  const courseRow = {
    id: COURSE_ID,
    title: parsed.course.title,
    slug: COURSE_SLUG,
    description: parsed.course.description || null,
    premise: parsed.course.premise || null,
    learning_outcomes: parsed.course.learning_outcomes,
    course_type: parsed.course.course_type,
    level: parsed.course.level,
    duration_weeks: parsed.course.duration_weeks,
    content,
    is_published: true,
    sort_order: -105,
  };
  const { error: courseWriteError } = await service
    .from("courses")
    .upsert(courseRow, { onConflict: "id" });
  if (courseWriteError) throw courseWriteError;

  if (await fixtureUserId()) {
    throw new Error("Fixture user already exists; run cleanup before setup");
  }

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: FIXTURE_EMAIL,
    password,
    email_confirm: true,
    user_metadata: { full_name: "LEAN L1-05 Reader" },
  });
  if (createError || !created.user) throw createError ?? new Error("User creation failed");

  const { error: profileError } = await service.from("users").upsert({
    id: created.user.id,
    email: FIXTURE_EMAIL,
    name: "LEAN L1-05 Reader",
    role: "user",
    subscription_status: "free",
    stripe_customer_id: null,
    stripe_subscription_id: null,
  });
  if (profileError) throw profileError;

  console.log(JSON.stringify({
    result: "fixture-ready",
    localUrl: url,
    course: COURSE_SLUG,
    courseWeeks: parsed.course.content.weeks.length,
    readerRole: "user",
    readerPlan: "free",
    admin: false,
    enrollmentCount: 0,
    journalCount: 0,
  }, null, 2));
}

async function fillCap() {
  const userId = await fixtureUserId();
  if (!userId) throw new Error("Fixture user is missing");

  const { count, error: countError } = await service
    .from("journal_pages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_archived", false);
  if (countError) throw countError;
  const active = count ?? 0;
  if (active > 50) throw new Error(`Reader already exceeds cap: ${active}`);

  const rows = Array.from({ length: 50 - active }, (_, index) => ({
    user_id: userId,
    title: `${FILLER_PREFIX} ${active + index + 1}`,
    content: { type: "doc", content: [{ type: "paragraph", content: [] }] },
    entry_type: "note",
    tags: [FIXTURE_MARKER],
  }));
  if (rows.length > 0) {
    const { error } = await service.from("journal_pages").insert(rows);
    if (error) throw error;
  }

  console.log(JSON.stringify({ result: "reader-cap-ready", activePages: 50 }));
}

function extractText(value: unknown): string {
  if (Array.isArray(value)) return value.map(extractText).join("");
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return (typeof record.text === "string" ? record.text : "") + extractText(record.content);
}

async function inspect() {
  const userId = await fixtureUserId();
  if (!userId) throw new Error("Fixture user is missing");

  const [{ data: profile, error: profileError }, { data: enrollment, error: enrollmentError }, { data: pages, error: pagesError }] =
    await Promise.all([
      service.from("users").select("role, subscription_status, stripe_customer_id, stripe_subscription_id").eq("id", userId).single(),
      service.from("course_enrollments").select("current_week, progress").eq("user_id", userId).eq("course_id", COURSE_ID).maybeSingle(),
      service.from("journal_pages").select("content, learner_revision, source_key, week_number, is_archived").eq("user_id", userId).eq("course_id", COURSE_ID).order("week_number"),
    ]);
  if (profileError) throw profileError;
  if (enrollmentError) throw enrollmentError;
  if (pagesError) throw pagesError;

  const savedPages = (pages ?? []).map((page) => {
    const text = extractText(page.content);
    return {
      weekNumber: page.week_number,
      sourceKey: page.source_key,
      revision: page.learner_revision,
      archived: page.is_archived,
      characters: text.length,
      sha256: createHash("sha256").update(text).digest("hex"),
    };
  });

  console.log(JSON.stringify({
    result: "fixture-inspected",
    readerRole: profile.role,
    readerPlan: profile.subscription_status,
    admin: profile.role === "admin",
    hasStripeCustomer: Boolean(profile.stripe_customer_id),
    hasStripeSubscription: Boolean(profile.stripe_subscription_id),
    enrollment: enrollment ?? null,
    savedPages,
  }, null, 2));
}

async function cleanup() {
  const userId = await fixtureUserId();

  if (userId) {
    for (const table of ["learner_journal_requests", "learner_progress_requests", "journal_pages", "course_enrollments"]) {
      const { error } = await service.from(table).delete().eq("user_id", userId);
      if (error) throw error;
    }
    const { error: authError } = await service.auth.admin.deleteUser(userId);
    if (authError) throw authError;
    const { error: profileError } = await service.from("users").delete().eq("id", userId);
    if (profileError) throw profileError;
  }

  const { data: course, error: courseReadError } = await service
    .from("courses")
    .select("id, content")
    .eq("slug", COURSE_SLUG)
    .maybeSingle();
  if (courseReadError) throw courseReadError;
  if (course?.content?.__lean_l1_05_fixture === FIXTURE_MARKER) {
    const { error } = await service.from("courses").delete().eq("id", course.id);
    if (error) throw error;
  } else if (course) {
    throw new Error("Refusing to delete an untagged PRE course row");
  }

  const [userAfter, courseAfter] = await Promise.all([
    fixtureUserId(),
    service.from("courses").select("id", { count: "exact", head: true }).eq("slug", COURSE_SLUG),
  ]);
  if (courseAfter.error) throw courseAfter.error;

  const residue: Record<string, number> = {};
  if (userId) {
    for (const table of ["learner_journal_requests", "learner_progress_requests", "journal_pages", "course_enrollments"]) {
      const { count, error } = await service
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      residue[table] = count ?? 0;
    }
    const { count, error } = await service
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("id", userId);
    if (error) throw error;
    residue.users = count ?? 0;
  }
  residue.courses = courseAfter.count ?? 0;

  console.log(JSON.stringify({
    result: "fixture-cleaned",
    fixtureUsersRemaining: userAfter ? 1 : 0,
    fixtureCoursesRemaining: courseAfter.count ?? 0,
    residue,
    totalResidue: Object.values(residue).reduce((sum, count) => sum + count, 0),
  }, null, 2));
}

async function main() {
  const [command, manuscript] = process.argv.slice(2);
  if (command === "setup") return setup(manuscript);
  if (command === "fill-cap") return fillCap();
  if (command === "inspect") return inspect();
  if (command === "cleanup") return cleanup();
  throw new Error("Usage: lean-l1-05-local-fixture.ts <setup|fill-cap|inspect|cleanup> [manuscript.md]");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
