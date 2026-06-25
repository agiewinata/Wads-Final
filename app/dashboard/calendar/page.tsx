"use client";

import { useEffect, useMemo, useState } from "react";
import { csrfFetch } from "@/lib/csrf-client";
import { useSession } from "@/lib/auth-client";
import { DateTimePicker } from "./_components/DateTimePicker";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  priority?: number | null;
  category?: string | null;
  completed: boolean;
}

interface WorkspaceTask {
  id: string;
  title: string;
  details: string | null;
  dueDate: string | null;
  priority: number | null;
  completed: boolean;
  assignees: { user: { id: string; name: string | null } }[];
  creator: { id: string; name: string | null };
  workspace: { id: string; name: string };
}

interface Event {
  id: string;
  title: string;
  details?: string | null;
  startDate: string;
  dueDate?: string | null;
  category?: string | null;
}

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

const DOT = {
  task: "#22c55e",
  overdue: "#ef4444",
  workspace: "#a855f7",
  event: "#3b82f6",
};

const CARD = {
  ongoing: { bg: "#dcfce7", stripe: DOT.task, text: "#22c55e" },
  overdue: { bg: "#fee2e2", stripe: DOT.overdue, text: "#ef4444" },
  workspace: { bg: "#f3e8ff", stripe: DOT.workspace, text: "#a855f7" },
  event: { bg: "#dbeafe", stripe: DOT.event, text: "#3b82f6" },
};

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isOverdue(dueDate: string | null, completed: boolean) {
  if (!dueDate || completed) return false;
  return new Date(dueDate).getTime() < Date.now();
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CAT_LABELS: Record<string, string> = {
  ASSIGNMENT: "Assignment",
  PROJECT: "Project",
  EXAM: "Exam",
};

function catLabel(v: string) {
  return CAT_LABELS[v] ?? v;
}

function pillClass(v: string) {
  if (v === "ASSIGNMENT") return "pill pill-assignment";
  if (v === "PROJECT") return "pill pill-project";
  if (v === "EXAM") return "pill pill-exam";
  return "pill";
}

function PriorityBars({ value }: { value: number | null | undefined }) {
  if (!value) return null;

  return (
    <span
      className="inline-flex items-center"
      style={{ gap: 3, flexShrink: 0 }}
    >
      {[1, 2, 3, 4, 5].map((p) => (
        <span
          key={p}
          style={{
            width: 4,
            height: 13,
            borderRadius: 2,
            background: p <= value ? "var(--accent)" : "var(--line-strong)",
          }}
        />
      ))}
    </span>
  );
}

function CountBadge({ color, n }: { color: string; n: number }) {
  if (n <= 0) return null;

  return (
    <span
      style={{
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        borderRadius: 999,
        background: color,
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        display: "inline-grid",
        placeItems: "center",
      }}
    >
      {n}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "var(--ink-soft)",
      }}
    >
      {children}
    </span>
  );
}

function belongsToCurrentUser(task: WorkspaceTask, currentUserId?: string) {
  if (!currentUserId) return false;

  return (
    task.creator.id === currentUserId ||
    task.assignees.some((a) => a.user.id === currentUserId)
  );
}

