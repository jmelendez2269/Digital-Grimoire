"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: username,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Redirect to email verification page
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    console.log("🔐 Google sign-in initiated");

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
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
      console.log("✅ Google OAuth redirect initiated");
    } catch (err) {
      console.error("❌ Unexpected error during Google sign-in:", err);
      setError("An unexpected error occurred during Google sign-in");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#050505] to-black px-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
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
                <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
                <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" fill="none" className="opacity-70" />
                <circle cx="50" cy="50" r="3" fill="currentColor" className="animate-pulse" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 tracking-tight">
            Join Project Parallax
          </h1>
          <p className="mt-2 text-sm text-zinc-400 font-mono tracking-wide">
            INITIATE_NEW_PROTOCOL &gt; CREATE_USER
          </p>
        </div>

        {/* Register Form */}
        <div className="glass-panel p-8 backdrop-blur-xl relative overflow-hidden rounded-2xl border-white/5">
          {/* Top Border Gradient */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

          <form onSubmit={handleRegister} className="space-y-5 relative z-10">
            {/* Username Field */}
            <div className="group">
              <label htmlFor="username" className="block text-xs font-mono text-amber-500/70 mb-1.5 uppercase tracking-wider">
                User_Handle (Username)
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  className="block w-full rounded bg-black/50 border border-white/10 px-4 py-3 text-amber-100 placeholder-zinc-700 font-mono text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all group-hover:border-white/20"
                  placeholder="mystic_scholar"
                />
                <div className="absolute inset-0 rounded pointer-events-none border border-white/5 group-hover:border-white/10 transition-colors" />
              </div>
            </div>

            {/* Email Field */}
            <div className="group">
              <label htmlFor="email" className="block text-xs font-mono text-amber-500/70 mb-1.5 uppercase tracking-wider">
                Comms_Link (Email)
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full rounded bg-black/50 border border-white/10 px-4 py-3 text-amber-100 placeholder-zinc-700 font-mono text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all group-hover:border-white/20"
                  placeholder="scholar@projectparallax.io"
                />
                <div className="absolute inset-0 rounded pointer-events-none border border-white/5 group-hover:border-white/10 transition-colors" />
              </div>
            </div>

            {/* Password Field */}
            <div className="group">
              <label htmlFor="password" className="block text-xs font-mono text-amber-500/70 mb-1.5 uppercase tracking-wider">
                Access_Code (Password)
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="block w-full rounded bg-black/50 border border-white/10 px-4 py-3 text-amber-100 placeholder-zinc-700 font-mono text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all group-hover:border-white/20"
                  placeholder="••••••••"
                />
                <div className="absolute inset-0 rounded pointer-events-none border border-white/5 group-hover:border-white/10 transition-colors" />
              </div>
              <p className="mt-1 text-[10px] text-zinc-600 font-mono text-right">
                MIN_LENGTH: 8_CHARS
              </p>
            </div>

            {/* Confirm Password Field */}
            <div className="group">
              <label htmlFor="confirmPassword" className="block text-xs font-mono text-amber-500/70 mb-1.5 uppercase tracking-wider">
                Verify_Code (Confirm)
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="block w-full rounded bg-black/50 border border-white/10 px-4 py-3 text-amber-100 placeholder-zinc-700 font-mono text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all group-hover:border-white/20"
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
              className="relative w-full overflow-hidden rounded bg-amber-500 px-4 py-3 text-sm font-bold text-black uppercase tracking-wider hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="animate-spin text-lg">⟳</span> PROCESSING...
                  </>
                ) : (
                  <>
                    ESTABLISH_LINK <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </>
                )}
              </span>
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </button>

            {/* Terms */}
            <p className="text-center text-[10px] text-zinc-500 font-mono">
              BY_EXECUTING, YOU_AGREE_TO{" "}
              <Link href="/terms" className="text-amber-500/70 hover:text-amber-400 underline decoration-amber-500/30">
                TERMS
              </Link>{" "}
              &{" "}
              <Link href="/privacy" className="text-amber-500/70 hover:text-amber-400 underline decoration-amber-500/30">
                PRIVACY_PROTOCOLS
              </Link>
            </p>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-zinc-800"></div>
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Alt_Protocol</span>
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
            <span className="font-mono tracking-wide text-xs">GOOGLE_AUTH</span>
          </button>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-500 font-mono">
              EXISTING_ENTITY?{" "}
              <Link
                href="/login"
                className="text-amber-500 hover:text-amber-400 underline decoration-amber-500/30 hover:decoration-amber-500 transition-all font-bold tracking-wider ml-1"
              >
                ACCESS_TERMINAL
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-xs font-mono text-zinc-500 hover:text-amber-500 transition-colors uppercase tracking-widest flex items-center justify-center gap-2 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            ABORT_PROTOCOL
          </Link>
        </div>
      </div>
    </div>
  );
}

