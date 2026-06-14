"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import Link from "next/link";

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

const IRREGULAR = "6px 8px 5px 7px / 7px 5px 8px 6px";

export default function DashboardCalendar() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [narrow, setNarrow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Detect card width to switch between side-by-side and stacked layout */
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setNarrow(entry.contentRect.width < 500);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [taskRes, eventRes] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/events"),
        ]);
        const taskData = await taskRes.json();
        const eventData = await eventRes.json();
        if (taskRes.ok) setTasks(taskData);
        if (eventRes.ok) setEvents(eventData);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, []);

  const selectedTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate);
      return (
        due.getDate() === selectedDate.getDate() &&
        due.getMonth() === selectedDate.getMonth() &&
        due.getFullYear() === selectedDate.getFullYear()
      );
    });
  }, [tasks, selectedDate]);

  const selectedEvents = useMemo(() => {
    return events.filter((event) => {
      const start = new Date(event.startDate);
      const end = event.dueDate ? new Date(event.dueDate) : start;
      const sel = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      return (
        sel >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
        sel <= new Date(end.getFullYear(), end.getMonth(), end.getDate())
      );
    });
  }, [events, selectedDate]);

  const totalToday = selectedTasks.length + selectedEvents.length;

  const dayItems = (
    <div style={{ padding: narrow ? "12px 16px 16px" : "14px 16px", overflowY: "auto", flex: narrow ? "none" : 1 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a1a1aa", marginBottom: 2 }}>
          Selected
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", color: "#111" }}>
          {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </div>
      </div>

      {totalToday === 0 ? (
        <p style={{ fontSize: 12, color: "#a1a1aa", fontStyle: "italic" }}>Nothing scheduled.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {selectedTasks.slice(0, 4).map((task) => {
            const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
            const stripe = task.completed ? "#16a34a" : isOverdue ? "#dc2626" : "#71717a";
            return (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  border: "1.5px solid #e4e4e7",
                  borderRadius: "3px 5px 3px 5px",
                  overflow: "hidden",
                }}
              >
                <div style={{ width: 3, background: stripe, flexShrink: 0 }} />
                <div style={{ padding: "6px 10px", flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: stripe, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 1 }}>
                    {task.completed ? "Done" : isOverdue ? "Overdue" : "Task"}
                  </div>
                </div>
              </div>
            );
          })}

          {selectedEvents.slice(0, 3).map((event) => (
            <div
              key={event.id}
              style={{
                display: "flex",
                alignItems: "stretch",
                border: "1.5px solid #bfdbfe",
                borderRadius: "3px 5px 3px 5px",
                overflow: "hidden",
                background: "#f0f7ff",
              }}
            >
              <div style={{ width: 3, background: "#2563eb", flexShrink: 0 }} />
              <div style={{ padding: "6px 10px", flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {event.title}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 1 }}>
                  Event
                </div>
              </div>
            </div>
          ))}

          {totalToday > 7 && (
            <p style={{ fontSize: 11, color: "#a1a1aa", fontStyle: "italic" }}>
              +{totalToday - 7} more
            </p>
          )}
        </div>
      )}
    </div>
  );

  const calendarPanel = (
    <div
      style={{
        flexShrink: 0,
        padding: narrow ? "12px 16px 0" : "12px 12px 12px 16px",
        borderRight: narrow ? "none" : "1.5px solid #f4f4f5",
        borderBottom: narrow ? "1.5px solid #f4f4f5" : "none",
      }}
    >
      <div className="themed-cal" style={{ width: "100%", maxWidth: narrow ? "100%" : 260 }}>
        <Calendar
          value={selectedDate}
          onChange={(value) => setSelectedDate(value as Date)}
          tileContent={({ date, view }) => {
            if (view !== "month") return null;

            const hasTask = tasks.some((task) => {
              if (!task.dueDate) return false;
              const due = new Date(task.dueDate);
              return (
                due.getDate() === date.getDate() &&
                due.getMonth() === date.getMonth() &&
                due.getFullYear() === date.getFullYear()
              );
            });

            const hasEvent = events.some((event) => {
              const start = new Date(event.startDate);
              const end = event.dueDate ? new Date(event.dueDate) : start;
              const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
              return (
                current >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
                current <= new Date(end.getFullYear(), end.getMonth(), end.getDate())
              );
            });

            if (!hasTask && !hasEvent) return null;
            return (
              <div className="mt-1 flex justify-center gap-1">
                {hasTask && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#111" }} />}
                {hasEvent && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2563eb" }} />}
              </div>
            );
          }}
        />
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="bg-white h-full flex flex-col overflow-hidden"
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
          padding: "14px 20px 10px",
          borderBottom: "2px solid #f4f4f5",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a1a1aa", marginBottom: 2 }}>
            {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, fontStyle: "italic", letterSpacing: "-0.03em", color: "#111", lineHeight: 1 }}>
            Calendar
          </h2>
        </div>
        <Link
          href="/dashboard/calendar"
          style={{
            fontSize: 11, fontWeight: 700, color: "#71717a", textDecoration: "none",
            padding: "4px 10px", border: "1.5px solid #e4e4e7", borderRadius: 4,
          }}
        >
          View all →
        </Link>
      </div>

      {/* Body — stacked on narrow, side-by-side on wide */}
      <div
        style={{
          display: "flex",
          flexDirection: narrow ? "column" : "row",
          flex: 1,
          overflow: narrow ? "auto" : "hidden",
        }}
      >
        {calendarPanel}
        {dayItems}
      </div>
    </div>
  );
}
