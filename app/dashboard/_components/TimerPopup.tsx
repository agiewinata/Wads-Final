"use client";

import { useTimer } from "./TimerProvider";
import { Bell } from "lucide-react";

export default function TimerPopup() {
  const { popupMessage } = useTimer();
  if (!popupMessage) return null;

  return (
    <div
      className="paper"
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        maxWidth: 340,
      }}
    >
      <span
        className="grid place-items-center"
        style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent-text)", flexShrink: 0 }}
      >
        <Bell size={16} />
      </span>
      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: 0, lineHeight: 1.4 }}>
        {popupMessage}
      </p>
    </div>
  );
}