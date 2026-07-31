import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  COURSE_POLL_VOTER_COOKIE,
  generateCoursePollVoterToken,
  getCoursePollCookieOptions,
  hashCoursePollIdentifier,
  isCoursePollVoterToken,
  readTrustedCoursePollNetwork,
} from "../src/lib/course-polls/privacy";
import { parseCoursePathPollView } from "../src/lib/course-polls/types";

const firstOptionId = "11111111-1111-4111-8111-111111111111";
const secondOptionId = "22222222-2222-4222-8222-222222222222";
const migrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260730000200_add_course_path_polls.sql",
    import.meta.url,
  ),
  "utf8",
);
const dataSource = readFileSync(
  new URL("../src/lib/course-polls/data.server.ts", import.meta.url),
  "utf8",
);

function rawPoll(overrides: Record<string, unknown> = {}) {
  return {
    slug: "next-prismarium-youtube-series",
    question: "Which course should become the next series?",
    status: "open",
    viewerChoiceOptionId: null,
    resultsVisible: true,
    totalVotes: 6,
    options: [
      {
        optionId: firstOptionId,
        courseSlug: "c01-how-humans-know-what-they-know",
        code: "C01",
        title: "How Humans Know What They Know",
        coreQuestion: "What counts as knowing?",
        href: "/courses/c01-how-humans-know-what-they-know",
        voteCount: 4,
        percentage: 66.7,
        isAudienceLeader: false,
      },
      {
        optionId: secondOptionId,
        courseSlug:
          "fd01-mythic-imagination-from-classical-pattern-to-personal-meaning",
        code: "FD01",
        title: "Mythic Imagination",
        coreQuestion: "How do stories become tools for meaning?",
        href:
          "/courses/fd01-mythic-imagination-from-classical-pattern-to-personal-meaning",
        voteCount: 2,
        percentage: 33.3,
        isAudienceLeader: false,
      },
    ],
    audienceResult: {
      kind: "pending",
      leaderCourseSlug: null,
    },
    editorialDecision: null,
    ...overrides,
  };
}

test("live totals remain hidden until this browser has voted", () => {
  const raw = rawPoll({
    voterHash: "must-never-cross-the-public-boundary",
    internalPath: "C:/private/review.json",
    options: [
      { ...rawPoll().options[0], isAudienceLeader: true },
      rawPoll().options[1],
    ],
  });
  const poll = parseCoursePathPollView(raw);
  assert.ok(poll);
  assert.equal(poll.resultsVisible, false);
  assert.equal(poll.totalVotes, null);
  assert.deepEqual(
    poll.options.map((option) => [option.voteCount, option.percentage]),
    [
      [null, null],
      [null, null],
    ],
  );
  assert.equal(poll.options[0].isAudienceLeader, false);
  assert.equal("voterHash" in poll, false);
  assert.equal("internalPath" in poll, false);
});

test("a current browser choice reveals totals and remains changeable while open", () => {
  const poll = parseCoursePathPollView(
    rawPoll({ viewerChoiceOptionId: secondOptionId }),
  );
  assert.ok(poll);
  assert.equal(poll.status, "open");
  assert.equal(poll.viewerChoiceOptionId, secondOptionId);
  assert.equal(poll.resultsVisible, true);
  assert.equal(poll.totalVotes, 6);
  assert.deepEqual(
    poll.options.map((option) => option.voteCount),
    [4, 2],
  );
});

test("closed totals and the audience/editorial distinction are public to everyone", () => {
  const poll = parseCoursePathPollView(
    rawPoll({
      status: "closed",
      resultsVisible: false,
      audienceResult: {
        kind: "leader",
        leaderCourseSlug: "c01-how-humans-know-what-they-know",
      },
      editorialDecision: {
        courseSlug:
          "fd01-mythic-imagination-from-classical-pattern-to-personal-meaning",
        note: "The audience preferred C01; the editorial schedule selected FD01.",
      },
    }),
  );
  assert.ok(poll);
  assert.equal(poll.resultsVisible, true);
  assert.equal(poll.totalVotes, 6);
  assert.deepEqual(poll.audienceResult, {
    kind: "leader",
    leaderCourseSlug: "c01-how-humans-know-what-they-know",
  });
  assert.equal(
    poll.editorialDecision?.courseSlug,
    "fd01-mythic-imagination-from-classical-pattern-to-personal-meaning",
  );
});

test("archived ballots remain public as read-only closed results", () => {
  assert.match(
    migrationSource,
    /poll\.status in \('open', 'closed', 'archived'\)/,
  );
  assert.match(
    migrationSource,
    /when target_poll\.status = 'archived' then 'closed'/,
  );
});

test("a closed tie has no invented leader", () => {
  const poll = parseCoursePathPollView(
    rawPoll({
      status: "closed",
      options: [
        {
          ...rawPoll().options[0],
          voteCount: 3,
          percentage: 50,
        },
        {
          ...rawPoll().options[1],
          voteCount: 3,
          percentage: 50,
        },
      ],
      audienceResult: {
        kind: "tie",
        leaderCourseSlug: null,
      },
    }),
  );
  assert.ok(poll);
  assert.deepEqual(poll.audienceResult, {
    kind: "tie",
    leaderCourseSlug: null,
  });
  assert.equal(
    poll.options.some((option) => option.isAudienceLeader),
    false,
  );
});

