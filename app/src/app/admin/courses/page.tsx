"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BookOpen, Edit, Loader2, Plus, Search, ChevronUp, ChevronDown, Trash2, AlertTriangle } from "lucide-react";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  course_type: string | null;
  level: string | null;
  is_published: boolean;
  sort_order: number | null;
  created_at: string;
  content: Record<string, unknown> | null;
}

function hasCuratorNote(content: Record<string, unknown> | null | undefined): boolean {
  const note = content?.curator_note_public || content?.curator_note;
  return typeof note === "string" && note.trim().length > 0;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [reordering, setReordering] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchCourses();
  }, [search]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());

      const response = await fetch(`/api/courses?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();

      if (data.success) {
        setCourses(data.courses || []);
      } else {
        setCourses([]);
        setError(data.error || "Failed to load courses");
      }
    } catch (error) {
      console.error("Failed to fetch courses", error);
      setCourses([]);
      setError("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Course",
          slug: `new-course-${Date.now()}`,
          description: "Draft course description",
          premise: "",
          learning_outcomes: [],
          course_type: "foundational",
          level: "foundational",
          duration_weeks: 8,
          content: { weeks: [] },
          is_published: false,
          sort_order: courses.length,
        }),
      });

      const data = await response.json();
      if (data.success && data.course) {
        router.push(`/admin/courses/${data.course.id}`);
      }
    } catch (error) {
      console.error("Failed to create course", error);
    } finally {
      setCreating(false);
    }
  };

  const moveOrder = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= courses.length) return;

    const previousCourses = courses;
    const reordered = [...courses];
    const [movedCourse] = reordered.splice(index, 1);
    reordered.splice(swapIndex, 0, movedCourse);

    const normalized = reordered.map((course, orderIndex) => ({
      ...course,
      sort_order: orderIndex,
    }));

    const changedCourses = normalized.filter((course, orderIndex) => {
      const previousCourse = previousCourses.find((item) => item.id === course.id);
      return (previousCourse?.sort_order ?? orderIndex) !== course.sort_order;
    });

    setCourses(normalized);
    setReordering(courses[index].id);
    try {
      const responses = await Promise.all(
        changedCourses.map((course) =>
          fetch(`/api/courses/${course.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: course.sort_order }),
          })
        )
      );

      const failedResponse = responses.find((response) => !response.ok);
      if (failedResponse) {
        throw new Error(`Failed to persist reorder (${failedResponse.status})`);
      }
    } catch (error) {
      console.error("Failed to reorder courses", error);
      setCourses(previousCourses);
      void fetchCourses();
    } finally {
      setReordering(null);
    }
  };

  const handleDelete = async (courseId: string) => {
    try {
      setDeletingId(courseId);
      const response = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      const data = await response.json();

      if (data.success) {
        setCourses((prev) => prev.filter((course) => course.id !== courseId));
        setDeleteTarget(null);
      } else {
        setError(data.error || "Failed to delete course");
      }
    } catch (error) {
      console.error("Failed to delete course", error);
      setError("Failed to delete course");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (courseId: string, nextPublished: boolean) => {
    const previousCourses = courses;

    setPublishingId(courseId);
    setError(null);
    setCourses((prev) =>
      prev.map((course) =>
        course.id === courseId ? { ...course, is_published: nextPublished } : course
      )
    );

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: nextPublished }),
      });
      const data = await response.json();

      if (!data.success) {
        setCourses(previousCourses);
        setError(data.error || `Failed to ${nextPublished ? "publish" : "unpublish"} course`);
      }
    } catch (error) {
      console.error("Failed to toggle course publishing", error);
      setCourses(previousCourses);
      setError(`Failed to ${nextPublished ? "publish" : "unpublish"} course`);
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-zinc-100 selection:bg-cyan-900 selection:text-cyan-50">
      <Header />

      <main className="container mx-auto mt-24 flex-grow px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-cyan-400 to-teal-200 bg-clip-text text-3xl font-bold text-transparent">
              Course Management
            </h1>
            <p className="mt-2 text-zinc-400">Create, reorder, edit, publish, and delete courses.</p>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2 font-medium text-white transition-all hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>Create Course</span>
          </button>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 py-2 pl-10 pr-4 text-sm transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/20 py-20 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
            <h3 className="text-lg font-medium text-zinc-300">No courses found</h3>
            <p className="mt-1 text-zinc-500">Create one here, or import one from the uploader.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {!search && (
              <p className="mb-4 text-xs text-zinc-500">
                This order is used for course display. Use the arrows to reorder the catalog.
              </p>
            )}

            {courses.map((course, index) => (
              <div
                key={course.id}
                className="group flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4 transition-all duration-200 hover:border-cyan-500/30 hover:bg-zinc-900/80"
              >
                {!search && (
                  <>
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveOrder(index, "up")}
                        disabled={index === 0 || reordering !== null}
                        className="p-0.5 text-zinc-600 transition-colors hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-20"
                        aria-label={`Move ${course.title} up`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveOrder(index, "down")}
                        disabled={index === courses.length - 1 || reordering !== null}
                        className="p-0.5 text-zinc-600 transition-colors hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-20"
                        aria-label={`Move ${course.title} down`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>

                    <span className="w-5 shrink-0 text-center font-mono text-xs text-zinc-600">
                      {index + 1}
                    </span>
                  </>
                )}

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-3">
                    <h3 className="truncate font-semibold text-zinc-100 transition-colors group-hover:text-cyan-400">
                      {course.title}
                    </h3>
                    <span
                      className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${
                        course.is_published
                          ? "border-emerald-900/50 bg-emerald-950/30 text-emerald-400"
                          : "border-zinc-700/50 bg-zinc-800/50 text-zinc-400"
                      }`}
                    >
                      {course.is_published ? "Published" : "Draft"}
                    </span>
                    <span className="shrink-0 text-xs uppercase tracking-wider text-zinc-500">
                      {course.level}
                    </span>
                    {!hasCuratorNote(course.content) && (
                      <span className="shrink-0 rounded border border-amber-900/50 bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-300">
                        Needs note
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-zinc-500">
                    {course.description || "No description provided."}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <span className="hidden font-mono text-xs text-zinc-600 sm:block">
                    {new Date(course.created_at).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleTogglePublish(course.id, !course.is_published)}
                    disabled={publishingId === course.id}
                    className={`flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 ${
                      course.is_published
                        ? "text-amber-400 hover:text-amber-300"
                        : "text-emerald-400 hover:text-emerald-300"
                    }`}
                  >
                    {publishingId === course.id
                      ? course.is_published
                        ? "Unpublishing..."
                        : "Publishing..."
                      : course.is_published
                        ? "Unpublish"
                        : "Publish"}
                  </button>
                  {deleteTarget === course.id ? (
                    <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-sm text-red-300">Delete?</span>
                      <button
                        type="button"
                        onClick={() => void handleDelete(course.id)}
                        disabled={deletingId === course.id}
                        className="text-sm font-medium text-red-400 transition-colors hover:text-red-200 disabled:opacity-50"
                      >
                        {deletingId === course.id ? "Deleting..." : "Yes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(null)}
                        disabled={deletingId === course.id}
                        className="text-sm text-zinc-400 transition-colors hover:text-zinc-200 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(course.id)}
                      className="flex items-center gap-1.5 text-sm text-red-400 transition-colors hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/courses/${course.id}`)}
                    className="flex items-center gap-1.5 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
