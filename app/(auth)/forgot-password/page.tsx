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
    <div className="w-full max-w-[380px]">
      <div className="sticky" style={{ padding: "40px 36px 30px" }}>
        {sent ? (
          <div className="flex flex-col gap-5 text-center">
            <h1 className="hand" style={{ fontSize: 32, lineHeight: 1 }}>
              check your inbox!
            </h1>
            <p style={{ fontSize: 13.5, opacity: 0.75 }}>
              If an account exists for that address, a reset link has been sent.
            </p>

            {devResetUrl && (
              <div
                className="text-left"
                style={{
                  padding: 12,
                  fontSize: 12,
                  background: "rgba(255,255,255,.4)",
                  border: "2px dashed rgba(74,63,46,.4)",
                  borderRadius: 6,
                }}
              >
                <p className="font-semibold" style={{ opacity: 0.7, marginBottom: 4 }}>
                  DEV — reset link:
                </p>
                <a href={devResetUrl} className="break-all" style={{ textDecoration: "underline" }}>
                  {devResetUrl}
                </a>
              </div>
            )}

            <Link href="/login" className="mx-auto" style={{ fontSize: 13.5, textDecoration: "underline" }}>
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="hand text-center" style={{ fontSize: 34, lineHeight: 1 }}>
              forgot something?
            </h1>
            <p className="text-center" style={{ opacity: 0.7, fontSize: 13.5, margin: "6px 0 28px" }}>
              enter your email and we&apos;ll send you a reset link
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col">
              <div style={{ marginBottom: 24 }}>
                <div className="auth-label">Email</div>
                <input
                  name="email"
                  type="email"
                  placeholder="you@student.edu"
                  autoComplete="email"
                  required
                  className="auth-input"
                />
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
                {isPending ? "Sending..." : "Send link"}
              </button>
            </form>

            <p className="text-center" style={{ fontSize: 13.5, marginTop: 22 }}>
              Remembered it?{" "}
              <Link href="/login" style={{ textDecoration: "underline", fontWeight: 600 }}>
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}