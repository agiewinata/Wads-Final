"use client";

import { useTimer } from "../_components/TimerProvider";
import {
  Settings,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Sparkles,
} from "lucide-react";

const RADIUS = 98;
const CENTER = 112;
const KNOB_SIZE = 36;
const KNOB_OFFSET = KNOB_SIZE / 2;

function fmtFocus(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function TimerPage() {
  const {
    screen,
    setScreen,
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
    isRewinding,
    isSnapping,
    isTabRestoring,
    displayMinutes,
    displaySeconds,
    progress,
    mode,
    innerModeLabel,
    requestNotificationPermission,
    saveSettings,
    setModeAndReset,
    completedFocusSessions,
    totalFocusMinutes,
    resetStatistics,
    resetSettingsToDefault,
  } = useTimer();

  const circumference = 2 * Math.PI * RADIUS;
  const strokeDashoffset = circumference * (1 - progress);
  const elapsedProgress = 1 - progress;
  const angle = 90 + elapsedProgress * 360;
  const knobX = CENTER - RADIUS * Math.cos((angle * Math.PI) / 180);
  const knobY = CENTER + RADIUS * Math.sin((angle * Math.PI) / 180);
  const shouldDisableTransition = isRewinding || isSnapping || isTabRestoring;

  const modes: { key: "focus" | "shortBreak" | "longBreak"; label: string }[] = [
    { key: "focus", label: "Focus" },
    { key: "shortBreak", label: "Short" },
    { key: "longBreak", label: "Long" },
  ];

  const setupRows = [
    { label: "Focus", value: `${focusMinutes} min` },
    { label: "Short break", value: `${shortBreakMinutes} min` },
    { label: "Long break", value: `${longBreakMinutes} min` },
    { label: "Long break after", value: `${longBreakInterval} sessions` },
  ];

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-start justify-between" style={{ gap: 16 }}>
        <div>
          <h1
            className="swipe"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              lineHeight: 1,
            }}
          >
            Study Timer
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 10 }}>
            Work in focused sessions · {completedFocusSessions} done ·{" "}
            {fmtFocus(totalFocusMinutes)} banked today
          </p>
        </div>

        <button
          onClick={resetStatistics}
          className="btn-paper"
          style={{ padding: "8px 13px", fontSize: 13, marginTop: 4 }}
        >
          <RotateCcw size={14} />
          Reset statistics
        </button>
      </div>

      <div
        className="grid gap-6 items-start"
        style={{ gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)" }}
      >
        <div className="phone mx-auto" style={{ width: 340, height: 648 }}>
          <div className="phone-screen">
            <div className="phone-notch" />

            {screen === "timer" ? (
              <div className="flex h-full flex-col items-center px-7 pt-14 pb-7">
                <div className="flex-1 grid place-items-center w-full">
                  <TimerCircle
                    circumference={circumference}
                    strokeDashoffset={strokeDashoffset}
                    knobX={knobX}
                    knobY={knobY}
                    shouldDisableTransition={shouldDisableTransition}
                    innerModeLabel={innerModeLabel}
                    displayMinutes={displayMinutes}
                    displaySeconds={displaySeconds}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 w-full" style={{ marginBottom: 22 }}>
                  {modes.map((m) => {
                    const active = mode === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setModeAndReset(m.key)}
                        style={{
                          padding: "8px 0",
                          fontSize: 13,
                          fontWeight: 600,
                          borderRadius: 999,
                          cursor: "pointer",
                          border: active
                            ? "1px solid var(--accent)"
                            : "1px solid var(--line-strong)",
                          background: active ? "var(--accent)" : "var(--paper)",
                          color: active ? "#fff" : "var(--ink-soft)",
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center" style={{ gap: 20 }}>
                  <button
                    onClick={() => setScreen("settings")}
                    className="grid place-items-center"
                    style={ctrlSmall}
                    title="Timer settings"
                  >
                    <Settings size={18} />
                  </button>

                  <button
                    onClick={async () => {
                      await requestNotificationPermission();
                      setIsRunning((prev: boolean) => !prev);
                    }}
                    className="grid place-items-center"
                    style={playButton}
                  >
                    {isRunning ? (
                      <Pause size={26} fill="currentColor" />
                    ) : (
                      <Play size={26} fill="currentColor" style={{ marginLeft: 3 }} />
                    )}
                  </button>

                  <button
                    onClick={resetSettingsToDefault}
                    className="grid place-items-center"
                    style={ctrlSmall}
                    title="Reset timer settings"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>

                <p style={{ marginTop: 20, fontSize: 13, color: "var(--ink-soft)" }}>
                  {isRunning ? "Timer is running" : "Timer is paused"}
                </p>
              </div>
            ) : (
              <div className="flex h-full flex-col px-7 pt-14 pb-6">
                <h1
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: 21,
                    fontWeight: 600,
                    color: "var(--ink)",
                    marginBottom: 6,
                    textAlign: "center",
                  }}
                >
                  Timer Settings
                </h1>

                <p
                  style={{
                    fontSize: 12,
                    color: "var(--ink-soft)",
                    textAlign: "center",
                    marginBottom: 18,
                  }}
                >
                  Customize your focus rhythm.
                </p>

                <div className="flex-1 overflow-y-auto" style={{ paddingRight: 2 }}>
                  <TimerInput label="Focus time" value={focusMinutes} onChange={setFocusMinutes} />
                  <TimerInput label="Short break" value={shortBreakMinutes} onChange={setShortBreakMinutes} />
                  <TimerInput label="Long break" value={longBreakMinutes} onChange={setLongBreakMinutes} />
                  <TimerInput label="Long break interval" value={longBreakInterval} onChange={setLongBreakInterval} />

                  <div className="flex items-center justify-between" style={{ gap: 14, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={inputLabel}>Auto-start breaks</label>
                      <p style={{ fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.4 }}>
                        Automatically start break timers after a focus session ends.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAutoStartBreaks((prev: boolean) => !prev)}
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        flexShrink: 0,
                        height: 30,
                        width: 54,
                        borderRadius: 999,
                        padding: 3,
                        cursor: "pointer",
                        border: autoStartBreaks
                          ? "1px solid var(--accent)"
                          : "1px solid var(--line-strong)",
                        background: autoStartBreaks ? "var(--accent)" : "var(--paper-2)",
                        transition: "background .15s",
                      }}
                    >
                      <span
                        style={{
                          height: 22,
                          width: 22,
                          borderRadius: "50%",
                          background: "#fff",
                          boxShadow: "var(--shadow-sm)",
                          transform: autoStartBreaks ? "translateX(24px)" : "translateX(0)",
                          transition: "transform .15s",
                        }}
                      />
                    </button>
                  </div>
                </div>

                <button
                  onClick={resetSettingsToDefault}
                  className="btn-paper"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginTop: 14,
                  }}
                >
                  <RotateCcw size={14} />
                  Reset to default
                </button>

                <div className="flex" style={{ gap: 10, marginTop: 14 }}>
                  <button
                    onClick={() => setScreen("timer")}
                    className="btn-paper"
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSettings}
                    className="btn-ink"
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 16 }}>
          <div className="grid grid-cols-2" style={{ gap: 16 }}>
            <div className="sticky sticky--yellow" style={{ padding: "18px 20px" }}>
              <p style={statLabel}>Sessions today</p>
              <p className="hand" style={statValue}>{completedFocusSessions}</p>
              <p style={statSub}>focus sessions finished</p>
            </div>

            <div className="sticky sticky--mint sticky--r2" style={{ padding: "18px 20px" }}>
              <p style={statLabel}>Focus banked</p>
              <p className="hand" style={statValue}>{fmtFocus(totalFocusMinutes)}</p>
              <p style={statSub}>time studied today</p>
            </div>
          </div>

          <div className="paper" style={{ padding: "20px 22px" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <h2 style={cardTitle}>Your setup</h2>

              <div className="flex items-center" style={{ gap: 10 }}>
                <button
                  onClick={() => setScreen("settings")}
                  className="btn-paper"
                  style={{ padding: "7px 13px", fontSize: 13 }}
                >
                  <Settings size={14} /> Adjust
                </button>

                <button
                  onClick={resetSettingsToDefault}
                  className="btn-paper"
                  style={{ padding: "7px 13px", fontSize: 13 }}
                >
                  <RotateCcw size={14} /> Reset to default
                </button>
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: 2 }}>
              {setupRows.map((row, i) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between"
                  style={{
                    padding: "10px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--line)",
                  }}
                >
                  <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "var(--ink)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="paper" style={{ padding: "20px 22px" }}>
            <div className="flex items-center" style={{ gap: 9, marginBottom: 12 }}>
              <span
                className="grid place-items-center"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: "var(--accent-soft)",
                  color: "var(--accent-text)",
                  flexShrink: 0,
                }}
              >
                <Sparkles size={16} />
              </span>
              <h2 style={cardTitle}>How it flows</h2>
            </div>

            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>
              Work in a <strong style={{ color: "var(--ink)" }}>{focusMinutes}-minute</strong>{" "}
              focus session, then take a{" "}
              <strong style={{ color: "var(--ink)" }}>{shortBreakMinutes}-minute</strong>{" "}
              breather. After{" "}
              <strong style={{ color: "var(--ink)" }}>{longBreakInterval}</strong> focus sessions,
              reward yourself with a longer{" "}
              <strong style={{ color: "var(--ink)" }}>{longBreakMinutes}-minute</strong> break.
            </p>

            <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 10 }}>
              Breaks {autoStartBreaks ? "start automatically" : "wait for you to press play"}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const ctrlSmall: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  cursor: "pointer",
  border: "1px solid var(--line-strong)",
  background: "var(--paper)",
  color: "var(--ink-soft)",
};

