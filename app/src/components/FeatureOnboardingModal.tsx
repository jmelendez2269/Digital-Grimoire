"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
    X,
    BookOpen,
    Library,
    Book,
    GraduationCap,
    Zap,
    Hammer,
    Sparkles,
    Network,
    Scroll,
    ArrowRight,
    ChevronRight,
    ChevronLeft,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;
const STORAGE_KEY = "hasSeenOnboardingV2";

const LENSES = [
    {
        emoji: "🔭",
        label: "Scientific",
        color: "text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/20",
        description: "Physics, biology, cosmology, empirical inquiry",
    },
    {
        emoji: "🧠",
        label: "Psychological",
        color: "text-violet-400",
        bg: "bg-violet-500/10",
        border: "border-violet-500/20",
        description: "Jungian archetypes, depth psychology, shadow work",
    },
    {
        emoji: "📜",
        label: "Philosophical",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        description: "Metaphysics, ethics, epistemology, ontology",
    },
    {
        emoji: "✨",
        label: "Religious / Spiritual",
        color: "text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        description: "Comparative theology, mysticism, sacred traditions",
    },
    {
        emoji: "🏛️",
        label: "Historical",
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
        description: "Cultural evolution, mythology, ritual context",
    },
    {
        emoji: "⚗️",
        label: "Symbolic / Occult",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        description: "Alchemy, astrology, esoteric correspondences",
    },
    {
        emoji: "∞",
        label: "Mathematical",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        description: "Sacred geometry, numerology, universal patterns",
    },
];

