"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  priority?: number | null;
  category?: string | null;
  completed: boolean;
}

interface Event {
  id: string;
  title: string;
  details?: string | null;
  startDate: string;
  dueDate?: string | null;
  category?: string | null;
}

interface WorkspaceTask {
  id: string;
  title: string;
  dueDate: string | null;
  completed?: boolean;
}

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

const DOT = {
  task: "#22c55e",
  overdue: "#ef4444",
  event: "#3b82f6",
  workspace: "#a855f7",
};

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function DashboardCalendar() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [workspaceTasks, setWorkspaceTasks] = useState<WorkspaceTask[]>([]);
  const today = useMemo(() => new Date(), []);
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [tr, er, wr] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/events"),
          fetch("/api/workspace-tasks"),
        ]);

        const td = await tr.json();
        const ed = await er.json();
        const wd = await wr.json();

        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (tr.ok) setTasks(td);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (er.ok) setEvents(ed);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (wr.ok) setWorkspaceTasks(wd);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, []);

  function activeTasksForDay(d: Date) {
    return tasks.filter((t) => {
      if (!t.dueDate || t.completed) return false;
      return sameDay(new Date(t.dueDate), d);
    });
  }

  function activeWorkspaceTasksForDay(d: Date) {
    return workspaceTasks.filter((t) => {
      if (!t.dueDate || t.completed) return false;
      return sameDay(new Date(t.dueDate), d);
    });
  }

  function activeEventsForDay(d: Date) {
    const todayStart = startOfDay(new Date());

    return events.filter((ev) => {
      const s = new Date(ev.startDate);
      const e = ev.dueDate ? new Date(ev.dueDate) : s;
      const cur = startOfDay(d);

      const start = startOfDay(s);
      const end = startOfDay(e);

      if (end < todayStart) return false;

      return cur >= start && cur <= end;
    });
  }

  function getTaskDotColor(d: Date) {
    const todayStart = startOfDay(new Date());
    const dStart = startOfDay(d);

    return dStart < todayStart ? DOT.overdue : DOT.task;
  }

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const arr: { date: Date; muted: boolean }[] = [];
    for (let i = startDow - 1; i >= 0; i--) arr.push({ date: new Date(view.y, view.m, -i), muted: true });
    for (let d = 1; d <= daysInMonth; d++) arr.push({ date: new Date(view.y, view.m, d), muted: false });
    let next = 1;
    while (arr.length < 42) arr.push({ date: new Date(view.y, view.m + 1, next++), muted: true });
    return arr;
  }, [view]);

  const selTasks = activeTasksForDay(selected);
  const selWorkspaceTasks = activeWorkspaceTasksForDay(selected);
  const selEvents = activeEventsForDay(selected);
  const total = selTasks.length + selWorkspaceTasks.length + selEvents.length;

  const headerLabel = new Date(view.y, view.m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthOnly = new Date(view.y, view.m, 1).toLocaleDateString("en-US", { month: "long" });

  function shiftMonth(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div className="wall-cal h-full flex flex-col overflow-hidden">
      <div className="wall-cal-binding"><span /><span /><span /><span /></div>

      <div className="flex justify-between items-center" style={{ padding: "12px 20px 10px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-faint)" }}>{headerLabel}</div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 19, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>Calendar</h2>
        </div>
        <Link href="/dashboard/calendar" className="btn-paper" style={{ padding: "5px 11px", fontSize: 12 }}>View all →</Link>
      </div>

      <div className="flex flex-1" style={{ minHeight: 0 }}>
        <div style={{ padding: "12px 14px", borderRight: "1px solid var(--line)", flexShrink: 0, width: 270 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <button onClick={() => shiftMonth(-1)} className="grid place-items-center" style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "transparent", color: "var(--ink-soft)", cursor: "pointer" }}><ChevronLeft size={16} /></button>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{monthOnly}</div>
            <button onClick={() => shiftMonth(1)} className="grid place-items-center" style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "transparent", color: "var(--ink-soft)", cursor: "pointer" }}><ChevronRight size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {DOW.map((d, i) => <div key={i} style={{ fontSize: 10, fontWeight: 600, textAlign: "center", color: "var(--ink-faint)", paddingBottom: 3 }}>{d}</div>)}
            {cells.map(({ date, muted }, i) => {
              const isSel = sameDay(date, selected);
              const isToday = sameDay(date, today);
              const hasT = !muted && activeTasksForDay(date).length > 0;
              const hasW = !muted && activeWorkspaceTasksForDay(date).length > 0;
              const hasE = !muted && activeEventsForDay(date).length > 0;

              return (
                <button key={i} onClick={() => setSelected(date)} style={{
                  position: "relative", aspectRatio: "1", display: "grid", placeItems: "center",
                  fontSize: 12.5, borderRadius: "50%", border: "none", cursor: "pointer",
                  fontWeight: isSel ? 600 : 500,
                  color: isSel ? "#fff" : muted ? "var(--ink-faint)" : "var(--ink-soft)",
                  background: isSel ? "var(--accent)" : "transparent",
                  opacity: muted ? 0.45 : 1,
                  boxShadow: !isSel && isToday ? "inset 0 0 0 1.5px var(--accent)" : "none",
                }}>
                  {date.getDate()}
                  {(hasT || hasW || hasE) && !isSel && (
                    <span style={{ position: "absolute", bottom: 3, display: "flex", gap: 3 }}>
                      {hasT && <span style={{ width: 6, height: 6, borderRadius: "50%", background: getTaskDotColor(date) }} />}
                      {hasW && <span style={{ width: 6, height: 6, borderRadius: "50%", background: DOT.workspace }} />}
                      {hasE && <span style={{ width: 6, height: 6, borderRadius: "50%", background: DOT.event }} />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "14px 16px", flex: 1, overflowY: "auto", minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>
            {selected.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </div>
          {total === 0 ? (
            <p style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic" }}>Nothing scheduled.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {selTasks.slice(0, 4).map((t) => {
                const overdue = t.dueDate && new Date(t.dueDate) < new Date();
                const stripe = overdue ? DOT.overdue : DOT.task;
                return (
                  <div key={t.id} className="flex" style={{ border: `1px solid ${overdue ? "#fee2e2" : "#dcfce7"}`, background: overdue ? "#fee2e2" : "#dcfce7", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ width: 3, background: stripe, flexShrink: 0 }} />
                    <div style={{ padding: "6px 10px", minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: stripe, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 1 }}>{overdue ? "Overdue" : "Ongoing"}</div>
                    </div>
                  </div>
                );
              })}

              {selWorkspaceTasks.slice(0, 4).map((t) => (
                <div key={t.id} className="flex" style={{ border: "1px solid #f3e8ff", background: "#f3e8ff", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ width: 3, background: DOT.workspace, flexShrink: 0 }} />
                  <div style={{ padding: "6px 10px", minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: DOT.workspace, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 1 }}>Workspace</div>
                  </div>
                </div>
              ))}

              {selEvents.slice(0, 3).map((ev) => (
                <div key={ev.id} className="flex" style={{ border: "1px solid #dbeafe", background: "#dbeafe", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ width: 3, background: DOT.event, flexShrink: 0 }} />
                  <div style={{ padding: "6px 10px", minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: DOT.event, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 1 }}>Event</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}