"use client";

import { useEffect, useState, useCallback } from "react";
import { csrfFetch } from "@/lib/csrf-client";

const IRREGULAR = "6px 8px 5px 7px / 7px 5px 8px 6px";
const CARD_IRR  = "4px 6px 4px 6px / 6px 4px 6px 4px";

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
    fetchRecs();
  }, [fetchRecs]);

  return (
    <div
      className="bg-white h-full w-full flex flex-col overflow-hidden"
      style={{
        border: "3px solid #111",
        borderRadius: IRREGULAR,
        boxShadow: "6px 8px 0 rgba(0,0,0,0.12)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px 12px",
          borderBottom: "2px solid #f4f4f5",
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#a1a1aa",
              marginBottom: 2,
            }}
          >
            AI Powered
          </div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              fontStyle: "italic",
              letterSpacing: "-0.03em",
              color: "#111",
              lineHeight: 1,
            }}
          >
            Recommendations
          </h2>
        </div>
        <button
          onClick={fetchRecs}
          disabled={loading}
          style={{
            fontSize: 14,
            fontWeight: 700,
            padding: "6px 12px",
            background: "white",
            border: "2px solid #e4e4e7",
            borderRadius: CARD_IRR,
            cursor: loading ? "not-allowed" : "pointer",
            color: loading ? "#a1a1aa" : "#111",
            transition: "border-color 0.12s",
          }}
        >
          {loading ? "···" : "↻ Refresh"}
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 16px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 52,
                  background: "#f4f4f5",
                  borderRadius: 6,
                  animation: "pulse 1.5s ease-in-out infinite",
                  opacity: 1 - i * 0.15,
                }}
              />
            ))}
            <p style={{ fontSize: 12, color: "#a1a1aa", fontStyle: "italic", marginTop: 4 }}>
              Generating recommendations…
            </p>
          </div>
        ) : recs.length === 0 ? (
          <p style={{ fontSize: 13, color: "#a1a1aa", fontStyle: "italic" }}>
            No recommendations available.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recs.slice(0, 5).map((rec, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 14px",
                  background: "#fafafa",
                  border: "1.5px solid #e4e4e7",
                  borderRadius: CARD_IRR,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    background: "#111",
                    color: "white",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>
                <p
                  style={{
                    fontSize: 13,
                    color: "#3f3f46",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {rec}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
