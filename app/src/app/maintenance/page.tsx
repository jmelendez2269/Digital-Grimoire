export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo/Icon */}
        <div className="mb-8 inline-block">
          <svg
            viewBox="0 0 100 100"
            className="h-16 w-16 text-amber-500/30"
            fill="currentColor"
          >
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="50" cy="50" r="3" fill="currentColor" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-4xl font-bold text-amber-100">
          Under Maintenance
        </h1>

        {/* Description */}
        <p className="mb-8 text-lg text-zinc-400">
          Project Parallax is temporarily unavailable while we make improvements.
        </p>

        {/* Footer message */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur">
          <p className="text-sm text-zinc-500">
            We&apos;ll be back soon. Thank you for your patience.
          </p>
        </div>
      </div>
    </div>
  );
}

