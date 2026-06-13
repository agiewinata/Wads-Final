"use client";

import { useEffect, useState, useCallback } from "react";
import { csrfFetch } from "@/lib/csrf-client";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type RangeKey = "7d" | "14d" | "30d" | "90d" | "180d";

interface AnalyticsData {
  total: number;
  completed: number;
  overdue: number;
  active: number;
  dueSoon: number;
  completionRate: number;
  byCategory: { name: string; total: number; completed: number; incomplete: number }[];
  byPriority: { priority: string; total: number; completed: number; incomplete: number }[];
  trend: { date: string; completed: number; created: number; overdue: number }[];
}

// ── Range options ─────────────────────────────────────────────────────────────

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d",   label: "Last 7 days"   },
  { key: "14d",  label: "Last 2 weeks"  },
  { key: "30d",  label: "Last month"    },
  { key: "90d",  label: "Last 3 months" },
  { key: "180d", label: "Last 6 months" },
];

// ── Design tokens ─────────────────────────────────────────────────────────────

const COLORS = {
  completed: "#111111",
  overdue:   "#888888",
  active:    "#d4d4d8",
};

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "3px solid #111",
  borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
  boxShadow: "5px 7px 0 rgba(0,0,0,0.13)",
  padding: "20px 24px",
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div style={{ ...CARD, padding: "18px 22px", minWidth: 0 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#999", marginBottom: 6 }}>
        {label.toUpperCase()}
      </p>
      <p style={{ fontSize: 36, fontWeight: 800, color: "#111", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>{sub}</p>}
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "2px solid #111", borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
      padding: "8px 14px", boxShadow: "3px 4px 0 rgba(0,0,0,0.12)", fontSize: 12,
    }}>
      {label && <p style={{ fontWeight: 700, marginBottom: 4, color: "#111" }}>{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Range dropdown ────────────────────────────────────────────────────────────

function RangeDropdown({ value, onChange }: { value: RangeKey; onChange: (r: RangeKey) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RangeKey)}
      style={{
        fontSize: 11, fontWeight: 700,
        padding: "4px 10px",
        background: "#fff",
        color: "#111",
        border: "2px solid #333",
        borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
        cursor: "pointer",
        outline: "none",
        appearance: "none",
        paddingRight: 24,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23333'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
      }}
    >
      {RANGE_OPTIONS.map((o) => (
        <option key={o.key} value={o.key}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data,       setData]       = useState<AnalyticsData | null>(null);
  const [recs,       setRecs]       = useState<string[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [range,      setRange]      = useState<RangeKey>("7d");

  const fetchData = useCallback(async (r: RangeKey) => {
    setLoading(true);
    const res = await fetch(`/api/analytics?range=${r}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  const fetchRecs = useCallback(async () => {
    setRecLoading(true);
    const res = await csrfFetch("/api/ai/recommendations", { method: "POST" });
    if (res.ok) {
      const json = await res.json() as { recommendations?: string[] };
      setRecs(json.recommendations ?? []);
    }
    setRecLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(range); }, [fetchData, range]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRecs(); },     [fetchRecs]);

  const handleRangeChange = (r: RangeKey) => {
    setRange(r);
  };

  if (loading || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#aaa", fontSize: 14 }}>
        Loading analytics…
      </div>
    );
  }

  const statusPie = [
    { name: "Completed", value: data.completed, color: COLORS.completed },
    { name: "Overdue",   value: data.overdue,   color: COLORS.overdue   },
    { name: "Active",    value: data.active,     color: COLORS.active    },
  ].filter((d) => d.value > 0);

  const currentRangeLabel = RANGE_OPTIONS.find((o) => o.key === range)?.label ?? "";

  // Show every nth label so the x-axis doesn't crowd
  const tickInterval =
    range === "180d" ? 3 :
    range === "90d"  ? 1 :
    range === "30d"  ? 4 :
    range === "14d"  ? 1 :
    0; // 7d — show all 7

  return (
    <div className="w-full flex flex-col gap-6">

      {/* ── Title ── */}
      <h1 style={{
        fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em",
        color: "#111", fontStyle: "italic", lineHeight: 1, paddingLeft: 2,
      }}>
        analytics
      </h1>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
        <StatCard label="Total Tasks" value={data.total}         sub="all time" />
        <StatCard label="Completed"   value={data.completed}     sub={`${data.completionRate}% rate`} />
        <StatCard label="Overdue"     value={data.overdue}       sub="need attention" />
        <StatCard label="Active"      value={data.active}        sub="in progress" />
        <StatCard label="Due Soon"    value={data.dueSoon}       sub="next 3 days" />
      </div>

      {/* ── Charts row 1: Pie + Trend ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>

        {/* Status breakdown */}
        <div style={CARD}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", color: "#555", marginBottom: 16 }}>
            TASK STATUS
          </p>
          {data.total === 0 ? (
            <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No tasks yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusPie}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value"
                >
                  {statusPie.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="#111" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle" iconSize={10}
                  formatter={(v) => <span style={{ fontSize: 12, color: "#333" }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Performance trend */}
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", color: "#555" }}>
              PERFORMANCE — {currentRangeLabel.toUpperCase()}
            </p>
            <RangeDropdown value={range} onChange={handleRangeChange} />
          </div>

          {loading ? (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13 }}>
              Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#999" }}
                  tickLine={false}
                  interval={tickInterval}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend formatter={(v) => <span style={{ fontSize: 12, color: "#333" }}>{v}</span>} />
                <Line
                  type="monotone" dataKey="completed" name="Completed"
                  stroke={COLORS.completed} strokeWidth={2.5}
                  dot={data.trend.length <= 30 ? { r: 4, fill: "#111", stroke: "#fff", strokeWidth: 2 } : false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone" dataKey="created" name="Created"
                  stroke="#aaa" strokeWidth={2} strokeDasharray="4 2"
                  dot={data.trend.length <= 30 ? { r: 3, fill: "#aaa", stroke: "#fff", strokeWidth: 1.5 } : false}
                />
                <Line
                  type="monotone" dataKey="overdue" name="Overdue"
                  stroke="#888" strokeWidth={2} strokeDasharray="2 3"
                  dot={data.trend.length <= 30 ? { r: 3, fill: "#888", stroke: "#fff", strokeWidth: 1.5 } : false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Charts row 2: By category + By priority ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* By category */}
        <div style={CARD}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", color: "#555", marginBottom: 16 }}>
            BY CATEGORY
          </p>
          {data.byCategory.length === 0 ? (
            <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No categories</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byCategory} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: "#555" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend formatter={(v) => <span style={{ fontSize: 12, color: "#333" }}>{v}</span>} />
                <Bar dataKey="completed"  name="Completed"  stackId="a" fill={COLORS.completed} />
                <Bar dataKey="incomplete" name="Incomplete" stackId="a" fill={COLORS.active} stroke="#bbb" strokeWidth={1} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By priority */}
        <div style={CARD}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", color: "#555", marginBottom: 16 }}>
            BY PRIORITY
          </p>
          {data.byPriority.length === 0 ? (
            <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No prioritised tasks</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byPriority} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="priority" tick={{ fontSize: 11, fill: "#555" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend formatter={(v) => <span style={{ fontSize: 12, color: "#333" }}>{v}</span>} />
                <Bar dataKey="completed"  name="Completed"  stackId="a" fill={COLORS.completed} />
                <Bar dataKey="incomplete" name="Incomplete" stackId="a" fill={COLORS.active} stroke="#bbb" strokeWidth={1} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── AI Recommendations ── */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", color: "#555" }}>
            RECOMMENDATIONS
          </p>
          <button
            onClick={fetchRecs}
            disabled={recLoading}
            style={{
              fontSize: 11, fontWeight: 700, padding: "4px 12px",
              background: "transparent", color: recLoading ? "#aaa" : "#111",
              border: `2px solid ${recLoading ? "#ddd" : "#333"}`,
              borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
              cursor: recLoading ? "default" : "pointer",
            }}
          >
            {recLoading ? "thinking…" : "refresh"}
          </button>
        </div>

        {recLoading ? (
          <p style={{ color: "#aaa", fontSize: 13 }}>Generating recommendations…</p>
        ) : recs.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: 13 }}>No recommendations available.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {recs.map((rec, i) => (
              <li
                key={i}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "10px 14px",
                  background: "#f9f9f9",
                  border: "1.5px solid #e4e4e7",
                  borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#111", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 13, color: "#333", lineHeight: 1.6 }}>{rec}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
