"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  premise: string | null;
  learning_outcomes: string[] | null;
  course_type: string | null;
  level: string | null;
  duration_weeks: number | null;
  is_published: boolean;
  sort_order: number | null;
  content: Record<string, unknown> | null;
}

interface ParsedCourse {
  title: string;
  slug: string;
  description: string;
  premise: string;
  learning_outcomes: string[];
  course_type: string;
  level: string;
  duration_weeks: number;
  content: Record<string, unknown>;
}

const COURSE_TYPES = ["foundational", "theme", "rotation"];
const LEVELS = ["foundational", "intermediate", "advanced"];

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [outcomesText, setOutcomesText] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    void fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${id}`, { cache: "no-store" });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        setOutcomesText((data.course.learning_outcomes || []).join("\n"));
        setJsonInput(JSON.stringify(data.course.content || {}, null, 2));
      } else {
        setError(data.error || "Course not found");
      }
    } catch {
      setError("Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!course || jsonError) return;
    setSaving(true);
    setSaveError(null);

    const learning_outcomes = outcomesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    try {
      const parsedContent = JSON.parse(jsonInput);
      const response = await fetch(`/api/courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: course.title,
          slug: course.slug,
          description: course.description,
          premise: course.premise,
          learning_outcomes,
          course_type: course.course_type,
          level: course.level,
          duration_weeks: course.duration_weeks,
          is_published: course.is_published,
          sort_order: course.sort_order,
          content: parsedContent,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        setJsonInput(JSON.stringify(data.course.content || {}, null, 2));
      } else {
        setSaveError(data.error || "Failed to save");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        router.push("/admin/courses");
      } else {
        setSaveError(data.error || "Failed to delete");
        setConfirmDelete(false);
      }
    } catch {
      setSaveError("Failed to delete course");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setImportText((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  };

  const handleParseAndApply = async () => {
    if (!importText.trim() || !course) return;
    setImporting(true);
    setImportError(null);
    setImportWarnings([]);
    setImportSuccess(false);

    try {
      const response = await fetch("/api/admin/parse-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdownContent: importText }),
      });
      const data = await response.json();

      if (!data.success) {
        setImportError(data.error || "Failed to parse markdown");
        return;
      }

      const parsed: ParsedCourse = data.course;
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              title: parsed.title || prev.title,
              slug: parsed.slug || prev.slug,
              description: parsed.description || prev.description,
              premise: parsed.premise || prev.premise,
              course_type: parsed.course_type || prev.course_type,
              level: parsed.level || prev.level,
              duration_weeks: parsed.duration_weeks || prev.duration_weeks,
              content: parsed.content || prev.content,
            }
          : prev
      );
      setOutcomesText((parsed.learning_outcomes || []).join("\n"));
      setJsonInput(JSON.stringify(parsed.content || {}, null, 2));
      setImportWarnings(data.warnings || []);
      setImportSuccess(true);
      setTimeout(() => setImportOpen(false), 1200);
    } catch {
      setImportError("Failed to parse course markdown");
    } finally {
      setImporting(false);
    }
  };

  const clearImport = () => {
    setImportText("");
    setImportFileName(null);
    setImportError(null);
    setImportWarnings([]);
    setImportSuccess(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const slugify = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const setField =
    (field: keyof Course) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setCourse((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));

  useEffect(() => {
    try {
      JSON.parse(jsonInput);
      setJsonError(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "Invalid JSON");
    }
  }, [jsonInput]);

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-zinc-100 selection:bg-cyan-900 selection:text-cyan-50">
      <Header />

      <main className="container mx-auto mt-24 max-w-4xl flex-grow px-4 py-8">
        <button
          type="button"
          onClick={() => router.push("/admin/courses")}
          className="mb-6 flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : error ? (
          <div className="py-20 text-center text-red-400">{error}</div>
        ) : course ? (
          <>
            <div className="mb-8 flex items-center justify-between">
              <h1 className="bg-gradient-to-r from-cyan-400 to-teal-200 bg-clip-text text-2xl font-bold text-transparent">
                Edit Course
              </h1>
              <div className="flex items-center gap-3">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-2 rounded-lg border border-red-900/50 px-3 py-1.5 text-sm text-red-400 transition-all hover:border-red-700 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-sm text-red-300">Delete permanently?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="ml-1 text-sm font-medium text-red-400 hover:text-red-200 disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Yes, delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-sm text-zinc-400 hover:text-zinc-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !!jsonError}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </div>

            {saveError && (
              <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-400">
                {saveError}
              </div>
            )}

            <div
              className={`mb-4 rounded-lg border p-3 text-sm ${
                course.is_published
                  ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-300"
                  : "border-amber-900/40 bg-amber-950/20 text-amber-300"
              }`}
            >
              {course.is_published
                ? "This course is published and can appear on the public /courses page."
                : "This course is saved as a draft and will not appear on the public /courses page until you switch it to Published and save."}
            </div>

            <div className="mb-4 overflow-hidden rounded-xl border border-cyan-900/40 bg-gradient-to-br from-cyan-950/20 to-zinc-950/0">
              <button
                type="button"
                onClick={() => setImportOpen((open) => !open)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-cyan-950/20"
                aria-expanded={importOpen}
              >
                <span className="flex items-center gap-2 font-medium text-cyan-300">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  Parse Markdown Into This Course
                </span>
                {importOpen ? <ChevronUp className="h-4 w-4 text-cyan-400" /> : <ChevronDown className="h-4 w-4 text-cyan-400" />}
              </button>

              {importOpen && (
                <div className="space-y-4 border-t border-cyan-900/30 p-4">
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-cyan-700/50">
                      Upload Markdown
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".md,.txt,.markdown"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                    {importFileName && (
                      <span className="font-mono text-xs text-zinc-500">{importFileName}</span>
                    )}
                    {(importText || importFileName) && (
                      <button
                        type="button"
                        onClick={clearImport}
                        className="ml-auto flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                      >
                        <X className="h-3 w-3" />
                        Clear
                      </button>
                    )}
                  </div>

                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={14}
                    placeholder="Paste full course markdown here..."
                    className="w-full rounded-lg border border-zinc-800 bg-black/40 px-4 py-3 font-mono text-xs text-zinc-300 transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                  />

                  {importError && (
                    <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-2.5 text-xs text-red-400">
                      {importError}
                    </div>
                  )}

                  {importSuccess && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-2.5 text-xs text-emerald-400">
                      <CheckCircle className="h-4 w-4" />
                      Parsed and applied successfully.
                    </div>
                  )}

                  {importWarnings.length > 0 && (
                    <div className="space-y-1 rounded-lg border border-amber-900/40 bg-amber-950/20 p-2.5 text-xs text-amber-400">
                      {importWarnings.map((warning, index) => (
                        <div key={index}>Warning: {warning}</div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleParseAndApply}
                    disabled={!importText.trim() || importing}
                    className="flex items-center gap-2 rounded-lg border border-cyan-800/50 bg-cyan-900/40 px-4 py-2 text-sm text-cyan-300 transition-all hover:bg-cyan-900/60 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Parse & Apply Fields
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="course-title" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Title
                </label>
                <input
                  id="course-title"
                  value={course.title}
                  onChange={(e) =>
                    setCourse((prev) =>
                      prev ? { ...prev, title: e.target.value, slug: slugify(e.target.value) } : prev
                    )
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                />
              </div>

              <div>
                <label htmlFor="course-slug" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Slug
                </label>
                <input
                  id="course-slug"
                  value={course.slug}
                  onChange={setField("slug")}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 font-mono text-sm transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label htmlFor="course-type" className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Type
                  </label>
                  <select
                    id="course-type"
                    value={course.course_type ?? "foundational"}
                    onChange={setField("course_type")}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm transition-all focus:border-cyan-500/50 focus:outline-none"
                  >
                    {COURSE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="course-level" className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Level
                  </label>
                  <select
                    id="course-level"
                    value={course.level ?? "foundational"}
                    onChange={setField("level")}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm transition-all focus:border-cyan-500/50 focus:outline-none"
                  >
                    {LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="course-duration" className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Duration
                  </label>
                  <input
                    id="course-duration"
                    type="number"
                    min={1}
                    value={course.duration_weeks ?? 1}
                    onChange={(e) =>
                      setCourse((prev) =>
                        prev ? { ...prev, duration_weeks: parseInt(e.target.value, 10) || 1 } : prev
                      )
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm transition-all focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="course-sort-order" className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Display Order
                  </label>
                  <input
                    id="course-sort-order"
                    type="number"
                    min={0}
                    value={course.sort_order ?? 0}
                    onChange={(e) =>
                      setCourse((prev) =>
                        prev ? { ...prev, sort_order: parseInt(e.target.value, 10) || 0 } : prev
                      )
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm transition-all focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCourse((prev) => (prev ? { ...prev, is_published: !prev.is_published } : prev))
                  }
                  aria-pressed={course.is_published ? "true" : "false"}
                  className={`relative h-5 w-10 rounded-full transition-colors ${
                    course.is_published ? "bg-cyan-600" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      course.is_published ? "translate-x-5" : ""
                    }`}
                  />
                </button>
                <span className="text-sm text-zinc-300">
                  {course.is_published ? "Published" : "Draft"}
                </span>
              </div>

              <div>
                <label htmlFor="course-description" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Description
                </label>
                <textarea
                  id="course-description"
                  value={course.description || ""}
                  onChange={setField("description")}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                />
              </div>

              <div>
                <label htmlFor="course-premise" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Premise
                </label>
                <textarea
                  id="course-premise"
                  value={course.premise || ""}
                  onChange={setField("premise")}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                />
              </div>

              <div>
                <label htmlFor="course-outcomes" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Learning Outcomes
                  <span className="ml-1 font-normal text-zinc-500">(one per line)</span>
                </label>
                <textarea
                  id="course-outcomes"
                  value={outcomesText}
                  onChange={(e) => setOutcomesText(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 font-mono text-sm transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                />
              </div>

              <div>
                <label htmlFor="course-json" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Course Content JSON
                </label>
                <textarea
                  id="course-json"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  rows={18}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 font-mono text-xs text-zinc-300 transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                />
                {jsonError && (
                  <p className="mt-2 text-xs text-red-400">Invalid JSON: {jsonError}</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
