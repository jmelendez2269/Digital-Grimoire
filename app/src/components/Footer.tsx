import Link from "next/link";

// Server component - no client-side JavaScript needed
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-zinc-900/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* About */}
          <div>
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
          <div>
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
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/api"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  API
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-100">
              Community
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/community"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Forums
                </Link>
              </li>
              <li>
                <Link
                  href="/discord"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Discord
                </Link>
              </li>
              <li>
                <Link
                  href="/contribute"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Contribute
                </Link>
              </li>
              <li>
                <Link
                  href="/guidelines"
                  className="text-sm text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
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
                © {currentYear} Digital Grimoire. All rights reserved.
              </p>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-6">
              <Link
                href="https://github.com/jmelendez2269/Digital-Grimoire"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 transition-colors hover:text-amber-400"
              >
                <span className="sr-only">GitHub</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
              <Link
                href="https://twitter.com/digital-grimoire"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 transition-colors hover:text-amber-400"
              >
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </Link>
              <Link
                href="https://discord.gg/digital-grimoire"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 transition-colors hover:text-amber-400"
              >
                <span className="sr-only">Discord</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

