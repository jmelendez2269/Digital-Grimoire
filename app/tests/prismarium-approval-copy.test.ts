import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function assertIncludesAll(
  source: string,
  expected: readonly string[],
  sourceName: string
): void {
  const normalizedSource = normalizeWhitespace(source);

  for (const copy of expected) {
    assert.ok(
      normalizedSource.includes(normalizeWhitespace(copy)),
      `${sourceName} is missing approved copy: ${copy}`
    );
  }
}

function assertExcludesAll(
  source: string,
  superseded: readonly string[],
  sourceName: string
): void {
  const normalizedSource = normalizeWhitespace(source);

  for (const copy of superseded) {
    assert.ok(
      !normalizedSource.includes(normalizeWhitespace(copy)),
      `${sourceName} still contains superseded visible copy: ${copy}`
    );
  }
}

test("five-step onboarding retains its behavior contract and approved copy", () => {
  const sourceName = "FeatureOnboardingModal.tsx";
  const source = readSource("src/components/FeatureOnboardingModal.tsx");

  assertIncludesAll(
    source,
    [
      "const TOTAL_STEPS = 5",
      'const STORAGE_KEY = "hasSeenOnboardingV3"',
      "window.setTimeout(() => setIsOpen(true), 2500)",
      'localStorage.setItem(STORAGE_KEY, "true")',
      'const stepLabels = ["Welcome", "Seven Lenses", "The Tools", "The Workflow", "Ready"]',
      "A place to keep learning, compare perspectives, and build your own understanding.",
      "Read · compare · question · make connections",
      "Prismarium grew out of my own search for somewhere I could keep learning without being handed one final answer. I’m still learning too. This is a place to read deeply, compare perspectives, and build your own understanding over time.",
      "What this is not",
      "A place to hold many traditions at once",
      "A way to build your own map",
      "What guides the work",
      "More than one perspective can matter",
      "No lens gets the final word",
      "You decide what holds up for you",
      "Questions can stay open",
      "Seven ways to look at a question",
      "A question can look very different depending on where you stand. Seven Lenses lets you compare seven perspectives without treating any one of them as the final answer.",
      "Religious/Spiritual",
      "Historical/Anthropological",
      "Symbolic/Occult",
      "The point is not to force the lenses into agreement. It is to notice what each one reveals, where they differ, and what you think after seeing the question from more than one direction.",
      "Ways to explore",
      "The tools",
      "Choose a tool to see what it can help you do. You can use any of them on their own or alongside a course path.",
      "How it works",
      "A good place to begin",
      "Courses are guided paths through questions we can explore together. How to Hold Two Things at Once is the recommended shared beginning, never a requirement. Public course previews stay open so you can see which question calls to you.",
      "Explore one question at a time",
      "Read and compare different perspectives",
      "Use the Library, Concept Search, Seven Lenses, Knowledge Graph, and Study Journal as you go",
      "Build your own understanding in your own words",
      "Bring a question, concept, or passage and look at it through seven perspectives side by side. The point is to compare what each one reveals, not to receive one final answer.",
      "See seven perspectives on the same question",
      "Adjust which lenses receive more attention",
      "Compare agreements, differences, and blind spots",
      "Built for comparison, not dogma",
      "Study Journal",
      "Your private place for notes, clipped passages, reflections, and connections. Keep what matters as you read and explore, and give the journal a name of your own.",
      "Keep course notes and questions together",
      "Follow Course Knowledge connections between concepts, books, authors, and lessons, or explore sourced symbolic correspondences.",
      "Course Knowledge: concepts, books, authors, lessons, and typed connections",
      "Connections grounded in course, Library, and reference sources",
      "Correspondences: explore symbolic relationships",
      "Choose a starting point or open a random connection",
      "Correspondence palette drawn live from the Knowledge Graph",
      "One way to begin",
      "A course gives us a question to follow together. From there, you can read in the Library, trace an idea with Concept Search, compare perspectives with Seven Lenses, follow connections in the Knowledge Graph, and keep your notes in your Study Journal.",
      "Courses",
      "Explore a question together",
      "Library",
      "Read across the collection",
      "Concept Search",
      "Trace patterns and themes",
      "Compare perspectives",
      "Follow connections between ideas",
      "Keep notes and connections",
      "You can also begin with any tool on its own. Courses are one way in, not a requirement.",
      "a separate practice tool",
      "Build a ritual from an intention and connections in the Knowledge Graph.",
      "Begin with How to Hold Two Things at Once",
      "Meet the method in the two-week shared orientation",
      "Open Concept Search",
      "Follow an idea across the collection.",
      "Need help finding your way around? The wiki explains what each part does and how they connect.",
      "The door is open.",
      "Here are a few good ways to begin.",
      "Visit the Wiki",
      "Back",
      "Enter Prismarium",
      "Continue",
    ],
    sourceName
  );

  assertExcludesAll(
    source,
    [
      "A curated body of wisdom, a method for understanding it, and tools for carrying that method into your own work.",
      "Prismatic Learning · Seven Lenses · Synthesis as Discipline",
      "You don't have to choose between rigorous inquiry and genuine mystery.",
      "A method for building your own map",
      "What we believe",
      "Multiple truths can coexist",
      "No lens is final",
      "You decide what resonates",
      "Synthesis matters",
      "Seven Ways of Knowing",
      "Reality is not accessed through a single mode of inquiry.",
      "Religious / Spiritual",
      "Symbolic / Occult",
      "Synthesis is not agreement.",
      "Your Toolkit",
      "The Platform&apos;s Tools",
      "Select a tool to see what it does and how it fits into the overall workflow.",
      "Read the docs",
      "Recommended starting point",
      "There are 29 paths across 9 arcs",
      "Archived synthesis and highlights from your courses",
      "The Recommended Path",
      "standalone · part of the ecosystem",
      "A ritual generator — draws from the knowledge graph, used on its own terms",
      "Start a Course",
      "Structured inquiry around a core question",
      "Search Concepts",
      "Follow an idea across the full collection of texts",
      "Need orientation on a feature?",
      "One main course is open for shared study at a time.",
      "See what’s open now",
      "Join the question we’re exploring together",
    ],
    sourceName
  );
});

