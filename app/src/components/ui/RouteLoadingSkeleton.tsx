interface RouteLoadingSkeletonProps {
  label?: string;
  cards?: number;
}

export default function RouteLoadingSkeleton({
  label = "Loading page",
  cards = 6,
}: RouteLoadingSkeletonProps) {
  return (
    <main
      className="min-h-[60dvh] flex-1 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-6 py-12"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto w-full max-w-7xl animate-pulse space-y-8">
        <div className="space-y-4">
          <div className="h-3 w-32 rounded bg-amber-300/15" />
          <div className="h-12 max-w-2xl rounded-xl bg-white/8" />
          <div className="h-5 max-w-xl rounded bg-white/5" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: cards }, (_, index) => (
            <div
              key={index}
              className="h-52 rounded-2xl border border-white/8 bg-white/[0.025]"
            />
          ))}
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </main>
  );
}