test("malformed and cross-poll-shaped public views fail closed", () => {
  assert.equal(
    parseCoursePathPollView(
      rawPoll({ viewerChoiceOptionId: "33333333-3333-4333-8333-333333333333" }),
    ),
    null,
  );
  assert.equal(
    parseCoursePathPollView(rawPoll({ options: [rawPoll().options[0]] })),
    null,
  );
  assert.equal(
    parseCoursePathPollView(
      rawPoll({
        audienceResult: {
          kind: "leader",
          leaderCourseSlug: "some-other-course",
        },
        status: "closed",
      }),
    ),
    null,
  );
});

test("the voter token is opaque and the stored identifiers are poll-specific HMACs", () => {
  const token = generateCoursePollVoterToken();
  const secret = "test-secret-that-is-at-least-thirty-two-characters";
  assert.equal(isCoursePollVoterToken(token), true);
  assert.equal(token.length, 43);

  const firstHash = hashCoursePollIdentifier(
    secret,
    "first-poll",
    "voter",
    token,
  );
  const secondHash = hashCoursePollIdentifier(
    secret,
    "second-poll",
    "voter",
    token,
  );
  const networkHash = hashCoursePollIdentifier(
    secret,
    "first-poll",
    "network",
    "203.0.113.10",
  );

  assert.match(firstHash, /^[a-f0-9]{64}$/);
  assert.notEqual(firstHash, secondHash);
  assert.notEqual(firstHash, networkHash);
  assert.equal(firstHash.includes(token), false);
  assert.equal(networkHash.includes("203.0.113.10"), false);
});

test("the ballot cookie has the required browser protections", () => {
  assert.equal(COURSE_POLL_VOTER_COOKIE, "prismarium_course_poll_voter");
  assert.deepEqual(getCoursePollCookieOptions(true), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 31_536_000,
  });
  assert.equal(getCoursePollCookieOptions(false).secure, false);
});

test("network limiting reads only the configured trusted header", () => {
  const reads: string[] = [];
  const headers = {
    get(name: string) {
      reads.push(name);
      const values: Record<string, string> = {
        "x-vercel-forwarded-for": "203.0.113.7, 10.0.0.2",
        "user-agent": "must-not-be-read",
      };
      return values[name] ?? null;
    },
  };

  assert.equal(
    readTrustedCoursePollNetwork(headers),
    "203.0.113.7",
  );
  assert.deepEqual(reads, ["x-vercel-forwarded-for"]);
});

