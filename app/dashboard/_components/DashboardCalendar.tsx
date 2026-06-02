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

  const selectedItems = useMemo(() => {
    const tasksForDay = tasks.filter((task) => {
      if (!task.dueDate) return false;

      const due = new Date(task.dueDate);

      return (
        due.getDate() === selectedDate.getDate() &&
        due.getMonth() === selectedDate.getMonth() &&
        due.getFullYear() === selectedDate.getFullYear()
      );
    });

    const eventsForDay = events.filter((event) => {
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

    return { tasksForDay, eventsForDay };
  }, [tasks, events, selectedDate]);

  return (
    <div
      className="bg-white p-4"
      style={{
        border: "3px solid #111",
        borderRadius: "6px",
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
      />

      <div className="mt-4">
        <h3 className="font-medium mb-2">
          {selectedDate.toDateString()}
        </h3>

        {selectedItems.tasksForDay.map((task) => (
          <div key={task.id} className="text-sm">
            📋 {task.title}
          </div>
        ))}

        {selectedItems.eventsForDay.map((event) => (
          <div key={event.id} className="text-sm">
            📅 {event.title}
          </div>
        ))}

        {selectedItems.tasksForDay.length === 0 &&
          selectedItems.eventsForDay.length === 0 && (
            <p className="text-sm text-zinc-500">
              No items
            </p>
          )}
      </div>
    </div>
  );
}