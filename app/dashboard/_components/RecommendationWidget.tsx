"use client";

import { useEffect, useState, useCallback } from "react";
import { csrfFetch } from "@/lib/csrf-client";

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "3px solid #111",
  borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
  boxShadow: "5px 7px 0 rgba(0,0,0,0.13)",
  padding: "16px 20px",
};

export default function RecommendationWidget() {
  const [recs, setRecs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecs = useCallback(async () => {
    setLoading(true);

    try {
      const res = await csrfFetch("/api/ai/recommendations", {
        method: "POST",
      });

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
    <div style={CARD}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: "#555",
            margin: 0,
          }}
        >
          RECOMMENDATIONS
        </h3>

        <button
          onClick={fetchRecs}
          disabled={loading}
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            background: "transparent",
            border: "2px solid #333",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {loading ? "..." : "↻"}
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#999", fontSize: 13 }}>
          Generating recommendations...
        </p>
      ) : recs.length === 0 ? (
        <p style={{ color: "#999", fontSize: 13 }}>
          No recommendations available.
        </p>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {recs.slice(0, 3).map((rec, i) => (
            <li
              key={i}
              style={{
                padding: "10px",
                background: "#f8f8f8",
                border: "1px solid #e4e4e7",
                borderRadius: "4px",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {rec}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}