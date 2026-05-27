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

      return (
        start.getDate() === selectedDate.getDate() &&
        start.getMonth() === selectedDate.getMonth() &&
        start.getFullYear() === selectedDate.getFullYear()
      );
    });
  }, [events, selectedDate]);

  return (
    <div
      className="bg-white p-6 h-full w-full overflow-auto"
      style={{
        border: "3px solid #111",
        borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
        boxShadow: "6px 8px 0 rgba(0,0,0,0.12)",
      }}
    >
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">
        Calendar
      </h1>

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

            return (
              start.getDate() === date.getDate() &&
              start.getMonth() === date.getMonth() &&
              start.getFullYear() === date.getFullYear()
            );
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
                      Starts:{" "}
                      {new Date(event.startDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>

                    {event.details && (
                      <p className="text-sm text-zinc-700 mt-3">
                        {event.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}