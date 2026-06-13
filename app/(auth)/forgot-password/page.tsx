"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { devGetResetToken } from "./actions";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;

    startTransition(async () => {
      const baseUrl = window.location.origin;
      const { error: authError } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${baseUrl}/reset-password`,
      });
      if (authError) {
        setError(authError.message ?? "Something went wrong. Please try again.");
        return;
      }
      setSent(true);

      // Dev only: fetch the token directly from DB so we can show the link on-screen
      if (process.env.NODE_ENV === "development") {
        const token = await devGetResetToken(email);
        if (token) setDevResetUrl(`${baseUrl}/reset-password?token=${token}`);
      }
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
          {sent ? (
            <div className="flex flex-col gap-6 text-center">
              <p className="text-zinc-800 font-medium">Check your email</p>
              <p className="text-sm text-zinc-500">
                If an account exists for that address, a reset link has been
                sent.
              </p>

              {/* Dev-only: show reset link directly on page */}
              {devResetUrl && (
                <div
                  className="text-left p-3 text-xs bg-zinc-50"
                  style={{ border: "2px dashed #aaa", borderRadius: 4 }}
                >
                  <p className="font-semibold text-zinc-500 mb-1">DEV — reset link:</p>
                  <a
                    href={devResetUrl}
                    className="break-all text-blue-600 underline"
                  >
                    {devResetUrl}
                  </a>
                </div>
              )}

              <Link
                href="/login"
                className="mx-auto text-sm underline underline-offset-2 text-zinc-600 hover:text-black transition-colors"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              <p className="text-sm text-zinc-500 -mb-2">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <input
                name="email"
                type="email"
                placeholder="email..."
                autoComplete="email"
                required
                className="w-full bg-transparent text-lg text-zinc-800 placeholder-zinc-400 outline-none pb-1"
                style={{ borderBottom: "2.5px solid #111" }}
              />

              {error && (
                <p className="text-sm text-red-600 -mt-4 font-medium">{error}</p>
              )}

              <p className="text-sm text-zinc-700 -mt-2">
                Remembered it?{" "}
                <Link
                  href="/login"
                  className="underline underline-offset-2 font-medium hover:text-black transition-colors"
                >
                  Log in
                </Link>
              </p>

              <button
                type="submit"
                disabled={isPending}
                className="mx-auto px-10 py-2 text-base font-medium text-zinc-900 transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-50"
                style={{
                  border: "3px solid #111",
                  borderRadius: "4px 6px 4px 6px / 6px 4px 6px 4px",
                }}
              >
                {isPending ? "Sending..." : "Send link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}