test("course metadata stays descriptive without uncertain map totals", () => {
  const sourceName = "courses/layout.tsx";
  const source = readSource("src/app/courses/layout.tsx");

  assertIncludesAll(
    source,
    [
      "Follow shared Prismarium course paths built for reading, comparison, and open-ended inquiry.",
      "Follow shared course paths built for reading, comparison, and open-ended inquiry.",
      "Prismarium courses — shared paths for open-ended inquiry",
      "Follow shared course paths through questions, reading, and comparison.",
    ],
    sourceName
  );
  assertExcludesAll(
    source,
    ["29 questions across 9 arcs", "29 paths across 9 arcs"],
    sourceName
  );
});

test("Explore presents the approved four ways into the collection", () => {
  const sourceName = "explore/page.tsx";
  const source = readSource("src/app/explore/page.tsx");

  assertIncludesAll(
    source,
    [
      "Follow a question in more than one direction",
      "Explore is the front door to Prismarium&apos;s discovery tools.",
      "Public discovery spaces are open now.",
      "Knowledge Graph",
      "Follow connections between concepts, traditions, symbols, people, and texts. Start with one point and see where it leads.",
      "Concept Search",
      "Search for an idea across the Library and find the books and passages where it appears.",
      "Seven Lenses",
      "Ask one question through seven perspectives at once — Scientific, Psychological, Philosophical, Religious/Spiritual, Historical/Anthropological, Symbolic/Occult, and Mathematical. Compare what each reveals.",
      "The Working",
      "Replay an editorial example to see an intention become a correspondence palette, a ritual, and a private record of practice.",
      "Open to everyone",
      "Public preview",
    ],
    sourceName
  );

  assertExcludesAll(
    source,
    [
      "Navigate the knowledge network",
      "Three tools for moving through the archive — by connection, by concept, or by lens.",
      'name: "Parallax Engine"',
      "Hermetic, Kabbalistic, Thelemic, Gnostic",
      "Sign in to use",
    ],
    sourceName
  );
});

