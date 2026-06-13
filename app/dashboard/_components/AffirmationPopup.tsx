"use client";

import { useState, useEffect } from "react";
import { csrfFetch } from "@/lib/csrf-client";

export default function AffirmationPopup() {
  const [open,    setOpen]    = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const today     = new Date().toDateString();
    const lastShown = localStorage.getItem("affirmation-date");
    if (lastShown === today) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
    setLoading(true);

    csrfFetch("/api/ai/assess", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ type: "affirmation" }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { message?: string } | null) => {
        setMessage(data?.message ?? "You're showing up — that already matters. Keep going today.");
      })
      .catch(() => {
        setMessage("You're showing up — that already matters. Keep going today.");
      })
      .finally(() => setLoading(false));
  }, []);

  function dismiss() {
    setOpen(false);
    localStorage.setItem("affirmation-date", new Date().toDateString());
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#fff",
          border: "3px solid #111",
          borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
          boxShadow: "8px 10px 0 rgba(0,0,0,0.18)",
          maxWidth: 400,
          width: "100%",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            borderBottom: "2px solid #e4e4e7",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 800,
              fontStyle: "italic",
              letterSpacing: "-0.02em",
              color: "#111",
              margin: 0,
            }}
          >
            good to see you
          </h2>
          <span style={{ fontSize: 11, color: "#aaa", fontStyle: "italic" }}>
            daily check-in
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", minHeight: 72 }}>
          {loading ? (
            <p style={{ fontSize: 13, color: "#bbb", fontStyle: "italic", margin: 0 }}>
              thinking of something for you…
            </p>
          ) : (
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.75,
                color: "#333",
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {message}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "2px solid #e4e4e7",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={dismiss}
            disabled={loading}
            style={{
              padding: "6px 18px",
              fontSize: 13,
              fontWeight: 700,
              background: "#111",
              color: "#fff",
              border: "2px solid #111",
              borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.4 : 1,
            }}
          >
            thanks
          </button>
        </div>
      </div>
    </div>
  );
}