export default function CalendarPage() {
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [workspaceTasks, setWorkspaceTasks] = useState<WorkspaceTask[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    details: "",
    category: "",
    startDate: "",
    dueDate: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [taskResponse, eventResponse, wsRes] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/events"),
          fetch("/api/workspace-tasks"),
        ]);

        const taskData = await taskResponse.json();
        const eventData = await eventResponse.json();

        if (taskResponse.ok) setTasks(taskData);
        else console.error(taskData);

        if (eventResponse.ok) setEvents(eventData);
        else console.error(eventData);

        if (wsRes.ok) setWorkspaceTasks(await wsRes.json());
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const selectedTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.dueDate &&
          !t.completed &&
          sameDay(new Date(t.dueDate), selectedDate),
      ),
    [tasks, selectedDate],
  );

  const selectedWorkspaceTasks = useMemo(
    () =>
      workspaceTasks.filter(
        (t) =>
          t.dueDate &&
          !t.completed &&
          belongsToCurrentUser(t, currentUserId) &&
          sameDay(new Date(t.dueDate), selectedDate),
      ),
    [workspaceTasks, selectedDate, currentUserId],
  );

  const selectedEvents = useMemo(
    () =>
      events.filter((event) => {
        const start = new Date(event.startDate);
        const end = event.dueDate ? new Date(event.dueDate) : start;
        const sel = startOfDay(selectedDate);
        return sel >= startOfDay(start) && sel <= startOfDay(end);
      }),
    [events, selectedDate],
  );

  const taskOngoing = selectedTasks.filter(
    (t) => !isOverdue(t.dueDate, t.completed),
  ).length;
  const taskOverdue = selectedTasks.filter((t) =>
    isOverdue(t.dueDate, t.completed),
  ).length;
  const wsOngoing = selectedWorkspaceTasks.filter(
    (t) => !isOverdue(t.dueDate, t.completed),
  ).length;
  const wsOverdue = selectedWorkspaceTasks.filter((t) =>
    isOverdue(t.dueDate, t.completed),
  ).length;

  async function deleteEvent(id: string) {
    if (!window.confirm("Delete this event?")) return;

    try {
      const response = await csrfFetch(`/api/events/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        alert("Failed to delete event");
        return;
      }

      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error(error);
      alert("Failed to delete event");
    }
  }

  async function saveEvent() {
    if (!eventForm.title.trim()) {
      alert("Title is required");
      return;
    }

    if (!eventForm.startDate) {
      alert("Start date is required");
      return;
    }

    if (!eventForm.dueDate) {
      alert("End date is required");
      return;
    }

    if (new Date(eventForm.dueDate) < new Date(eventForm.startDate)) {
      alert("End date must be after start date");
      return;
    }

    try {
      const url = editingEvent
        ? `/api/events/${editingEvent.id}`
        : "/api/events";
      const method = editingEvent ? "PATCH" : "POST";

      const response = await csrfFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventForm),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        return;
      }

      if (editingEvent) {
        setEvents((prev) => prev.map((e) => (e.id === data.id ? data : e)));
      } else {
        setEvents((prev) => [...prev, data]);
      }

      setEventForm({
        title: "",
        details: "",
        category: "",
        startDate: "",
        dueDate: "",
      });
      setEditingEvent(null);
      setShowEventModal(false);
    } catch (error) {
      console.error(error);
    }
  }

  function openAddModal() {
    setEditingEvent(null);
    setEventForm({
      title: "",
      details: "",
      category: "",
      startDate: "",
      dueDate: "",
    });
    setShowEventModal(true);
  }

  function openEditModal(event: Event) {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      details: event.details ?? "",
      category: event.category ?? "",
      startDate: event.startDate,
      dueDate: event.dueDate ?? "",
    });
    setShowEventModal(true);
  }

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const arr: { date: Date; muted: boolean }[] = [];

    for (let i = startDow - 1; i >= 0; i--) {
      arr.push({ date: new Date(view.y, view.m, -i), muted: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      arr.push({ date: new Date(view.y, view.m, d), muted: false });
    }

    let next = 1;
    while (arr.length < 42) {
      arr.push({ date: new Date(view.y, view.m + 1, next++), muted: true });
    }

    return arr;
  }, [view]);

  function dotsFor(date: Date) {
    const personalAll = tasks.filter(
      (t) => t.dueDate && sameDay(new Date(t.dueDate), date),
    );
    const personalActive = personalAll.filter((t) => !t.completed);

    const ws = workspaceTasks.filter(
      (t) =>
        t.dueDate &&
        !t.completed &&
        belongsToCurrentUser(t, currentUserId) &&
        sameDay(new Date(t.dueDate), date),
    );

    const ev = events.some((event) => {
      const start = new Date(event.startDate);
      const end = event.dueDate ? new Date(event.dueDate) : start;
      const cur = startOfDay(date);
      return cur >= startOfDay(start) && cur <= startOfDay(end);
    });

    return {
      overdue: [...personalActive, ...ws].some((t) =>
        isOverdue(t.dueDate, t.completed),
      ),
      ongoing: personalActive.some((t) => !isOverdue(t.dueDate, t.completed)),
      workspace: ws.some((t) => !isOverdue(t.dueDate, t.completed)),
      event: ev,
    };
  }

  function shiftMonth(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function pickDay(date: Date) {
    setSelectedDate(date);
    if (date.getMonth() !== view.m || date.getFullYear() !== view.y) {
      setView({ y: date.getFullYear(), m: date.getMonth() });
    }
  }

  function goToday() {
    const d = new Date();
    setSelectedDate(d);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  }

  const today = new Date();
  const headerDate = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const selectedLabel = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="w-full flex flex-col gap-5">
      <div
        className="flex items-end justify-between flex-wrap"
        style={{ gap: 16 }}
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
            Calendar
          </h1>

          <p
            style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 10 }}
          >
            {headerDate}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={goToday} className="btn-paper">
            Today
          </button>
          <button onClick={openAddModal} className="btn-ink">
            <Plus size={17} /> Add event
          </button>
        </div>
      </div>

      <div className="wall-cal flex flex-col overflow-hidden">
        <div className="wall-cal-binding">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "42% 58%", minHeight: 0 }}>
          <div
            style={{
              padding: "18px 20px",
              borderRight: "1px solid var(--line)",
              minWidth: 0,
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 12 }}
            >
              <button
                onClick={() => shiftMonth(-1)}
                className="grid place-items-center"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid var(--line-strong)",
                  background: "var(--paper)",
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                }}
                title="Previous month"
              >
                <ChevronLeft size={17} />
              </button>

              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                {monthLabel}
              </div>

              <button
                onClick={() => shiftMonth(1)}
                className="grid place-items-center"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid var(--line-strong)",
                  background: "var(--paper)",
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                }}
                title="Next month"
              >
                <ChevronRight size={17} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 6,
              }}
            >
              {DOW.map((d, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textAlign: "center",
                    color: "var(--ink-faint)",
                    paddingBottom: 6,
                    textTransform: "uppercase",
                  }}
                >
                  {d}
                </div>
              ))}

              {cells.map(({ date, muted }, i) => {
                const isSel = sameDay(date, selectedDate);
                const isToday = sameDay(date, today);
                const dots = muted ? null : dotsFor(date);
                const hasDots =
                  dots &&
                  (dots.ongoing ||
                    dots.overdue ||
                    dots.workspace ||
                    dots.event);

                return (
                  <button
                    key={i}
                    onClick={() => pickDay(date)}
                    style={{
                      position: "relative",
                      aspectRatio: "1",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 15,
                      borderRadius: "50%",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: isSel ? 700 : 500,
                      color: isSel
                        ? "#fff"
                        : muted
                          ? "var(--ink-faint)"
                          : "var(--ink-soft)",
                      background: isSel ? "var(--accent)" : "transparent",
                      opacity: muted ? 0.45 : 1,
                      boxShadow:
                        !isSel && isToday
                          ? "inset 0 0 0 1.5px var(--accent)"
                          : "none",
                    }}
                  >
                    {date.getDate()}

                    {hasDots && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: isSel ? 5 : 4,
                          display: "flex",
                          gap: 4,
                        }}
                      >
                        {dots.ongoing && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: isSel ? "#bbf7d0" : DOT.task,
                            }}
                          />
                        )}
                        {dots.overdue && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: isSel ? "#fecaca" : DOT.overdue,
                            }}
                          />
                        )}
                        {dots.workspace && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: isSel ? "#e9d5ff" : DOT.workspace,
                            }}
                          />
                        )}
                        {dots.event && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: isSel ? "#bfdbfe" : DOT.event,
                            }}
                          />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div
              className="flex flex-wrap"
              style={{
                gap: "6px 14px",
                marginTop: 16,
                padding: "10px 12px",
                background: "var(--paper-2)",
                border: "1px solid var(--line)",
                borderRadius: 8,
              }}
            >
              {[
                { color: DOT.task, label: "Ongoing" },
                { color: DOT.overdue, label: "Overdue" },
                { color: DOT.workspace, label: "Workspace" },
                { color: DOT.event, label: "Event" },
              ].map(({ color, label }) => (
                <div
                  key={label}
                  className="flex items-center"
                  style={{ gap: 5 }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--ink-soft)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              minWidth: 0,
              padding: "18px 22px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 20,
                fontWeight: 600,
                color: "var(--ink)",
                marginBottom: 18,
              }}
            >
              {selectedLabel}
            </div>

            {loading ? (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink-faint)",
                  fontStyle: "italic",
                }}
              >
                Loading…
              </p>
            ) : (
              <div className="flex flex-col" style={{ gap: 22 }}>
                <div>
                  <div
                    className="flex items-center"
                    style={{ gap: 7, marginBottom: 10 }}
                  >
                    <SectionLabel>Tasks</SectionLabel>
                    <CountBadge color={DOT.task} n={taskOngoing} />
                    <CountBadge color={DOT.overdue} n={taskOverdue} />
                  </div>

                  {selectedTasks.length === 0 ? (
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--ink-faint)",
                        fontStyle: "italic",
                      }}
                    >
                      No tasks due this day.
                    </p>
                  ) : (
                    <div className="flex flex-col" style={{ gap: 8 }}>
                      {selectedTasks.map((task) => {
                        const od = isOverdue(task.dueDate, task.completed);
                        const tone = od ? CARD.overdue : CARD.ongoing;

                        return (
                          <div
                            key={task.id}
                            className="flex"
                            style={{
                              borderRadius: 10,
                              overflow: "hidden",
                              background: tone.bg,
                              border: "1px solid var(--line)",
                            }}
                          >
                            <div
                              style={{
                                width: 4,
                                background: tone.stripe,
                                flexShrink: 0,
                              }}
                            />

                            <div
                              style={{
                                flex: 1,
                                padding: "8px 14px",
                                minWidth: 0,
                              }}
                            >
                              <div
                                className="flex items-center"
                                style={{ gap: 10, minWidth: 0 }}
                              >
                                <span
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: "var(--ink)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {task.title}
                                </span>

                                <PriorityBars value={task.priority} />

                                {task.dueDate && (
                                  <span
                                    style={{
                                      marginLeft: "auto",
                                      fontSize: 12,
                                      fontFamily: "var(--font-mono)",
                                      color: "var(--ink-soft)",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {timeOf(task.dueDate)}
                                  </span>
                                )}
                              </div>

                              <div
                                className="flex items-center flex-wrap"
                                style={{ gap: "4px 8px", marginTop: 6 }}
                              >
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                    color: tone.text,
                                  }}
                                >
                                  {od ? "Overdue" : "Ongoing"}
                                </span>

                                {task.category && (
                                  <span
                                    className={pillClass(task.category)}
                                    style={
                                      pillClass(task.category) === "pill"
                                        ? {
                                            background: "var(--accent-soft)",
                                            color: "var(--accent-text)",
                                          }
                                        : undefined
                                    }
                                  >
                                    {catLabel(task.category)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <div
                    className="flex items-center"
                    style={{ gap: 7, marginBottom: 10 }}
                  >
                    <SectionLabel>Workspace tasks</SectionLabel>
                    <CountBadge color={DOT.workspace} n={wsOngoing} />
                    <CountBadge color={DOT.overdue} n={wsOverdue} />
                  </div>

                  {selectedWorkspaceTasks.length === 0 ? (
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--ink-faint)",
                        fontStyle: "italic",
                      }}
                    >
                      No shared tasks due this day.
                    </p>
                  ) : (
                    <div className="flex flex-col" style={{ gap: 8 }}>
                      {selectedWorkspaceTasks.map((task) => {
                        const od = isOverdue(task.dueDate, task.completed);
                        const tone = od ? CARD.overdue : CARD.workspace;

                        return (
                          <div
                            key={task.id}
                            className="flex"
                            style={{
                              borderRadius: 10,
                              overflow: "hidden",
                              background: tone.bg,
                              border: "1px solid var(--line)",
                            }}
                          >
                            <div
                              style={{
                                width: 4,
                                background: tone.stripe,
                                flexShrink: 0,
                              }}
                            />

                            <div
                              style={{
                                flex: 1,
                                padding: "8px 14px",
                                minWidth: 0,
                              }}
                            >
                              <div
                                className="flex items-center"
                                style={{ gap: 10, minWidth: 0 }}
                              >
                                <span
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: "var(--ink)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {task.title}
                                </span>

                                <PriorityBars value={task.priority} />

                                {task.dueDate && (
                                  <span
                                    style={{
                                      marginLeft: "auto",
                                      fontSize: 12,
                                      fontFamily: "var(--font-mono)",
                                      color: "var(--ink-soft)",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {timeOf(task.dueDate)}
                                  </span>
                                )}
                              </div>

                              <div
                                className="flex items-center flex-wrap"
                                style={{ gap: "4px 8px", marginTop: 6 }}
                              >
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                    color: tone.text,
                                  }}
                                >
                                  {od ? "Overdue" : "Workspace"}
                                </span>

                                <span
                                  className="pill"
                                  style={{
                                    background: "rgba(168, 85, 247, 0.14)",
                                    color: DOT.workspace,
                                  }}
                                >
                                  {task.workspace.name}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <div
                    className="flex items-center"
                    style={{ gap: 7, marginBottom: 10 }}
                  >
                    <SectionLabel>Events</SectionLabel>
                    <CountBadge color={DOT.event} n={selectedEvents.length} />
                  </div>

                  {selectedEvents.length === 0 ? (
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--ink-faint)",
                        fontStyle: "italic",
                      }}
                    >
                      No events scheduled.
                    </p>
                  ) : (
                    <div className="flex flex-col" style={{ gap: 8 }}>
                      {selectedEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex"
                          style={{
                            borderRadius: 10,
                            overflow: "hidden",
                            background: CARD.event.bg,
                            border: "1px solid var(--line)",
                          }}
                        >
                          <div
                            style={{
                              width: 4,
                              background: CARD.event.stripe,
                              flexShrink: 0,
                            }}
                          />

                          <div
                            style={{
                              flex: 1,
                              padding: "8px 14px",
                              minWidth: 0,
                            }}
                          >
                            <div
                              className="flex items-start justify-between"
                              style={{ gap: 10 }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: "var(--ink)",
                                    marginBottom: 5,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {event.title}
                                </div>

                                <div
                                  className="flex flex-wrap items-center"
                                  style={{ gap: "3px 10px" }}
                                >
                                  {event.category && (
                                    <span
                                      className="pill"
                                      style={{
                                        background: "rgba(59, 130, 246, 0.14)",
                                        color: DOT.event,
                                      }}
                                    >
                                      {event.category}
                                    </span>
                                  )}

                                  <span className="pill" style={{ background: "#eff6ff", color: DOT.event }}>
                                    {new Date(event.startDate).toLocaleString([], {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>

                                  {event.dueDate && (
                                    <>
                                      <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 700 }}>
                                        →
                                      </span>
                                      <span className="pill" style={{ background: "#eff6ff", color: DOT.event }}>
                                        {new Date(event.dueDate).toLocaleString([], {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </>
                                  )}
                                </div>

                                {event.details && (
                                  <p
                                    style={{
                                      fontSize: 12,
                                      color: "var(--ink-soft)",
                                      marginTop: 6,
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {event.details}
                                  </p>
                                )}
                              </div>

                              <div
                                className="flex shrink-0"
                                style={{ gap: 6, marginLeft: 8 }}
                              >
                                <button
                                  onClick={() => openEditModal(event)}
                                  className="btn-paper"
                                  style={{ padding: "5px 11px", fontSize: 12 }}
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => deleteEvent(event.id)}
                                  style={{
                                    padding: "5px 11px",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    background: DOT.overdue,
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 9,
                                    cursor: "pointer",
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEventModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            className="paper"
            style={{
              width: "100%",
              maxWidth: 440,
              padding: 0,
              overflow: "hidden",
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                {editingEvent ? "Edit event" : "New event"}
              </h2>

              <button
                onClick={() => setShowEventModal(false)}
                className="grid place-items-center"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  border: "1px solid var(--line-strong)",
                  background: "var(--paper)",
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div
              className="flex flex-col"
              style={{ gap: 14, padding: "18px 22px" }}
            >
              <div>
                <label style={labelStyle}>Title *</label>
                <input
                  type="text"
                  placeholder="Event title"
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, title: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Details</label>
                <textarea
                  placeholder="Optional details"
                  value={eventForm.details}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, details: e.target.value })
                  }
                  style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
                />
              </div>

              <div>
                <label style={labelStyle}>Category</label>
                <input
                  type="text"
                  placeholder="e.g. Work, Personal"
                  value={eventForm.category}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, category: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>Start *</label>
                  <DateTimePicker
                    value={eventForm.startDate}
                    onChange={(iso) =>
                      setEventForm({ ...eventForm, startDate: iso })
                    }
                    placeholder="Start date & time"
                  />
                </div>

                <div>
                  <label style={labelStyle}>End *</label>
                  <DateTimePicker
                    value={eventForm.dueDate}
                    onChange={(iso) =>
                      setEventForm({ ...eventForm, dueDate: iso })
                    }
                    placeholder="End date & time"
                  />
                </div>
              </div>
            </div>

            <div
              className="flex justify-end"
              style={{
                gap: 8,
                padding: "12px 20px",
                borderTop: "1px solid var(--line)",
              }}
            >
              <button
                onClick={() => setShowEventModal(false)}
                className="btn-paper"
              >
                Cancel
              </button>

              <button onClick={saveEvent} className="btn-ink">
                {editingEvent ? "Save changes" : "Create event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--ink-faint)",
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--line-strong)",
  borderRadius: 9,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "var(--paper)",
  color: "var(--ink)",
  fontFamily: "inherit",
};