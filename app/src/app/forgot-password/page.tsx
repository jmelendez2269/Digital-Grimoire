"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        setError("Configuration error. Please contact support.");
        setLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        const isRateLimit =
          resetError.message?.toLowerCase().includes("rate limit") ||
          resetError.message?.toLowerCase().includes("rate_limit");

        if (isRateLimit) {
          setError(
            "Email rate limit exceeded. Please wait 1 hour before requesting another password reset link. This limit helps protect against spam.",
          );
        } else {
          setError(resetError.message);
        }

        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#050505] to-black px-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.32em] text-cyan-400/80">
            Prismarium
          </p>
          <div className="mb-4 inline-block">
            <svg
              className="h-16 w-16 text-cyan-500/50"
              fill="currentColor"
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="50" cy="50" r="3" fill="currentColor" />
            </svg>
          </div>
          <h1 className="bg-gradient-to-r from-amber-300 via-amber-500 to-cyan-400 bg-clip-text text-3xl font-bold text-transparent">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Enter the email tied to your Prismarium account and we&apos;ll send you a secure reset link.
          </p>
        </div>

        <div className="glass-panel rounded-2xl border-white/5 p-8 shadow-2xl backdrop-blur-xl">
          {!success ? (
            <form className="space-y-6" onSubmit={handleResetRequest}>
              <div>
                <label className="block text-sm font-medium text-amber-100" htmlFor="email">
                  Email address
                </label>
                <input
                  className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
                <p className="mt-2 text-xs text-zinc-500">
                  We&apos;ll email you a link to choose a new password.
                </p>
              </div>

              {error && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  <div className="flex items-start gap-2">
                    <svg
                      className="mt-0.5 h-5 w-5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="font-medium">{error}</p>
                      {error.toLowerCase().includes("rate limit") && (
                        <p className="mt-2 text-xs text-red-300/80">
                          Tip: If you&apos;re already signed in, you may not need to reset your password. Try refreshing the page or contact support if you need immediate assistance.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                className="w-full rounded-md bg-amber-500 px-4 py-3 font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
                type="submit"
              >
                {loading ? "Sending..." : "Send reset email"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-center">
                <div className="mb-3 flex justify-center">
                  <svg
                    className="h-12 w-12 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-amber-100">Check your inbox</h3>
                <p className="text-sm text-amber-200/80">
                  If an account exists for <span className="font-semibold">{email}</span>, we&apos;ll send a password reset link shortly.
                </p>
              </div>

              <div className="space-y-3 text-center text-sm text-zinc-400">
                <p>Didn&apos;t receive the email?</p>
                <ul className="space-y-1 text-xs text-zinc-500">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Wait a few minutes and try again</li>
                </ul>
              </div>

              <button
                className="w-full rounded-md border border-zinc-700 px-4 py-3 text-sm font-medium text-amber-100 transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
              >
                Try another email
              </button>
            </div>
          )}

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-zinc-700" />
            <span className="px-4 text-sm text-zinc-500">or</span>
            <div className="flex-1 border-t border-zinc-700" />
          </div>

          <div className="text-center">
            <p className="text-sm text-zinc-400">
              Remember your password?{" "}
              <Link className="font-semibold text-amber-400 hover:text-amber-300" href="/login">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link className="text-sm text-zinc-500 hover:text-zinc-400" href="/">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
