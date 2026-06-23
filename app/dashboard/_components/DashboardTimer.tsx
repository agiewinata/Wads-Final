"use client";

import { useState, useEffect } from "react";
import { useTimer } from "../_components/TimerProvider";
import { Clock, Settings, RotateCcw, Play, Pause, ArrowLeft, Bell } from "lucide-react";

function fmt(secondsLeft: number) {
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/* Simple twin-bell alarm clock. Minute hand sweeps one full turn over the
   whole session (12 -> clockwise -> 12); hour hand stays at 12. */
function AlarmClock({ progress }: { progress: number }) {
  const angle = (1 - progress) * 360;          // 0 at start (12 o'clock), grows clockwise
  const th = (angle * Math.PI) / 180;
  const hx = 100 + Math.sin(th) * 58;
  const hy = 100 - Math.cos(th) * 58;

  const ticks = [0, 3, 6, 9].map((i) => {
    const a = (i / 12) * 2 * Math.PI;
    const x1 = 100 + Math.sin(a) * 60, y1 = 100 - Math.cos(a) * 60;
    const x2 = 100 + Math.sin(a) * 51, y2 = 100 - Math.cos(a) * 51;
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-faint)" strokeWidth={3} strokeLinecap="round" />;
  });

  return (
    <svg width="166" height="184" viewBox="0 0 200 220" style={{ flexShrink: 0 }}>
      {/* feet */}
      <rect x="44" y="166" width="16" height="30" rx="6" transform="rotate(24 52 181)" fill="var(--ink)" />
      <rect x="140" y="166" width="16" height="30" rx="6" transform="rotate(-24 148 181)" fill="var(--ink)" />
      {/* bells + hammer */}
      <ellipse cx="50" cy="40" rx="26" ry="22" fill="var(--ink)" />
      <ellipse cx="150" cy="40" rx="26" ry="22" fill="var(--ink)" />
      <rect x="92" y="9" width="16" height="18" rx="7" fill="var(--ink)" />
      <line x1="64" y1="37" x2="136" y2="37" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
      {/* body */}
      <circle cx="100" cy="100" r="72" fill="var(--ink)" />
      <circle cx="100" cy="100" r="67" fill="var(--paper)" stroke="var(--line-strong)" strokeWidth="2" />
      {ticks}
      {/* hour hand fixed at 12 */}
      <line x1="100" y1="100" x2="100" y2="66" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" />
      {/* minute hand (sweeps with progress) */}
      <line x1="100" y1="100" x2={hx} y2={hy} stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="100" r="6" fill="var(--accent)" />
      <circle cx="100" cy="100" r="2.5" fill="var(--paper)" />
    </svg>
  );
}

