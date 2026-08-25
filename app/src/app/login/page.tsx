import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import PrismAnimation from "@/components/ui/PrismAnimation";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#050505] to-black px-4">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] bg-center" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back to Home Link */}
        <Link
          href="/"
          className="group mb-6 inline-flex items-center gap-2.5 text-zinc-400 transition-colors hover:text-cyan-500"
        >
          <span className="text-lg transition-transform group-hover:-translate-x-1">
            ←
          </span>
          <span className="text-lg font-semibold">Home</span>
        </Link>

        {/* Logo/Title */}
        <div className="mb-8 text-center">
          <PrismAnimation className="mx-auto mb-4 w-36" />
          <h1 className="bg-gradient-to-r from-cyan-300 to-cyan-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm tracking-wide text-zinc-400">
            Sign in to your account
          </p>
        </div>

        {/* Login Form - Wrapped in Suspense for useSearchParams */}
        <Suspense
          fallback={
            <div className="glass-panel rounded-xl p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
              </div>
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Back to Home */}
        <div className="mt-8 space-y-4 text-center">
          <Link
            href="/"
            className="group flex items-center justify-center gap-2 text-xs tracking-widest text-zinc-500 transition-colors hover:text-cyan-500"
          >
            <span className="transition-transform group-hover:-translate-x-1">
              ←
            </span>
            Back to home
          </Link>

          {/* Legal Links for Verification */}
          <div className="flex items-center justify-center gap-4 border-t border-white/5 pt-4">
            <Link
              href="/privacy"
              className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase transition-colors hover:text-cyan-500/70"
            >
              Privacy Policy
            </Link>
            <div className="h-1 w-1 rounded-full bg-zinc-800" />
            <Link
              href="/terms"
              className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase transition-colors hover:text-cyan-500/70"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
