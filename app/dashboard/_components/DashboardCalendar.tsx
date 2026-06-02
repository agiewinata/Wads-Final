"use client";

import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
}

interface Event {
  id: string;
  title: string;
  startDate: string;
  dueDate?: string | null;
}

export default function DashboardCalendar() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    async function loadData() {
      try {
        const [taskRes, eventRes] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/events"),
        ]);

        if (taskRes.ok) {
          setTasks(await taskRes.json());
        }

        if (eventRes.ok) {
          setEvents(await eventRes.json());
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadData();
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

  return (
    <div
      className="bg-white p-4"
      style={{
        border: "3px solid #111",
        borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
        boxShadow: "6px 8px 0 rgba(0,0,0,0.12)",
      }}
    >
      <h2 className="text-lg font-semibold mb-4">
        Calendar
      </h2>

      <Calendar
        value={selectedDate}
        onChange={(value) => setSelectedDate(value as Date)}
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

          const hasEvent = events.some((event) => {
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

            return (
              currentDay >= startDay &&
              currentDay <= endDay
            );
          });

          if (!hasTask && !hasEvent) return null;

          return (
            <div className="flex justify-center gap-1 mt-1">
              {hasTask && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "999px",
                    background: "#111",
                  }}
                />
              )}

              {hasEvent && (
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

      <div className="mt-4">
        <h3 className="font-semibold text-sm mb-2">
          {selectedDate.toDateString()}
        </h3>

        {selectedTasks.slice(0, 3).map((task) => (
          <div
            key={task.id}
            className="text-sm text-zinc-700"
          >
            📋 {task.title}
          </div>
        ))}

        {selectedEvents.slice(0, 3).map((event) => (
          <div
            key={event.id}
            className="text-sm text-zinc-700"
          >
            📅 {event.title}
          </div>
        ))}

        {selectedTasks.length === 0 &&
          selectedEvents.length === 0 && (
            <p className="text-sm text-zinc-500">
              No items
            </p>
          )}
      </div>
    </div>
  );
}