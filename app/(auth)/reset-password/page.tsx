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
      <div className="flex flex-col gap-6 text-center">
        <p className="text-sm text-red-600 font-medium">
          Invalid or missing reset token.
        </p>
        <Link
          href="/forgot-password"
          className="mx-auto text-sm underline underline-offset-2 text-zinc-600 hover:text-black transition-colors"
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <p className="text-sm text-zinc-500 -mb-2">Enter your new password.</p>

      <div className="relative">
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="new password..."
          autoComplete="new-password"
          required
          minLength={8}
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

      {error && (
        <p className="text-sm text-red-600 -mt-4 font-medium">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mx-auto px-10 py-2 text-base font-medium text-zinc-900 transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-50"
        style={{
          border: "3px solid #111",
          borderRadius: "4px 6px 4px 6px / 6px 4px 6px 4px",
        }}
      >
        {isPending ? "Saving..." : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={<p className="text-sm text-zinc-400">Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}