export default function DashboardTimer() {
  const [screen, setScreen] = useState<"timer" | "settings">("timer");
  const [showNotifPopup, setShowNotifPopup] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") return;
    const alreadyAsked = localStorage.getItem("notif-prompt-shown");
    if (!alreadyAsked) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowNotifPopup(true);
      localStorage.setItem("notif-prompt-shown", "1");
    }
  }, []);

  const {
    focusMinutes, setFocusMinutes,
    shortBreakMinutes, setShortBreakMinutes,
    longBreakMinutes, setLongBreakMinutes,
    longBreakInterval, setLongBreakInterval,
    autoStartBreaks, setAutoStartBreaks,
    isRunning, setIsRunning,
    secondsLeft, progress, innerModeLabel, mode, setModeAndReset,
    requestNotificationPermission, resetTimer, saveSettings,
  } = useTimer();

  return (
    <div className="paper h-full w-full flex flex-col overflow-hidden" style={{ position: "relative", padding: "18px 20px" }}>
      {showNotifPopup && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, borderRadius: 14, padding: 18 }}>
          <div className="paper" style={{ padding: "20px 18px", textAlign: "center", maxWidth: 260 }}>
            <Bell size={26} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: "8px 0 4px" }}>Enable notifications?</h3>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5, marginBottom: 14 }}>Get alerted when your session or break ends.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-paper" style={{ flex: 1, justifyContent: "center", padding: 8, fontSize: 12 }}
                onClick={() => { setShowNotifPopup(false); setIsRunning(true); }}>No thanks</button>
              <button className="btn-ink" style={{ flex: 1, justifyContent: "center", padding: 8, fontSize: 12 }}
                onClick={async () => {
                  setShowNotifPopup(false);
                  if (typeof Notification !== "undefined" && Notification.permission === "denied") {
                    alert("Notifications are blocked. Allow them from the lock icon in the address bar.");
                  } else { await requestNotificationPermission(); }
                  setIsRunning(true);
                }}>Enable</button>
            </div>
          </div>
        </div>
      )}

      {/* header */}
      <div className="flex items-center gap-2.5" style={{ marginBottom: 14, flexShrink: 0 }}>
        <div className="grid place-items-center" style={{ width: 30, height: 30, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent-text)" }}>
          <Clock size={17} />
        </div>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>Focus timer</h2>
        <span className="pill pill-assignment" style={{ marginLeft: "auto" }}>Pomodoro</span>
      </div>

      {screen === "timer" ? (
        <div className="flex-1 flex items-center" style={{ gap: 22, minHeight: 0 }}>
          <AlarmClock progress={progress} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-faint)", marginBottom: 4 }}>{innerModeLabel}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 44, fontWeight: 600, color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {fmt(secondsLeft)}
            </div>

            {/* quick select */}
            <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
              {([{ key: "focus", label: "Focus" }, { key: "shortBreak", label: "Short" }, { key: "longBreak", label: "Long" }] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setModeAndReset(key)}
                  style={{ flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 600, borderRadius: 999, cursor: "pointer",
                    border: "1px solid " + (mode === key ? "var(--accent)" : "var(--line-strong)"),
                    background: mode === key ? "var(--accent)" : "var(--paper)",
                    color: mode === key ? "#fff" : "var(--ink-soft)" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
              <button onClick={() => setScreen("settings")} className="grid place-items-center" title="Settings"
                style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid var(--line-strong)", background: "var(--paper)", color: "var(--ink-soft)", cursor: "pointer" }}>
                <Settings size={16} />
              </button>
              <button onClick={() => {
                  if (typeof Notification !== "undefined" && Notification.permission === "default") setShowNotifPopup(true);
                  else setIsRunning((p: boolean) => !p);
                }} className="grid place-items-center" title={isRunning ? "Pause" : "Start"}
                style={{ width: 52, height: 52, borderRadius: "50%", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", boxShadow: "var(--shadow)" }}>
                {isRunning ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 2 }} />}
              </button>
              <button onClick={resetTimer} className="grid place-items-center" title="Reset"
                style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid var(--line-strong)", background: "var(--paper)", color: "var(--ink-soft)", cursor: "pointer" }}>
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 10, flexShrink: 0 }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>Timer settings</h3>
            <button onClick={() => setScreen("timer")} className="grid place-items-center"
              style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--line-strong)", background: "var(--paper)", color: "var(--ink-soft)", cursor: "pointer" }}>
              <ArrowLeft size={15} />
            </button>
          </div>
          <div style={{ overflowY: "auto", flex: 1, paddingRight: 4 }}>
            <TimerInput label="Focus time" value={focusMinutes} onChange={setFocusMinutes} />
            <TimerInput label="Short break" value={shortBreakMinutes} onChange={setShortBreakMinutes} />
            <TimerInput label="Long break" value={longBreakMinutes} onChange={setLongBreakMinutes} />
            <TimerInput label="Long break interval" value={longBreakInterval} onChange={setLongBreakInterval} />
            <div className="flex items-center justify-between" style={{ gap: 8, padding: "10px 0", borderTop: "1px solid var(--line)", marginTop: 4 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>Auto-start breaks</div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Start break timers automatically.</div>
              </div>
              <button type="button" onClick={() => setAutoStartBreaks((p: boolean) => !p)}
                style={{ position: "relative", width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer", flexShrink: 0,
                  background: autoStartBreaks ? "var(--accent)" : "var(--line-strong)", transition: "background .15s" }}>
                <span style={{ position: "absolute", top: 2, left: autoStartBreaks ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexShrink: 0 }}>
            <button onClick={() => setScreen("timer")} className="btn-paper" style={{ flex: 1, justifyContent: "center", padding: 9, fontSize: 13 }}>Cancel</button>
            <button onClick={() => { saveSettings(); setScreen("timer"); }} className="btn-ink" style={{ flex: 1, justifyContent: "center", padding: 9, fontSize: 13 }}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimerInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const isInterval = label === "Long break interval";
  const hint = !isInterval && value >= 60 ? `${Math.floor(value / 60)}h ${value % 60 ? `${value % 60}m` : ""}`.trim() : "";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", border: "1px solid var(--line-strong)", borderRadius: 9, overflow: "hidden" }}>
        <button onClick={() => onChange(Math.max(1, value - (isInterval ? 1 : 5)))}
          style={{ width: 38, borderRight: "1px solid var(--line)", background: "var(--paper-2)", fontSize: 16, fontWeight: 600, cursor: "pointer", color: "var(--ink)" }}>−</button>
        <input type="number" min="1" value={value}
          onChange={(e) => { const v = Number(e.target.value); if (v > 0) onChange(v); }}
          style={{ flex: 1, textAlign: "center", border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "var(--ink)", background: "var(--paper)" }} />
        <button onClick={() => onChange(value + (isInterval ? 1 : 5))}
          style={{ width: 38, borderLeft: "1px solid var(--line)", background: "var(--paper-2)", fontSize: 16, fontWeight: 600, cursor: "pointer", color: "var(--ink)" }}>+</button>
      </div>
      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>{isInterval ? "sessions" : hint ? `minutes · ${hint}` : "minutes"}</div>
    </div>
  );
}