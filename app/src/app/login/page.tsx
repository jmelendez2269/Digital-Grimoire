"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        router.push("/dashboard");
        router.refresh();
      }
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
          <h1 className="text-3xl font-bold text-amber-100">Welcome Back</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in to your Digital Grimoire
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl backdrop-blur">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-amber-100">
                Email
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
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-amber-100">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                placeholder="••••••••"
              />
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
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {/* Forgot Password */}
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-amber-400 hover:text-amber-300"
              >
                Forgot your password?
              </Link>
            </div>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-zinc-700"></div>
            <span className="px-4 text-sm text-zinc-500">or</span>
            <div className="flex-1 border-t border-zinc-700"></div>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-zinc-400">
              New to Digital Grimoire?{" "}
              <Link
                href="/register"
                className="font-semibold text-amber-400 hover:text-amber-300"
              >
                Create an account
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

