"use client";
// By GPT
import { useTimer } from "../_components/TimerProvider";

const RADIUS = 70;
const CENTER = 80;
const KNOB_SIZE = 24;
const KNOB_OFFSET = KNOB_SIZE / 2;

export default function DashboardTimer() {
  const {
    displayMinutes,
    displaySeconds,
    innerModeLabel,
    isRunning,
    setIsRunning,
    requestNotificationPermission,
    resetTimer,
  } = useTimer();

  return (
    <div
      className="bg-white p-4 h-full flex flex-col"
      style={{
        border: "3px solid #111",
        borderRadius: "6px",
      }}
    >
      <h2 className="font-semibold text-center mb-4">
        Study Timer
      </h2>

      <div className="flex flex-col items-center justify-center flex-1">
        <p className="text-sm text-zinc-500 mb-2">
          {innerModeLabel}
        </p>

        <p className="text-5xl font-bold">
          {String(displayMinutes).padStart(2, "0")}:
          {String(displaySeconds).padStart(2, "0")}
        </p>

        <p className="mt-2 text-sm text-zinc-500">
          {isRunning ? "Running" : "Paused"}
        </p>
      </div>

      <div className="flex justify-center gap-2 mt-4">
        <button
          onClick={async () => {
            await requestNotificationPermission();
            setIsRunning((prev: boolean) => !prev);
          }}
          className="px-4 py-2 bg-black text-white rounded"
        >
          {isRunning ? "Pause" : "Start"}
        </button>

        <button
          onClick={resetTimer}
          className="px-4 py-2 border rounded"
        >
          Reset
        </button>
      </div>
    </div>
  );
}