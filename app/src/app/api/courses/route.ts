import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPublicCourseCatalog } from "@/lib/courses/public-catalog.server";
import { EMPTY_PLATFORM_TOTALS } from "@/lib/platform/catalog";
import { getPlatformTotals } from "@/lib/platform/totals.server";
import { getRequestVerifiedUserIdentity } from "@/lib/supabase/identity.server";

async function getViewer(supabase: Awaited<ReturnType<typeof createClient>>) {
  const user = await getRequestVerifiedUserIdentity(supabase);
  if (!user) return { user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { user, isAdmin: profile?.role === "admin" };
}

export async function GET(request: NextRequest) {
  try {
    const startedAt = performance.now();
    const searchParams = request.nextUrl.searchParams;
    const isAdminView = searchParams.get("view") === "admin";

    if (!isAdminView) {
      const catalog = await getPublicCourseCatalog();
      const search = searchParams.get("search")?.trim().toLocaleLowerCase();
      const type = searchParams.get("type");
      const level = searchParams.get("level");
      const courses = catalog.courses.filter((course) => {
        if (search) {
          const matchesSearch = [
            course.title,
            course.description,
            course.premise,
            course.content?.core_question,
          ].some((value) => value?.toLocaleLowerCase().includes(search));
          if (!matchesSearch) return false;
        }
        if (type && type !== "all" && course.course_type !== type) return false;
        if (level && level !== "all" && course.level !== level) return false;
        return true;
      });
      const durationMs = performance.now() - startedAt;

      if (durationMs > 1000) {
        console.warn("[courses GET] Slow public catalog response", {
          durationMs: Math.round(durationMs),
          courseCount: courses.length,
        });
      }

      return NextResponse.json(
        { success: true, courses, totals: catalog.totals },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=300, stale-while-revalidate=3600",
            "Server-Timing": `catalog;dur=${durationMs.toFixed(1)}`,
          },
        }
      );
    }

    const supabase = await createClient();
    const serviceSupabase = createServiceClient();
    const totalsPromise = getPlatformTotals(serviceSupabase).catch((error) => {
      console.error("[courses GET] Failed to load platform totals:", error);
      return EMPTY_PLATFORM_TOTALS;
    });
    const { isAdmin } = await getViewer(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filters = {
      search: searchParams.get("search"),
      type: searchParams.get("type"),
      level: searchParams.get("level"),
      published: searchParams.get("published"),
    };

    let courses = null;
    let error = null;

    let primaryQuery = serviceSupabase
      .from("courses")
      .select(
        `
                id, title, slug, description, premise, learning_outcomes, course_type, level, duration_weeks, is_published, content, sort_order, created_at, updated_at,
                course_texts(
                    id,
                    text_id,
                    is_required,
                    texts(
                        id,
                        title,
                        author,
                        cover_image_url
                    )
                )
            `
      )
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (filters.search) {
      primaryQuery = primaryQuery.ilike("title", `%${filters.search}%`);
    }

    if (filters.type && filters.type !== "all") {
      primaryQuery = primaryQuery.eq("course_type", filters.type);
    }

    if (filters.level && filters.level !== "all") {
      primaryQuery = primaryQuery.eq("level", filters.level);
    }

    if (filters.published === "true") {
      primaryQuery = primaryQuery.eq("is_published", true);
    } else if (filters.published === "false") {
      primaryQuery = primaryQuery.eq("is_published", false);
    }

    ({ data: courses, error } = await primaryQuery);

    if (error) {
      console.warn(
        "[courses GET] Primary query failed, attempting fallback:",
        error
      );

      let fallbackQuery = serviceSupabase
        .from("courses")
        .select(
          `
                    id, title, slug, description, premise, learning_outcomes, course_type, level, duration_weeks, is_published, content, sort_order, created_at, updated_at
                `
        )
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });

      if (filters.search) {
        fallbackQuery = fallbackQuery.ilike("title", `%${filters.search}%`);
      }

      if (filters.type && filters.type !== "all") {
        fallbackQuery = fallbackQuery.eq("course_type", filters.type);
      }

      if (filters.level && filters.level !== "all") {
        fallbackQuery = fallbackQuery.eq("level", filters.level);
      }

      if (filters.published === "true") {
        fallbackQuery = fallbackQuery.eq("is_published", true);
      } else if (filters.published === "false") {
        fallbackQuery = fallbackQuery.eq("is_published", false);
      }

      const fallbackResult = await fallbackQuery;
      courses = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.error("Error fetching courses:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch courses" },
        { status: 500 }
      );
    }

    const [enrichedCourses, totals] = await Promise.all([
      Promise.all(
        (courses || []).map(async (course: Record<string, unknown>) => {
          const existingCourseTexts = Array.isArray(course.course_texts)
            ? course.course_texts
            : [];
          if (existingCourseTexts.length > 0) return course;

          const { matchAndPersistCourseTexts } = await import(
            "@/lib/courses/match-course-texts"
          );
          const fallbackCourseTexts = await matchAndPersistCourseTexts(
            serviceSupabase,
            String(course.id),
            (course.content as Record<string, unknown> | null) ?? null
          );

          return {
            ...course,
            course_texts: fallbackCourseTexts,
          };
        })
      ),
      totalsPromise,
    ]);

    return NextResponse.json(
      {
        success: true,
        courses: enrichedCourses,
        totals,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Unexpected error in courses API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const user = await getRequestVerifiedUserIdentity(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      slug,
      description,
      premise,
      learning_outcomes,
      course_type,
      level,
      duration_weeks,
      content,
      is_published,
    } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { success: false, error: "title and slug are required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceClient();

    const { data: highestOrderedCourse } = await serviceSupabase
      .from("courses")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = (highestOrderedCourse?.sort_order ?? -1) + 1;

    const { data: course, error } = await serviceSupabase
      .from("courses")
      .insert({
        title,
        slug,
        description: description || null,
        premise: premise || null,
        learning_outcomes: learning_outcomes || [],
        course_type: course_type || "foundational",
        level: level || "foundational",
        duration_weeks: duration_weeks || 8,
        content: content || {},
        is_published: is_published ?? false,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating course:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "A course with this slug already exists",
            code: "SLUG_CONFLICT",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: "Failed to create course" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, course }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in courses POST:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
