import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#050505] to-black px-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to Home Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-zinc-400 hover:text-amber-500 transition-colors mb-6 group"
        >
          <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-lg font-semibold">Home</span>
        </Link>

        {/* Logo/Title */}
        <div className="mb-8 text-center">
          <div className="mb-6 inline-block relative group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-500 to-cyan-500 opacity-25 group-hover:opacity-50 blur transition duration-500" />
            <div className="relative bg-black rounded-full p-2 ring-1 ring-white/10">
              <svg
                viewBox="0 0 100 100"
                className="h-16 w-16 text-amber-500"
                fill="currentColor"
              >
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" className="opacity-50" />
                <circle cx="50" cy="50" r="30" stroke="url(#gradient)" strokeWidth="1" fill="none" className="animate-[spin_10s_linear_infinite]" />
                <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" fill="none" className="opacity-70" />
                <circle cx="50" cy="50" r="3" fill="currentColor" className="animate-pulse" />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 tracking-tight">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-zinc-400 font-mono tracking-wide">
            ACCESS_TERMINAL &gt; AUTHENTICATE
          </p>
        </div>

        {/* Login Form - Wrapped in Suspense for useSearchParams */}
        <Suspense
          fallback={
            <div className="glass-panel rounded-xl p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
              </div>
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Back to Home */}
        <div className="mt-8 text-center space-y-4">
          <Link
            href="/"
            className="text-xs font-mono text-zinc-500 hover:text-amber-500 transition-colors uppercase tracking-widest flex items-center justify-center gap-2 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Return to Nexus
          </Link>

          {/* Legal Links for Verification */}
          <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/5">
            <Link
              href="/privacy"
              className="text-[10px] font-mono text-zinc-600 hover:text-amber-500/70 transition-colors uppercase tracking-widest"
            >
              Privacy Policy
            </Link>
            <div className="w-1 h-1 rounded-full bg-zinc-800" />
            <Link
              href="/terms"
              className="text-[10px] font-mono text-zinc-600 hover:text-amber-500/70 transition-colors uppercase tracking-widest"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

