import assert from "node:assert/strict";
import { test } from "node:test";
import { discover } from "../src/lib/discovery/engine";
import {
  groundSynthesis,
  sourcesFromAnnotations,
  type Source,
} from "../src/lib/discovery/model";

const source: Source = {
  id: "S1",
  title: "Manuscript catalogue",
  url: "https://museum.example/manuscript",
  content:
    "The final illustration depicts the Resurrection of Christ in this manuscript copy.",
  kind: "web",
  query: "alchemy",
};
const assertion = {
  title: "A religious image",
  explanation: "This copy contains Christian imagery.",
  evidence: [{ sourceId: "S1", quote: source.content }],
};
const synthesis = {
  overview: [assertion],
  connections: [],
  nextQuestions: [],
  gaps: [],
};

test("generated URLs and unquoted model knowledge cannot become sources", () => {
  assert.deepEqual(
    sourcesFromAnnotations(
      [
        {
          type: "url_citation",
          url_citation: { url: "javascript:alert(1)", content: source.content },
        },
        {
          type: "url_citation",
          url_citation: { url: source.url, title: source.title },
        },
      ],
      "alchemy"
    ),
    []
  );
  const sources = sourcesFromAnnotations(
    [
      {
        type: "url_citation",
        url_citation: {
          url: source.url,
          title: source.title,
          content: source.content,
        },
      },
    ],
    "alchemy"
  );
  assert.equal(sources.length, 1);
  assert.equal(sources[0].content, source.content);
});
test("unknown sources and invented quotations withhold the entire assertion", () => {
  const result = groundSynthesis(
    {
      ...synthesis,
      overview: [
        assertion,
        {
          ...assertion,
          evidence: [{ sourceId: "S99", quote: source.content }],
        },
        {
          ...assertion,
          evidence: [
            {
              sourceId: "S1",
              quote: "Jesus invented alchemy in ancient Egypt.",
            },
          ],
        },
      ],
    },
    [source]
  );
  assert.equal(result.overview.length, 1);
  assert.equal(result.rejected, 2);
});
test("one malformed generated item does not discard supported results", () => {
  const result = groundSynthesis(
    {
      ...synthesis,
      connections: [{ title: "Bad kind", from: { kind: "planet" } }],
    },
    [source]
  );
  assert.equal(result.overview.length, 1);
  assert.equal(result.connections.length, 0);
  assert.equal(result.rejected, 1);
});
test("research follows retrieved clues and preserves the original question in follow-up context", async () => {
  const searches: string[] = [];
  const prompts: string[] = [];
  let generation = 0;
  const result = await discover(
    "Does this image have a religious meaning?",
    ["WTF is Alchemy?"],
    {
      retrieve: async (query) => {
        searches.push(query);
        return { sources: [{ ...source, query }], warnings: [] };
      },
      generate: async (_system, input) => {
        prompts.push(input);
        return generation++ === 0
          ? {
              queries: [
                "manuscript resurrection historical context",
                "Christian alchemical symbolism scholarship",
              ],
            }
          : synthesis;
      },
    },
    () => {}
  );
  assert.equal(searches.length, 3);
  assert.match(searches[0], /WTF is Alchemy/);
  assert.match(prompts[0], /Resurrection of Christ/);
  assert.equal(result.sources.length, 1, "duplicate sources have stable IDs");
  assert.equal(result.overview.length, 1);
});
test("unavailable deeper planning still returns initial evidence with an explicit warning", async () => {
  let call = 0;
  const result = await discover(
    "Alchemy",
    [],
    {
      retrieve: async () => ({ sources: [source], warnings: [] }),
      generate: async () => {
        if (call++ === 0) throw new Error("offline");
        return synthesis;
      },
    },
    () => {}
  );
  assert.equal(result.overview.length, 1);
  assert.equal(result.searched.length, 1);
  assert.match(result.warnings[0], /unavailable/);
});
test("no retrieved evidence produces an honest gap, never a fabricated answer", async () => {
  const result = await discover(
    "Unattested claim",
    [],
    {
      retrieve: async () => ({
        sources: [],
        warnings: ["Web search unavailable"],
      }),
      generate: async () => ({ queries: [] }),
    },
    () => {}
  );
  assert.equal(result.overview.length, 0);
  assert.equal(result.connections.length, 0);
  assert.match(result.gaps[0], /No usable source passages/);
});
test("the final review can remove unsupported interpretation despite a valid quotation", async () => {
  let call = 0;
  const result = await discover(
    "Alchemy",
    [],
    {
      retrieve: async () => ({ sources: [source], warnings: [] }),
      generate: async () => {
        call++;
        if (call === 1) return { queries: [] };
        if (call === 2) return synthesis;
        return {
          overview: [],
          connections: [],
          nextQuestions: [],
          gaps: ["The quoted image does not establish historical influence."],
        };
      },
    },
    () => {}
  );
  assert.equal(call, 3);
  assert.equal(result.overview.length, 0);
  assert.match(result.gaps[0], /does not establish/);
});
test("a failed final review preserves sources without presenting unaudited findings", async () => {
  let call = 0;
  const result = await discover(
    "Alchemy",
    [],
    {
      retrieve: async () => ({ sources: [source], warnings: [] }),
      generate: async () => {
        call++;
        if (call === 1) return { queries: [] };
        if (call === 2) return synthesis;
        throw new Error("timeout");
      },
    },
    () => {}
  );
  assert.equal(result.sources.length, 1);
  assert.equal(result.overview.length, 0);
  assert.match(result.gaps[0], /final review/);
});
