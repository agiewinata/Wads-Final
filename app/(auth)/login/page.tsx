"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const rawCallback = searchParams.get("callbackUrl");
  // Only allow internal redirects
  const destination = rawCallback?.startsWith("/") ? rawCallback : "/dashboard";

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    startTransition(async () => {
      const { error: authError } = await signIn.email({
        email,
        password,
        callbackURL: destination,
      });
      if (authError) {
        setError(authError.message ?? "Invalid email or password.");
      } else {
        router.push(destination);
      }
    });
  }

  function handleGoogle() {
    startGoogleTransition(async () => {
      await signIn.social({ provider: "google", callbackURL: destination });
    });
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm">
        {/* Clipboard clip */}
        <div
          className="absolute -top-5 left-1/2 -translate-x-1/2 w-16 h-8 bg-white z-10"
          style={{
            border: "4px solid #111",
            borderRadius: "4px 4px 2px 2px",
            boxShadow: "2px 2px 0 #111",
          }}
        />

        {/* Card */}
        <div
          className="bg-white pt-12 pb-10 px-10 relative"
          style={{
            border: "4px solid #111",
            borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
            boxShadow: "6px 8px 0 rgba(0,0,0,0.18)",
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {/* Email */}
            <input
              id="email"
              name="email"
              type="email"
              placeholder="email..."
              autoComplete="email"
              required
              className="w-full bg-transparent text-lg text-zinc-800 placeholder-zinc-400 outline-none pb-1"
              style={{ borderBottom: "2.5px solid #111" }}
            />

            {/* Password */}
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="password..."
                autoComplete="current-password"
                required
                className="w-full bg-transparent text-lg text-zinc-800 placeholder-zinc-400 outline-none pb-1 pr-8"
                style={{ borderBottom: "2.5px solid #111" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 bottom-2 text-zinc-400 hover:text-zinc-700 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 -mt-4 font-medium">{error}</p>
            )}

            {/* Sign up + forgot password links */}
            <div className="flex items-center justify-between -mt-2">
              <p className="text-sm text-zinc-700">
                No account?{" "}
                <Link
                  href={`/signup${rawCallback ? `?callbackUrl=${encodeURIComponent(rawCallback)}` : ""}`}
                  className="underline underline-offset-2 font-medium hover:text-black transition-colors"
                >
                  Sign up
                </Link>
              </p>
              <Link
                href="/forgot-password"
                className="text-sm text-zinc-500 underline underline-offset-2 hover:text-black transition-colors"
              >
                Forgot?
              </Link>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={isPending}
              className="mx-auto px-10 py-2 text-base font-medium text-zinc-900 transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-50"
              style={{
                border: "3px solid #111",
                borderRadius: "4px 6px 4px 6px / 6px 4px 6px 4px",
              }}
            >
              {isPending ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-zinc-300" />
            <span className="text-xs text-zinc-400">or</span>
            <div className="flex-1 h-px bg-zinc-300" />
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={isGooglePending}
            className="w-full flex items-center justify-center gap-3 py-2 text-sm font-medium text-zinc-800 transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-50"
            style={{
              border: "3px solid #111",
              borderRadius: "4px 6px 4px 6px / 6px 4px 6px 4px",
            }}
          >
            <GoogleIcon />
            {isGooglePending ? "Redirecting..." : "Continue with Google"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
