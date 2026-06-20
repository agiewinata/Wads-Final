"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

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

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!token) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <h1 className="hand" style={{ fontSize: 32, lineHeight: 1 }}>
          oops, broken link
        </h1>
        <p className="text-sm font-medium" style={{ color: "#b5453d" }}>
          Invalid or missing reset token.
        </p>
        <Link
          href="/forgot-password"
          className="mx-auto"
          style={{ fontSize: 13.5, textDecoration: "underline" }}
        >
          Request a new link
        </Link>
      </div>
    );
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const newPassword = form.get("password") as string;

    startTransition(async () => {
      const { error: authError } = await authClient.resetPassword({
        newPassword,
        token: token!,
      });
      if (authError) {
        setError(authError.message ?? "Could not reset password.");
      } else {
        router.push("/login");
      }
    });
  }

  return (
    <>
      <h1 className="hand text-center" style={{ fontSize: 34, lineHeight: 1 }}>
        new password!
      </h1>
      <p className="text-center" style={{ opacity: 0.7, fontSize: 13.5, margin: "6px 0 28px" }}>
        pick something you&apos;ll remember this time
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div style={{ marginBottom: 24, position: "relative" }}>
          <div className="auth-label">New password</div>
          <input
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
          {isPending ? "Saving..." : "Reset password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-[380px]">
      <div className="sticky" style={{ padding: "40px 36px 30px" }}>
        <Suspense fallback={<p style={{ fontSize: 13.5, opacity: 0.6 }}>Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}