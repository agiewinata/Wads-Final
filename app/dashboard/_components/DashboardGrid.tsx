"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

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

export default function DashboardGrid({ user }: Props) {
  const [dueToday, setDueToday] = useState<number | null>(null);

  const firstName = user.name?.split(" ")[0] ?? "there";
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  useEffect(() => {
    async function loadCount() {
      try {
        const res = await fetch("/api/tasks");
        if (!res.ok) return;
        const tasks: { dueDate: string | null; completed: boolean }[] = await res.json();
        const now = new Date();
        const n = tasks.filter((t) => {
          if (!t.dueDate || t.completed) return false;
          const d = new Date(t.dueDate);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        }).length;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDueToday(n);
      } catch {
        /* ignore */
      }
    }
    loadCount();
  }, []);

  const subtitle =
    dueToday === null
      ? dateStr
      : dueToday === 0
      ? `${dateStr} · nothing due today`
      : `${dateStr} · ${dueToday} task${dueToday === 1 ? "" : "s"} due today`;

  return (
    <div>
      {/* page header */}
      <div className="flex items-end justify-between" style={{ gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="swipe" style={{ fontFamily: "var(--font-heading)", fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 10 }}>
            Welcome back, {firstName} · {subtitle}
          </p>
        </div>
        <Link href="/dashboard/tasks?new=1" className="btn-ink" style={{ textDecoration: "none" }}>
          <Plus size={17} /> Quick add
        </Link>
      </div>

      {/* fixed 2x2 grid (profile + calendar on top, timer + recommendations below) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 h-[340px]">
          <ProfileCard name={user.name} email={user.email} createdAt={user.createdAt} />
        </div>
        <div className="lg:col-span-7 h-[340px]">
          <DashboardCalendar />
        </div>
        <div className="lg:col-span-5 h-[360px]">
          <DashboardTimer />
        </div>
        <div className="lg:col-span-7 h-[360px]">
          <RecommendationWidget />
        </div>
      </div>
    </div>
  );
}