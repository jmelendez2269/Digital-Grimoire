import Link from "next/link";

// Server component - no client-side JavaScript needed
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-zinc-900/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          {/* About */}
          <div className="flex flex-col">
            <h3 className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-amber-100">
              About
            </h3>
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/about"
                  className="text-xs text-zinc-400 transition-colors hover:text-amber-300"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/mission"
                  className="text-xs text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Our Mission
                </Link>
              </li>
              <li>
                <Link
                  href="/team"
                  className="text-xs text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Team
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="flex flex-col">
            <h3 className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-amber-100">
              Resources
            </h3>
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/docs"
                  className="text-xs text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/guides"
                  className="text-xs text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Guides
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="flex flex-col">
            <h3 className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-amber-100">
              Legal
            </h3>
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/privacy"
                  className="text-xs text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-xs text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-xs text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/license"
                  className="text-xs text-zinc-400 transition-colors hover:text-amber-300"
                >
                  License
                </Link>
              </li>
              <li>
                <Link
                  href="/ai-disclaimer"
                  className="text-xs text-zinc-400 transition-colors hover:text-amber-300"
                >
                  AI Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-2 border-t border-zinc-800 pt-2">
          <div className="flex items-center justify-center">
            <p className="text-xs text-zinc-500">
              © {currentYear} Convergence. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

