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
      
      // Get the current URL origin for the redirect
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-block">
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
          <h1 className="text-3xl font-bold text-amber-100">Reset Password</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Enter your email to receive a password reset link
          </p>
        </div>

        {/* Reset Form */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl backdrop-blur">
          {!success ? (
            <form onSubmit={handleResetRequest} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-amber-100">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="scholar@grimoire.com"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  We'll send you a magic link to reset your password
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-amber-500 px-4 py-3 font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-center">
                <div className="mb-3 flex justify-center">
                  <svg
                    className="h-12 w-12 text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-amber-100 mb-2">
                  Check Your Email
                </h3>
                <p className="text-sm text-amber-200/80">
                  If an account exists for <span className="font-semibold">{email}</span>, you'll receive a password reset link shortly.
                </p>
              </div>

              <div className="space-y-3 text-center text-sm text-zinc-400">
                <p>Didn't receive the email?</p>
                <ul className="space-y-1 text-xs text-zinc-500">
                  <li>• Check your spam or junk folder</li>
                  <li>• Ensure you entered the correct email address</li>
                  <li>• Wait a few minutes and try again</li>
                </ul>
              </div>

              {/* Resend Button */}
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
                className="w-full rounded-md border border-zinc-700 px-4 py-3 text-sm font-medium text-amber-100 transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
              >
                Try Another Email
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-zinc-700"></div>
            <span className="px-4 text-sm text-zinc-500">or</span>
            <div className="flex-1 border-t border-zinc-700"></div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-zinc-400">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-semibold text-amber-400 hover:text-amber-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-400"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

