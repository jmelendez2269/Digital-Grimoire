"use client";

import { FlaskConical } from "lucide-react";

export default function TheWorkingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <FlaskConical className="w-10 h-10 text-amber-500/60 mb-6" />
      <h1 className="text-2xl font-bold text-zinc-100 mb-3">The Working</h1>
      <p className="text-zinc-400 max-w-sm leading-relaxed">
        State an intention. The Parallax Engine assembles a correspondence palette from the knowledge
        graph and composes a ritual for you to cast and record as an experiment.
      </p>
      <p className="mt-6 text-xs font-mono text-amber-500/70 uppercase tracking-widest">Coming soon</p>
    </div>
  );
}
