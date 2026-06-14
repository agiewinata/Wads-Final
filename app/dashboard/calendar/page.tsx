"use client";

import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { csrfFetch } from "@/lib/csrf-client";
import { DateTimePicker } from "./_components/DateTimePicker";

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
const CARD_IRREGULAR = "4px 6px 4px 6px / 6px 4px 6px 4px";

const PRIORITY_COLORS: Record<number, string> = {
  1: "#fde047",
  2: "#eab308",
  3: "#ca8a04",
  4: "#ea580c",
  5: "#dc2626",
};

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
        const taskResponse = await fetch("/api/tasks");
        const taskData = await taskResponse.json();
        if (taskResponse.ok) setTasks(taskData);
        else console.error(taskData);

        const eventResponse = await fetch("/api/events");
        const eventData = await eventResponse.json();
        if (eventResponse.ok) setEvents(eventData);
        else console.error(eventData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
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
      const selected = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return selected >= startDay && selected <= endDay;
    });
  }, [events, selectedDate]);

  async function deleteEvent(id: string) {
    if (!window.confirm("Delete this event?")) return;
    try {
      const response = await csrfFetch(`/api/events/${id}`, { method: "DELETE" });
      if (!response.ok) { alert("Failed to delete event"); return; }
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error(error);
      alert("Failed to delete event");
    }
  }

  async function saveEvent() {
    if (!eventForm.title.trim()) { alert("Title is required"); return; }
    if (!eventForm.startDate) { alert("Start date is required"); return; }
    if (!eventForm.dueDate) { alert("End date is required"); return; }
    if (new Date(eventForm.dueDate) < new Date(eventForm.startDate)) {
      alert("End date must be after start date");
      return;
    }
    try {
      const url = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events";
      const method = editingEvent ? "PATCH" : "POST";
      const response = await csrfFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventForm),
      });
      const data = await response.json();
      if (!response.ok) { console.error(data); return; }
      if (editingEvent) {
        setEvents((prev) => prev.map((e) => (e.id === data.id ? data : e)));
      } else {
        setEvents((prev) => [...prev, data]);
      }
      setEventForm({ title: "", details: "", category: "", startDate: "", dueDate: "" });
      setEditingEvent(null);
      setShowEventModal(false);
    } catch (error) {
      console.error(error);
    }
  }

  function openAddModal() {
    setEditingEvent(null);
    setEventForm({ title: "", details: "", category: "", startDate: "", dueDate: "" });
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

  function getTileContent({ date, view }: { date: Date; view: string }) {
    if (view !== "month") return null;

    const dayTasks = tasks.filter((task) => {
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate);
      return (
        due.getDate() === date.getDate() &&
        due.getMonth() === date.getMonth() &&
        due.getFullYear() === date.getFullYear()
      );
    });

    const dayEvents = events.filter((event) => {
      const start = new Date(event.startDate);
      const end = event.dueDate ? new Date(event.dueDate) : start;
      const currentDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return currentDay >= startDay && currentDay <= endDay;
    });

    if (dayTasks.length === 0 && dayEvents.length === 0) return null;

    let taskDotColor = "#71717a";
    if (dayTasks.some((t) => t.completed)) taskDotColor = "#16a34a";
    if (dayTasks.some((t) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date())) {
      taskDotColor = "#dc2626";
    }

    return (
      <div className="mt-1 flex justify-center gap-1">
        {dayTasks.length > 0 && (
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: taskDotColor }} />
        )}
        {dayEvents.length > 0 && (
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2563eb" }} />
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className="bg-white p-6 h-full w-full overflow-auto"
        style={{
          border: "3px solid #111",
          borderRadius: IRREGULAR,
          boxShadow: "6px 8px 0 rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 800,
                fontStyle: "italic",
                letterSpacing: "-0.03em",
                color: "#111",
                lineHeight: 1,
              }}
            >
              Calendar
            </h1>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#a1a1aa",
                marginTop: 5,
              }}
            >
              {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>

          <button
            onClick={openAddModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: "#111",
              color: "white",
              fontSize: 13,
              fontWeight: 700,
              border: "2px solid #111",
              borderRadius: CARD_IRREGULAR,
              cursor: "pointer",
              letterSpacing: "-0.01em",
            }}
          >
            <span style={{ fontSize: 17, lineHeight: 1, marginTop: -1 }}>+</span>
            Add Event
          </button>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Left column: Calendar widget */}
          <div style={{ flexShrink: 0, width: 460 }}>
            <div
              className="themed-cal"
              style={{
                border: "2px solid #e4e4e7",
                borderRadius: 8,
                padding: "14px 12px 12px",
                background: "#fafafa",
              }}
            >
              <Calendar
                onChange={(value) => setSelectedDate(value as Date)}
                value={selectedDate}
                tileContent={getTileContent}
              />
            </div>

            {/* Dot legend */}
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexWrap: "wrap",
                gap: "6px 14px",
                padding: "8px 12px",
                background: "#f4f4f5",
                borderRadius: 6,
                border: "1px solid #e4e4e7",
              }}
            >
              {[
                { color: "#71717a", label: "Pending" },
                { color: "#16a34a", label: "Done" },
                { color: "#dc2626", label: "Overdue" },
                { color: "#2563eb", label: "Event" },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#71717a",
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

          {/* Right column: Day details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Selected date header */}
            <div
              style={{
                marginBottom: 20,
                paddingBottom: 14,
                borderBottom: "2px solid #e4e4e7",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#a1a1aa",
                  marginBottom: 3,
                }}
              >
                Selected date
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#111",
                }}
              >
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>

            {loading && (
              <p style={{ fontSize: 13, color: "#a1a1aa", fontStyle: "italic" }}>Loading...</p>
            )}

            {!loading && (
              <>
                {/* Tasks */}
                <div style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#71717a",
                      }}
                    >
                      Tasks
                    </span>
                    {selectedTasks.length > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: "#111",
                          color: "white",
                          padding: "1px 7px",
                          borderRadius: 999,
                        }}
                      >
                        {selectedTasks.length}
                      </span>
                    )}
                  </div>

                  {selectedTasks.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#a1a1aa", fontStyle: "italic" }}>
                      No tasks due this day.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {selectedTasks.map((task) => {
                        const isOverdue =
                          task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
                        const statusColor = task.completed
                          ? "#16a34a"
                          : isOverdue
                          ? "#dc2626"
                          : "#71717a";
                        const statusLabel = task.completed
                          ? "Done"
                          : isOverdue
                          ? "Overdue"
                          : "Pending";

                        return (
                          <div
                            key={task.id}
                            style={{
                              display: "flex",
                              alignItems: "stretch",
                              border: "2px solid #e4e4e7",
                              borderRadius: CARD_IRREGULAR,
                              overflow: "hidden",
                              background: "white",
                            }}
                          >
                            {/* Status accent stripe */}
                            <div
                              style={{ width: 4, background: statusColor, flexShrink: 0 }}
                            />
                            <div style={{ flex: 1, padding: "10px 14px" }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: 10,
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 600,
                                      color: "#111",
                                      marginBottom: 5,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {task.title}
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 10px" }}>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: statusColor,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                      }}
                                    >
                                      {statusLabel}
                                    </span>
                                    {task.category && (
                                      <span
                                        style={{ fontSize: 11, color: "#a1a1aa", fontWeight: 500 }}
                                      >
                                        {task.category}
                                      </span>
                                    )}
                                    {task.dueDate && (
                                      <span
                                        style={{ fontSize: 11, color: "#a1a1aa", fontWeight: 500 }}
                                      >
                                        {new Date(task.dueDate).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {task.priority && (
                                  <div
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "3px 8px",
                                      border: "2px solid #111",
                                      borderRadius: 4,
                                      background: PRIORITY_COLORS[task.priority] ?? "#fde047",
                                      color: "#111",
                                      flexShrink: 0,
                                      letterSpacing: "0.02em",
                                    }}
                                  >
                                    P{task.priority}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Events */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#71717a",
                      }}
                    >
                      Events
                    </span>
                    {selectedEvents.length > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: "#2563eb",
                          color: "white",
                          padding: "1px 7px",
                          borderRadius: 999,
                        }}
                      >
                        {selectedEvents.length}
                      </span>
                    )}
                  </div>

                  {selectedEvents.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#a1a1aa", fontStyle: "italic" }}>
                      No events scheduled.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {selectedEvents.map((event) => (
                        <div
                          key={event.id}
                          style={{
                            display: "flex",
                            alignItems: "stretch",
                            border: "2px solid #bfdbfe",
                            borderRadius: CARD_IRREGULAR,
                            overflow: "hidden",
                            background: "#f0f7ff",
                          }}
                        >
                          {/* Blue accent stripe */}
                          <div style={{ width: 4, background: "#2563eb", flexShrink: 0 }} />
                          <div style={{ flex: 1, padding: "10px 14px" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 10,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: "#111",
                                    marginBottom: 5,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {event.title}
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 10px" }}>
                                  {event.category && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: "#2563eb",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                      }}
                                    >
                                      {event.category}
                                    </span>
                                  )}
                                  <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500 }}>
                                    {new Date(event.startDate).toLocaleString([], {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    {event.dueDate &&
                                      " → " +
                                        new Date(event.dueDate).toLocaleString([], {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                  </span>
                                </div>
                                {event.details && (
                                  <p
                                    style={{
                                      fontSize: 12,
                                      color: "#52525b",
                                      marginTop: 6,
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {event.details}
                                  </p>
                                )}
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  flexShrink: 0,
                                  marginLeft: 8,
                                }}
                              >
                                <button
                                  onClick={() => openEditModal(event)}
                                  style={{
                                    padding: "3px 10px",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: "white",
                                    color: "#111",
                                    border: "2px solid #111",
                                    borderRadius: "3px 5px 3px 5px",
                                    cursor: "pointer",
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteEvent(event.id)}
                                  style={{
                                    padding: "3px 10px",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: "#dc2626",
                                    color: "white",
                                    border: "2px solid #111",
                                    borderRadius: "3px 5px 3px 5px",
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
              </>
            )}
          </div>
        </div>

        {/* Event modal */}
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
            }}
          >
            <div
              className="bg-white p-6 w-full max-w-md"
              style={{
                border: "3px solid #111",
                borderRadius: IRREGULAR,
                boxShadow: "6px 8px 0 rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    fontStyle: "italic",
                    letterSpacing: "-0.02em",
                    color: "#111",
                  }}
                >
                  {editingEvent ? "Edit Event" : "New Event"}
                </h2>
                <button
                  onClick={() => setShowEventModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 18,
                    cursor: "pointer",
                    color: "#a1a1aa",
                    lineHeight: 1,
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input
                    type="text"
                    placeholder="Event title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Details</label>
                  <textarea
                    placeholder="Optional details"
                    value={eventForm.details}
                    onChange={(e) => setEventForm({ ...eventForm, details: e.target.value })}
                    style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Work, Personal"
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Start *</label>
                    <DateTimePicker
                      value={eventForm.startDate}
                      onChange={(iso) => setEventForm({ ...eventForm, startDate: iso })}
                      placeholder="Start date & time"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>End *</label>
                    <DateTimePicker
                      value={eventForm.dueDate}
                      onChange={(iso) => setEventForm({ ...eventForm, dueDate: iso })}
                      placeholder="End date & time"
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 22,
                }}
              >
                <button
                  onClick={() => setShowEventModal(false)}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "white",
                    color: "#3f3f46",
                    border: "2px solid #e4e4e7",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEvent}
                  style={{
                    padding: "8px 18px",
                    fontSize: 13,
                    fontWeight: 700,
                    background: "#111",
                    color: "white",
                    border: "2px solid #111",
                    borderRadius: CARD_IRREGULAR,
                    cursor: "pointer",
                  }}
                >
                  {editingEvent ? "Save Changes" : "Create Event"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#71717a",
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "2px solid #d4d4d8",
  borderRadius: 4,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "white",
  color: "#111",
  fontFamily: "inherit",
  transition: "border-color 0.12s",
};
