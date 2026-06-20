"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp, signIn } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
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

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const rawCallback = searchParams.get("callbackUrl");
  const destination = rawCallback?.startsWith("/") ? rawCallback : "/dashboard";

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    startTransition(async () => {
      const { error: authError } = await signUp.email({
        name,
        email,
        password,
        callbackURL: destination,
      });
      if (authError) {
        setError(authError.message ?? "Could not create account.");
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
    <div className="w-full max-w-[380px]">
      <div className="sticky" style={{ padding: "40px 36px 30px" }}>
        <h1 className="hand text-center" style={{ fontSize: 38, lineHeight: 1 }}>
          join the desk!
        </h1>
        <p className="text-center" style={{ opacity: 0.7, fontSize: 13.5, margin: "6px 0 28px" }}>
          set up your space in a few seconds
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Name */}
          <div style={{ marginBottom: 22 }}>
            <div className="auth-label">Name</div>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="your name..."
              autoComplete="name"
              required
              className="auth-input"
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 22 }}>
            <div className="auth-label">Email</div>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@student.edu"
              autoComplete="email"
              required
              className="auth-input"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24, position: "relative" }}>
            <div className="auth-label">Password</div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="at least 8 characters"
              autoComplete="new-password"
              required
              minLength={8}
              className="auth-input"
              style={{ paddingRight: 28 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-0 bottom-1.5 transition-opacity"
              style={{ opacity: 0.55 }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: "#b5453d", marginBottom: 16 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="btn-ink"
            style={{ display: "flex", margin: "4px auto 0" }}
          >
            {isPending ? "Creating..." : "Sign up"}
          </button>
        </form>

        <div className="flex items-center gap-3" style={{ margin: "22px 0" }}>
          <div className="flex-1 h-px" style={{ background: "rgba(74,63,46,.2)" }} />
          <span style={{ fontSize: 12, opacity: 0.6 }}>or</span>
          <div className="flex-1 h-px" style={{ background: "rgba(74,63,46,.2)" }} />
        </div>

        <button
          onClick={handleGoogle}
          disabled={isGooglePending}
          className="btn-paper-auth"
        >
          <GoogleIcon />
          {isGooglePending ? "Redirecting..." : "Continue with Google"}
        </button>

        <p className="text-center" style={{ fontSize: 13.5, marginTop: 20 }}>
          Have an account?{" "}
          <Link href="/login" style={{ textDecoration: "underline", fontWeight: 600 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}