const FEATURES = [
    {
        id: "courses",
        Icon: GraduationCap,
        label: "Courses",
        href: "/courses",
        wikiHref: "/wiki/courses",
        accentColor: "text-blue-400",
        accentBg: "bg-blue-500/10",
        accentBorder: "border-blue-500/30",
        badge: "Recommended starting point",
        badgeColor: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
        description:
            "Courses are the heart of the platform. Each one is built around a core question — not a topic — and guides you through multiple lenses of inquiry. Your course assigns readings from the Library, suggests concepts to run through the Seven Lenses, and your Journal is where you capture it all.",
        bullets: [
            "Structured around a central question, not a syllabus",
            "Each week focuses on a specific lens",
            "Includes assigned library readings with rationale",
            "Ends with a synthesis artifact you create yourself",
        ],
    },
    {
        id: "library",
        Icon: Library,
        label: "Library",
        href: "/library",
        wikiHref: "/wiki/library-features",
        accentColor: "text-cyan-400",
        accentBg: "bg-cyan-500/10",
        accentBorder: "border-cyan-500/30",
        badge: null,
        badgeColor: "",
        description:
            "Over 100 curated public domain texts spanning all seven lenses — from the Bhagavad Gita to Principia Mathematica to The Golden Bough. Every text was chosen for its Parallax Value: its ability to bridge traditions and reveal cross-tradition patterns.",
        bullets: [
            "Public domain texts — freely accessible to all",
            "Each text tagged by lens and tradition",
            '"Why Chosen" rationale for every selection',
            "Full-text reading, annotations, and highlights",
        ],
    },
    {
        id: "parallax",
        Icon: Zap,
        label: "Seven Lenses",
        href: "/parallax-engine",
        wikiHref: "/wiki/parallax-engine",
        accentColor: "text-amber-400",
        accentBg: "bg-amber-500/10",
        accentBorder: "border-amber-500/30",
        badge: null,
        badgeColor: "",
        description:
            "Enter any concept — a word, a question, an idea — and the Engine analyzes it simultaneously through all seven lenses, drawing from the library's texts. You can adjust the weight of each lens to match your inquiry. This is convergent knowing in action.",
        bullets: [
            "Seven-lens simultaneous analysis",
            "Grounded in the curated library's texts",
            "Adjustable lens weighting per inquiry",
            "No lens is ranked above another",
        ],
    },
    {
        id: "journal",
        Icon: Book,
        label: "Journal",
        href: "/journal",
        wikiHref: "/wiki/journal",
        accentColor: "text-indigo-400",
        accentBg: "bg-indigo-500/10",
        accentBorder: "border-indigo-500/30",
        badge: null,
        badgeColor: "",
        description:
            "Your private research space. Clip passages from library texts, take notes during courses, save Seven Lenses outputs, and build an interconnected knowledge network with wiki-style links. Over time it becomes a personal knowledge base that belongs only to you.",
        bullets: [
            "Rich text editor with wiki-links between entries",
            "Clip passages directly from library texts",
            "Customizable name — call it whatever resonates",
            "Your synthesis work lives here permanently",
        ],
    },
    {
        id: "graph",
        Icon: Network,
        label: "Knowledge Graph",
        href: "/graph",
        wikiHref: "/wiki/graph",
        accentColor: "text-emerald-400",
        accentBg: "bg-emerald-500/10",
        accentBorder: "border-emerald-500/30",
        badge: null,
        badgeColor: "",
        description:
            "A visualization layer that reveals how concepts, texts, and traditions connect across the library. Explore how Buddhist emptiness relates to quantum physics, or how Hermetic principles appear in modern psychology — patterns invisible from any single vantage point.",
        bullets: [
            "Interactive concept-to-concept visualization",
            "Cross-tradition pattern discovery",
            "Connections drawn from the full library",
            "Navigate the map of ideas",
        ],
    },
    {
        id: "ritual",
        Icon: Scroll,
        label: "Ritual Machine",
        href: "/ritual-machine",
        wikiHref: "/wiki/ritual-machine",
        accentColor: "text-rose-400",
        accentBg: "bg-rose-500/10",
        accentBorder: "border-rose-500/30",
        badge: "Extra",
        badgeColor: "bg-zinc-700/50 text-zinc-400 border border-zinc-600/50",
        description:
            "For practitioners. Browse curated ritual protocols drawn from esoteric traditions — select a rite and follow it step by step. Or design your own in the Workbench and run it here.",
        bullets: [
            "Curated ritual protocols from multiple traditions",
            "Step-by-step ritual execution mode",
            "Track and document your practice",
            "Connect rituals to library source texts",
        ],
    },
    {
        id: "workbench",
        Icon: Hammer,
        label: "Workbench",
        href: "/workbench",
        wikiHref: "/wiki/workbench",
        accentColor: "text-orange-400",
        accentBg: "bg-orange-500/10",
        accentBorder: "border-orange-500/30",
        badge: "Extra",
        badgeColor: "bg-zinc-700/50 text-zinc-400 border border-zinc-600/50",
        description:
            "Your maker's space. Design custom rituals, forge personalized tarot cards, and build practice tools that are uniquely yours. Where learning becomes craft.",
        bullets: [
            "Custom ritual design and builder",
            "Custom tarot card creation",
            "Practitioner tools and tracking",
            "Your personal practice workshop",
        ],
    },
    {
        id: "oracle",
        Icon: Sparkles,
        label: "The Oracle",
        href: "/extras/tarot",
        wikiHref: "/wiki/tarot",
        accentColor: "text-purple-400",
        accentBg: "bg-purple-500/10",
        accentBorder: "border-purple-500/30",
        badge: "Extra",
        badgeColor: "bg-zinc-700/50 text-zinc-400 border border-zinc-600/50",
        description:
            "Consult the digital tarot. Draw from the standard 78-card deck, receive readings, and save them to your journal. A contemplative tool — not a prediction engine.",
        bullets: [
            "Full 78-card tarot deck",
            "Save readings to your journal",
            "Symbolic, not predictive",
            "A contemplative companion",
        ],
    },
];

