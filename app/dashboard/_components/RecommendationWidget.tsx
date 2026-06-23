"use client";

import { useEffect, useState, useCallback } from "react";
import { csrfFetch } from "@/lib/csrf-client";
import { RefreshCw, Lightbulb } from "lucide-react";

export default function RecommendationWidget() {
  const [recs, setRecs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await csrfFetch("/api/ai/recommendations", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setRecs(json.recommendations ?? []);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecs();
  }, [fetchRecs]);

  return (
    <div className="paper h-full w-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center" style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center" style={{ width: 30, height: 30, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent-text)" }}>
            <Lightbulb size={17} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-faint)" }}>
              AI powered
            </div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", lineHeight: 1 }}>
              For you today
            </h2>
          </div>
        </div>
        <button onClick={fetchRecs} disabled={loading} className="btn-paper" style={{ padding: "7px 12px", fontSize: 13, opacity: loading ? .5 : 1 }}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          {loading ? "" : "Refresh"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: "14px 20px 16px" }}>
        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 56, background: "var(--paper-2)", borderRadius: 10, opacity: 1 - i * 0.18 }} />
            ))}
            <p style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic", marginTop: 4 }}>Generating recommendations…</p>
          </div>
        ) : recs.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-faint)", fontStyle: "italic" }}>No recommendations available.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {recs.slice(0, 5).map((rec, i) => (
              <div key={i} className="flex items-start gap-3"
                style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
                <span className="grid place-items-center"
                  style={{ flexShrink: 0, width: 22, height: 22, background: "var(--accent)", color: "#fff", borderRadius: "50%", fontSize: 11, fontWeight: 600, marginTop: 1 }}>
                  {i + 1}
                </span>
                <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, margin: 0 }}>{rec}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}