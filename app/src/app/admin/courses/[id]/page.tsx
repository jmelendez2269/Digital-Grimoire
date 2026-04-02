"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
    Save, Trash2, ArrowLeft, Loader2, AlertTriangle,
    Upload, ChevronDown, ChevronUp, FileText, CheckCircle, X,
    Plus, Minus, BookOpen, Search, Sparkles, Copy
} from "lucide-react";

interface Course {
    id: string;
    title: string;
    slug: string;
    description: string;
    premise: string;
    learning_outcomes: string[];
    course_type: string;
    level: string;
    duration_weeks: number;
    is_published: boolean;
    sort_order: number;
    content: Record<string, unknown>;
    course_texts?: Array<{
        id: string;
        text_id: string;
        is_required: boolean;
        texts: {
            id: string;
            title: string;
            author: string;
            cover_image_url: string;
        };
    }>;
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

    // Import panel state
    const [importOpen, setImportOpen] = useState(false);
    const [importText, setImportText] = useState("");
    const [importFileName, setImportFileName] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importWarnings, setImportWarnings] = useState<string[]>([]);
    const [importSuccess, setImportSuccess] = useState(false);

    // Generate with AI state
    const [generateOpen, setGenerateOpen] = useState(false);
    const [generateBrief, setGenerateBrief] = useState("");
    const [generating, setGenerating] = useState(false);
    const [generatedMarkdown, setGeneratedMarkdown] = useState("");
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [generateDone, setGenerateDone] = useState(false);
    const [copied, setCopied] = useState(false);

    // Text linking state
    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    useEffect(() => {
        fetchCourse();
    }, [id]);

    const fetchCourse = async () => {
        try {
            const res = await fetch(`/api/courses/${id}`);
            const data = await res.json();
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
            .map(s => s.trim())
            .filter(Boolean);

        // Prep course_texts for sync
        const course_texts = course.course_texts?.map(ct => ({
            text_id: ct.text_id,
            is_required: ct.is_required
        }));

        try {
            const parsedContent = JSON.parse(jsonInput);
            const res = await fetch(`/api/courses/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...course, learning_outcomes, course_texts, content: parsedContent }),
            });
            const data = await res.json();
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

    const searchLibrary = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await fetch(`/api/texts?search=${encodeURIComponent(query)}&limit=5`);
            const data = await res.json();
            if (data.texts) {
                setSearchResults(data.texts);
            }
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchText) searchLibrary(searchText);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchText]);

    const addTextLink = (text: any) => {
        if (!course) return;
        const exists = course.course_texts?.some(ct => ct.text_id === text.id);
        if (exists) return;

        const newLink = {
            id: `temp-${Date.now()}`,
            text_id: text.id,
            is_required: true,
            texts: {
                id: text.id,
                title: text.title,
                author: text.author,
                cover_image_url: text.cover_image_url
            }
        };

        setCourse({
            ...course,
            course_texts: [...(course.course_texts || []), newLink]
        });
        setSearchText("");
        setSearchResults([]);
        setSearchOpen(false);
    };

    const removeTextLink = (textId: string) => {
        if (!course) return;
        setCourse({
            ...course,
            course_texts: course.course_texts?.filter(ct => ct.text_id !== textId)
        });
    };

    const toggleRequired = (textId: string) => {
        if (!course) return;
        setCourse({
            ...course,
            course_texts: course.course_texts?.map(ct =>
                ct.text_id === textId ? { ...ct, is_required: !ct.is_required } : ct
            )
        });
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
            const data = await res.json();
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
        reader.onload = (ev) => setImportText(ev.target?.result as string ?? "");
        reader.readAsText(file);
    };

    const handleParseAndApply = async () => {
        if (!importText.trim() || !course) return;
        setImporting(true);
        setImportError(null);
        setImportWarnings([]);
        setImportSuccess(false);

        try {
            const res = await fetch("/api/admin/parse-course", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markdownContent: importText }),
            });
            const data = await res.json();

            if (!data.success) {
                setImportError(data.error || "Failed to parse markdown");
                return;
            }

            const parsed: ParsedCourse = data.course;
            setCourse(prev => prev ? {
                ...prev,
                title: parsed.title || prev.title,
                slug: parsed.slug || prev.slug,
                description: parsed.description || prev.description,
                premise: parsed.premise || prev.premise,
                course_type: parsed.course_type || prev.course_type,
                level: parsed.level || prev.level,
                duration_weeks: parsed.duration_weeks || prev.duration_weeks,
                content: parsed.content || prev.content,
                course_texts: data.course_texts && data.course_texts.length > 0 
                  ? data.course_texts 
                  : prev.course_texts
            } : prev);
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

    const handleGenerate = async () => {
        if (!generateBrief.trim() || generating) return;
        setGenerating(true);
        setGenerateError(null);
        setGeneratedMarkdown("");
        setGenerateDone(false);

        try {
            const res = await fetch("/api/admin/generate-course", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ brief: generateBrief }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                setGenerateError(errData.error || `Request failed (${res.status})`);
                return;
            }

            const reader = res.body?.getReader();
            if (!reader) { setGenerateError("No stream received"); return; }

            const decoder = new TextDecoder();
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                accumulated += decoder.decode(value, { stream: true });
                setGeneratedMarkdown(accumulated);
            }

            // Auto-apply: feed generated markdown into the existing parse flow
            setGenerateDone(true);
            setImportText(accumulated);
            setImportOpen(true);

            // Small delay so the user sees the success state before parse fires
            await new Promise(r => setTimeout(r, 400));

            // Trigger parse-and-apply programmatically by calling the handler
            // with the generated markdown already in importText state
            const parseRes = await fetch("/api/admin/parse-course", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markdownContent: accumulated }),
            });
            const parseData = await parseRes.json();

            if (!parseData.success) {
                setImportError(parseData.error || "Failed to parse generated markdown");
                return;
            }

            const parsed = parseData.course;
            setCourse(prev => prev ? {
                ...prev,
                title: parsed.title || prev.title,
                slug: parsed.slug || prev.slug,
                description: parsed.description || prev.description,
                premise: parsed.premise || prev.premise,
                course_type: parsed.course_type || prev.course_type,
                level: parsed.level || prev.level,
                duration_weeks: parsed.duration_weeks || prev.duration_weeks,
                content: parsed.content || prev.content,
                course_texts: parseData.course_texts?.length > 0
                    ? parseData.course_texts
                    : prev.course_texts,
            } : prev);
            setOutcomesText((parsed.learning_outcomes || []).join("\n"));
            setJsonInput(JSON.stringify(parsed.content || {}, null, 2));
            setImportWarnings(parseData.warnings || []);
            setImportSuccess(true);

        } catch (err) {
            setGenerateError(err instanceof Error ? err.message : "Generation failed");
        } finally {
            setGenerating(false);
        }
    };

    const handleCopyGenerated = async () => {
        if (!generatedMarkdown) return;
        await navigator.clipboard.writeText(generatedMarkdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const slugify = (title: string) =>
        title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const set = (field: keyof Course) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setCourse(prev => prev ? { ...prev, [field]: e.target.value } : prev);

    const weekCount = (() => {
        try {
            const weeks = (JSON.parse(jsonInput) as { weeks?: unknown[] })?.weeks;
            return Array.isArray(weeks) ? weeks.length : 0;
        } catch { return 0; }
    })();

    return (
        <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-cyan-900 selection:text-cyan-50">
            <Header />

            <main className="flex-grow container mx-auto px-4 py-8 mt-24 max-w-3xl">
                <button
                    type="button"
                    onClick={() => router.push("/admin/courses")}
                    className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-6 text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Courses
                </button>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20 text-red-400">{error}</div>
                ) : course ? (
                    <>
                        <div className="flex justify-between items-center mb-8">
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-200">
                                Edit Course
                            </h1>
                            <div className="flex items-center gap-3">
                                {!confirmDelete ? (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(true)}
                                        className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700 px-3 py-1.5 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                                        <span className="text-sm text-red-300">Delete permanently?</span>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className="text-sm text-red-400 hover:text-red-200 font-medium ml-1 disabled:opacity-50"
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
                                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-cyan-500 hover:to-teal-500 transition-all font-medium text-sm disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                            </div>
                        </div>

                        {saveError && (
                            <div className="mb-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-sm">
                                {saveError}
                            </div>
                        )}

                        {/* Generate with AI */}
                        <div className="mb-4 border border-cyan-900/40 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-950/20 to-zinc-950/0">
                            <button
                                type="button"
                                onClick={() => setGenerateOpen(o => !o)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-cyan-950/20 transition-colors text-sm"
                                aria-expanded={generateOpen}
                            >
                                <span className="flex items-center gap-2 text-cyan-300 font-medium">
                                    <Sparkles className="w-4 h-4 text-cyan-400" />
                                    Generate with AI
                                    <span className="text-[10px] font-mono text-cyan-700 border border-cyan-900/50 px-1.5 py-0.5 rounded">
                                        claude-opus-4-6
                                    </span>
                                </span>
                                {generateOpen
                                    ? <ChevronUp className="w-4 h-4 text-zinc-500" />
                                    : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                            </button>

                            {generateOpen && (
                                <div className="px-4 pb-4 pt-2 space-y-3">
                                    <p className="text-xs text-zinc-500">
                                        Paste a rough brief, outline, or set of notes. The AI has the full course template, schema, philosophy, and a complete example week — it will produce a fully finished course document and populate all fields automatically.
                                    </p>

                                    <textarea
                                        value={generateBrief}
                                        onChange={e => setGenerateBrief(e.target.value)}
                                        rows={8}
                                        placeholder={`Example:\n\nCourse on the Hermetic Principle of Correspondence — "as above, so below"\n\nCore question: Is the universe built on hidden correspondences, or does the human mind impose order on chaos?\n\nWeekly arc:\n1. What is correspondence? The Hermetic principle as reasoning method\n2. Correspondence tables — planets, metals, elements\n...`}
                                        disabled={generating}
                                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs font-mono resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/10 transition-all text-zinc-300 placeholder:text-zinc-700 disabled:opacity-50"
                                    />

                                    {generateError && (
                                        <div className="flex items-start gap-2 p-2.5 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-xs">
                                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                            {generateError}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={handleGenerate}
                                            disabled={!generateBrief.trim() || generating}
                                            className="flex items-center gap-2 bg-gradient-to-r from-cyan-700/60 to-teal-700/60 hover:from-cyan-700/80 hover:to-teal-700/80 border border-cyan-700/40 text-cyan-200 text-sm px-4 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {generating
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Sparkles className="w-4 h-4" />}
                                            {generating ? "Generating…" : "Generate Course"}
                                        </button>

                                        {generatedMarkdown && !generating && (
                                            <button
                                                type="button"
                                                onClick={handleCopyGenerated}
                                                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                                {copied ? "Copied!" : "Copy markdown"}
                                            </button>
                                        )}
                                    </div>

                                    {/* Live streaming output */}
                                    {(generating || generatedMarkdown) && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
                                                    {generating ? "Generating…" : generateDone ? "Complete — fields applied below" : "Output"}
                                                </span>
                                                {generating && (
                                                    <span className="text-[10px] text-cyan-700 font-mono">
                                                        {generatedMarkdown.length.toLocaleString()} chars
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <textarea
                                                    readOnly
                                                    value={generatedMarkdown}
                                                    rows={12}
                                                    className="w-full bg-black/60 border border-zinc-800/60 rounded-lg px-3 py-2.5 text-[10px] font-mono resize-none focus:outline-none text-zinc-500 leading-relaxed"
                                                />
                                                {generating && (
                                                    <span className="absolute bottom-3 right-3 inline-block w-1.5 h-3.5 bg-cyan-500 animate-pulse rounded-sm" />
                                                )}
                                                {generateDone && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                                                        <div className="flex items-center gap-2 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs px-4 py-2 rounded-full">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            Fields applied — review and save
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Import from Markdown */}
                        <div className="mb-6 border border-zinc-800 rounded-xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => { setImportOpen(o => !o); if (importOpen) clearImport(); }}
                                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/60 hover:bg-zinc-900 transition-colors text-sm"
                                aria-expanded={importOpen}
                            >
                                <span className="flex items-center gap-2 text-zinc-300 font-medium">
                                    <Upload className="w-4 h-4 text-cyan-500" />
                                    Import from Markdown
                                    {weekCount > 0 && (
                                        <span className="text-xs text-zinc-500 font-normal">
                                            · {weekCount} week{weekCount !== 1 ? "s" : ""} loaded
                                        </span>
                                    )}
                                </span>
                                {importOpen ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                            </button>

                            {importOpen && (
                                <div className="px-4 pb-4 pt-3 space-y-3 bg-zinc-950/40">
                                    <p className="text-xs text-zinc-500">
                                        Paste your course markdown or upload a .md file. All fields will be populated from the document — you can edit them afterwards before saving.
                                    </p>

                                    {/* File upload */}
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => fileRef.current?.click()}
                                            className="flex items-center gap-2 text-xs text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            Choose file
                                        </button>
                                        {importFileName && (
                                            <span className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
                                                {importFileName}
                                                <button
                                                    type="button"
                                                    onClick={clearImport}
                                                    aria-label="Clear selected file"
                                                    className="text-zinc-600 hover:text-zinc-400"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        )}
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept=".md,.txt"
                                            onChange={handleFileUpload}
                                            aria-label="Upload course markdown file"
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Paste area */}
                                    <textarea
                                        id="import-markdown"
                                        value={importText}
                                        onChange={(e) => { setImportText(e.target.value); setImportFileName(null); }}
                                        rows={6}
                                        placeholder="Or paste markdown here..."
                                        aria-label="Paste course markdown content"
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs font-mono resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all text-zinc-300"
                                    />

                                    {/* Feedback */}
                                    {importError && (
                                        <div className="flex items-start gap-2 p-2.5 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-xs">
                                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                            {importError}
                                        </div>
                                    )}
                                    {importSuccess && (
                                        <div className="flex items-center gap-2 p-2.5 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-emerald-400 text-xs">
                                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                            Fields applied — review and save when ready.
                                        </div>
                                    )}
                                    {importWarnings.length > 0 && (
                                        <div className="p-2.5 bg-amber-950/20 border border-amber-900/40 rounded-lg text-xs text-amber-400 space-y-1">
                                            {importWarnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleParseAndApply}
                                        disabled={!importText.trim() || importing}
                                        className="flex items-center gap-2 bg-cyan-900/40 hover:bg-cyan-900/60 border border-cyan-800/50 text-cyan-300 text-sm px-4 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        Parse &amp; Apply Fields
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            {/* Title */}
                            <div>
                                <label htmlFor="course-title" className="block text-sm font-medium text-zinc-300 mb-1.5">Title</label>
                                <input
                                    id="course-title"
                                    value={course.title}
                                    onChange={(e) => {
                                        setCourse(prev => prev ? {
                                            ...prev,
                                            title: e.target.value,
                                            slug: slugify(e.target.value)
                                        } : prev);
                                    }}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                />
                            </div>

                            {/* Slug */}
                            <div>
                                <label htmlFor="course-slug" className="block text-sm font-medium text-zinc-300 mb-1.5">Slug</label>
                                <input
                                    id="course-slug"
                                    value={course.slug}
                                    onChange={set("slug")}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                />
                            </div>

                            {/* Type + Level + Duration + Sort Order */}
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label htmlFor="course-type" className="block text-sm font-medium text-zinc-300 mb-1.5">Type</label>
                                    <select
                                        id="course-type"
                                        value={course.course_type}
                                        onChange={set("course_type")}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                                    >
                                        {COURSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="course-level" className="block text-sm font-medium text-zinc-300 mb-1.5">Level</label>
                                    <select
                                        id="course-level"
                                        value={course.level}
                                        onChange={set("level")}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                                    >
                                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="course-duration" className="block text-sm font-medium text-zinc-300 mb-1.5">Duration (weeks)</label>
                                    <input
                                        id="course-duration"
                                        type="number"
                                        min={1}
                                        value={course.duration_weeks}
                                        onChange={(e) => setCourse(prev => prev ? { ...prev, duration_weeks: parseInt(e.target.value) || 1 } : prev)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="course-sort-order" className="block text-sm font-medium text-zinc-300 mb-1.5">Display Order</label>
                                    <input
                                        id="course-sort-order"
                                        type="number"
                                        min={0}
                                        value={course.sort_order}
                                        onChange={(e) => setCourse(prev => prev ? { ...prev, sort_order: parseInt(e.target.value) || 0 } : prev)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Published toggle */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCourse(prev => prev ? { ...prev, is_published: !prev.is_published } : prev)}
                                    aria-label={course.is_published ? "Unpublish course" : "Publish course"}
                                    aria-pressed={course.is_published ? "true" : "false"}
                                    className={`relative w-10 h-5 rounded-full transition-colors ${course.is_published ? 'bg-cyan-600' : 'bg-zinc-700'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${course.is_published ? 'translate-x-5' : ''}`} />
                                </button>
                                <span className="text-sm text-zinc-300">{course.is_published ? 'Published' : 'Draft'}</span>
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="course-description" className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
                                <textarea
                                    id="course-description"
                                    value={course.description || ""}
                                    onChange={set("description")}
                                    rows={3}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                />
                            </div>

                            {/* Library Texts Linking */}
                            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-cyan-500" />
                                        Linked Library Texts
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setSearchOpen(!searchOpen)}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                                    >
                                        <Plus className="w-3 h-3" />
                                        {searchOpen ? "DONE" : "LINK_TEXT"}
                                    </button>
                                </div>

                                {searchOpen && (
                                    <div className="relative">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                            <input
                                                type="text"
                                                placeholder="Search library by title or author..."
                                                value={searchText}
                                                onChange={(e) => setSearchText(e.target.value)}
                                                className="w-full bg-black border border-cyan-900/50 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-all font-mono"
                                            />
                                        </div>

                                        {searchResults.length > 0 && (
                                            <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden divide-y divide-zinc-800">
                                                {searchResults.map(text => (
                                                    <button
                                                        key={text.id}
                                                        type="button"
                                                        onClick={() => addTextLink(text)}
                                                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-zinc-800 transition-colors group"
                                                    >
                                                        <div className="w-8 h-12 bg-zinc-800 rounded border border-zinc-700 overflow-hidden shrink-0">
                                                            {text.cover_image_url && (
                                                                <img 
                                                                    src={text.cover_image_url} 
                                                                    alt="" 
                                                                    className="w-full h-full object-cover" 
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.opacity = '0';
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-medium text-zinc-100 truncate">{text.title}</div>
                                                            <div className="text-[10px] text-zinc-500 truncate">{text.author}</div>
                                                        </div>
                                                        <Plus className="w-4 h-4 text-zinc-600 group-hover:text-cyan-500" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {isSearching && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {(course.course_texts || []).length === 0 ? (
                                        <div className="text-center py-6 border border-dashed border-zinc-800 rounded-lg">
                                            <p className="text-xs text-zinc-600 font-mono">NO_TEXTS_LINKED</p>
                                        </div>
                                    ) : (
                                        course.course_texts?.map((ct) => (
                                            <div
                                                key={ct.id}
                                                className="flex items-center gap-3 p-2 bg-black/40 border border-zinc-800/50 rounded-lg group"
                                            >
                                                <div className="w-10 h-14 bg-zinc-900 rounded border border-zinc-800 overflow-hidden shrink-0">
                                                    {ct.texts?.cover_image_url && (
                                                        <img 
                                                            src={ct.texts.cover_image_url} 
                                                            alt="" 
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-semibold text-zinc-200 truncate">{ct.texts?.title}</div>
                                                    <div className="text-[10px] text-zinc-500 truncate">{ct.texts?.author}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleRequired(ct.text_id)}
                                                        className={`text-[9px] font-mono border px-1.5 py-0.5 rounded transition-all ${
                                                            ct.is_required
                                                                ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                                                                : "bg-zinc-800/10 border-zinc-800 text-zinc-500"
                                                        }`}
                                                    >
                                                        {ct.is_required ? "REQUIRED" : "OPTIONAL"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTextLink(ct.text_id)}
                                                        title="Remove text"
                                                        aria-label="Remove text"
                                                        className="p-1.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Premise */}
                            <div>
                                <label htmlFor="course-premise" className="block text-sm font-medium text-zinc-300 mb-1.5">Premise</label>
                                <textarea
                                    id="course-premise"
                                    value={course.premise || ""}
                                    onChange={set("premise")}
                                    rows={3}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                />
                            </div>

                            {/* Learning Outcomes */}
                            <div>
                                <label htmlFor="course-outcomes" className="block text-sm font-medium text-zinc-300 mb-1.5">
                                    Learning Outcomes <span className="text-zinc-500 font-normal">(one per line)</span>
                                </label>
                                <textarea
                                    id="course-outcomes"
                                    value={outcomesText}
                                    onChange={(e) => setOutcomesText(e.target.value)}
                                    rows={5}
                                    placeholder="Students will understand..."
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                                />
                            </div>
                        </div>
                    </>
                ) : null}
            </main>
            <Footer />
        </div>
    );
}
