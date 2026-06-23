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

const layouts = {
  lg: [
    { i: "profile", x: 0, y: 0, w: 5, h: 4 },
    { i: "calendar", x: 5, y: 0, w: 7, h: 4 },
    { i: "timer", x: 0, y: 4, w: 5, h: 4 },
    { i: "recommendations", x: 5, y: 4, w: 7, h: 4 },
  ],
};

export default function DashboardGrid({ user }: Props) {
  const { width, containerRef } = useContainerWidth({ initialWidth: 1200 });
  const [dueToday, setDueToday] = useState<number | null>(null);

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const focusedThisWeek = "2h 15m focused this week";

  useEffect(() => {
    async function loadCount() {
      try {
        const res = await fetch("/api/tasks");
        if (!res.ok) return;

        const tasks: { dueDate: string | null; completed: boolean }[] =
          await res.json();

        const now = new Date();

        const n = tasks.filter((t) => {
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
      : `${dateStr} · ${dueToday} task${dueToday === 1 ? "" : "s"} due today · ${focusedThisWeek}`;

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
        layouts={layouts}
        width={width}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={80}
        margin={[16, 16]}
        draggableHandle=".drag-handle"
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