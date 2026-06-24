"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Responsive, useContainerWidth } from "react-grid-layout";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import ProfileCard from "./ProfileCard";
import DashboardCalendar from "./DashboardCalendar";
import DashboardTimer from "./DashboardTimer";
import RecommendationWidget from "./RecommendationWidget";

type Props = {
  user: {
    name: string | null;
    email: string;
    createdAt: Date;
  };
};

const DEFAULT_LAYOUTS = {
  lg: [
    { i: "profile", x: 0, y: 0, w: 5, h: 4 },
    { i: "calendar", x: 5, y: 0, w: 7, h: 4 },
    { i: "timer", x: 0, y: 4, w: 5, h: 4 },
    { i: "recommendations", x: 5, y: 4, w: 7, h: 4 },
  ],
  md: [
    { i: "profile", x: 0, y: 0, w: 5, h: 4 },
    { i: "calendar", x: 5, y: 0, w: 7, h: 4 },
    { i: "timer", x: 0, y: 4, w: 5, h: 4 },
    { i: "recommendations", x: 5, y: 4, w: 7, h: 4 },
  ],
  sm: [
    { i: "profile", x: 0, y: 0, w: 6, h: 4 },
    { i: "calendar", x: 0, y: 4, w: 6, h: 4 },
    { i: "timer", x: 0, y: 8, w: 6, h: 4 },
    { i: "recommendations", x: 0, y: 12, w: 6, h: 4 },
  ],
  xs: [
    { i: "profile", x: 0, y: 0, w: 4, h: 4 },
    { i: "calendar", x: 0, y: 4, w: 4, h: 4 },
    { i: "timer", x: 0, y: 8, w: 4, h: 4 },
    { i: "recommendations", x: 0, y: 12, w: 4, h: 4 },
  ],
  xxs: [
    { i: "profile", x: 0, y: 0, w: 2, h: 4 },
    { i: "calendar", x: 0, y: 4, w: 2, h: 4 },
    { i: "timer", x: 0, y: 8, w: 2, h: 4 },
    { i: "recommendations", x: 0, y: 12, w: 2, h: 4 },
  ],
};

const LAYOUT_STORAGE_KEY = "dashboard-grid-layouts-v2";

export default function DashboardGrid({ user }: Props) {
  const { width, containerRef } = useContainerWidth({ initialWidth: 1200 });

  const [dueToday, setDueToday] = useState<number | null>(null);
  const [savedLayouts, setSavedLayouts] = useState(DEFAULT_LAYOUTS);

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const focusedThisWeek = "2h 15m focused this week";

  useEffect(() => {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);

    if (stored) {
      try {
        setSavedLayouts(JSON.parse(stored));
      } catch {
        localStorage.removeItem(LAYOUT_STORAGE_KEY);
        setSavedLayouts(DEFAULT_LAYOUTS);
      }
    }
  }, []);

  useEffect(() => {
    async function loadCount() {
      try {
        const [taskRes, workspaceRes] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/workspace-tasks"),
        ]);

        if (!taskRes.ok) return;

        const tasks: { dueDate: string | null; completed: boolean }[] =
          await taskRes.json();

        const workspaceTasks: { dueDate: string | null; completed?: boolean }[] =
          workspaceRes.ok ? await workspaceRes.json() : [];

        const allTasks = [...tasks, ...workspaceTasks];

        const now = new Date();

        const n = allTasks.filter((t) => {
          if (!t.dueDate || t.completed) return false;

          const d = new Date(t.dueDate);

          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        }).length;

        setDueToday(n);
      } catch {}
    }

    loadCount();
  }, []);

  const subtitle =
    dueToday === null
      ? `${dateStr} · ${focusedThisWeek}`
      : `${dateStr} · ${dueToday} task${
          dueToday === 1 ? "" : "s"
        } due today · ${focusedThisWeek}`;

  return (
    <div ref={containerRef}>
      <div
        className="flex items-end justify-between"
        style={{ gap: 16, marginBottom: 22, flexWrap: "wrap" }}
      >
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
            Dashboard
          </h1>

          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 10 }}>
            {subtitle}
          </p>
        </div>

        <Link
          href="/dashboard/tasks?new=1"
          className="btn-ink"
          style={{ textDecoration: "none" }}
        >
          <Plus size={17} /> Quick add
        </Link>
      </div>

      <Responsive
        className="layout"
        layouts={savedLayouts}
        width={width}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={80}
        margin={[16, 16]}
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
        <div key="profile" className="drag-handle cursor-move">
          <ProfileCard name={user.name} email={user.email} createdAt={user.createdAt} />
        </div>

        <div key="calendar" className="drag-handle cursor-move">
          <DashboardCalendar />
        </div>

        <div key="timer" className="drag-handle cursor-move">
          <DashboardTimer />
        </div>

        <div key="recommendations" className="drag-handle cursor-move">
          <RecommendationWidget />
        </div>
      </Responsive>
    </div>
  );
}