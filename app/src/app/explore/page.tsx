import Link from "next/link";
import {
  Network,
  Search,
  Sparkles,
  ArrowRight,
  FlaskConical,
  Eye,
  LockKeyhole,
} from "lucide-react";

const tools = [
  {
    name: "Knowledge Graph",
    description:
      "Follow connections between concepts, traditions, symbols, people, and texts. Start with one point and see where it leads.",
    href: "/graph",
    icon: Network,
    accent: "cyan",
    access: "Open to everyone",
    isPublic: true,
  },
  {
    name: "Concept Search",
    description:
      "Search for an idea across the Library and find the books and passages where it appears.",
    href: "/search",
    icon: Search,
    accent: "violet",
    access: "Public preview",
    isPublic: true,
  },
  {
    name: "Seven Lenses",
    description:
      "Ask one question through seven perspectives at once — Scientific, Psychological, Philosophical, Religious/Spiritual, Historical/Anthropological, Symbolic/Occult, and Mathematical. Compare what each reveals.",
    href: "/seven-lenses",
    icon: Sparkles,
    accent: "amber",
    access: "Sign in to use",
    isPublic: false,
  },
  {
    name: "Shared Workings",
    description:
      "Workings cast and shared by practitioners — intentions stated, rituals synthesized, conditions stamped at the moment of casting. A living record of practice.",
    href: "/explore/workings",
    icon: FlaskConical,
    accent: "emerald",
    access: "Open to everyone",
    isPublic: true,
  },
];

const accentMap: Record<
  string,
  { border: string; icon: string; arrow: string; glow: string }
> = {
  cyan: {
    border: "border-cyan-500/20 hover:border-cyan-500/50",
    icon: "text-cyan-400",
    arrow: "text-cyan-400",
    glow: "group-hover:shadow-[0_0_30px_rgba(6,182,212,0.08)]",
  },
  violet: {
    border: "border-violet-500/20 hover:border-violet-500/50",
    icon: "text-violet-400",
    arrow: "text-violet-400",
    glow: "group-hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]",
  },
  amber: {
    border: "border-amber-500/20 hover:border-amber-500/50",
    icon: "text-amber-400",
    arrow: "text-amber-400",
    glow: "group-hover:shadow-[0_0_30px_rgba(245,158,11,0.08)]",
  },
  emerald: {
    border: "border-emerald-500/20 hover:border-emerald-500/50",
    icon: "text-emerald-400",
    arrow: "text-emerald-400",
    glow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.08)]",
  },
};

export default function ExplorePage() {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-16 sm:py-20">
      <div className="w-full max-w-4xl">
        <div className="mb-14 text-center">
          <p className="mb-4 font-mono text-xs tracking-[0.25em] text-cyan-500 uppercase">
            Explore
          </p>
          <h1 className="mb-4 font-serif text-4xl leading-tight text-zinc-100 sm:text-5xl">
            Follow a question in more than one direction
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-zinc-400">
            Explore is the front door to Prismarium&apos;s discovery tools. See
            how ideas, books, people, traditions, and practices connect before
            deciding where to go deeper.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-500">
            Public discovery spaces are open now. Private analysis, saved work,
            and personal study tools ask you to sign in only when you enter
            them.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const AccessIcon = tool.isPublic ? Eye : LockKeyhole;
            const a = accentMap[tool.accent];
            const href = tool.isPublic
              ? tool.href
              : `/login?redirect=${encodeURIComponent(tool.href)}`;
            return (
              <Link
                key={tool.href}
                href={href}
                className={`group flex min-h-64 flex-col rounded-2xl border bg-zinc-950 p-6 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none ${a.border} ${a.glow}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                    <Icon className={`h-5 w-5 ${a.icon}`} aria-hidden="true" />
                  </div>
                  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium text-zinc-400">
                    <AccessIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {tool.access}
                  </span>
                </div>
                <div className="mt-7">
                  <h2 className="font-serif text-2xl text-zinc-100">
                    {tool.name}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">
                    {tool.description}
                  </p>
                </div>
                <div
                  className={`mt-auto flex min-h-11 items-end gap-2 pt-6 text-sm font-semibold ${a.arrow}`}
                >
                  {tool.isPublic ? "Take a look" : "See the member tool"}
                  <ArrowRight
                    className="mb-0.5 h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
