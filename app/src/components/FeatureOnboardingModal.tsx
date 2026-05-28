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
  GraduationCap,
  Library,
  Lightbulb,
  Network,
  X,
  Zap,
} from "lucide-react";

const TOTAL_STEPS = 5;
const STORAGE_KEY = "hasSeenOnboardingV2";

const lenses = [
  { emoji: "🔭", label: "Scientific", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { emoji: "🧠", label: "Psychological", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  { emoji: "📜", label: "Philosophical", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { emoji: "✨", label: "Religious / Spiritual", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  { emoji: "🏛️", label: "Historical", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  { emoji: "⚗️", label: "Symbolic / Occult", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
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
    badge: "Recommended starting point",
    badgeColor: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    description:
      "Courses are the heart of the platform. Each one is built around a core question and guides you through readings, exercises, and synthesis work.",
    bullets: [
      "Structured around a central question",
      "Each week emphasizes a particular lens",
      "Assigned readings with rationale",
      "Ends in a synthesis artifact you build",
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
      "Trace a concept across the corpus to find where ideas recur, mutate, or bridge traditions. It is built for thematic discovery rather than simple keyword lookup.",
    bullets: [
      "Search for ideas, not just titles",
      "Surface related books and passages",
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
      "Enter a question, concept, or passage and analyze it through seven distinct epistemological lenses at once, grounded in the library's texts.",
    bullets: [
      "Seven-lens simultaneous analysis",
      "Grounded in the curated library",
      "Adjustable lens weighting",
      "Built for comparison, not dogma",
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
      "Your private research space for notes, clipped passages, reflections, and synthesis. Over time it becomes your personal map of understanding.",
    bullets: [
      "Rich editor with wiki-links",
      "Clip passages from the Library",
      "Save outputs from Seven Lenses",
      "A private synthesis space that persists",
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
      "A visual layer for exploring how ideas, books, and traditions interconnect across the library.",
    bullets: [
      "Interactive concept visualization",
      "Cross-tradition pattern discovery",
      "Navigate clusters of related ideas",
      "See the architecture beneath the texts",
    ],
  },
];

const workflowSteps = [
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
    Icon: Lightbulb,
    label: "Concept Search",
    href: "/search",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    description: "Trace patterns and themes",
  },
  {
    Icon: Zap,
    label: "Seven Lenses",
    href: "/seven-lenses",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    description: "Analyze through multiple lenses",
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

function StepWelcome() {
  return (
    <div className="flex flex-col items-center text-center gap-8 py-4 px-2">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-1">
          <BookOpen className="w-8 h-8 text-amber-400" />
        </div>
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-500/70">Prismarium</p>
        <h2 className="text-3xl sm:text-4xl font-serif text-amber-100 leading-tight max-w-lg">
          A curated body of wisdom, a method for understanding it, and tools for carrying that method into your own work.
        </h2>
        <p className="text-sm font-mono text-zinc-500 tracking-widest mt-1">
          Prismatic Learning · Seven Lenses · Synthesis as Discipline
        </p>
      </div>

      <p className="text-zinc-300 max-w-xl leading-relaxed">
        Prismarium is built for deep study. The goal is not just to access profound texts, but to understand them in relation to each other and to your own questions.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl text-left">
        {[
          {
            label: "What this is not",
            items: ["A university program", "A mystery cult", "A belief replacement system", "A content dump"],
            color: "border-zinc-700 text-zinc-500",
            labelColor: "text-zinc-500",
          },
          {
            label: "What this is",
            items: ["A disciplined environment for inquiry", "A set of tools for comparative understanding"],
            color: "border-amber-500/30 text-amber-200",
            labelColor: "text-amber-400",
          },
          {
            label: "What we believe",
            items: ["Multiple truths can coexist", "No lens is final", "You decide what resonates", "Synthesis matters"],
            color: "border-cyan-500/20 text-cyan-200",
            labelColor: "text-cyan-400",
          },
        ].map((col) => (
          <div key={col.label} className={`rounded-lg border p-4 ${col.color} bg-black/20`}>
            <p className={`text-xs font-mono uppercase tracking-widest mb-3 ${col.labelColor}`}>{col.label}</p>
            <ul className="space-y-1.5">
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
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-500/70 mb-3">Prismatic Learning</p>
        <h2 className="text-2xl sm:text-3xl font-serif text-amber-100 mb-3">Seven Ways of Knowing</h2>
        <p className="text-zinc-400 max-w-2xl mx-auto text-sm leading-relaxed">
          Reality is not accessed through a single mode of inquiry. Prismarium compares claims through seven distinct lenses so that no single framework quietly becomes absolute.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {lenses.slice(0, 4).map((lens) => (
          <div key={lens.label} className={`rounded-xl border p-4 ${lens.bg} ${lens.border} flex flex-col gap-2`}>
            <span className="text-2xl">{lens.emoji}</span>
            <p className={`font-medium text-sm ${lens.color}`}>{lens.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {lenses.slice(4).map((lens) => (
          <div key={lens.label} className={`rounded-xl border p-4 ${lens.bg} ${lens.border} flex flex-col gap-2`}>
            <span className="text-2xl">{lens.emoji}</span>
            <p className={`font-medium text-sm ${lens.color}`}>{lens.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-center max-w-2xl mx-auto">
        <p className="text-amber-200 text-sm leading-relaxed">
          <span className="font-medium">Synthesis is not agreement.</span> It is the discipline of holding multiple perspectives long enough to understand what each one reveals.
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
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-500/70 mb-2">Your Toolkit</p>
        <h2 className="text-2xl sm:text-3xl font-serif text-amber-100 mb-2">The Platform&apos;s Tools</h2>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
          Select a tool to see what it does and how it fits into the overall workflow.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 min-h-[300px]">
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
                <h3 className={`text-lg font-semibold ${selected.accentColor}`}>{selected.label}</h3>
                {selected.badge && <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${selected.badgeColor}`}>{selected.badge}</span>}
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">{selected.description}</p>
            </div>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selected.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-sm text-zinc-400">
                <ArrowRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${selected.accentColor}`} />
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
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-500/70 mb-3">The Recommended Path</p>
        <h2 className="text-2xl sm:text-3xl font-serif text-amber-100 mb-3">How the Tools Work Together</h2>
        <p className="text-zinc-400 text-sm max-w-2xl mx-auto leading-relaxed">
          Each feature is useful on its own, but together they create a study loop from question to synthesis.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0">
        {workflowSteps.map((step, index) => {
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
              {index < workflowSteps.length - 1 && <ArrowRight className="w-5 h-5 text-zinc-600 mx-2 shrink-0 rotate-90 sm:rotate-0" />}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/30 p-5 text-center max-w-2xl mx-auto">
        <p className="text-zinc-300 text-sm leading-relaxed">
          Start with a course or a question, follow the threads through the library, compare them through Concept Search and Seven Lenses, then capture what matters in your Journal.
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
        <h2 className="text-3xl sm:text-4xl font-serif text-amber-100">The door is open.</h2>
        <p className="text-zinc-400 max-w-md text-sm leading-relaxed">
          Here are a few good ways to begin.
        </p>
      </div>

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
            description: "Read across traditions and disciplines",
            href: "/library",
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
            border: "border-cyan-500/30",
          },
          {
            Icon: Lightbulb,
            label: "Search Concepts",
            description: "Follow an idea across the corpus",
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
            <p className={`font-medium text-sm ${color}`}>{label}</p>
            <p className="text-xs text-zinc-500 leading-snug">{description}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/30 p-5 max-w-lg w-full">
        <p className="text-zinc-400 text-sm mb-3">
          Need orientation on a feature? The wiki explains how the study surfaces work and how they connect.
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
      timer = window.setTimeout(() => setIsOpen(true), 800);
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
        className="bg-zinc-950/98 border border-amber-500/20 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-300"
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

        <div className="relative flex-1 overflow-y-auto px-6 sm:px-8 py-6">
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
