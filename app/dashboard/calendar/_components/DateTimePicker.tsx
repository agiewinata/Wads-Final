"use client";

import { useEffect, useRef, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

interface DateTimePickerProps {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
}

const IRREGULAR = "6px 8px 5px 7px / 7px 5px 8px 6px";

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
}: DateTimePickerProps) {
  const parsed = value ? new Date(value) : null;

  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(parsed);
  const [hour, setHour] = useState(parsed ? parsed.getHours() : 9);
  const [minute, setMinute] = useState(parsed ? parsed.getMinutes() : 0);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  /* Sync external value changes */
  useEffect(() => {
    if (!value) return;
    const d = new Date(value);
    setSelectedDate(d);
    setHour(d.getHours());
    setMinute(d.getMinutes());
  }, [value]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function openPicker() {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const dropHeight = 420;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const top =
      spaceBelow >= dropHeight ? r.bottom + 6 : r.top - dropHeight - 6;
    setDropPos({ top, left: r.left, width: r.width });
    setOpen((o) => !o);
  }

  function commit(date: Date | null, h: number, m: number) {
    if (!date) return;
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    onChange(d.toISOString());
  }

  function handleDateSelect(date: Date) {
    setSelectedDate(date);
    commit(date, hour, minute);
  }

  function nudgeHour(delta: number) {
    const next = (hour + delta + 24) % 24;
    setHour(next);
    commit(selectedDate, next, minute);
  }

  function nudgeMinute(delta: number) {
    const next = (minute + delta + 60) % 60;
    setMinute(next);
    commit(selectedDate, hour, next);
  }

  function formatDisplay() {
    if (!selectedDate) return null;
    return (
      <>
        <span>
          {selectedDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <span
          style={{
            fontWeight: 800,
            fontSize: 13,
            color: "#111",
            background: "#f4f4f5",
            border: "1.5px solid #e4e4e7",
            borderRadius: 4,
            padding: "1px 7px",
            letterSpacing: "0.02em",
          }}
        >
          {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
        </span>
      </>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        style={{
          width: "100%",
          padding: "8px 12px",
          border: `2px solid ${open ? "#111" : "#d4d4d8"}`,
          borderRadius: 4,
          fontSize: 13,
          fontFamily: "inherit",
          background: "white",
          color: selectedDate ? "#111" : "#a1a1aa",
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          transition: "border-color 0.12s",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          {selectedDate ? formatDisplay() : placeholder}
        </span>
        <span style={{ color: "#a1a1aa", fontSize: 10, flexShrink: 0 }}>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div
          ref={dropRef}
          style={{
            position: "fixed",
            top: dropPos.top,
            left: dropPos.left,
            minWidth: Math.max(dropPos.width, 296),
            zIndex: 9999,
            background: "white",
            border: "2px solid #111",
            borderRadius: IRREGULAR,
            boxShadow: "5px 6px 0 rgba(0,0,0,0.14)",
            padding: "14px 14px 12px",
          }}
        >
          {/* Calendar */}
          <div className="themed-cal">
            <Calendar
              onChange={(v) => handleDateSelect(v as Date)}
              value={selectedDate ?? new Date()}
            />
          </div>

          {/* Divider */}
          <div
            style={{
              borderTop: "1.5px solid #e4e4e7",
              margin: "10px -14px",
            }}
          />

          {/* Time picker */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "4px 0 6px",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#a1a1aa",
                width: 36,
              }}
            >
              Time
            </span>

            {/* Hour column */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <button type="button" onClick={() => nudgeHour(1)} style={arrowBtn}>
                ▲
              </button>
              <div style={timeBox}>{String(hour).padStart(2, "0")}</div>
              <button type="button" onClick={() => nudgeHour(-1)} style={arrowBtn}>
                ▼
              </button>
            </div>

            <span
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#111",
                lineHeight: 1,
                marginTop: -2,
                userSelect: "none",
              }}
            >
              :
            </span>

            {/* Minute column */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <button type="button" onClick={() => nudgeMinute(5)} style={arrowBtn}>
                ▲
              </button>
              <div style={timeBox}>{String(minute).padStart(2, "0")}</div>
              <button type="button" onClick={() => nudgeMinute(-5)} style={arrowBtn}>
                ▼
              </button>
            </div>

            {/* Quick presets */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                marginLeft: 8,
              }}
            >
              {[
                { label: "9 AM", h: 9, m: 0 },
                { label: "12 PM", h: 12, m: 0 },
                { label: "5 PM", h: 17, m: 0 },
              ].map(({ label, h, m }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setHour(h);
                    setMinute(m);
                    commit(selectedDate, h, m);
                  }}
                  style={{
                    padding: "2px 8px",
                    fontSize: 10,
                    fontWeight: 700,
                    background: hour === h && minute === m ? "#111" : "#f4f4f5",
                    color: hour === h && minute === m ? "white" : "#71717a",
                    border: "1.5px solid #e4e4e7",
                    borderRadius: 4,
                    cursor: "pointer",
                    transition: "all 0.1s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "7px",
              background: "#111",
              color: "white",
              fontSize: 12,
              fontWeight: 700,
              border: "2px solid #111",
              borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            {selectedDate ? "Confirm" : "Cancel"}
          </button>
        </div>
      )}
    </>
  );
}

const arrowBtn: React.CSSProperties = {
  background: "white",
  border: "1.5px solid #e4e4e7",
  borderRadius: 3,
  padding: "2px 8px",
  fontSize: 8,
  cursor: "pointer",
  color: "#71717a",
  lineHeight: 1,
  transition: "background 0.1s",
};

const timeBox: React.CSSProperties = {
  width: 48,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  color: "#111",
  border: "2px solid #111",
  borderRadius: "4px 6px 4px 6px",
  background: "#fafafa",
  userSelect: "none",
};
