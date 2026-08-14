import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BASIC_READ_ALOUD_PUBLICLY_AVAILABLE,
  PREMIUM_READ_ALOUD_PUBLICLY_AVAILABLE,
} from "../src/lib/features/public-feature-flags";

const libraryPageSource = readFileSync(
  new URL("../src/app/library/[id]/page.tsx", import.meta.url),
  "utf8",
);
const chapterViewerSource = readFileSync(
  new URL("../src/components/ChapterViewer.tsx", import.meta.url),
  "utf8",
);
const audioPlayerSource = readFileSync(
  new URL("../src/components/AudioPlayer.tsx", import.meta.url),
  "utf8",
);

test("basic read aloud is public while premium engines remain fail closed", () => {
  assert.equal(BASIC_READ_ALOUD_PUBLICLY_AVAILABLE, true);
  assert.equal(PREMIUM_READ_ALOUD_PUBLICLY_AVAILABLE, false);
  assert.match(
    libraryPageSource,
    /BASIC_READ_ALOUD_PUBLICLY_AVAILABLE && document[\s\S]*<AudioPlayer/,
  );
  assert.match(
    libraryPageSource,
    /premiumEnginesAvailable=\{PREMIUM_READ_ALOUD_PUBLICLY_AVAILABLE\}/,
  );
});

test("basic read aloud activates click-to-listen only through its public flag", () => {
  assert.match(
    libraryPageSource,
    /onParagraphClick=\{BASIC_READ_ALOUD_PUBLICLY_AVAILABLE \? handleParagraphClick : undefined\}/,
  );
  assert.match(
    libraryPageSource,
    /onBlockClick=\{BASIC_READ_ALOUD_PUBLICLY_AVAILABLE \? handleBlockClick : undefined\}/,
  );
  assert.match(
    libraryPageSource,
    /onTextClick=\{BASIC_READ_ALOUD_PUBLICLY_AVAILABLE \? handleBlockClick : undefined\}/,
  );
  assert.match(
    chapterViewerSource,
    /title=\{onParagraphClick \? 'Click to read aloud' : undefined\}/,
  );
  assert.match(
    chapterViewerSource,
    /onClick=\{onParagraphClick \?/,
  );
});

test("the public player forces browser speech and hides premium controls", () => {
  assert.match(
    audioPlayerSource,
    /setEngine\(premiumEnginesAvailable \? savedEngine : 'web-speech'\)/,
  );
  assert.match(
    audioPlayerSource,
    /premiumEnginesAvailable && \([\s\S]*aria-label="Premium voice settings"/,
  );
  assert.match(
    audioPlayerSource,
    /Free browser voice · no Prism Credits/,
  );
});
