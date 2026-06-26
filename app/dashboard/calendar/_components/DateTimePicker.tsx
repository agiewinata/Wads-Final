"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";

interface DateTimePickerProps {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
}

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCells(y: number, m: number) {
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const arr: { date: Date; muted: boolean }[] = [];
  for (let i = startDow - 1; i >= 0; i--) arr.push({ date: new Date(y, m, -i), muted: true });
  for (let d = 1; d <= days; d++) arr.push({ date: new Date(y, m, d), muted: false });
  let n = 1;
  while (arr.length < 42) arr.push({ date: new Date(y, m + 1, n++), muted: true });
  return arr;
}

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
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const d = parsed ?? new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  /* Sync external value changes */
  useEffect(() => {
    if (!value) return;
    const d = new Date(value);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedDate(d);
    setHour(d.getHours());
    setMinute(d.getMinutes());
    setView({ y: d.getFullYear(), m: d.getMonth() });
  }, [value]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node) || dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function openPicker() {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const dropHeight = 430;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const top = spaceBelow >= dropHeight ? r.bottom + 6 : Math.max(8, r.top - dropHeight - 6);
    setDropPos({ top, left: r.left, width: r.width });
    if (selectedDate) setView({ y: selectedDate.getFullYear(), m: selectedDate.getMonth() });
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
    if (date.getMonth() !== view.m || date.getFullYear() !== view.y) setView({ y: date.getFullYear(), m: date.getMonth() });
    commit(date, hour, minute);
  }
  function shiftMonth(delta: number) {
    setView((v) => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
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

  const today = new Date();
  const cells = buildCells(view.y, view.m);
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        style={{
          width: "100%", padding: "9px 12px",
          border: `1px solid ${open ? "var(--accent)" : "var(--line-strong)"}`,
          borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", background: "var(--paper)",
          color: selectedDate ? "var(--ink)" : "var(--ink-faint)", cursor: "pointer", textAlign: "left",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
          transition: "border-color 0.12s",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          {selectedDate ? (
            <>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span style={{
                fontWeight: 700, fontSize: 12.5, color: "var(--accent-text)", background: "var(--accent-soft)",
                borderRadius: 6, padding: "1px 7px", letterSpacing: "0.02em", fontFamily: "var(--font-mono)", flexShrink: 0,
              }}>
                {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
              </span>
            </>
          ) : placeholder}
        </span>
        <ChevronDown size={15} style={{ color: "var(--ink-soft)", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .12s" }} />
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          className="paper"
          style={{
            position: "fixed", top: dropPos.top, left: dropPos.left,
            minWidth: Math.max(dropPos.width, 300), width: Math.max(dropPos.width, 300),
            zIndex: 9999, padding: 14,
          }}
        >
          {/* month nav */}
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <button type="button" onClick={() => shiftMonth(-1)} className="grid place-items-center" style={navBtn}><ChevronLeft size={16} /></button>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{monthLabel}</div>
            <button type="button" onClick={() => shiftMonth(1)} className="grid place-items-center" style={navBtn}><ChevronRight size={16} /></button>
          </div>

          {/* grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {DOW.map((d, i) => (
              <div key={i} style={{ fontSize: 10.5, fontWeight: 700, textAlign: "center", color: "var(--ink-faint)", paddingBottom: 4, textTransform: "uppercase" }}>{d}</div>
            ))}
            {cells.map(({ date, muted }, i) => {
              const isSel = selectedDate ? sameDay(date, selectedDate) : false;
              const isToday = sameDay(date, today);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDateSelect(date)}
                  style={{
                    aspectRatio: "1", display: "grid", placeItems: "center",
                    fontSize: 13, borderRadius: "50%", border: "none", cursor: "pointer",
                    fontWeight: isSel ? 700 : 500,
                    color: isSel ? "#fff" : muted ? "var(--ink-faint)" : "var(--ink-soft)",
                    background: isSel ? "var(--accent)" : "transparent",
                    opacity: muted ? 0.45 : 1,
                    boxShadow: !isSel && isToday ? "inset 0 0 0 1.5px var(--accent)" : "none",
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* divider */}
          <div style={{ borderTop: "1px solid var(--line)", margin: "12px -14px" }} />

          {/* time */}
          <div className="flex items-center justify-center" style={{ gap: 10, padding: "2px 0 4px" }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-faint)", width: 34 }}>Time</span>

            <div className="flex flex-col items-center" style={{ gap: 3 }}>
              <button type="button" onClick={() => nudgeHour(1)} style={arrowBtn}><ChevronUp size={13} /></button>
              <div style={timeBox}>{String(hour).padStart(2, "0")}</div>
              <button type="button" onClick={() => nudgeHour(-1)} style={arrowBtn}><ChevronDown size={13} /></button>
            </div>

            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", lineHeight: 1, marginTop: -2, userSelect: "none" }}>:</span>

            <div className="flex flex-col items-center" style={{ gap: 3 }}>
              <button type="button" onClick={() => nudgeMinute(5)} style={arrowBtn}><ChevronUp size={13} /></button>
              <div style={timeBox}>{String(minute).padStart(2, "0")}</div>
              <button type="button" onClick={() => nudgeMinute(-5)} style={arrowBtn}><ChevronDown size={13} /></button>
            </div>

            <div className="flex flex-col" style={{ gap: 3, marginLeft: 6 }}>
              {[
                { label: "9 AM", h: 9, m: 0 },
                { label: "12 PM", h: 12, m: 0 },
                { label: "5 PM", h: 17, m: 0 },
              ].map(({ label, h, m }) => {
                const active = hour === h && minute === m;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { setHour(h); setMinute(m); commit(selectedDate, h, m); }}
                    style={{
                      padding: "2px 9px", fontSize: 10.5, fontWeight: 700, cursor: "pointer", borderRadius: 6,
                      background: active ? "var(--accent)" : "var(--paper-2)",
                      color: active ? "#fff" : "var(--ink-soft)",
                      border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                      transition: "all 0.1s",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* confirm */}
          <button type="button" onClick={() => setOpen(false)} className="btn-ink" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
            {selectedDate ? "Confirm" : "Close"}
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

const navBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8, border: "1px solid var(--line-strong)",
  background: "var(--paper)", color: "var(--ink-soft)", cursor: "pointer",
};

const arrowBtn: React.CSSProperties = {
  background: "var(--paper)", border: "1px solid var(--line-strong)", borderRadius: 6,
  padding: "3px 8px", cursor: "pointer", color: "var(--ink-soft)", lineHeight: 1,
  display: "grid", placeItems: "center",
};

const timeBox: React.CSSProperties = {
  width: 46, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)",
  border: "1px solid var(--line-strong)", borderRadius: 8, background: "var(--paper-2)",
  fontFamily: "var(--font-mono)", userSelect: "none",
};