"use client";

import { useState } from "react";
import { useTimer } from "../_components/TimerProvider";

const IRREGULAR = "6px 8px 5px 7px / 7px 5px 8px 6px";
const CARD_IRR  = "4px 6px 4px 6px / 6px 4px 6px 4px";

export default function DashboardTimer() {
  const [screen, setScreen] = useState<"timer" | "settings">("timer");
  const [showNotifPopup, setShowNotifPopup] = useState(false);

  const {
    focusMinutes,
    setFocusMinutes,
    shortBreakMinutes,
    setShortBreakMinutes,
    longBreakMinutes,
    setLongBreakMinutes,
    longBreakInterval,
    setLongBreakInterval,
    autoStartBreaks,
    setAutoStartBreaks,
    isRunning,
    setIsRunning,
    displayMinutes,
    displaySeconds,
    innerModeLabel,
    mode,
    setModeAndReset,
    requestNotificationPermission,
    resetTimer,
    saveSettings,
  } = useTimer();

  return (
    <div
      className="bg-white h-full w-full flex flex-col overflow-hidden"
      style={{
        border: "3px solid #111",
        borderRadius: IRREGULAR,
        boxShadow: "6px 8px 0 rgba(0,0,0,0.12)",
        position: "relative",
      }}
    >
      {/* Notification permission popup */}
      {showNotifPopup && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            borderRadius: IRREGULAR,
          }}
        >
          <div
            style={{
              background: "white",
              border: "3px solid #111",
              borderRadius: IRREGULAR,
              boxShadow: "5px 6px 0 rgba(0,0,0,0.18)",
              padding: "24px 20px 20px",
              width: "calc(100% - 32px)",
              maxWidth: 280,
            }}
          >
            <div style={{ fontSize: 28, textAlign: "center", marginBottom: 10 }}>🔔</div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 800,
                fontStyle: "italic",
                letterSpacing: "-0.02em",
                color: "#111",
                textAlign: "center",
                marginBottom: 6,
              }}
            >
              Enable notifications?
            </h3>
            <p
              style={{
                fontSize: 12,
                color: "#71717a",
                textAlign: "center",
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              Get alerted when your focus session or break ends — even if this tab is in the background.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  setShowNotifPopup(false);
                  setIsRunning(true);
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: "white",
                  color: "#71717a",
                  border: "2px solid #e4e4e7",
                  borderRadius: CARD_IRR,
                  cursor: "pointer",
                }}
              >
                No thanks
              </button>
              <button
                onClick={async () => {
                  setShowNotifPopup(false);
                  await requestNotificationPermission();
                  setIsRunning(true);
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  fontSize: 12,
                  fontWeight: 700,
                  background: "#111",
                  color: "white",
                  border: "2px solid #111",
                  borderRadius: CARD_IRR,
                  cursor: "pointer",
                }}
              >
                Yes, enable
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5">
        {screen === "timer" ? (
          <>
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#a1a1aa",
                    marginBottom: 2,
                  }}
                >
                  Pomodoro
                </div>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    fontStyle: "italic",
                    letterSpacing: "-0.03em",
                    color: "#111",
                    lineHeight: 1,
                  }}
                >
                  Study Timer
                </h2>
              </div>
              <button
                onClick={() => setScreen("settings")}
                style={{
                  background: "white",
                  border: "2px solid #e4e4e7",
                  borderRadius: CARD_IRR,
                  padding: "6px 10px",
                  fontSize: 14,
                  cursor: "pointer",
                  color: "#71717a",
                  transition: "border-color 0.12s",
                }}
              >
                ⚙
              </button>
            </div>

            {/* Mode tabs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 6,
                marginBottom: 14,
              }}
            >
              {(
                [
                  { key: "focus",      label: "Focus" },
                  { key: "shortBreak", label: "Short" },
                  { key: "longBreak",  label: "Long" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setModeAndReset(key)}
                  style={{
                    padding: "7px 0",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    border: "2px solid #111",
                    borderRadius: CARD_IRR,
                    background: mode === key ? "#111" : "white",
                    color: mode === key ? "white" : "#111",
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Time display */}
            <div
              style={{
                background: "#fafafa",
                border: "2px solid #e4e4e7",
                borderRadius: CARD_IRR,
                padding: "20px 16px",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#a1a1aa",
                  marginBottom: 6,
                }}
              >
                {innerModeLabel}
              </div>
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: "#111",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String(displayMinutes).padStart(2, "0")}
                <span style={{ color: "#d4d4d8", margin: "0 2px" }}>:</span>
                {String(displaySeconds).padStart(2, "0")}
              </div>
            </div>

            {/* Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
              }}
            >
              {/* Reset */}
              <button
                onClick={resetTimer}
                style={{
                  width: 42,
                  height: 42,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  border: "2px solid #e4e4e7",
                  background: "white",
                  fontSize: 18,
                  cursor: "pointer",
                  color: "#71717a",
                  transition: "border-color 0.12s",
                }}
              >
                ↻
              </button>

              {/* Play/Pause */}
              <button
                onClick={() => {
                  if (
                    typeof Notification !== "undefined" &&
                    Notification.permission === "default"
                  ) {
                    setShowNotifPopup(true);
                  } else {
                    setIsRunning((prev: boolean) => !prev);
                  }
                }}
                style={{
                  width: 58,
                  height: 58,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  border: "3px solid #111",
                  background: "#111",
                  color: "white",
                  fontSize: 20,
                  cursor: "pointer",
                  boxShadow: "3px 4px 0 rgba(0,0,0,0.18)",
                  transition: "transform 0.1s",
                }}
              >
                {isRunning ? "⏸" : "▶"}
              </button>

              {/* Spacer mirror of reset for centering */}
              <div style={{ width: 42 }} />
            </div>
          </>
        ) : (
          <>
            {/* Settings header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  fontStyle: "italic",
                  letterSpacing: "-0.03em",
                  color: "#111",
                }}
              >
                Settings
              </h2>
              <button
                onClick={() => setScreen("timer")}
                style={{
                  background: "white",
                  border: "2px solid #e4e4e7",
                  borderRadius: CARD_IRR,
                  padding: "6px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                  color: "#71717a",
                }}
              >
                ←
              </button>
            </div>

            <TimerInput label="Focus time"          value={focusMinutes}      onChange={setFocusMinutes} />
            <TimerInput label="Short break"         value={shortBreakMinutes} onChange={setShortBreakMinutes} />
            <TimerInput label="Long break"          value={longBreakMinutes}  onChange={setLongBreakMinutes} />
            <TimerInput label="Long break interval" value={longBreakInterval} onChange={setLongBreakInterval} />

            {/* Auto-start toggle */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
                padding: "10px 0",
                borderTop: "1px solid #f4f4f5",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
                  Auto-start breaks
                </div>
                <div style={{ fontSize: 11, color: "#a1a1aa" }}>
                  Automatically starts break timers
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoStartBreaks((prev: boolean) => !prev)}
                style={{
                  position: "relative",
                  width: 44,
                  height: 24,
                  borderRadius: 999,
                  border: "2px solid #111",
                  background: autoStartBreaks ? "#111" : "white",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: autoStartBreaks ? 20 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: autoStartBreaks ? "white" : "#d4d4d8",
                    transition: "left 0.15s",
                  }}
                />
              </button>
            </div>

            {/* Save / Cancel */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setScreen("timer")}
                style={{
                  flex: 1,
                  padding: "9px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "2px solid #e4e4e7",
                  borderRadius: CARD_IRR,
                  background: "white",
                  color: "#3f3f46",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { saveSettings(); setScreen("timer"); }}
                style={{
                  flex: 1,
                  padding: "9px",
                  fontSize: 13,
                  fontWeight: 700,
                  border: "2px solid #111",
                  borderRadius: CARD_IRR,
                  background: "#111",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TimerInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#a1a1aa",
          marginBottom: 5,
        }}
      >
        {label}{" "}
        <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
          ({label === "Long break interval" ? "sessions" : "min"})
        </span>
      </div>
      <div
        style={{
          display: "flex",
          border: "2px solid #111",
          borderRadius: "4px 6px 4px 6px",
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          style={{
            width: 36,
            borderRight: "2px solid #111",
            background: "#fafafa",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            color: "#111",
            flexShrink: 0,
          }}
        >
          −
        </button>
        <input
          type="number"
          min="1"
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v > 0) onChange(v);
          }}
          style={{
            flex: 1,
            textAlign: "center",
            border: "none",
            outline: "none",
            fontSize: 14,
            fontWeight: 700,
            color: "#111",
            background: "white",
          }}
        />
        <button
          onClick={() => onChange(value + 1)}
          style={{
            width: 36,
            borderLeft: "2px solid #111",
            background: "#fafafa",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            color: "#111",
            flexShrink: 0,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
