"use client";

import { useEffect, useState, useCallback } from "react";
import { csrfFetch } from "@/lib/csrf-client";
import { Responsive, useContainerWidth } from "react-grid-layout";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  BarChart3,
  BookOpen,
  Lightbulb,
  RefreshCw,
  PieChart as PieChartIcon,
} from "lucide-react";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

type RangeKey = "7d" | "30d" | "90d";

interface AnalyticsData {
  total: number;
  completed: number;
  overdue: number;
  active: number;
  dueSoon: number;
  completionRate: number;
  byCategory: {
    name: string;
    total: number;
    completed: number;
    incomplete: number;
  }[];
  byPriority: {
    priority: string;
    total: number;
    completed: number;
    incomplete: number;
  }[];
  trend: {
    date: string;
    completed: number;
    created: number;
    overdue: number;
  }[];
}

const RANGES: { key: RangeKey; label: string; sub: string }[] = [
  { key: "7d", label: "Week", sub: "this week" },
  { key: "30d", label: "Month", sub: "this month" },
  { key: "90d", label: "Term", sub: "this term" },
];

const DEFAULT_LAYOUTS = {
  lg: [
    { i: "focus", x: 0, y: 0, w: 6, h: 4 },
    { i: "category", x: 6, y: 0, w: 6, h: 4 },
    { i: "status", x: 0, y: 4, w: 4, h: 4 },
    { i: "priority", x: 4, y: 4, w: 4, h: 4 },
    { i: "recommendations", x: 8, y: 4, w: 4, h: 4 },
  ],
};

const LAYOUT_STORAGE_KEY = "analytics-grid-layouts";

const COLORS = {
  focus: "#4F63C6",
  best: "#F4D867",
  active: "#4F63C6",
  completed: "#78B86F",
  overdue: "#B86B6B",
  streak: "#E59A3B",
  incomplete: "#B86B6B",
};

const CATEGORY_COLORS = [
  { name: "test1", bg: "#f6d1d1", color: "#b5453d", activeBg: "#b5453d" },
  { name: "test2", bg: "#f7dfbc", color: "#b86b18", activeBg: "#b86b18" },
  { name: "test3", bg: "#f5e8a8", color: "#8a6f13", activeBg: "#8a6f13" },
  { name: "test4", bg: "#d9edc8", color: "#4b7f35", activeBg: "#4b7f35" },
  { name: "test5", bg: "#ccebea", color: "#25736f", activeBg: "#25736f" },
  { name: "test6", bg: "#d6e4ff", color: "#3858b8", activeBg: "#3858b8" },
  { name: "test7", bg: "#eadcff", color: "#7c3aed", activeBg: "#7c3aed" },
];

