"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for error in URL params (e.g., verification failed)
    const urlError = searchParams.get("error");
    if (urlError === "verification_failed") {
      setError("Email verification failed. Please try again or request a new verification email.");
    }
  }, [searchParams]);

  // Redirect when user becomes authenticated
  useEffect(() => {
    if (user && window.location.pathname === "/login") {
      console.log("✅ User authenticated, redirecting to dashboard");
      setLoading(false);
      router.push("/dashboard");
      // Fallback navigation if router.push doesn't work
      setTimeout(() => {
        if (window.location.pathname === "/login") {
          console.log("⚠️ Router navigation timeout - trying window.location");
          window.location.href = "/dashboard";
        }
      }, 500);
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    console.log("🔐 Login attempt started for:", email);

    try {
      console.log("📡 Calling Supabase signInWithPassword...");
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("❌ Login error:", signInError);
        // Check if error is related to email confirmation
        if (signInError.message.includes("Email not confirmed")) {
          console.log("⚠️ Email not confirmed, redirecting to verification page");
          setLoading(false);
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        setError(signInError.message);
        setLoading(false);
        return;
      }

      console.log("✅ Login successful, user data:", data.user?.id);

      if (data.user) {
        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          console.log("⚠️ Email not verified, redirecting to verification page");
          setLoading(false);
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        console.log("✅ Redirecting to dashboard");
        
        // Reset loading state before redirect
        setLoading(false);
        router.push("/dashboard");
        router.refresh();
        
        // Fallback: force hard navigation if router.push doesn't work within 1 second
        setTimeout(() => {
          if (window.location.pathname === "/login") {
            console.log("⚠️ Router navigation timeout - trying window.location");
            window.location.href = "/dashboard";
          }
        }, 1000);
      } else {
        // No user data returned - shouldn't happen but handle it
        console.error("❌ Login succeeded but no user data returned");
        setError("Login succeeded but user data is missing");
        setLoading(false);
      }
    } catch (err) {
      console.error("❌ Unexpected error during login:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
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
          onClick={() => console.log("🖱️ Sign In button clicked")}
          className="w-full rounded-md bg-amber-500 px-4 py-3 font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {/* Forgot Password */}
        <div className="text-center">
          <Link
            href="/forgot-password"
            className="text-sm text-amber-400 transition-colors hover:text-amber-300 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
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
  );
}

