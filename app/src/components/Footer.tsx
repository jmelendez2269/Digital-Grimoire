import Link from "next/link";

// Server component - no client-side JavaScript needed
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-zinc-900/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
          {/* About */}
          <div className="flex flex-col">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-100">
              About
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/mission"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Our Mission
                </Link>
              </li>
              <li>
                <Link
                  href="/team"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Team
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="flex flex-col">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-100">
              Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/docs"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/guides"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Guides
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="flex flex-col">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-100">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/license"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  License
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-zinc-800 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 100 100"
                className="h-6 w-6 text-amber-500/50"
                fill="currentColor"
              >
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
                <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
                <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" fill="none" />
                <circle cx="50" cy="50" r="3" fill="currentColor" />
              </svg>
              <p className="text-sm text-zinc-500">
                © {currentYear} Convergence. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

