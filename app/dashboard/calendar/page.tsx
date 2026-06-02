"use client";

import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

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
        /* Fetch tasks */
        const taskResponse = await fetch("/api/tasks");
        const taskData = await taskResponse.json();

        if (taskResponse.ok) {
          setTasks(taskData);
        } else {
          console.error(taskData);
        }

        /* Fetch events */
        const eventResponse = await fetch("/api/events");
        const eventData = await eventResponse.json();

        if (eventResponse.ok) {
          setEvents(eventData);
        } else {
          console.error(eventData);
        }
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

      const end = event.dueDate
        ? new Date(event.dueDate)
        : start;

      const selected = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );

      const startDay = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      );

      const endDay = new Date(
        end.getFullYear(),
        end.getMonth(),
        end.getDate()
      );

      return selected >= startDay && selected <= endDay;
    });
  }, [events, selectedDate]);

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

    if (
      new Date(eventForm.dueDate) <
      new Date(eventForm.startDate)
    ) {
      alert("End date must be after start date");
      return;
    }
    try {
      const url = editingEvent
        ? `/api/events/${editingEvent.id}`
        : "/api/events";

      const method = editingEvent
        ? "PATCH"
        : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventForm),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        return;
      }

      if (editingEvent) {
        setEvents((prev) =>
          prev.map((event) =>
            event.id === data.id
              ? data
              : event
          )
        );
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

  return (
    <div
      className="bg-white p-6 h-full w-full overflow-auto"
      style={{
        border: "3px solid #111",
        borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
        boxShadow: "6px 8px 0 rgba(0,0,0,0.12)",
      }}
    >
      <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Calendar
      </h1>

      <button
        onClick={() => {
          setEditingEvent(null);

          setEventForm({
            title: "",
            details: "",
            category: "",
            startDate: "",
            dueDate: "",
          });

          setShowEventModal(true);
        }}
        className="px-4 py-2 bg-black text-white"
        style={{
          borderRadius: "4px",
        }}
      >
        Add Event
      </button>
    </div>

      {/* Calendar */}
      <Calendar
        onChange={(value) => setSelectedDate(value as Date)}
        value={selectedDate}
        className="border-0 w-full"
        tileContent={({ date, view }) => {
          if (view !== "month") return null;

          /* Tasks on day */
          const dayTasks = tasks.filter((task) => {
            if (!task.dueDate) return false;

            const due = new Date(task.dueDate);

            return (
              due.getDate() === date.getDate() &&
              due.getMonth() === date.getMonth() &&
              due.getFullYear() === date.getFullYear()
            );
          });

          /* Events on day */
          const dayEvents = events.filter((event) => {
          const start = new Date(event.startDate);

          const end = event.dueDate
            ? new Date(event.dueDate)
            : start;

          const currentDay = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
          );

          const startDay = new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate()
          );

          const endDay = new Date(
            end.getFullYear(),
            end.getMonth(),
            end.getDate()
          );

          return currentDay >= startDay && currentDay <= endDay;
        });

          if (dayTasks.length === 0 && dayEvents.length === 0) {
            return null;
          }

          let taskDotColor = "#111";

          if (dayTasks.some((task) => task.completed)) {
            taskDotColor = "#16a34a";
          }

          if (
            dayTasks.some(
              (task) =>
                !task.completed &&
                task.dueDate &&
                new Date(task.dueDate) < new Date()
            )
          ) {
            taskDotColor = "#dc2626";
          }

          return (
            <div className="mt-1 flex justify-center gap-1">
              {/* Task dot */}
              {dayTasks.length > 0 && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "999px",
                    background: taskDotColor,
                  }}
                />
              )}

              {/* Event dot */}
              {dayEvents.length > 0 && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "999px",
                    background: "#2563eb",
                  }}
                />
              )}
            </div>
          );
        }}
      />

      {/* Selected Date */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 mb-6">
          {selectedDate.toDateString()}
        </h2>

        {loading && (
          <p className="text-sm text-zinc-400 italic">
            loading...
          </p>
        )}

        {/* Tasks */}
        {!loading && (
          <>
            <h3 className="text-md font-semibold mb-3">
              Tasks
            </h3>

            {selectedTasks.length === 0 ? (
              <p className="text-sm text-zinc-500 mb-6">
                No tasks due.
              </p>
            ) : (
              <div className="space-y-3 mb-8">
                {selectedTasks.map((task) => {
                  const isOverdue =
                    task.dueDate &&
                    !task.completed &&
                    new Date(task.dueDate) < new Date();

                  return (
                    <div
                      key={task.id}
                      className="p-4 bg-zinc-50"
                      style={{
                        border: "2px solid #111",
                        borderRadius: "4px 6px 4px 6px",
                      }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-zinc-900">
                            {task.title}
                          </h3>

                          {/* Status */}
                          <div className="flex items-center gap-2 mt-2">
                            {task.completed ? (
                              <span className="text-sm font-medium text-green-600">
                                ✅ Done
                              </span>
                            ) : isOverdue ? (
                              <span className="text-sm font-medium text-red-600">
                                ⚠️ Overdue
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-zinc-500">
                                • Pending
                              </span>
                            )}
                          </div>

                          {task.category && (
                            <p className="text-sm text-zinc-500 mt-2">
                              Category: {task.category}
                            </p>
                          )}

                          {task.dueDate && (
                            <p className="text-sm text-zinc-500 mt-2">
                              Due:{" "}
                              {new Date(task.dueDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>

                        {/* Priority */}
                        {task.priority && (() => {
                          const priorityColors = {
                            1: "#fde047",
                            2: "#eab308",
                            3: "#ca8a04",
                            4: "#ea580c",
                            5: "#dc2626",
                          };

                          return (
                            <div
                              className="text-xs font-bold px-2 py-1 text-black"
                              style={{
                                border: "2px solid #111",
                                borderRadius: "4px",
                                background:
                                  priorityColors[
                                    task.priority as keyof typeof priorityColors
                                  ],
                              }}
                            >
                              P{task.priority}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Events */}
            <h3 className="text-md font-semibold mb-3">
              Events
            </h3>

            {selectedEvents.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No events.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4"
                    style={{
                      border: "2px solid #2563eb",
                      borderRadius: "6px",
                      background: "#eff6ff",
                    }}
                  >
                    <h3 className="font-semibold text-zinc-900">
                      {event.title}
                    </h3>

                    {event.category && (
                      <p className="text-sm text-zinc-500 mt-2">
                        Category: {event.category}
                      </p>
                    )}

                    <p className="text-sm text-zinc-500 mt-2">
                    Start:{" "}
                    {new Date(event.startDate).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  {event.dueDate && (
                    <p className="text-sm text-zinc-500 mt-1">
                      End:{" "}
                      {new Date(event.dueDate).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}

                    {event.details && (
                      <p className="text-sm text-zinc-700 mt-3">
                        {event.details}
                      </p>
                    )}
                    <button
                      onClick={() => {
                        setEditingEvent(event);

                        setEventForm({
                          title: event.title,
                          details: event.details ?? "",
                          category: event.category ?? "",
                          startDate: event.startDate,
                          dueDate: event.dueDate ?? "",
                        });

                        setShowEventModal(true);
                      }}
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: "#d4d4d8",
                        color: "#111",
                        border: "2px solid #111",
                        borderRadius: "4px 6px 4px 6px",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {showEventModal && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
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
            borderRadius: "6px",
          }}
        >
          <h2 className="text-xl font-semibold mb-4">
            {editingEvent ? "Edit Event" : "Add Event"}
          </h2>

          <input
            type="text"
            placeholder="Title"
            value={eventForm.title}
            onChange={(e) =>
              setEventForm({
                ...eventForm,
                title: e.target.value,
              })
            }
            className="w-full border p-2 mb-3"
          />

          <textarea
            placeholder="Details"
            value={eventForm.details}
            onChange={(e) =>
              setEventForm({
                ...eventForm,
                details: e.target.value,
              })
            }
            className="w-full border p-2 mb-3"
          />

          <input
            type="text"
            placeholder="Category"
            value={eventForm.category}
            onChange={(e) =>
              setEventForm({
                ...eventForm,
                category: e.target.value,
              })
            }
            className="w-full border p-2 mb-3"
          />

          <label className="block text-sm mb-1">
            Start Date
          </label>

          <input
            type="datetime-local"
            className="w-full border p-2 mb-3"
            onChange={(e) =>
              setEventForm({
                ...eventForm,
                startDate: new Date(
                  e.target.value
                ).toISOString(),
              })
            }
          />

          <label className="block text-sm mb-1">
            End Date
          </label>

          <input
            type="datetime-local"
            className="w-full border p-2 mb-4"
            onChange={(e) =>
              setEventForm({
                ...eventForm,
                dueDate: new Date(
                  e.target.value
                ).toISOString(),
              })
            }
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowEventModal(false)}
              className="px-4 py-2 border"
            >
              Cancel
            </button>

            <button
              onClick={saveEvent}
              className="px-4 py-2 bg-black text-white"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}