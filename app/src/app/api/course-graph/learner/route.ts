import { NextRequest, NextResponse } from "next/server";

import {
  CourseGraphLearnerAccessError,
  sanitizeCourseGraphCandidateForLearners,
  validateCourseGraphCandidateBundle,
} from "@/lib/graph/course-graph-candidate";
import { findExactCourseGraphPackage } from "@/lib/graph/course-graph-registry.server";

export const dynamic = "force-dynamic";

const PUBLIC_HEADERS = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};

export async function GET(request: NextRequest) {
  const courseSlug = request.nextUrl.searchParams.get("course")?.trim() || "";
  const viewId = request.nextUrl.searchParams.get("view")?.trim() || "";

  if (!courseSlug || !viewId) {
    return NextResponse.json(
      {
        error: "An exact course and saved view are required.",
        code: "COURSE_GRAPH_EXACT_SELECTION_REQUIRED",
      },
      { status: 400, headers: PUBLIC_HEADERS },
    );
  }

  const selectedPackage = findExactCourseGraphPackage(courseSlug, viewId);
  if (
    !selectedPackage ||
    !selectedPackage.learnerReady ||
    !selectedPackage.loadBundle
  ) {
    return NextResponse.json(
      {
        error: "The requested learner course view is unavailable.",
        code: "COURSE_GRAPH_VIEW_UNAVAILABLE",
      },
      { status: 404, headers: PUBLIC_HEADERS },
    );
  }

  try {
    const bundle = await selectedPackage.loadBundle();
    validateCourseGraphCandidateBundle(bundle);
    const learnerPackage = sanitizeCourseGraphCandidateForLearners(
      bundle,
      selectedPackage.bundleSlug,
      viewId,
    );

    return NextResponse.json(learnerPackage, {
      headers: PUBLIC_HEADERS,
    });
  } catch (error) {
    if (error instanceof CourseGraphLearnerAccessError) {
      return NextResponse.json(
        {
          error: "The requested learner course view is unavailable.",
          code: "COURSE_GRAPH_VIEW_UNAVAILABLE",
        },
        { status: 404, headers: PUBLIC_HEADERS },
      );
    }

    console.error("Unable to prepare learner course graph", error);
    return NextResponse.json(
      {
        error: "The requested learner course view is unavailable.",
        code: "COURSE_GRAPH_VIEW_UNAVAILABLE",
      },
      { status: 404, headers: PUBLIC_HEADERS },
    );
  }
}