const playButton: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  border: "none",
  cursor: "pointer",
  background: "var(--accent)",
  color: "#fff",
  boxShadow: "var(--shadow)",
};

const inputLabel: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--ink)",
  marginBottom: 2,
};

const statLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--note-text)",
  opacity: 0.65,
};

const statValue: React.CSSProperties = {
  fontFamily: "var(--font-hand)",
  fontSize: 38,
  fontWeight: 700,
  color: "var(--note-text)",
  lineHeight: 1.1,
  marginTop: 4,
};

const statSub: React.CSSProperties = {
  fontSize: 12,
  color: "var(--note-text)",
  opacity: 0.7,
  marginTop: 4,
};

const cardTitle: React.CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: 17,
  fontWeight: 600,
  color: "var(--ink)",
};

function TimerCircle({
  circumference,
  strokeDashoffset,
  knobX,
  knobY,
  shouldDisableTransition,
  innerModeLabel,
  displayMinutes,
  displaySeconds,
}: {
  circumference: number;
  strokeDashoffset: number;
  knobX: number;
  knobY: number;
  shouldDisableTransition: boolean;
  innerModeLabel: string;
  displayMinutes: number;
  displaySeconds: number;
}) {
  return (
    <div className="relative" style={{ height: 224, width: 224 }}>
      <svg className="h-full w-full" style={{ transform: "rotate(90deg)" }} viewBox="0 0 224 224">
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--line-strong)" strokeWidth="10" />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`will-change-[stroke-dashoffset] ${
            shouldDisableTransition
              ? "transition-none"
              : "transition-[stroke-dashoffset] duration-1000 ease-linear"
          }`}
        />
      </svg>

      <div
        className={`absolute left-0 top-0 will-change-transform ${
          shouldDisableTransition
            ? "transition-none"
            : "transition-transform duration-1000 ease-linear"
        }`}
        style={{
          height: 36,
          width: 36,
          borderRadius: "50%",
          border: "5px solid var(--accent)",
          background: "var(--paper)",
          transform: `translate(${knobX - KNOB_OFFSET}px, ${knobY - KNOB_OFFSET}px)`,
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center text-center">
        <div>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 4 }}>
            {innerModeLabel}
          </p>
          <p
            style={{
              fontSize: 46,
              fontWeight: 700,
              color: "var(--ink)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {String(displayMinutes).padStart(2, "0")}:
            {String(displaySeconds).padStart(2, "0")}
          </p>
        </div>
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
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 7 }}>
        {label}
      </label>

      <div className="flex overflow-hidden" style={{ borderRadius: 10, border: "1px solid var(--line-strong)" }}>
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          className="grid place-items-center"
          style={{
            width: 44,
            borderRight: "1px solid var(--line-strong)",
            background: "var(--paper-2)",
            color: "var(--ink)",
            cursor: "pointer",
          }}
        >
          <Minus size={15} />
        </button>

        <input
          type="number"
          min="1"
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v > 0) onChange(v);
          }}
          className="w-full text-center outline-none"
          style={{
            background: "var(--paper)",
            color: "var(--ink)",
            fontWeight: 700,
            fontSize: 15,
          }}
        />

        <button
          onClick={() => onChange(value + 1)}
          className="grid place-items-center"
          style={{
            width: 44,
            borderLeft: "1px solid var(--line-strong)",
            background: "var(--paper-2)",
            color: "var(--ink)",
            cursor: "pointer",
          }}
        >
          <Plus size={15} />
        </button>
      </div>

      <p style={{ marginTop: 5, fontSize: 11.5, color: "var(--ink-faint)" }}>
        {label === "Long break interval" ? "sessions" : "minutes"}
      </p>
    </div>
  );
}