"use client";

import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function CalendarPage() {
  const [date, setDate] = useState<Value>(new Date());

  return (
    <div className="w-full h-full flex flex-col">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">
        Calendar
      </h1>

      <div
        className="bg-white p-6"
        style={{
          border: "3px solid #111",
          borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
          boxShadow: "6px 8px 0 rgba(0,0,0,0.12)",
          width: "fit-content",
        }}
      >
        <Calendar
          onChange={setDate}
          value={date}
          className="border-0"
        />

        <p className="mt-4 text-sm text-zinc-600">
          Selected date:{" "}
          <span className="font-medium text-zinc-900">
            {date instanceof Date
              ? date.toDateString()
              : "Multiple dates selected"}
          </span>
        </p>
      </div>
    </div>
  );
}