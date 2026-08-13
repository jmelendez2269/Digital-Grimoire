import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8");
}

test("public launch page presents PRE before two equally visible candidates", () => {
  const source = readSource("src/components/home/PublicHomeView.tsx");

  const prePosition = source.indexOf("We’re starting together with {pre.title}.");
  const candidatePosition = source.indexOf(
    "Which question should become the next series?",
  );
  const votePosition = source.indexOf('id="choose-the-next-show"');

  assert.ok(prePosition >= 0);
  assert.ok(candidatePosition > prePosition);
  assert.ok(votePosition > candidatePosition);
  assert.ok(source.includes("Highly recommended, never required."));
  assert.ok(
    source.includes(
      "{pre.title} is the first Prismarium course series launching on",
    ),
  );
  assert.ok(source.includes("Compare both"));
  assert.ok(source.includes("lg:grid-cols-2"));
  assert.ok(!source.toLowerCase().includes("carousel"));
});

test("launch page keeps both public previews actionable without sign-in", () => {
  const source = readSource("src/components/home/PublicHomeView.tsx");
  const presentation = readSource(
    "src/lib/courses/launch-presentation.ts",
  );

  assert.ok(source.includes("Public preview"));
  assert.ok(source.includes("Preview {course.code}"));
  assert.ok(
    presentation.includes(
      "fd01-mythic-imagination-from-classical-pattern-to-personal-meaning",
    ),
  );
  assert.ok(presentation.includes('publicPreview: "available"'));
  assert.ok(!source.includes('href="/login'));
});

test("YouTube actions render only when a validated URL is configured", () => {
  const source = readSource("src/components/home/PublicHomeView.tsx");
  const presentation = readSource(
    "src/lib/courses/launch-presentation.ts",
  );

  assert.ok(source.includes("{youtubeHref ? ("));
  assert.ok(source.includes('target="_blank"'));
  assert.ok(source.includes("opens in a new tab"));
  assert.ok(presentation.includes('url.protocol === "https:"'));
  assert.ok(presentation.includes('hostname === "youtube.com"'));
});

test("launch interactions expose focus treatment and 44px targets", () => {
  const source = readSource("src/components/home/PublicHomeView.tsx");

  assert.ok(source.includes("min-h-11"));
  assert.ok(source.includes("min-h-12"));
  assert.ok(source.includes("focus-visible:ring-2"));
  assert.ok(source.includes("motion-reduce:transition-none"));
  assert.ok(source.includes('role="status"'));
});

test("the homepage isolates ballot failure and mounts the live panel only when available", () => {
  const page = readSource("src/app/(home)/page.tsx");
  const home = readSource("src/components/home/PublicHomeView.tsx");
  const pollLoader = readSource("src/lib/course-polls/public.server.ts");

  assert.ok(page.includes("loadPublicCoursePathPoll()"));
  assert.ok(page.includes("<CoursePathPollPanel initialPoll={poll} />"));
  assert.ok(page.includes("<CoursePathPollPanel initialPoll={pollLoad.poll} />"));
  assert.ok(pollLoader.includes('voteStatus: "announced"'));
  assert.ok(pollLoader.includes('voteStatus: "unavailable"'));
  assert.ok(pollLoader.includes('lifecycleStatus === "draft"'));
  assert.ok(home.includes("pollPanel ?? <VoteFallback"));
});

test("the homepage loads the safe shared course preview with service authority", () => {
  const page = readSource("src/app/(home)/page.tsx");

  assert.ok(page.includes("getSharedCoursePreviews(serviceSupabase)"));
  assert.ok(!page.includes("getSharedCoursePreviews(supabase)"));
});
