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
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const response = await fetch("/api/tasks");

        if (!response.ok) {
          throw new Error("Failed to fetch tasks");
        }

        const data = await response.json();
        setTasks(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
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

  return (
    <div className="flex gap-6 h-full flex-col xl:flex-row">
      {/* Calendar */}
      <div
        className="bg-white p-6"
        style={{
          border: "3px solid #111",
          borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
          boxShadow: "6px 8px 0 rgba(0,0,0,0.12)",
        }}
      >
        <h1 className="text-2xl font-semibold text-zinc-900 mb-6">
          Calendar
        </h1>

        <Calendar
          onChange={(value) => setSelectedDate(value as Date)}
          value={selectedDate}
          className="border-0 w-full"
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

            if (!hasTask) return null;

            return (
              <div className="mt-1 flex justify-center">
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "999px",
                    background: "#111",
                  }}
                />
              </div>
            );
          }}
        />
      </div>

      {/* Task Panel */}
      <div
        className="bg-white flex-1 p-6"
        style={{
          border: "3px solid #111",
          borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
          boxShadow: "6px 8px 0 rgba(0,0,0,0.12)",
        }}
      >
        <h2 className="text-2xl font-semibold text-zinc-900 mb-2">
          Tasks Due
        </h2>

        <p className="text-sm text-zinc-500 mb-6">
          {selectedDate.toDateString()}
        </p>

        {loading ? (
          <p className="text-sm text-zinc-400 italic">
            loading tasks...
          </p>
        ) : selectedTasks.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No tasks due on this date.
          </p>
        ) : (
          <div className="space-y-4">
            {selectedTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 bg-zinc-50"
                style={{
                  border: "2px solid #111",
                  borderRadius: "4px 6px 4px 6px",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-zinc-900">
                      {task.title}
                    </h3>

                    {task.category && (
                      <p className="text-sm text-zinc-500 mt-1">
                        Category: {task.category}
                      </p>
                    )}
                  </div>

                  {task.priority && (
                    <div
                      className="text-xs font-bold px-2 py-1"
                      style={{
                        border: "2px solid #111",
                        borderRadius: "4px",
                      }}
                    >
                      P{task.priority}
                    </div>
                  )}
                </div>

                {task.dueDate && (
                  <p className="text-sm text-zinc-500 mt-3">
                    Due:{" "}
                    {new Date(task.dueDate).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}