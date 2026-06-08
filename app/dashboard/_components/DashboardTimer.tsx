"use client";

import { useState } from "react";
import { useTimer } from "../_components/TimerProvider";

export default function DashboardTimer() {
  const [screen, setScreen] = useState<"timer" | "settings">("timer");

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
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border-4 border-black bg-white shadow-sm">
      <div className="h-full overflow-y-auto p-4">
        {screen === "timer" ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Study Timer</h2>

              <button
                onClick={() => setScreen("settings")}
                className="rounded-lg border border-black px-3 py-2 hover:bg-zinc-100"
              >
                ⚙
              </button>
            </div>

            <div className="mb-4 rounded-xl border-2 border-black bg-zinc-50 p-5 text-center">
              <p className="mb-2 text-sm text-zinc-500">
                {innerModeLabel}
              </p>

              <p className="text-4xl font-bold text-zinc-900">
                {String(displayMinutes).padStart(2, "0")}:
                {String(displaySeconds).padStart(2, "0")}
              </p>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              <button
                onClick={() => setModeAndReset("focus")}
                className={`rounded-lg border-2 border-black py-2 text-sm font-semibold ${
                  mode === "focus"
                    ? "bg-black text-white"
                    : "hover:bg-zinc-100"
                }`}
              >
                Focus
              </button>

              <button
                onClick={() => setModeAndReset("shortBreak")}
                className={`rounded-lg border-2 border-black py-2 text-sm font-semibold ${
                  mode === "shortBreak"
                    ? "bg-black text-white"
                    : "hover:bg-zinc-100"
                }`}
              >
                Short
              </button>

              <button
                onClick={() => setModeAndReset("longBreak")}
                className={`rounded-lg border-2 border-black py-2 text-sm font-semibold ${
                  mode === "longBreak"
                    ? "bg-black text-white"
                    : "hover:bg-zinc-100"
                }`}
              >
                Long
              </button>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={async () => {
                  await requestNotificationPermission();
                  setIsRunning((prev: boolean) => !prev);
                }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-2xl text-white hover:bg-zinc-800"
              >
                {isRunning ? "⏸" : "▶"}
              </button>

              <button
                onClick={resetTimer}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-black text-xl hover:bg-zinc-100"
              >
                ↻
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                Timer Settings
              </h2>

              <button
                onClick={() => setScreen("timer")}
                className="rounded-lg border border-black px-3 py-2 hover:bg-zinc-100"
              >
                ←
              </button>
            </div>

            <TimerInput
              label="Focus time"
              value={focusMinutes}
              onChange={setFocusMinutes}
            />

            <TimerInput
              label="Short break"
              value={shortBreakMinutes}
              onChange={setShortBreakMinutes}
            />

            <TimerInput
              label="Long break"
              value={longBreakMinutes}
              onChange={setLongBreakMinutes}
            />

            <TimerInput
              label="Long break interval"
              value={longBreakInterval}
              onChange={setLongBreakInterval}
            />

            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  Auto-start breaks
                </p>

                <p className="text-xs text-zinc-500">
                  Automatically starts break timers.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setAutoStartBreaks(
                    (prev: boolean) => !prev
                  )
                }
                className={`relative flex h-8 w-16 items-center rounded-full border-2 border-black px-1 transition-colors ${
                  autoStartBreaks
                    ? "bg-black"
                    : "bg-white"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full border border-black bg-white transition-transform ${
                    autoStartBreaks
                      ? "translate-x-8"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setScreen("timer")}
                className="flex-1 rounded-lg border-2 border-black py-2 font-medium hover:bg-zinc-100"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  saveSettings();
                  setScreen("timer");
                }}
                className="flex-1 rounded-lg bg-black py-2 font-medium text-white hover:bg-zinc-800"
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
    <div className="mb-4">
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <div className="flex overflow-hidden rounded-lg border-2 border-black">
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          className="w-12 border-r-2 border-black text-lg font-bold hover:bg-zinc-100"
        >
          −
        </button>

        <input
          type="number"
          min="1"
          value={value}
          onChange={(e) => {
            const newValue = Number(e.target.value);

            if (newValue > 0) {
              onChange(newValue);
            }
          }}
          className="w-full text-center outline-none"
        />

        <button
          onClick={() => onChange(value + 1)}
          className="w-12 border-l-2 border-black text-lg font-bold hover:bg-zinc-100"
        >
          +
        </button>
      </div>

      <p className="mt-1 text-xs text-zinc-500">
        {label === "Long break interval"
          ? "sessions"
          : "minutes"}
      </p>
    </div>
  );
}