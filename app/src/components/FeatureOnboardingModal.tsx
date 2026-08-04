"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowRight,
  Book,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  GraduationCap,
  Library,
  Lightbulb,
  Network,
  X,
  Zap,
} from "lucide-react";

const TOTAL_STEPS = 5;
const STORAGE_KEY = "hasSeenOnboardingV3";

const lenses = [
  { emoji: "🔭", label: "Scientific", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { emoji: "🧠", label: "Psychological", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  { emoji: "📜", label: "Philosophical", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { emoji: "✨", label: "Religious/Spiritual", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  { emoji: "🏛️", label: "Historical/Anthropological", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  { emoji: "⚗️", label: "Symbolic/Occult", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { emoji: "∞", label: "Mathematical", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
];

const features = [
  {
    id: "courses",
    Icon: GraduationCap,
    label: "Courses",
    href: "/courses",
    wikiHref: "/wiki/courses",
    accentColor: "text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/30",
    badge: "A good place to begin",
    badgeColor: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    description:
      "Courses are guided paths through questions we can explore together. How to Hold Two Things at Once is the recommended shared beginning, never a requirement. Public course previews stay open so you can see which question calls to you.",
    bullets: [
      "Explore one question at a time",
      "Read and compare different perspectives",
      "Use the Library, Concept Search, Seven Lenses, Knowledge Graph, and Study Journal as you go",
      "Build your own understanding in your own words",
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
      "A curated public-domain library spanning philosophy, mysticism, science, mythology, and symbolic traditions across all seven lenses.",
    bullets: [
      "Texts tagged by lens and tradition",
      "Reading, annotation, and highlighting",
      "\"Why Chosen\" rationale for every selection",
      "Built for cross-tradition study",
    ],
  },
  {
    id: "concept",
    Icon: Lightbulb,
    label: "Concept Search",
    href: "/search",
    wikiHref: "/wiki/library-search-bar",
    accentColor: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/30",
    badge: null,
    badgeColor: "",
    description:
      "Trace a concept across the full collection of texts to find where ideas recur, mutate, or bridge traditions. Rooted in the library's own books — not the open web.",
    bullets: [
      "Search for ideas, not just titles",
      "Results drawn from the library's curated texts",
      "Reveal recurring themes across traditions",
      "Ideal companion to the Knowledge Graph",
    ],
  },
  {
    id: "parallax",
    Icon: Zap,
    label: "Seven Lenses",
    href: "/seven-lenses",
    wikiHref: "/wiki/parallax-engine",
    accentColor: "text-amber-400",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/30",
    badge: null,
    badgeColor: "",
    description:
      "Bring a question, concept, or passage and look at it through seven perspectives side by side. The point is to compare what each one reveals, not to receive one final answer.",
    bullets: [
      "See seven perspectives on the same question",
      "Adjust which lenses receive more attention",
      "Compare agreements, differences, and blind spots",
      "Built for comparison, not dogma",
    ],
  },
  {
    id: "journal",
    Icon: Book,
    label: "Study Journal",
    href: "/journal",
    wikiHref: "/wiki/journal",
    accentColor: "text-indigo-400",
    accentBg: "bg-indigo-500/10",
    accentBorder: "border-indigo-500/30",
    badge: null,
    badgeColor: "",
    description:
      "Your private place for notes, clipped passages, reflections, and connections. Keep what matters as you read and explore, and give the journal a name of your own.",
    bullets: [
      "Rich editor with wiki-links",
      "Clip passages from the Library",
      "Save outputs from Seven Lenses",
      "Keep course notes and questions together",
    ],
  },
  {
    id: "graph",
    Icon: Network,
    label: "Knowledge Graph",
    href: "/graph",
    wikiHref: "/wiki/graph",
    accentColor: "text-cyan-400",
    accentBg: "bg-cyan-500/10",
    accentBorder: "border-cyan-500/30",
    badge: null,
    badgeColor: "",
    description:
      "Follow Course Knowledge connections between concepts, books, authors, and lessons, or explore sourced symbolic correspondences.",
    bullets: [
      "Course Knowledge: concepts, books, authors, lessons, and typed connections",
      "Connections grounded in course, Library, and reference sources",
      "Correspondences: explore symbolic relationships",
      "Choose a starting point or open a random connection",
    ],
  },
  {
    id: "working",
    Icon: FlaskConical,
    label: "The Working",
    href: "/workbench/the-working",
    wikiHref: "/wiki/the-working",
    accentColor: "text-amber-400",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/30",
    badge: null,
    badgeColor: "",
    description:
      "A ritual generator. Describe what you're working toward in plain language — a job, a decision, a transition — and the engine pulls correspondences from the Knowledge Graph (symbols, plants, stones, planets, timing) and builds a complete, personalized ritual around your intention.",
    bullets: [
      "Tell it your intention in plain language — it builds the ritual",
      "Correspondence palette drawn live from the Knowledge Graph",
      "Record conditions when you cast it; watch what follows",
      "Share completed workings to the community",
    ],
  },
];

function StepWelcome() {
  return (
    <div className="flex flex-col items-center text-center gap-4 px-2">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-1">
          <BookOpen className="w-6 h-6 text-amber-400" />
        </div>
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-500/70">Prismarium</p>
        <h2 className="text-2xl sm:text-3xl font-serif text-amber-100 leading-tight max-w-lg">
          A place to keep learning, compare perspectives, and build your own understanding.
        </h2>
        <p className="text-xs font-mono text-zinc-500 tracking-widest">
          Read · compare · question · make connections
        </p>
      </div>

      <p className="text-sm text-zinc-300 max-w-xl leading-relaxed">
        Prismarium grew out of my own search for somewhere I could keep learning without being handed one final answer. I’m still learning too. This is a place to read deeply, compare perspectives, and build your own understanding over time.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
        {[
          {
            label: "What this is not",
            items: ["A university program", "A mystery cult", "A belief replacement system", "A content dump"],
            color: "border-zinc-500 text-zinc-300",
            labelColor: "text-zinc-300",
          },
          {
            label: "What this is",
            items: ["A place to hold many traditions at once", "A way to build your own map"],
            color: "border-amber-500/30 text-amber-200",
            labelColor: "text-amber-400",
          },
          {
            label: "What guides the work",
            items: ["More than one perspective can matter", "No lens gets the final word", "You decide what holds up for you", "Questions can stay open"],
            color: "border-cyan-500/20 text-cyan-200",
            labelColor: "text-cyan-400",
          },
        ].map((col) => (
          <div key={col.label} className={`rounded-lg border p-3 ${col.color} bg-black/20`}>
            <p className={`text-xs font-mono uppercase tracking-widest mb-2 ${col.labelColor}`}>{col.label}</p>
            <ul className="space-y-1">
              {col.items.map((item) => (
                <li key={item} className="text-sm flex gap-2">
                  <span className="opacity-50 shrink-0">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepPhilosophy() {
  return (
    <div className="flex flex-col gap-8 py-2">
      <div className="text-center">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-500/70 mb-3">Seven Lenses</p>
        <h2 className="text-3xl sm:text-4xl font-serif text-amber-100 mb-3">Seven ways to look at a question</h2>
        <p className="text-zinc-400 max-w-2xl mx-auto text-base leading-relaxed">
          A question can look very different depending on where you stand. Seven Lenses lets you compare seven perspectives without treating any one of them as the final answer.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {lenses.slice(0, 4).map((lens) => (
          <div key={lens.label} className={`rounded-xl border p-4 ${lens.bg} ${lens.border} flex flex-col gap-2`}>
            <span className="text-3xl">{lens.emoji}</span>
            <p className={`font-medium text-base ${lens.color}`}>{lens.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {lenses.slice(4).map((lens) => (
          <div key={lens.label} className={`rounded-xl border p-4 ${lens.bg} ${lens.border} flex flex-col gap-2`}>
            <span className="text-3xl">{lens.emoji}</span>
            <p className={`font-medium text-base ${lens.color}`}>{lens.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-center max-w-2xl mx-auto">
        <p className="text-amber-200 text-base leading-relaxed">
          The point is not to force the lenses into agreement. It is to notice what each one reveals, where they differ, and what you think after seeing the question from more than one direction.
        </p>
      </div>
    </div>
  );
}

function StepFeatureTour() {
  const [selectedId, setSelectedId] = useState("courses");
  const selected = features.find((feature) => feature.id === selectedId) ?? features[0];
  const { Icon: SelectedIcon } = selected;

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="text-center">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-500/70 mb-2">Ways to explore</p>
        <h2 className="text-3xl sm:text-4xl font-serif text-amber-100 mb-2">The tools</h2>
        <p className="text-zinc-400 text-base max-w-xl mx-auto">
          Choose a tool to see what it can help you do. You can use any of them on their own or alongside a course path.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 min-h-[260px]">
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:w-48 shrink-0 pb-2 lg:pb-0">
          {features.map((feature) => {
            const { Icon } = feature;
            const isActive = feature.id === selectedId;
            return (
              <button
                type="button"
                key={feature.id}
                onClick={() => setSelectedId(feature.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 lg:shrink lg:w-full text-left ${
                  isActive
                    ? `${feature.accentBg} ${feature.accentColor} border ${feature.accentBorder}`
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{feature.label}</span>
              </button>
            );
          })}
        </div>

        <div className={`flex-1 rounded-xl border ${selected.accentBorder} bg-black/20 p-5 flex flex-col gap-4 animate-in fade-in duration-200`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${selected.accentBg} shrink-0`}>
              <SelectedIcon className={`w-6 h-6 ${selected.accentColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className={`text-xl font-semibold ${selected.accentColor}`}>{selected.label}</h3>
                {selected.badge && <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${selected.badgeColor}`}>{selected.badge}</span>}
              </div>
              <p className="text-zinc-300 text-base leading-relaxed">{selected.description}</p>
            </div>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selected.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-base text-zinc-400">
                <ArrowRight className={`w-3.5 h-3.5 shrink-0 mt-1 ${selected.accentColor}`} />
                {bullet}
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
            <Link href={selected.wikiHref} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              How it works
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepWorkflow() {
  const coreTools = [
    { Icon: Library, label: "Library", description: "Read across the collection", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
    { Icon: Lightbulb, label: "Concept Search", description: "Trace patterns and themes", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    { Icon: Zap, label: "Seven Lenses", description: "Compare perspectives", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    { Icon: Network, label: "Knowledge Graph", description: "Follow connections between ideas", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
    { Icon: Book, label: "Study Journal", description: "Keep notes and connections", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
  ];

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="text-center">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-500/70 mb-3">One way to begin</p>
        <h2 className="text-3xl sm:text-4xl font-serif text-amber-100 mb-3">How the Tools Work Together</h2>
        <p className="text-zinc-400 text-base max-w-2xl mx-auto leading-relaxed">
          A course gives us a question to follow together. From there, you can read in the Library, trace an idea with Concept Search, compare perspectives with Seven Lenses, follow connections in the Knowledge Graph, and keep your notes in your Study Journal.
        </p>
      </div>

      {/* Entry: Courses */}
      <div className="flex flex-col items-center gap-0">
        <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl border border-blue-500/40 bg-blue-500/10 text-center w-56">
          <GraduationCap className="w-6 h-6 text-blue-400" />
          <p className="font-semibold text-base text-blue-400">Courses</p>
          <p className="text-sm text-zinc-500 leading-snug">Explore a question together</p>
        </div>

        {/* Branch stem */}
        <div className="flex flex-col items-center">
          <div className="w-px h-4 bg-zinc-700" />
          <div className="w-64 h-px bg-zinc-700" />
          <div className="flex justify-between w-64">
            {coreTools.map((tool) => <div key={tool.label} className="w-px h-4 bg-zinc-700" />)}
          </div>
        </div>

        {/* 5 parallel tools */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full">
          {coreTools.map(({ Icon, label, description, color, bg, border }) => (
            <div key={label} className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${border} ${bg} text-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
              <p className={`font-semibold text-sm ${color}`}>{label}</p>
              <p className="text-xs text-zinc-500 leading-snug">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Independent use note */}
      <p className="text-sm text-zinc-500 text-center max-w-xl mx-auto leading-relaxed">
        You can also begin with any tool on its own. Courses are one way in, not a requirement.
      </p>

      {/* The Working — standalone */}
      <div className="flex items-center gap-3 mt-1">
        <div className="flex-1 h-px border-t border-dashed border-zinc-700" />
        <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest shrink-0">a separate practice tool</p>
        <div className="flex-1 h-px border-t border-dashed border-zinc-700" />
      </div>

      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 text-center w-72">
          <FlaskConical className="w-5 h-5 text-amber-400" />
          <p className="font-semibold text-base text-amber-400">The Working</p>
          <p className="text-sm text-zinc-500 leading-snug">Build a ritual from an intention and connections in the Knowledge Graph.</p>
        </div>
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
        <h2 className="text-3xl sm:text-4xl font-serif text-amber-100">The door is open.</h2>
        <p className="text-zinc-400 max-w-md text-base leading-relaxed">
          Here are a few good ways to begin.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {[
          {
            Icon: GraduationCap,
            label: "Begin with How to Hold Two Things at Once",
            description: "Meet the method in the two-week shared orientation",
            href: "/courses/pre-how-to-hold-two-things-at-once",
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/30",
          },
          {
            Icon: Library,
            label: "Browse the Library",
            description: "Read across traditions and disciplines",
            href: "/library",
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
            border: "border-cyan-500/30",
          },
          {
            Icon: Lightbulb,
            label: "Open Concept Search",
            description: "Follow an idea across the collection.",
            href: "/search",
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/30",
          },
        ].map(({ Icon, label, description, href, color, bg, border }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`group flex flex-col items-center gap-2 p-5 rounded-xl border ${border} ${bg} hover:opacity-90 transition-all hover:-translate-y-0.5 text-center`}
          >
            <Icon className={`w-6 h-6 ${color}`} />
            <p className={`font-medium text-base ${color}`}>{label}</p>
            <p className="text-sm text-zinc-500 leading-snug">{description}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/30 p-5 max-w-lg w-full">
        <p className="text-zinc-400 text-base mb-3">
          Need help finding your way around? The wiki explains what each part does and how they connect.
        </p>
        <Link href="/wiki" onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Visit the Wiki
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

interface FeatureOnboardingModalProps {
  onClose?: () => void;
}

export default function FeatureOnboardingModal({ onClose }: FeatureOnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(typeof window !== "undefined");

  useEffect(() => {
    let timer: number | undefined;
    let frame: number | undefined;

    if (!mounted) {
      frame = window.requestAnimationFrame(() => setMounted(true));
      return () => {
        if (frame) window.cancelAnimationFrame(frame);
      };
    }

    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      timer = window.setTimeout(() => setIsOpen(true), 2500);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [mounted]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
    onClose?.();
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep((current) => current + 1);
    else handleClose();
  };

  const handleBack = () => {
    if (step > 1) setStep((current) => current - 1);
  };

  if (!mounted || !isOpen) return null;

  const stepLabels = ["Welcome", "Seven Lenses", "The Tools", "The Workflow", "Ready"];
  const isLastStep = step === TOTAL_STEPS;

  const modalContent = (
    <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-zinc-950/98 border border-amber-500/20 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        role="dialog"
        aria-label="Welcome to Prismarium"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="relative shrink-0 px-6 pt-5 pb-4 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-1.5">
            {stepLabels.map((label, index) => {
              const current = index + 1;
              const isDone = current < step;
              const isActive = current === step;
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => setStep(current)}
                  title={label}
                  className={`transition-all duration-300 rounded-full ${
                    isActive ? "w-6 h-2 bg-amber-500" : isDone ? "w-2 h-2 bg-amber-500/50 hover:bg-amber-500/70" : "w-2 h-2 bg-zinc-700 hover:bg-zinc-600"
                  }`}
                />
              );
            })}
          </div>

          <p className="absolute left-1/2 -translate-x-1/2 text-xs font-mono text-zinc-500 uppercase tracking-widest hidden sm:block">
            {stepLabels[step - 1]}
          </p>

          <button type="button" onClick={handleClose} className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-zinc-300 ml-auto" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="relative flex-1 overflow-y-auto px-6 sm:px-8 py-4">
          {step === 1 && <StepWelcome />}
          {step === 2 && <StepPhilosophy />}
          {step === 3 && <StepFeatureTour />}
          {step === 4 && <StepWorkflow />}
          {step === 5 && <StepReady onClose={handleClose} />}
        </div>

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
