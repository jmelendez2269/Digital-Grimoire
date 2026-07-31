import "server-only";

import type { CourseGraphCandidateBundle } from "./course-graph-candidate";
import {
  FD01_COURSE_SLUG,
  FD01_PATTERN_TEST_VIEW,
} from "./course-graph-public";

type CourseGraphRegistryEntry = {
  courseSlug: string;
  viewId: string;
  bundleSlug: string;
  learnerReady: boolean;
  loadBundle?: () => Promise<CourseGraphCandidateBundle>;
};

const COURSE_GRAPH_REGISTRY: CourseGraphRegistryEntry[] = [
  {
    courseSlug: FD01_COURSE_SLUG,
    viewId: FD01_PATTERN_TEST_VIEW,
    bundleSlug:
      "fd01-mythic-imagination-from-classical-pattern-to-personal-meaning-ac3958f164f1-candidate-v1",
    learnerReady: false,
  },
];

export function findExactCourseGraphPackage(
  courseSlug: string,
  viewId: string,
) {
  return COURSE_GRAPH_REGISTRY.find(
    (entry) =>
      entry.courseSlug === courseSlug &&
      entry.viewId === viewId,
  );
}