const WORKFLOW_STEPS = [
    {
        Icon: GraduationCap,
        label: "Courses",
        href: "/courses",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        description: "Start with a core question",
    },
    {
        Icon: Library,
        label: "Library",
        href: "/library",
        color: "text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/30",
        description: "Read the assigned texts",
    },
    {
        Icon: Zap,
        label: "Seven Lenses",
        href: "/parallax-engine",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        description: "Analyze through seven lenses",
    },
    {
        Icon: Book,
        label: "Journal",
        href: "/journal",
        color: "text-indigo-400",
        bg: "bg-indigo-500/10",
        border: "border-indigo-500/30",
        description: "Capture your synthesis",
    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepWelcome() {
    return (
        <div className="flex flex-col items-center text-center gap-8 py-4 px-2">
            <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-1">
                    <BookOpen className="w-8 h-8 text-amber-400" />
                </div>
                <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-500/70">
                    Prismarium
                </p>
                <h2 className="text-3xl sm:text-4xl font-serif text-amber-100 leading-tight max-w-lg">
                    A curated body of wisdom, a method for understanding it, and tools that make that method accessible to anyone.
                </h2>
                <p className="text-sm font-mono text-zinc-500 tracking-widest mt-1">
                    Prismatic Learning · Seven Lenses · Synthesis as Discipline
                </p>
            </div>

            <p className="text-zinc-300 max-w-xl leading-relaxed">
                The problem is not access. You can find the Bhagavad Gita, the Tao Te Ching, or On the Origin of Species in ten seconds. The unsolved problem is <em className="text-amber-300">comprehension</em> — really digesting a profound text in a way that connects to your actual life and to other ways of knowing.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl text-left">
                {[
                    {
                        label: "What this is not",
                        items: ["A university program", "A mystery cult", "A self-improvement system", "Belief replacement"],
                        color: "border-zinc-700 text-zinc-500",
                        labelColor: "text-zinc-500",
                    },
                    {
                        label: "What this is",
                        items: [
                            "A disciplined exploration of how humans make meaning",
                            "Tools that help you make meaning for yourself",
                        ],
                        color: "border-amber-500/30 text-amber-200",
                        labelColor: "text-amber-400",
                    },
                    {
                        label: "What we believe",
                        items: [
                            "Multiple truths can coexist",
                            "You decide what resonates",
                            "No lens is superior",
                            "Use it however you want",
                        ],
                        color: "border-cyan-500/20 text-cyan-200",
                        labelColor: "text-cyan-400",
                    },
                ].map((col) => (
                    <div key={col.label} className={`rounded-lg border p-4 ${col.color} bg-black/20`}>
                        <p className={`text-xs font-mono uppercase tracking-widest mb-3 ${col.labelColor}`}>
                            {col.label}
                        </p>
                        <ul className="space-y-1.5">
                            {col.items.map((item) => (
                                <li key={item} className="text-sm flex gap-2">
                                    <span className="opacity-50 shrink-0">—</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <p className="text-sm text-zinc-500 italic max-w-md">
                We are not an authority on truth. We are a workshop for understanding. What you build here is yours.
            </p>
        </div>
    );
}

function StepPhilosophy() {
    return (
        <div className="flex flex-col gap-8 py-2">
            <div className="text-center">
                <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-500/70 mb-3">
                    Prismatic Learning
                </p>
                <h2 className="text-2xl sm:text-3xl font-serif text-amber-100 mb-3">
                    Seven Ways of Knowing
                </h2>
                <p className="text-zinc-400 max-w-2xl mx-auto text-sm leading-relaxed">
                    Reality is not accessed through a single mode of knowing. The platform reads every text — and analyzes every concept — through seven distinct epistemological lenses. No lens is treated as final. No lens is reduced into another. Error arises not from using a lens, but from forgetting that it is one.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {LENSES.slice(0, 4).map((lens) => (
                    <div
                        key={lens.label}
                        className={`rounded-xl border p-4 ${lens.bg} ${lens.border} flex flex-col gap-2`}
                    >
                        <span className="text-2xl">{lens.emoji}</span>
                        <p className={`font-medium text-sm ${lens.color}`}>{lens.label}</p>
                        <p className="text-xs text-zinc-500 leading-relaxed">{lens.description}</p>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LENSES.slice(4).map((lens) => (
                    <div
                        key={lens.label}
                        className={`rounded-xl border p-4 ${lens.bg} ${lens.border} flex flex-col gap-2`}
                    >
                        <span className="text-2xl">{lens.emoji}</span>
                        <p className={`font-medium text-sm ${lens.color}`}>{lens.label}</p>
                        <p className="text-xs text-zinc-500 leading-relaxed">{lens.description}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-center max-w-2xl mx-auto">
                <p className="text-amber-200 text-sm leading-relaxed">
                    <span className="font-medium">Synthesis is not agreement.</span> It is the trained ability to hold multiple, incompatible truths without collapsing them into false unity — and to decide for yourself what resonates.
                </p>
            </div>
        </div>
    );
}

function StepFeatureTour() {
    const [selectedId, setSelectedId] = useState("courses");
    const selected = FEATURES.find((f) => f.id === selectedId) ?? FEATURES[0];
    const { Icon: SelectedIcon } = selected;

    return (
        <div className="flex flex-col gap-4 py-2">
            <div className="text-center">
                <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-500/70 mb-2">
                    Your Toolkit
                </p>
                <h2 className="text-2xl sm:text-3xl font-serif text-amber-100 mb-2">
                    The Platform's Tools
                </h2>
                <p className="text-zinc-400 text-sm max-w-xl mx-auto">
                    Use one feature deeply or all of them together — there is no wrong way in. Select any tool below to learn what it does.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 min-h-[300px]">
                {/* Sidebar */}
                <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:w-44 shrink-0 pb-2 lg:pb-0">
                    {FEATURES.map((f) => {
                        const { Icon } = f;
                        const isActive = f.id === selectedId;
                        return (
                            <button
                                type="button"
                                key={f.id}
                                onClick={() => setSelectedId(f.id)}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 lg:shrink lg:w-full text-left ${
                                    isActive
                                        ? `${f.accentBg} ${f.accentColor} border ${f.accentBorder}`
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                                }`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span className="truncate">{f.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Detail Panel */}
                <div
                    key={selected.id}
                    className={`flex-1 rounded-xl border ${selected.accentBorder} bg-black/20 p-5 flex flex-col gap-4 animate-in fade-in duration-200`}
                >
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${selected.accentBg} shrink-0`}>
                            <SelectedIcon className={`w-6 h-6 ${selected.accentColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className={`text-lg font-semibold ${selected.accentColor}`}>
                                    {selected.label}
                                </h3>
                                {selected.badge && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${selected.badgeColor}`}>
                                        {selected.badge}
                                    </span>
                                )}
                            </div>
                            <p className="text-zinc-300 text-sm leading-relaxed">
                                {selected.description}
                            </p>
                        </div>
                    </div>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selected.bullets.map((b) => (
                            <li key={b} className="flex items-start gap-2 text-sm text-zinc-400">
                                <ArrowRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${selected.accentColor}`} />
                                {b}
                            </li>
                        ))}
                    </ul>

                    <div className="flex items-center gap-3 mt-auto pt-2 border-t border-white/5">
                        <Link
                            href={selected.href}
                            className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg ${selected.accentBg} ${selected.accentColor} border ${selected.accentBorder} hover:opacity-80 transition-opacity`}
                        >
                            Open {selected.label}
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                            href={selected.wikiHref}
                            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            Read the docs
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StepWorkflow() {
    return (
        <div className="flex flex-col gap-8 py-2">
            <div className="text-center">
                <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-500/70 mb-3">
                    The Recommended Path
                </p>
                <h2 className="text-2xl sm:text-3xl font-serif text-amber-100 mb-3">
                    How the Tools Work Together
                </h2>
                <p className="text-zinc-400 text-sm max-w-2xl mx-auto leading-relaxed">
                    Each tool is independently useful. But together, they form a complete learning loop — from question to synthesis. Here's the workflow the platform was designed around.
                </p>
            </div>

            {/* Flow diagram */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0">
                {WORKFLOW_STEPS.map((step, i) => {
                    const { Icon } = step;
                    return (
                        <div key={step.label} className="flex flex-col sm:flex-row items-center">
                            <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${step.border} ${step.bg} w-40 text-center`}>
                                <div className={`w-10 h-10 rounded-full ${step.bg} border ${step.border} flex items-center justify-center`}>
                                    <Icon className={`w-5 h-5 ${step.color}`} />
                                </div>
                                <p className={`font-semibold text-sm ${step.color}`}>{step.label}</p>
                                <p className="text-xs text-zinc-500 leading-snug">{step.description}</p>
                            </div>
                            {i < WORKFLOW_STEPS.length - 1 && (
                                <ArrowRight className="w-5 h-5 text-zinc-600 mx-2 shrink-0 rotate-90 sm:rotate-0" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step-by-step explanation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
                {[
                    {
                        step: "01",
                        color: "text-blue-400",
                        heading: "Start with a Course",
                        body: "Each course is structured around a core question. It tells you what to read, what lens to apply each week, and what to synthesize at the end.",
                    },
                    {
                        step: "02",
                        color: "text-cyan-400",
                        heading: "Read in the Library",
                        body: "Your course assigns texts from the curated library. Read them there — annotate, highlight, and clip passages directly to your Journal.",
                    },
                    {
                        step: "03",
                        color: "text-amber-400",
                        heading: "Run the Seven Lenses",
                        body: "Encounter a concept you want to examine more deeply? Put it in the Engine. See it through all seven lenses at once. Save the output to your Journal.",
                    },
                    {
                        step: "04",
                        color: "text-indigo-400",
                        heading: "Synthesize in your Journal",
                        body: "Your Journal is where everything converges. Notes, clipped passages, Engine outputs, your own synthesis — it builds into a knowledge base that is uniquely yours.",
                    },
                ].map((item) => (
                    <div key={item.step} className="flex gap-3 rounded-xl bg-black/20 border border-white/5 p-4">
                        <span className={`text-2xl font-serif font-bold ${item.color} shrink-0 leading-none`}>
                            {item.step}
                        </span>
                        <div>
                            <p className={`font-medium text-sm mb-1 ${item.color}`}>{item.heading}</p>
                            <p className="text-xs text-zinc-400 leading-relaxed">{item.body}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/30 p-5 text-center max-w-2xl mx-auto">
                <p className="text-zinc-300 text-sm leading-relaxed">
                    <span className="text-amber-300 font-medium">There is no wrong way in.</span> Browse the library without taking a course. Run the Engine without reading anything. Open your Journal and just write. Use one tool for years. Use all of them in one session. The platform meets you wherever you are.
                </p>
            </div>
        </div>
    );
}

function StepReady({ onClose }: { onClose: () => void }) {
    return (
        <div className="flex flex-col items-center text-center gap-8 py-4">
            <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-amber-400" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif text-amber-100">
                    The door is open.
                </h2>
                <p className="text-zinc-400 max-w-md text-sm leading-relaxed">
                    You're free to explore everything — or start with one thing. Here are a few ways in.
                </p>
            </div>

            {/* Quick-start actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
                {[
                    {
                        Icon: GraduationCap,
                        label: "Start a Course",
                        description: "Structured inquiry around a core question",
                        href: "/courses",
                        color: "text-blue-400",
                        bg: "bg-blue-500/10",
                        border: "border-blue-500/30",
                    },
                    {
                        Icon: Library,
                        label: "Browse the Library",
                        description: "100+ curated wisdom texts across all lenses",
                        href: "/library",
                        color: "text-cyan-400",
                        bg: "bg-cyan-500/10",
                        border: "border-cyan-500/30",
                    },
                    {
                        Icon: Book,
                        label: "Open your Journal",
                        description: "Your personal research and synthesis space",
                        href: "/journal",
                        color: "text-indigo-400",
                        bg: "bg-indigo-500/10",
                        border: "border-indigo-500/30",
                    },
                ].map(({ Icon, label, description, href, color, bg, border }) => (
                    <Link
                        key={href}
                        href={href}
                        onClick={onClose}
                        className={`group flex flex-col items-center gap-2 p-5 rounded-xl border ${border} ${bg} hover:opacity-90 transition-all hover:-translate-y-0.5 text-center`}
                    >
                        <Icon className={`w-6 h-6 ${color}`} />
                        <p className={`font-medium text-sm ${color}`}>{label}</p>
                        <p className="text-xs text-zinc-500 leading-snug">{description}</p>
                    </Link>
                ))}
            </div>

            {/* Wiki CTA */}
            <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/30 p-5 max-w-lg w-full">
                <p className="text-zinc-400 text-sm mb-3">
                    Have questions about a specific feature? Every tool has detailed documentation in the knowledge base.
                </p>
                <Link
                    href="/wiki"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors"
                >
                    Visit the Wiki
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <p className="text-xs text-zinc-600 max-w-md">
                We are not an authority on truth. We are a workshop for understanding. What you build here is yours.
            </p>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface FeatureOnboardingModalProps {
    onClose?: () => void;
}

export default function FeatureOnboardingModal({ onClose }: FeatureOnboardingModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const hasSeen = localStorage.getItem(STORAGE_KEY);
        if (!hasSeen) {
            const timer = setTimeout(() => setIsOpen(true), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem(STORAGE_KEY, "true");
        setIsOpen(false);
        onClose?.();
    };

    const handleNext = () => {
        if (step < TOTAL_STEPS) setStep((s) => s + 1);
        else handleClose();
    };

    const handleBack = () => {
        if (step > 1) setStep((s) => s - 1);
    };

    if (!mounted || !isOpen) return null;

    const stepLabels = ["Welcome", "Seven Lenses", "The Tools", "The Workflow", "Ready"];
    const isLastStep = step === TOTAL_STEPS;

    const modalContent = (
        <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div
                className="bg-zinc-950/98 border border-amber-500/20 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                role="dialog"
                aria-label="Welcome to Prismarium"
            >
                {/* Decorative grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

                {/* Header */}
                <div className="relative shrink-0 px-6 pt-5 pb-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                    {/* Step indicators */}
                    <div className="flex items-center gap-1.5">
                        {stepLabels.map((label, i) => {
                            const n = i + 1;
                            const isDone = n < step;
                            const isActive = n === step;
                            return (
                                <button
                                    type="button"
                                    key={label}
                                    onClick={() => setStep(n)}
                                    title={label}
                                    className={`transition-all duration-300 rounded-full ${
                                        isActive
                                            ? "w-6 h-2 bg-amber-500"
                                            : isDone
                                            ? "w-2 h-2 bg-amber-500/50 hover:bg-amber-500/70"
                                            : "w-2 h-2 bg-zinc-700 hover:bg-zinc-600"
                                    }`}
                                />
                            );
                        })}
                    </div>

                    <p className="absolute left-1/2 -translate-x-1/2 text-xs font-mono text-zinc-500 uppercase tracking-widest hidden sm:block">
                        {stepLabels[step - 1]}
                    </p>

                    <button
                        type="button"
                        onClick={handleClose}
                        className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-zinc-300 ml-auto"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="relative flex-1 overflow-y-auto px-6 sm:px-8 py-6">
                    {step === 1 && <StepWelcome />}
                    {step === 2 && <StepPhilosophy />}
                    {step === 3 && <StepFeatureTour />}
                    {step === 4 && <StepWorkflow />}
                    {step === 5 && <StepReady onClose={handleClose} />}
                </div>

                {/* Footer */}
                <div className="relative shrink-0 px-6 py-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={handleBack}
                        disabled={step === 1}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-0 disabled:pointer-events-none transition-all rounded-lg hover:bg-white/5"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>

                    <p className="text-xs text-zinc-600 font-mono">
                        {step} / {TOTAL_STEPS}
                    </p>

                    <button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors shadow-lg shadow-amber-900/20"
                    >
                        {isLastStep ? "Enter Prismarium" : "Continue"}
                        {!isLastStep && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
