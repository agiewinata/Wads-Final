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
    <div className="app-overlay">
      <div className="paper" style={{ maxWidth: 400, width: "100%", overflow: "hidden", padding: 0 }}>
        <div
          style={{
            borderBottom: "1px solid var(--line)",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 className="app-modal-title" style={{ fontSize: 17 }}>
            Good to see you
          </h2>
          <span className="app-modal-subtle">daily check-in</span>
        </div>

        <div style={{ padding: "18px 22px", minHeight: 72 }}>
          {loading ? (
            <div className="app-message">Thinking of something for you…</div>
          ) : (
            <div className="app-message app-message-success">{message}</div>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--line)",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button onClick={dismiss} className="btn-ink">
            {loading ? "Skip" : "Thanks"}
          </button>
        </div>
      </div>
    </div>
  );
}
