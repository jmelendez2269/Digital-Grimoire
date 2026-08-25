import assert from "node:assert/strict";
import test from "node:test";
import { resolveCourseImportPublicationState } from "../src/lib/courses/course-import-publication";

test("new course imports honor the explicit publish choice", () => {
  assert.equal(
    resolveCourseImportPublicationState({ publishImmediately: false }),
    false,
  );
  assert.equal(
    resolveCourseImportPublicationState({ publishImmediately: true }),
    true,
  );
});

test("existing course refreshes preserve publication state", () => {
  assert.equal(
    resolveCourseImportPublicationState({
      existingPublished: true,
      publishImmediately: false,
    }),
    true,
  );
  assert.equal(
    resolveCourseImportPublicationState({
      existingPublished: false,
      publishImmediately: true,
    }),
    false,
  );
});
