import Link from "next/link";

export default function ParallaxLanding() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 border-b" style={{ borderColor: "var(--glass-border-color)" }}>
        <span className="text-sm tracking-widest uppercase opacity-60" style={{ fontFamily: "var(--font-mono)" }}>
          Project Parallax
        </span>
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm px-4 py-2 rounded-md transition-colors"
            style={{ background: "var(--brand)", color: "#fff" }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <p className="text-xs tracking-[0.3em] uppercase mb-6 opacity-50" style={{ fontFamily: "var(--font-mono)" }}>
          A brand house for meaning-making tools
        </p>
        <h1
          className="text-5xl md:text-7xl font-semibold mb-6 leading-tight"
          style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}
        >
          Project Parallax
        </h1>
        <p className="text-lg md:text-xl max-w-xl mx-auto opacity-70 leading-relaxed mb-12">
          We build tools that offer multiple perspectives — across wisdom traditions, across systems, across time — so that every person can find what resonates with them.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-md text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: "var(--brand)", color: "#fff" }}
        >
          Enter Prismarium
        </Link>
      </section>

      {/* Products */}
      <section className="px-6 pb-24 max-w-5xl mx-auto w-full">
        <div className="grid md:grid-cols-3 gap-6">

          {/* Prismarium — live */}
          <div
            className="rounded-xl p-7 flex flex-col gap-4 border"
            style={{ borderColor: "var(--brand)", background: "rgba(29, 72, 123, 0.08)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: "var(--brand-300)", fontFamily: "var(--font-mono)" }}
              >
                Live now
              </span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--status-success)" }}
                title="Live"
              />
            </div>
            <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Prismarium
            </h2>
            <p className="text-sm opacity-65 leading-relaxed flex-1">
              A multi-lens library and knowledge network. Explore sacred texts and wisdom traditions through seven analytical lenses — each illuminating something the others cannot.
            </p>
            <Link
              href="/register"
              className="mt-2 text-sm font-medium hover:underline"
              style={{ color: "var(--accent-brand)" }}
            >
              Explore Prismarium →
            </Link>
          </div>

          {/* Stelloquy — coming soon */}
          <div
            className="rounded-xl p-7 flex flex-col gap-4 border"
            style={{ borderColor: "var(--glass-border-color)", background: "rgba(240, 237, 232, 0.03)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs tracking-widest uppercase opacity-50"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Coming soon
              </span>
              <span
                className="w-2 h-2 rounded-full opacity-40"
                style={{ background: "var(--foreground)" }}
                title="Coming soon"
              />
            </div>
            <h2 className="text-2xl font-semibold opacity-70" style={{ fontFamily: "var(--font-serif)" }}>
              Stelloquy
            </h2>
            <p className="text-sm opacity-45 leading-relaxed flex-1">
              A second voice in the conversation. More details will be shared when the time is right.
            </p>
          </div>

          {/* Kairos — coming soon */}
          <div
            className="rounded-xl p-7 flex flex-col gap-4 border"
            style={{ borderColor: "var(--glass-border-color)", background: "rgba(240, 237, 232, 0.03)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs tracking-widest uppercase opacity-50"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Coming soon
              </span>
              <span
                className="w-2 h-2 rounded-full opacity-40"
                style={{ background: "var(--foreground)" }}
                title="Coming soon"
              />
            </div>
            <h2 className="text-2xl font-semibold opacity-70" style={{ fontFamily: "var(--font-serif)" }}>
              Kairos
            </h2>
            <p className="text-sm opacity-45 leading-relaxed flex-1">
              The right moment for the right question. A different kind of temporal tool is in development.
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-6 border-t text-center" style={{ borderColor: "var(--glass-border-color)" }}>
        <p className="text-xs opacity-40" style={{ fontFamily: "var(--font-mono)" }}>
          © PRISMARIUM // A PROJECT PARALLAX PRODUCT
        </p>
      </footer>
    </div>
  );
}