const NONE_CATEGORY_COLOR = {
  bg: "#e5e5e5",
  color: "#6f6f6f",
  activeBg: "#3f3f3f",
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="paper" style={{ padding: "8px 12px", fontSize: 12 }}>
      {label && (
        <p style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>
          {label}
        </p>
      )}

      {payload.map((p) => (
        <p key={p.name} style={{ color: "var(--ink-soft)", margin: "1px 0" }}>
          {p.name}: <strong style={{ color: "var(--ink)" }}>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

function StickyStat({
  bg,
  label,
  value,
  sub,
}: {
  bg: string;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      className="sticky sticky--flat"
      style={{
        padding: "20px 24px",
        borderRadius: 4,
        background: bg,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--note-text)",
          opacity: 0.65,
          marginBottom: 6,
        }}
      >
        {label}
      </p>

      <p
        className="hand"
        style={{
          fontFamily: "var(--font-hand)",
          fontSize: 40,
          fontWeight: 700,
          color: "var(--note-text)",
          lineHeight: 1,
        }}
      >
        {value}
      </p>

      {sub && (
        <p
          style={{
            fontSize: 12,
            color: "var(--note-text)",
            opacity: 0.7,
            marginTop: 6,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function CardHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div
      className="drag-handle flex items-center gap-2.5 cursor-move"
      style={{ marginBottom: 18 }}
    >
      <div
        className="grid place-items-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: "var(--accent-soft)",
          color: "var(--accent-text)",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <h2
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--ink)",
          lineHeight: 1,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

function WidgetCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="paper h-full flex flex-col"
      style={{
        padding: "22px 24px",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {children}
    </div>
  );
}

function formatFocusTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function AnalyticsPage() {
  const { width, containerRef } = useContainerWidth({ initialWidth: 1200 });

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [recs, setRecs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [range, setRange] = useState<RangeKey>("7d");
  const [savedLayouts, setSavedLayouts] = useState(DEFAULT_LAYOUTS);

  useEffect(() => {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);

    if (stored) {
      try {
        setSavedLayouts(JSON.parse(stored));
      } catch {
        setSavedLayouts(DEFAULT_LAYOUTS);
      }
    }
  }, []);

  const fetchData = useCallback(async (r: RangeKey) => {
    setLoading(true);
    const res = await fetch(`/api/analytics?range=${r}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  const fetchRecs = useCallback(async () => {
    setRecLoading(true);

    const res = await csrfFetch("/api/ai/recommendations", {
      method: "POST",
    });

    if (res.ok) {
      const json = (await res.json()) as { recommendations?: string[] };
      setRecs(json.recommendations ?? []);
    }

    setRecLoading(false);
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [fetchData, range]);

  useEffect(() => {
    fetchRecs();
  }, [fetchRecs]);

  const periodSub = RANGES.find((r) => r.key === range)?.sub ?? "this week";

  if (loading || !data) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          color: "var(--ink-faint)",
          fontSize: 14,
        }}
      >
        Loading analytics…
      </div>
    );
  }

  const tickInterval = range === "90d" ? 9 : range === "30d" ? 3 : 0;

  const focusTrend = data.trend.map((d) => ({
    date: d.date,
    minutes: d.completed * 45,
  }));

  const maxFocus = Math.max(0, ...focusTrend.map((d) => d.minutes));
  const totalFocusMinutes = focusTrend.reduce((sum, d) => sum + d.minutes, 0);

  const statusData = [
    { name: "Active", value: data.active, color: COLORS.active },
    { name: "Completed", value: data.completed, color: COLORS.completed },
    { name: "Overdue", value: data.overdue, color: COLORS.overdue },
  ];

  const sortedCategories = [...data.byCategory].sort((a, b) => {
    const aName = a.name ?? "None";
    const bName = b.name ?? "None";

    if (aName === "None") return 1;
    if (bName === "None") return -1;

    const aIndex = CATEGORY_COLORS.findIndex((c) => c.name === aName);
    const bIndex = CATEGORY_COLORS.findIndex((c) => c.name === bName);

    if (aIndex === -1 && bIndex === -1) return aName.localeCompare(bName);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;

    return aIndex - bIndex;
  });

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 16 }}>
        <div>
          <h1
            className="swipe"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              lineHeight: 1,
            }}
          >
            Analytics
          </h1>

          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 10 }}>
            Your study habits {periodSub}
          </p>
        </div>

        <div
          style={{
            display: "inline-flex",
            background: "var(--paper-2)",
            border: "1px solid var(--line)",
            borderRadius: 999,
            padding: 3,
          }}
        >
          {RANGES.map((r) => {
            const active = range === r.key;

            return (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 16px",
                  borderRadius: 999,
                  background: active ? "var(--paper)" : "transparent",
                  color: active ? "var(--ink)" : "var(--ink-soft)",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 18,
          marginTop: 8,
        }}
      >
        <StickyStat
          bg="#F7E589"
          label="Focus time"
          value={formatFocusTime(totalFocusMinutes)}
          sub={`estimated ${periodSub}`}
        />

        <StickyStat
          bg="#F7D9A8"
          label="Streak"
          value={`${Math.min(data.completed, 12)} days`}
          sub="keep it going"
        />

        <StickyStat
          bg="#CFEFC8"
          label="Tasks active"
          value={data.active}
          sub={`${data.dueSoon} due soon · ${data.total} total`}
        />

        <StickyStat
          bg="#DFAAAA"
          label="Tasks overdue"
          value={data.overdue}
          sub="need attention"
        />
      </div>

      <Responsive
        className="layout"
        layouts={savedLayouts}
        width={width}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={96}
        margin={[18, 18]}
        containerPadding={[0, 0]}
        draggableHandle=".drag-handle"
        compactType={null}
        preventCollision={false}
        isBounded={false}
        onLayoutChange={(_, allLayouts) => {
          setSavedLayouts(allLayouts as typeof DEFAULT_LAYOUTS);
          localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts));
        }}
      >
        <div key="focus">
          <WidgetCard>
            <CardHead icon={<BarChart3 size={17} />} title="Focus minutes per day" />

            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={focusTrend}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />

                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
                    tickLine={false}
                    axisLine={false}
                    interval={tickInterval}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--paper-2)" }} />

                  <Bar
                    dataKey="minutes"
                    name="Focus minutes"
                    radius={[7, 7, 0, 0]}
                    maxBarSize={52}
                  >
                    {focusTrend.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.minutes === maxFocus && maxFocus > 0 ? COLORS.best : COLORS.focus}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-4" style={{ marginTop: 12 }}>
              <span
                className="flex items-center gap-1.5"
                style={{ fontSize: 13, color: "var(--ink-soft)" }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 4,
                    background: COLORS.focus,
                  }}
                />
                Focus
              </span>

              <span
                className="flex items-center gap-1.5"
                style={{ fontSize: 13, color: "var(--ink-soft)" }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 4,
                    background: COLORS.best,
                  }}
                />
                Best day
              </span>
            </div>
          </WidgetCard>
        </div>

        <div key="category">
          <WidgetCard>
            <CardHead icon={<BookOpen size={17} />} title="Task by category" />

            <div
              className="flex flex-col"
              style={{
                gap: 16,
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                paddingRight: 6,
                paddingTop: 4,
              }}
            >
              {data.byCategory.length === 0 ? (
                <p
                  style={{
                    color: "var(--ink-faint)",
                    fontSize: 13,
                    textAlign: "center",
                    padding: "48px 0",
                  }}
                >
                  No categories yet
                </p>
              ) : (
                sortedCategories.map((cat) => {
                  const pct =
                    cat.total > 0
                      ? Math.round((cat.completed / cat.total) * 100)
                      : 0;
                  const categoryColor =
                    CATEGORY_COLORS.find((c) => c.name === cat.name) ?? NONE_CATEGORY_COLOR;

                  return (
                    <div key={cat.name}>
                      <div
                        className="flex items-center justify-between"
                        style={{ marginBottom: 7 }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: categoryColor.color,
                          }}
                        >
                          {cat.name}
                        </span>

                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--ink-soft)",
                          }}
                        >
                          {cat.completed}/{cat.total}
                        </span>
                      </div>

                      <div
                        style={{
                          height: 8,
                          borderRadius: 999,
                          background: categoryColor.bg,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: categoryColor.activeBg,
                            borderRadius: 999,
                            transition: "width .3s",
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </WidgetCard>
        </div>

        <div key="status">
          <WidgetCard>
            <CardHead icon={<PieChartIcon size={17} />} title="Task status" />

            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="52%"
                    outerRadius="76%"
                    paddingAngle={4}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>

                  <Tooltip content={<ChartTooltip />} />

                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: 12,
                      color: "var(--ink-soft)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </WidgetCard>
        </div>

        <div key="priority">
          <WidgetCard>
            <CardHead icon={<BarChart3 size={17} />} title="Task by priority" />

            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.byPriority}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />

                  <XAxis
                    dataKey="priority"
                    tick={{ fontSize: 11, fill: "var(--ink-soft)" }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--paper-2)" }} />

                  <Legend
                    wrapperStyle={{
                      fontSize: 12,
                      color: "var(--ink-soft)",
                      paddingTop: 8,
                    }}
                  />

                  <Bar
                    dataKey="completed"
                    name="Completed"
                    stackId="a"
                    fill={COLORS.completed}
                  />

                  <Bar
                    dataKey="incomplete"
                    name="Not completed"
                    stackId="a"
                    fill={COLORS.incomplete}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </WidgetCard>
        </div>

        <div key="recommendations">
          <WidgetCard>
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 18 }}
            >
              <CardHead icon={<Lightbulb size={17} />} title="Recommendations" />

              <button
                onClick={fetchRecs}
                disabled={recLoading}
                className="btn-paper"
                style={{
                  padding: "8px 13px",
                  fontSize: 13,
                  opacity: recLoading ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >
                <RefreshCw size={15} className={recLoading ? "animate-spin" : ""} />
                {recLoading ? "" : "Refresh"}
              </button>
            </div>

            <div
              className="flex flex-col"
              style={{
                gap: 10,
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {recLoading ? (
                <p
                  style={{
                    color: "var(--ink-faint)",
                    fontSize: 13,
                    fontStyle: "italic",
                  }}
                >
                  Generating recommendations…
                </p>
              ) : recs.length === 0 ? (
                <p
                  style={{
                    color: "var(--ink-faint)",
                    fontSize: 13,
                    fontStyle: "italic",
                  }}
                >
                  No recommendations available.
                </p>
              ) : (
                recs.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3"
                    style={{
                      padding: "12px 14px",
                      background: "var(--paper-2)",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                    }}
                  >
                    <span
                      className="grid place-items-center"
                      style={{
                        flexShrink: 0,
                        width: 22,
                        height: 22,
                        background: COLORS.focus,
                        color: "#fff",
                        borderRadius: "50%",
                        fontSize: 11,
                        fontWeight: 600,
                        marginTop: 1,
                      }}
                    >
                      {i + 1}
                    </span>

                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--ink-soft)",
                        lineHeight: 1.5,
                      }}
                    >
                      {rec}
                    </span>
                  </div>
                ))
              )}
            </div>
          </WidgetCard>
        </div>
      </Responsive>
    </div>
  );
}