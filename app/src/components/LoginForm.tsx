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

  const isLocalSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1:54321") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("localhost:54321");

  const getLoginErrorMessage = (message: string) => {
    if (message.includes("Invalid login credentials")) {
      if (isLocalSupabase) {
        return "No local account matched that email/password. This dev environment uses a separate local Supabase auth store. Sign up again locally or use Forgot password if the account already exists in this local project.";
      }

      return "The email or password is incorrect.";
    }

    return message;
  };

  useEffect(() => {
    // Check for error in URL params (e.g., verification failed)
    const urlError = searchParams.get("error");
    if (urlError === "verification_failed") {
      setError("Email verification failed. Please try again or request a new verification email.");
    } else if (urlError) {
      setError(urlError);
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
        if (signInError.message.includes("Invalid login credentials")) {
          console.warn("[LoginForm] Invalid login credentials for:", email);
        } else {
          console.error("❌ Login error:", signInError);
        }

        // Check if error is related to email confirmation
        if (signInError.message.includes("Email not confirmed")) {
          console.log("⚠️ Email not confirmed, redirecting to verification page");
          setLoading(false);
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        setError(getLoginErrorMessage(signInError.message));
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

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    console.log("🔐 Google sign-in initiated");

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        console.error("❌ Google OAuth error:", oauthError);
        setError(oauthError.message);
        setLoading(false);
        return;
      }

      // OAuth redirect will happen automatically
      // The callback route will handle the rest
      console.log("✅ Google OAuth redirect initiated");
    } catch (err) {
      console.error("❌ Unexpected error during Google sign-in:", err);
      setError("An unexpected error occurred during Google sign-in");
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 backdrop-blur-xl relative overflow-hidden rounded-2xl border-white/5">
      {/* Top Border Gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Iframe Warning */}
      {typeof window !== 'undefined' && window.self !== window.top && (
        <div className="mb-6 p-4 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs">
          <p className="mb-3 font-semibold">Security Notice</p>
          <p className="mb-3 opacity-80">
            Authentication cannot be completed in this sidebar/frame. Please return to the source.
          </p>
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium tracking-wide rounded transition-colors"
          >
            Open in browser
          </button>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6 relative z-10">
        {/* Email Field */}
        <div className="group">
          <label htmlFor="email" className="block text-xs font-medium text-zinc-400 mb-1.5 tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full rounded bg-black/50 border border-white/10 px-4 py-3 text-cyan-50 placeholder-zinc-700 text-sm focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all group-hover:border-white/20"
              placeholder="email@example.com"
            />
            <div className="absolute inset-0 rounded pointer-events-none border border-white/5 group-hover:border-white/10 transition-colors" />
          </div>
        </div>

        {/* Password Field */}
        <div className="group">
          <label htmlFor="password" className="block text-xs font-medium text-zinc-400 mb-1.5 tracking-wider">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full rounded bg-black/50 border border-white/10 px-4 py-3 text-cyan-50 placeholder-zinc-700 text-sm focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all group-hover:border-white/20"
              placeholder="••••••••"
            />
            <div className="absolute inset-0 rounded pointer-events-none border border-white/5 group-hover:border-white/10 transition-colors" />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-mono text-red-400 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            ERROR: {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          onClick={() => console.log("🖱️ Sign In button clicked")}
          className="relative w-full overflow-hidden rounded bg-cyan-600 px-4 py-3 text-sm font-semibold text-white tracking-wide hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 transition-all group"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <span className="animate-spin text-lg">⟳</span> Signing in...
              </>
            ) : (
              <>
                Sign In <span className="group-hover:translate-x-1 transition-transform">→</span>
              </>
            )}
          </span>
          {/* Shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </button>

        {/* Forgot Password */}
        <div className="text-center">
          <Link
            href="/forgot-password"
            className="text-xs text-zinc-500 hover:text-cyan-500 transition-colors tracking-wider"
          >
            Forgot password?
          </Link>
        </div>
      </form>

      {/* Divider */}
      <div className="my-8 flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-zinc-800"></div>
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest text-center">Or continue with</span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-zinc-800"></div>
      </div>

      {/* Google Sign-In Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="group relative flex w-full items-center justify-center gap-3 rounded border border-zinc-800 bg-black/30 px-4 py-3 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:text-white hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="tracking-wide text-xs">Sign in with Google</span>
      </button>

      {/* Register Link */}
      <div className="mt-8 text-center">
        <p className="text-xs text-zinc-500">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="text-cyan-500 hover:text-cyan-400 underline decoration-cyan-500/30 hover:decoration-cyan-500 transition-all font-semibold tracking-wider ml-1"
          >
            Sign up
          </Link>
        </p>
      </div>

      {/* Corner Decor */}
      <div className="absolute bottom-0 right-0 p-2 opacity-50">
        <div className="w-2 h-2 border-r border-b border-cyan-500/50"></div>
      </div>
      <div className="absolute top-0 left-0 p-2 opacity-50">
        <div className="w-2 h-2 border-l border-t border-cyan-500/50"></div>
      </div>
    </div>
  );
}

