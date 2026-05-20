"use client";

import { useEffect, useRef, useState } from "react";

type TimerMode = "focus" | "shortBreak" | "longBreak";
type ScreenMode = "timer" | "settings";

const RADIUS = 98;
const CENTER = 112;
const REWIND_DURATION = 1000;
const SNAP_DELAY = 100;
const KNOB_SIZE = 36;
const KNOB_OFFSET = KNOB_SIZE / 2;

export default function TimerPage() {
    const [screen, setScreen] = useState<ScreenMode>("timer");

    const [focusMinutes, setFocusMinutes] = useState(25);
    const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
    const [longBreakMinutes, setLongBreakMinutes] = useState(15);
    const [longBreakInterval, setLongBreakInterval] = useState(4);

    const [mode, setMode] = useState<TimerMode>("focus");
    const [completedFocusSessions, setCompletedFocusSessions] = useState(0);

    const [secondsLeft, setSecondsLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [isRewinding, setIsRewinding] = useState(false);
    const [rewindProgress, setRewindProgress] = useState(0);
    const [rewindStartProgress, setRewindStartProgress] = useState(0);
    const [isSnapping, setIsSnapping] = useState(false);

    const [popupMessage, setPopupMessage] = useState("");

    const audioContextRef = useRef<AudioContext | null>(null);

    const currentMinutes =
    mode === "focus"
        ? focusMinutes
        : mode === "shortBreak"
        ? shortBreakMinutes
        : longBreakMinutes;

    useEffect(() => {
        setSecondsLeft(currentMinutes * 60);
        setIsRunning(false);
    }, [mode, focusMinutes, shortBreakMinutes, longBreakMinutes]);

    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    handleTimerFinish();
                    return 0;
                }

                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRunning, mode, completedFocusSessions]);

    function playAlarmSound() {
        const AudioContextClass =
            window.AudioContext || (window as any).webkitAudioContext;

        if (!AudioContextClass) return;

        const audioContext =
            audioContextRef.current || new AudioContextClass();

        audioContextRef.current = audioContext;

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + 1
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 1);
    }

    function showNotification(message: string) {
        setPopupMessage(message);
        playAlarmSound();

        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(message);
        }

        setTimeout(() => {
            setPopupMessage("");
        }, 4000);
    }

    async function requestNotificationPermission() {
        if (!("Notification" in window)) return;

        if (Notification.permission === "default") {
            await Notification.requestPermission();
        }
    }

    function animateBackToFull(onComplete: () => void, startProgress = progress) {
        setIsRunning(false);
        setRewindStartProgress(startProgress);
        setIsRewinding(true);
        setRewindProgress(0);

        const duration = REWIND_DURATION;
        const startTime = performance.now();

        function animateRewind(currentTime: number) {
            const elapsed = currentTime - startTime;
            const nextProgress = Math.min(elapsed / duration, 1);

            setRewindProgress(nextProgress);

            if (nextProgress < 1) {
                requestAnimationFrame(animateRewind);
            } else {
                setIsSnapping(true);
                setIsRewinding(false);
                setRewindProgress(0);

                onComplete();

                setTimeout(() => {
                    setIsSnapping(false);
                }, SNAP_DELAY);
            }
        }

        requestAnimationFrame(animateRewind);
    }

    function handleTimerFinish() {
        setSecondsLeft(0);

        animateBackToFull(() => {
            if (mode === "focus") {
                const newCompletedSessions = completedFocusSessions + 1;
                setCompletedFocusSessions(newCompletedSessions);

                const shouldTakeLongBreak =
                    newCompletedSessions % longBreakInterval === 0;

                if (shouldTakeLongBreak) {
                    setMode("longBreak");
                    showNotification("Time for a long break!");
                } else {
                    setMode("shortBreak");
                    showNotification("Time for a break!");
                }
            } else {
                setMode("focus");
                showNotification("Break is over! Time to focus.");
            }
        }, 0);
    }

    function resetTimer() {
        animateBackToFull(() => {
            setSecondsLeft(currentMinutes * 60);
        });
    }

    function saveSettings() {
        setMode("focus");
        setSecondsLeft(focusMinutes * 60);
        setIsRunning(false);
        setScreen("timer");
    }

    const displayMinutes = Math.floor(secondsLeft / 60);
    const displaySeconds = secondsLeft % 60;

    const totalSeconds = currentMinutes * 60;
    const progress = isRewinding
        ? rewindStartProgress + (1 - rewindStartProgress) * rewindProgress
        : totalSeconds > 0
        ? secondsLeft / totalSeconds
        : 0;

    const circumference = 2 * Math.PI * RADIUS;
    const strokeDashoffset = circumference * (1 - progress);

    const elapsedProgress = 1 - progress;
    const angle = 90 + elapsedProgress * 360;

    const knobX = CENTER - RADIUS * Math.cos((angle * Math.PI) / 180);
    const knobY = CENTER + RADIUS * Math.sin((angle * Math.PI) / 180);

    const modeLabel =
        mode === "focus"
            ? "Focus session"
            : mode === "shortBreak"
            ? "Short break"
            : "Long break";

    const innerModeLabel =
        mode === "focus"
            ? "Focus"
            : mode === "shortBreak"
            ? "Break"
            : "Long Break";

    const shouldDisableTransition = isRewinding || isSnapping;
    
    return (
        <div className="relative flex w-full justify-center">
            {popupMessage && (
                <div className="fixed top-6 right-6 z-50 rounded-xl border-2 border-black bg-white px-5 py-4 shadow-xl">
                    <p className="font-bold">{popupMessage}</p>
                </div>
            )}

            <div className="relative w-[330px] h-[640px] rounded-[2.5rem] border-[10px] border-zinc-900 bg-zinc-100 shadow-2xl overflow-hidden">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-zinc-900" />
                    <div className="h-2 w-20 rounded-full bg-zinc-900" />
                </div>

                {screen === "timer" ? (
                    <div className="flex h-full flex-col items-center justify-center px-8 pt-14 pb-8">
                        <h1 className="text-2xl font-bold text-zinc-900 mb-2">
                            Study Timer
                        </h1>

                        <p className="text-sm text-zinc-500 mb-8">
                            {modeLabel}
                        </p>

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
                        
                        <div className="grid grid-cols-3 gap-2 w-full mb-6">
                            <button
                                onClick={() => {
                                    setMode("focus");
                                    setSecondsLeft(focusMinutes * 60);
                                    setIsRunning(false);
                                }}
                                className="rounded-full border-2 border-zinc-900 py-2 text-sm font-semibold hover:bg-zinc-200"
                            >
                                Focus
                            </button>

                            <button
                                onClick={() => {
                                    setMode("shortBreak");
                                    setSecondsLeft(shortBreakMinutes * 60);
                                    setIsRunning(false);
                                }}
                                className="rounded-full border-2 border-zinc-900 py-2 text-sm font-semibold hover:bg-zinc-200"
                            >
                                Short
                            </button>

                            <button
                                onClick={() => {
                                    setMode("longBreak");
                                    setSecondsLeft(longBreakMinutes * 60);
                                    setIsRunning(false);
                                }}
                                className="rounded-full border-2 border-zinc-900 py-2 text-sm font-semibold hover:bg-zinc-200"
                            >
                                Long
                            </button>
                        </div>

                        <div className="flex items-center justify-center gap-5">
                            <button
                                onClick={() => setScreen("settings")}
                                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-zinc-900 text-sm font-bold hover:bg-zinc-200"
                            >
                                ⚙
                            </button>

                            <button
                                onClick={async () => {
                                    await requestNotificationPermission();
                                    setIsRunning((prev) => !prev);
                                }}
                                className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 text-white text-3xl font-bold hover:bg-zinc-700"
                            >
                                {isRunning ? "⏸" : "▶"}
                            </button>

                            <button
                                onClick={resetTimer}
                                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-zinc-900 text-xl font-bold hover:bg-zinc-200"
                            >
                                ↻
                            </button>
                        </div>

                        <p className="mt-6 text-sm text-zinc-500">
                            {isRunning ? "Timer is running" : "Timer is paused"}
                        </p>
                    </div>
                ) : (
                    <div className="flex h-full flex-col px-7 pt-20 pb-8">
                        <h1 className="text-2xl font-bold mb-6 text-center">
                            Timer Settings
                        </h1>

                        <TimerInput
                            label="Focus time"
                            value={focusMinutes}
                            onChange={setFocusMinutes}
                        />

                        <TimerInput
                            label="Long break"
                            value={longBreakMinutes}
                            onChange={setLongBreakMinutes}
                        />

                        <TimerInput
                            label="Short break"
                            value={shortBreakMinutes}
                            onChange={setShortBreakMinutes}
                        />

                        <TimerInput
                            label="Long break interval"
                            value={longBreakInterval}
                            onChange={setLongBreakInterval}
                        />

                        <div className="mt-auto flex gap-3">
                            <button
                                onClick={() => setScreen("timer")}
                                className="flex-1 rounded-lg border-2 border-black py-2 font-semibold hover:bg-zinc-200"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={saveSettings}
                                className="flex-1 rounded-lg bg-black text-white py-2 font-semibold hover:bg-zinc-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

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
        <div className="relative mb-8 h-56 w-56">
            <svg
                className="h-full w-full rotate-90"
                viewBox="0 0 224 224"
            >
                <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    fill="none"
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth="10"
                />

                <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    fill="none"
                    stroke="black"
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
                className={`absolute left-0 top-0 h-9 w-9 rounded-full border-[6px] border-zinc-900 bg-zinc-100 will-change-transform ${
                    shouldDisableTransition
                        ? "transition-none"
                        : "transition-transform duration-1000 ease-linear"
                }`}
                style={{
                    transform: `translate(${knobX - KNOB_OFFSET}px, ${knobY - KNOB_OFFSET}px)`,
                }}
            />

            <div className="absolute inset-0 flex items-center justify-center text-center">
                <div>
                    <p className="text-sm text-zinc-500 mb-1">
                        {innerModeLabel}
                    </p>

                    <p className="text-5xl font-bold text-zinc-900">
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
        <div className="mb-5">
            <label className="block text-sm font-bold mb-2">{label}</label>

            <div className="flex overflow-hidden rounded-lg border-2 border-black">
                <button
                    onClick={() => onChange(Math.max(1, value - 1))}
                    className="w-12 border-r-2 border-black text-xl font-bold hover:bg-zinc-200"
                >
                    -
                </button>

                <input
                    type="number"
                    min="1"
                    value={value}
                    onChange={(e) => {
                        const newValue = Number(e.target.value);
                        if (newValue > 0) onChange(newValue);
                    }}
                    className="w-full bg-transparent text-center font-bold outline-none"
                />

                <button
                    onClick={() => onChange(value + 1)}
                    className="w-12 border-l-2 border-black text-xl font-bold hover:bg-zinc-200"
                >
                    +
                </button>
            </div>

            <p className="mt-1 text-xs text-zinc-500">
                {label === "Long break interval" ? "sessions" : "minutes"}
            </p>
        </div>
    );
}