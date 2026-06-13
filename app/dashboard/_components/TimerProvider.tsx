"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type TimerMode = "focus" | "shortBreak" | "longBreak";
type ScreenMode = "timer" | "settings";

const REWIND_DURATION = 1000;
const SNAP_DELAY = 100;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TimerContext = createContext<any>(null);

export function TimerProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string;
}) {
  const [screen, setScreen] = useState<ScreenMode>("timer");

  const [focusMinutes, setFocusMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [longBreakInterval, setLongBreakInterval] = useState(4);
  const [autoStartBreaks, setAutoStartBreaks] = useState(true);
  const storageKey = `timer-settings-${userId}`;

  const [mode, setMode] = useState<TimerMode>("focus");
  const [completedFocusSessions, setCompletedFocusSessions] = useState(0);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);

  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isRewinding, setIsRewinding] = useState(false);
  const [rewindProgress, setRewindProgress] = useState(0);
  const [rewindStartProgress, setRewindStartProgress] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);

  const [popupMessage, setPopupMessage] = useState("");

  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);

  const currentMinutes =
    mode === "focus"
      ? focusMinutes
      : mode === "shortBreak"
      ? shortBreakMinutes
      : longBreakMinutes;

  const displayMinutes = Math.floor(secondsLeft / 60);
  const displaySeconds = secondsLeft % 60;

  const totalSeconds = currentMinutes * 60;
  const progress = isRewinding
    ? rewindStartProgress + (1 - rewindStartProgress) * rewindProgress
    : totalSeconds > 0
    ? secondsLeft / totalSeconds
    : 0;

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
  
  useEffect(() => {
    const savedSettings = localStorage.getItem(storageKey);

    if (!savedSettings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasLoadedSettings(true);
      return;
    }

    const parsed = JSON.parse(savedSettings);

    const savedFocusMinutes = parsed.focusMinutes ?? 25;
    const savedShortBreakMinutes = parsed.shortBreakMinutes ?? 5;
    const savedLongBreakMinutes = parsed.longBreakMinutes ?? 15;

    setFocusMinutes(savedFocusMinutes);
    setShortBreakMinutes(savedShortBreakMinutes);
    setLongBreakMinutes(savedLongBreakMinutes);
    setLongBreakInterval(parsed.longBreakInterval ?? 4);
    setAutoStartBreaks(parsed.autoStartBreaks ?? true);

    setSecondsLeft(savedFocusMinutes * 60);

    setHasLoadedSettings(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoadedSettings) return;

    const minutes =
      mode === "focus"
        ? focusMinutes
        : mode === "shortBreak"
        ? shortBreakMinutes
        : longBreakMinutes;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSecondsLeft(minutes * 60);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hasLoadedSettings]);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = audioContextRef.current || new AudioContextClass();

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
        setTotalFocusMinutes((prev) => prev + focusMinutes);
        setCompletedFocusSessions(newCompletedSessions);

        const shouldTakeLongBreak =
          newCompletedSessions % longBreakInterval === 0;

        if (shouldTakeLongBreak) {
          setMode("longBreak");
          setIsRunning(autoStartBreaks);
          showNotification("Time for a long break!");
        } else {
          setMode("shortBreak");
          setIsRunning(autoStartBreaks);
          showNotification("Time for a break!");
        }
      } else {
        setMode("focus");
        setIsRunning(false);
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
    const settings = {
      focusMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      longBreakInterval,
      autoStartBreaks,
    };

    localStorage.setItem(storageKey, JSON.stringify(settings));

    setMode("focus");
    setSecondsLeft(focusMinutes * 60);
    setIsRunning(false);
    setScreen("timer");
  }

  function setModeAndReset(nextMode: TimerMode) {
    setMode(nextMode);

    const nextMinutes =
      nextMode === "focus"
        ? focusMinutes
        : nextMode === "shortBreak"
        ? shortBreakMinutes
        : longBreakMinutes;

    setSecondsLeft(nextMinutes * 60);
    setIsRunning(false);
  }

  return (
    <TimerContext.Provider
      value={{
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
        mode,
        secondsLeft,
        isRunning,
        setIsRunning,
        isRewinding,
        rewindProgress,
        rewindStartProgress,
        isSnapping,
        popupMessage,
        currentMinutes,
        displayMinutes,
        displaySeconds,
        progress,
        modeLabel,
        innerModeLabel,
        requestNotificationPermission,
        resetTimer,
        saveSettings,
        setModeAndReset,
        completedFocusSessions,
        totalFocusMinutes,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);

  if (!context) {
    throw new Error("useTimer must be used inside TimerProvider");
  }

  return context;
}