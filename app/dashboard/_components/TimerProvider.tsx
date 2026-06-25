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

const DEFAULT_TIMER_SETTINGS = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: true,
};

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

  const [focusMinutes, setFocusMinutes] = useState(DEFAULT_TIMER_SETTINGS.focusMinutes);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(DEFAULT_TIMER_SETTINGS.shortBreakMinutes);
  const [longBreakMinutes, setLongBreakMinutes] = useState(DEFAULT_TIMER_SETTINGS.longBreakMinutes);
  const [longBreakInterval, setLongBreakInterval] = useState(DEFAULT_TIMER_SETTINGS.longBreakInterval);
  const [autoStartBreaks, setAutoStartBreaks] = useState(DEFAULT_TIMER_SETTINGS.autoStartBreaks);

  const storageKey = `timer-settings-${userId}`;

  const [mode, setMode] = useState<TimerMode>("focus");
  const [completedFocusSessions, setCompletedFocusSessions] = useState(0);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);

  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_TIMER_SETTINGS.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isRewinding, setIsRewinding] = useState(false);
  const [rewindProgress, setRewindProgress] = useState(0);
  const [rewindStartProgress, setRewindStartProgress] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const [isTabRestoring, setIsTabRestoring] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const isFinishingRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const tabRestoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    try {
      const savedSettings = localStorage.getItem(storageKey);

      if (!savedSettings) {
        setHasLoadedSettings(true);
        return;
      }

      const parsed = JSON.parse(savedSettings);

      const savedFocusMinutes =
        parsed.focusMinutes ?? DEFAULT_TIMER_SETTINGS.focusMinutes;
      const savedShortBreakMinutes =
        parsed.shortBreakMinutes ?? DEFAULT_TIMER_SETTINGS.shortBreakMinutes;
      const savedLongBreakMinutes =
        parsed.longBreakMinutes ?? DEFAULT_TIMER_SETTINGS.longBreakMinutes;

      setFocusMinutes(savedFocusMinutes);
      setShortBreakMinutes(savedShortBreakMinutes);
      setLongBreakMinutes(savedLongBreakMinutes);
      setLongBreakInterval(
        parsed.longBreakInterval ?? DEFAULT_TIMER_SETTINGS.longBreakInterval
      );
      setAutoStartBreaks(
        parsed.autoStartBreaks ?? DEFAULT_TIMER_SETTINGS.autoStartBreaks
      );

      setSecondsLeft(savedFocusMinutes * 60);
      setHasLoadedSettings(true);
    } catch {
      localStorage.removeItem(storageKey);
      setHasLoadedSettings(true);
    }
  }, [storageKey]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;

      setIsTabRestoring(true);

      if (tabRestoreTimeoutRef.current) {
        clearTimeout(tabRestoreTimeoutRef.current);
      }

      tabRestoreTimeoutRef.current = setTimeout(() => {
        setIsTabRestoring(false);
        tabRestoreTimeoutRef.current = null;
      }, 180);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (tabRestoreTimeoutRef.current) {
        clearTimeout(tabRestoreTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedSettings) return;

    const minutes =
      mode === "focus"
        ? focusMinutes
        : mode === "shortBreak"
        ? shortBreakMinutes
        : longBreakMinutes;

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
  }, [isRunning, mode, completedFocusSessions, focusMinutes, longBreakInterval, autoStartBreaks]);

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  function playAlarmSound() {
    const AudioContextClass =
      window.AudioContext ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitAudioContext;

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
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsRunning(false);
    setRewindStartProgress(startProgress);
    setIsRewinding(true);
    setRewindProgress(0);

    const startTime = performance.now();

    function animateRewind(currentTime: number) {
      const elapsed = currentTime - startTime;
      const nextProgress = Math.min(elapsed / REWIND_DURATION, 1);

      setRewindProgress(nextProgress);

      if (nextProgress < 1) {
        animationRef.current = requestAnimationFrame(animateRewind);
      } else {
        animationRef.current = null;
        setIsSnapping(true);
        setIsRewinding(false);
        setRewindProgress(0);

        onComplete();

        setTimeout(() => {
          setIsSnapping(false);
        }, SNAP_DELAY);
      }
    }

    animationRef.current = requestAnimationFrame(animateRewind);
  }

  function handleTimerFinish() {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;

    setSecondsLeft(0);

    const finishedMode = mode;
    const finishedFocusMinutes = focusMinutes;
    const finishedLongBreakInterval = longBreakInterval;
    const shouldAutoStartBreaks = autoStartBreaks;

    animateBackToFull(() => {
      if (finishedMode === "focus") {
        const newCompletedSessions = completedFocusSessions + 1;
        const shouldTakeLongBreak =
          newCompletedSessions % finishedLongBreakInterval === 0;

        setCompletedFocusSessions(newCompletedSessions);
        setTotalFocusMinutes((prevMinutes) => prevMinutes + finishedFocusMinutes);

        if (shouldTakeLongBreak) {
          setMode("longBreak");
          setIsRunning(shouldAutoStartBreaks);
          showNotification("Time for a long break!");
        } else {
          setMode("shortBreak");
          setIsRunning(shouldAutoStartBreaks);
          showNotification("Time for a break!");
        }
      } else {
        setMode("focus");
        setIsRunning(false);
        showNotification("Break is over! Time to focus.");
      }

      isFinishingRef.current = false;
    }, 0);
  }

  function resetTimer() {
    isFinishingRef.current = false;

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

    isFinishingRef.current = false;
    setMode("focus");
    setSecondsLeft(focusMinutes * 60);
    setIsRunning(false);
    setScreen("timer");
  }

  function setModeAndReset(nextMode: TimerMode) {
    isFinishingRef.current = false;

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

  function resetStatistics() {
    setCompletedFocusSessions(0);
    setTotalFocusMinutes(0);
  }

  function resetSettingsToDefault() {
    setFocusMinutes(DEFAULT_TIMER_SETTINGS.focusMinutes);
    setShortBreakMinutes(DEFAULT_TIMER_SETTINGS.shortBreakMinutes);
    setLongBreakMinutes(DEFAULT_TIMER_SETTINGS.longBreakMinutes);
    setLongBreakInterval(DEFAULT_TIMER_SETTINGS.longBreakInterval);
    setAutoStartBreaks(DEFAULT_TIMER_SETTINGS.autoStartBreaks);

    localStorage.setItem(storageKey, JSON.stringify(DEFAULT_TIMER_SETTINGS));

    isFinishingRef.current = false;
    setMode("focus");
    setSecondsLeft(DEFAULT_TIMER_SETTINGS.focusMinutes * 60);
    setIsRunning(false);
    setScreen("timer");
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
        isTabRestoring,
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
        resetStatistics,
        resetSettingsToDefault,
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