test("header and footer use the approved public names and routes", () => {
  const headerName = "Header.tsx";
  const footerName = "Footer.tsx";
  const header = readSource("src/components/Header.tsx");
  const footer = readSource("src/components/Footer.tsx");

  assertIncludesAll(
    header,
    [
      '{ name: "Courses", path: "/courses" }',
      '{ name: "Library", path: "/library" }',
      '{ name: "Explore", path: "/explore" }',
      '{ name: "Membership", path: "/pricing" }',
      'name: "Seven Lenses", path: "/seven-lenses"',
      'name: "Workbench", path: "/workbench"',
      'name: "Study Journal", path: "/journal"',
      "Log in",
      "Join Prismarium",
    ],
    headerName
  );
  assertExcludesAll(
    header,
    [
      'name: "Parallax Engine"',
      'name: "Workbench", path: "/journal"',
      'name: "Journal", path: "/journal"',
      'label: "Journal"',
      "JOIN PRISMARIUM",
    ],
    headerName
  );

  assertIncludesAll(
    footer,
    [
      "A place for curious people to read, compare, question, and build their own understanding.",
      ">Courses</Link>",
      ">Library</Link>",
      ">Concept Search</Link>",
      ">Knowledge Graph</Link>",
      ">Seven Lenses</Link>",
      ">Study Journal</Link>",
      "Wiki",
      ">Community</Link>",
      "A Project Parallax project.",
      "As an Amazon Associate I earn from qualifying purchases.",
      "License Agreement",
      "Privacy Policy",
      "Terms of Service",
      "Cookie Policy",
    ],
    footerName
  );
  assertExcludesAll(
    footer,
    [
      "Explore esoteric texts, sacred writings, and wisdom traditions through multiple perspectives in Prismarium.",
      ">Wisdom Courses</Link>",
      ">Concept Map</Link>",
      "Documentation",
      "Part of the Project Parallax family",
      "Seeing things from different perspectives",
      "A PROJECT PARALLAX PRODUCT",
      "System Active",
    ],
    footerName
  );
});

test("format-v2 learner overview exposes approved labels without rewriting course values", () => {
  const sourceName = "CourseLearnerRenderer.tsx";
  const source = readSource("src/components/courses/CourseLearnerRenderer.tsx");
  const learnSourceName = "courses/[slug]/learn/page.tsx";
  const learnSource = readSource("src/app/courses/[slug]/learn/page.tsx");

  assertIncludesAll(
    source,
    [
      "course.premise",
      "course.learning_outcomes",
      "body: content?.curator_note_public",
      'title: "Why I chose this path"',
      "<Kicker icon={Compass}>About this path</Kicker>",
      "Why this question",
      '<Disclosure title="Read more about this question"',
      "ideas to explore",
      "<Kicker icon={Target}>What we’ll explore</Kicker>",
      'label="What we’ll explore"',
    ],
    sourceName
  );

  assertExcludesAll(
    source,
    [
      'title: "Curator\'s note"',
      "<Kicker icon={Compass}>Welcome to the course</Kicker>",
      '<Disclosure title="Read the full course premise"',
      ">learning goals</p>",
      "<Kicker icon={Target}>What you will be able to do</Kicker>",
      'label="Learning goals"',
    ],
    sourceName
  );

  assertIncludesAll(
    learnSource,
    [
      "premise?: string | null",
      "learning_outcomes?: string[] | null",
      "premise: course.premise",
      "learning_outcomes: course.learning_outcomes",
    ],
    learnSourceName
  );
});

test("enrollment API returns the approved PRE and taster explanation", () => {
  const sourceName = "api/courses/[id]/enroll/route.ts";
  const source = readSource("src/app/api/courses/[id]/enroll/route.ts");

  assertIncludesAll(
    source,
    [
      "How to Hold Two Things at Once and taster paths are open to everyone. Join Prismarium to start this path.",
    ],
    sourceName
  );
  assertExcludesAll(
    source,
    ["Pre-course and taster paths are free. Upgrade to start the full class."],
    sourceName
  );
});

test("member mobile navigation links directly to the Study Journal", () => {
  const header = readSource("src/components/Header.tsx");
  const mobileNav = header.match(
    /const memberMobileNav: NavItem\[\] = \[(.*?)\n\];/s
  )?.[1];

  assert.ok(mobileNav, "Header.tsx is missing the member mobile navigation");
  assert.match(
    normalizeWhitespace(mobileNav),
    /name: "Study Journal", path: "\/journal"/
  );
  assert.doesNotMatch(mobileNav, /name: "Workbench"/);
  assert.doesNotMatch(mobileNav, /path: "\/workbench"/);
});
