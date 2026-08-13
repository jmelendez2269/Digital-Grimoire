import Link from "next/link";
import {
  ArrowRight,
  FlaskConical,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import PalettePanel from "@/components/working/PalettePanel";
import RitualMarkdown from "@/components/working/RitualMarkdown";
import { RECORDED_WORKING_DEMO } from "@/lib/working/recorded-demo";

export default function WorkingPreviewPage() {
  const demo = RECORDED_WORKING_DEMO;

  return (
    <main className="flex flex-1 flex-col px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-10 text-center sm:mb-12">
          <div className="mb-4 flex items-center justify-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-400" aria-hidden="true" />
            <p className="font-mono text-xs tracking-[0.22em] text-amber-300 uppercase">
              The Working
            </p>
          </div>
          <h1 className="font-serif text-4xl leading-tight text-zinc-50 sm:text-5xl">
            See an intention become a practice
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
            This recorded example shows how The Working assembles a
            correspondence palette, synthesizes a ritual, and prepares a
            private record for reflection.
          </p>
        </div>

        <section
          aria-labelledby="recorded-working-heading"
          className="space-y-5"
        >
          <div
            role="note"
            className="flex flex-col gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.05] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p
                id="recorded-working-heading"
                className="font-mono text-[0.68rem] font-semibold tracking-[0.18em] text-cyan-200 uppercase"
              >
                Recorded example
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-300">
                {demo.provenance} No member data, database, or AI request is
                used.
              </p>
            </div>
            <time
              dateTime={demo.capturedAt}
              className="shrink-0 font-mono text-xs text-zinc-400"
            >
              August 13, 2026
            </time>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-[linear-gradient(135deg,rgba(120,53,15,0.16),rgba(9,9,11,0.96))] p-5 sm:p-6">
            <p className="font-mono text-[0.68rem] font-semibold tracking-[0.18em] text-amber-300/70 uppercase">
              Example intention
            </p>
            <p className="mt-3 font-serif text-2xl leading-9 text-zinc-50">
              &ldquo;{demo.intention}&rdquo;
            </p>
            <div className="mt-5 rounded-lg border border-white/[0.06] bg-black/30 px-4 py-3">
              <p className="font-mono text-[0.65rem] tracking-[0.14em] text-zinc-500 uppercase">
                Intent read as
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-300">
                {demo.interpretation}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span className="font-mono text-xs tracking-widest text-amber-300/70 uppercase">
                The ritual
              </span>
            </div>
            <RitualMarkdown content={demo.ritual} />
          </div>

          <PalettePanel palette={demo.palette} />
        </section>

        <section className="mt-10 rounded-2xl border border-emerald-300/20 bg-[linear-gradient(120deg,rgba(6,78,59,0.22),rgba(24,24,27,0.78))] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06]">
              <LockKeyhole
                className="h-5 w-5 text-emerald-200"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="font-mono text-[0.68rem] font-semibold tracking-[0.18em] text-emerald-200 uppercase">
                Private by design
              </p>
              <h2 className="mt-2 font-serif text-2xl text-zinc-50">
                Your workings are yours.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                Member intentions, rituals, casting conditions, and follow-up
                notes stay inside each member&apos;s private workbench. Public
                previews use editorial examples like this one instead.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/workbench/the-working"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-amber-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-200 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
            >
              Create a private working
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-zinc-200 focus-visible:outline-none"
            >
              View membership
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