test("the migration keeps all four ballot tables service-only", () => {
  const migration = readFileSync(
    new URL(
      "../../supabase/migrations/20260730000200_add_course_path_polls.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const tableNames = [
    "course_path_polls",
    "course_path_poll_options",
    "course_path_poll_votes",
    "course_path_poll_rate_buckets",
  ];

  for (const tableName of tableNames) {
    assert.match(
      migration,
      new RegExp(`create table if not exists public\\.${tableName}`),
    );
    assert.match(
      migration,
      new RegExp(
        `alter table public\\.${tableName} enable row level security`,
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `revoke all on table public\\.${tableName} from public, anon, authenticated`,
      ),
    );
    assert.match(
      migration,
      new RegExp(`grant all on table public\\.${tableName} to service_role`),
    );
  }

  assert.equal(
    (
      migration.match(
        /create table if not exists public\.course_path_poll(?:s|_options|_votes|_rate_buckets)/g,
      ) ?? []
    ).length,
    4,
  );
});

test("admin vote totals are grouped in the database without reading every vote row", () => {
  assert.match(
    migrationSource,
    /function public\.course_path_poll_admin_vote_counts\(\)/,
  );
  assert.match(
    dataSource,
    /serviceClient\.rpc\("course_path_poll_admin_vote_counts"\)/,
  );
  assert.doesNotMatch(
    dataSource,
    /\.from\("course_path_poll_votes"\)\s*\.select\("poll_id, option_id"\)/,
  );
});

test("the migration enforces option, concurrency, rate, and advisory boundaries", () => {
  const migration = readFileSync(
    new URL(
      "../../supabase/migrations/20260730000200_add_course_path_polls.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(migration, /primary key \(poll_id, voter_hash\)/);
  assert.match(
    migration,
    /foreign key \(poll_id, option_id\)[\s\S]*references public\.course_path_poll_options\(poll_id, id\)/,
  );
  assert.match(migration, /on conflict \(poll_id, voter_hash\)/);
  assert.match(
    migration,
    /on conflict \(poll_id, identifier_kind, identifier_hash, bucket_start\)/,
  );
  assert.match(migration, /for key share/);
  assert.match(migration, /option_count <> 2 or published_option_count <> 2/);
  assert.match(
    migration,
    /pre_course\.slug = 'pre-how-to-hold-two-things-at-once'[\s\S]*pre_course\.is_published = true/,
  );
  assert.match(
    migration,
    /course\.slug in \([\s\S]*'c01-how-humans-know-what-they-know'[\s\S]*'fd01-mythic-imagination-from-classical-pattern-to-personal-meaning'[\s\S]*\)/,
  );
  assert.match(
    migration,
    /function public\.course_path_poll_launch_records_ready\([\s\S]*pre-how-to-hold-two-things-at-once[\s\S]*c01-how-humans-know-what-they-know[\s\S]*fd01-mythic-imagination-from-classical-pattern-to-personal-meaning/,
  );
  assert.ok(
    (
      migration.match(
        /course_path_poll_launch_records_ready\(target_poll_id\)/g,
      ) ?? []
    ).length >= 1,
  );
  assert.match(
    migration,
    /poll\.status in \('closed', 'archived'\)[\s\S]*course_path_poll_launch_records_ready\(poll\.id\)/,
  );
  assert.match(migration, /if launch_candidate_count <> 2 then/);
  assert.match(migration, /course_path_poll_options_lock_after_open/);
  assert.match(migration, /audience_result_kind/);
  assert.match(migration, /editorial_selection_option_id/);
  assert.match(migration, /elsif leaders > 1 then[\s\S]*result_kind := 'tie'/);
  assert.match(migration, /COURSE_POLL_OPTION_MISMATCH/);
  const castVoteFunction = migration.slice(
    migration.indexOf(
      "create or replace function public.course_path_poll_cast_vote",
    ),
    migration.indexOf(
      "create or replace function public.course_path_poll_close",
    ),
  );
  assert.ok(
    castVoteFunction.indexOf(
      "insert into public.course_path_poll_rate_buckets",
    ) <
      castVoteFunction.indexOf(
        "return jsonb_build_object('errorCode', 'not_available')",
      ),
    "unavailable-preview attempts must consume the atomic rate bucket before rejection",
  );
  assert.ok(
    castVoteFunction.indexOf(
      "insert into public.course_path_poll_rate_buckets",
    ) <
      castVoteFunction.indexOf(
        "return jsonb_build_object('errorCode', 'option_mismatch')",
      ),
    "cross-poll attempts must consume the atomic rate bucket before rejection",
  );
  assert.doesNotMatch(
    castVoteFunction,
    /raise exception 'COURSE_POLL_OPTION_MISMATCH'/,
  );
  assert.match(
    dataSource,
    /data\.errorCode === "option_mismatch"[\s\S]*new CoursePollDataError\([\s\S]*"invalid"/,
  );
  assert.match(
    migration,
    /where actor\.id = p_actor_id and actor\.role = 'admin'/,
  );
  assert.doesNotMatch(migration, /update\s+public\.courses/i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.course_enrollments/i);
});

test("public reads and votes are coded to fail closed without crashing the page", () => {
  const publicRead = readFileSync(
    new URL("../src/lib/course-polls/public.server.ts", import.meta.url),
    "utf8",
  );
  const action = readFileSync(
    new URL("../src/app/actions/course-path-poll.ts", import.meta.url),
    "utf8",
  );

  assert.match(publicRead, /catch \{/);
  assert.match(
    publicRead,
    /return \{ poll: null, voteStatus: "unavailable" \};/,
  );
  assert.match(
    publicRead,
    /lifecycleStatus === null \|\| lifecycleStatus === "draft"[\s\S]*voteStatus: "announced"/,
  );
  assert.match(action, /code: "not_available"/);
  assert.match(action, /cookieStore\.set/);
  assert.match(action, /error\.code === "not_open"/);
  assert.match(action, /Voting has closed\. Final results are now visible\./);
  assert.match(action, /readCoursePathPollView/);
  assert.ok(
    action.indexOf("await castCoursePathVote") <
      action.indexOf("cookieStore.set"),
    "the cookie must only be set after the database confirms the vote",
  );
  assert.doesNotMatch(action, /user-agent/i);
});

test("the embeddable public panel keeps the ballot accessible and transparent", () => {
  const panel = readFileSync(
    new URL(
      "../src/components/course-polls/CoursePathPollPanel.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.doesNotMatch(panel, /id="choose-the-next-show"/);
  assert.match(panel, /aria-live="polite"/);
  assert.match(panel, /aria-pressed=\{isSelected\}/);
  assert.match(panel, /aria-busy=\{isPending\}/);
  assert.match(panel, /startTransition\(async \(\) =>/);
  assert.match(panel, /await castCoursePathVoteAction/);
  assert.match(panel, /voteInFlight\.current/);
  assert.match(panel, /finally \{/);
  assert.match(panel, /if \(result\.poll\)/);
  assert.match(panel, /min-h-11/);
  assert.match(panel, /castCoursePathVoteAction/);
  assert.match(panel, /Live totals appear after you vote/);
  assert.match(panel, /Change to \$\{option\.code\}/);
  assert.match(panel, /Audience result: a tie/);
  assert.match(panel, /Editorial decision:/);
  assert.match(panel, /never changes course access or release/);
  assert.doesNotMatch(panel, /carousel/i);
});
