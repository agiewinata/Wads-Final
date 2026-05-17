"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";

type Message = { role: "user" | "assistant"; content: string };
type ChatSession = { id: string; name: string; messages: Message[]; createdAt: number };

const LINE_H   = 40;
const MARGIN_X = 72;

const STICKY_COLORS  = ["#111", "#111", "#111", "#111", "#111", "#111"];
const STICKY_ROTATIONS = ["2deg", "-1.5deg", "2.5deg", "-2deg", "1.5deg", "-2.5deg"];

const PAPER_STYLE: React.CSSProperties = {
  backgroundColor: "#ffffff",
  backgroundImage: [
    `linear-gradient(90deg, transparent ${MARGIN_X - 1}px, #aaa ${MARGIN_X - 1}px, #aaa ${MARGIN_X}px, transparent ${MARGIN_X}px)`,
    `repeating-linear-gradient(transparent 0px, transparent ${LINE_H - 1}px, #e2e2e2 ${LINE_H - 1}px, #e2e2e2 ${LINE_H}px)`,
  ].join(", "),
  backgroundAttachment: "local",
};

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function freshSession(): ChatSession {
  return { id: genId(), name: "New chat", messages: [], createdAt: Date.now() };
}

async function streamChat(
  messages: Message[],
  onChunk: (text: string) => void,
): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch("/api/ai/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ messages }),
    });
  } catch {
    return "Could not reach the server.";
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return (body as { error?: string }).error ?? "Something went wrong.";
  }

  const reader  = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) onChunk(text);
  }

  return null;
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem("ai-sessions");
    if (raw) {
      const parsed = JSON.parse(raw) as ChatSession[];
      if (parsed.length > 0) return parsed;
    }
  } catch {}
  return [freshSession()];
}

export default function AIPage() {
  const { data: sessionData } = useSession();
  const firstName = sessionData?.user?.name?.split(" ")[0] ?? "there";

  const [sessions,  setSessions]  = useState<ChatSession[]>(() =>
    typeof window === "undefined" ? [freshSession()] : loadSessions(),
  );
  const [activeId,  setActiveId]  = useState<string>(() => sessions[0]?.id ?? "");
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const active   = sessions.find(s => s.id === activeId) ?? sessions[0];
  const messages = active?.messages ?? [];

  useEffect(() => {
    try { localStorage.setItem("ai-sessions", JSON.stringify(sessions)); } catch {}
  }, [sessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function patchSession(id: string, newMessages: Message[]) {
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s;
      const firstUserText = newMessages.find(m => m.role === "user")?.content ?? "";
      const name = firstUserText
        ? firstUserText.slice(0, 28) + (firstUserText.length > 28 ? "…" : "")
        : s.name;
      return { ...s, name, messages: newMessages };
    }));
  }

  async function sendMessage(userContent: string) {
    if (!userContent.trim() || loading) return;

    const id = active.id;
    const userMsg: Message    = { role: "user", content: userContent.trim() };
    const outgoing: Message[] = [...messages, userMsg];

    patchSession(id, [...outgoing, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    setError("");

    let assembled = "";
    const err = await streamChat(outgoing, chunk => {
      assembled += chunk;
      patchSession(id, [...outgoing, { role: "assistant", content: assembled }]);
    });

    if (err) {
      patchSession(id, outgoing);
      setError(err);
    }
    setLoading(false);
  }

  function addSession() {
    const s = freshSession();
    setSessions(prev => [s, ...prev]);
    setActiveId(s.id);
    setError("");
    setInput("");
  }

  function deleteSession(id: string) {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (next.length === 0) {
        const s = freshSession();
        setActiveId(s.id);
        return [s];
      }
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
  }

  return (
    <div className="w-full flex flex-col gap-4" style={{ height: "calc(100vh - 48px)" }}>

      {/* Title */}
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#111",
          fontStyle: "italic",
          lineHeight: 1,
          paddingLeft: 2,
          flexShrink: 0,
        }}
      >
        AI Assistant
      </h1>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* Chat panel */}
        <div
          style={{
            flex: 1,
            border: "3px solid #111",
            borderRadius: "6px 2px 2px 6px",
            boxShadow: "5px 7px 0 rgba(0,0,0,0.13)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Message area */}
          <div className="flex-1 overflow-y-auto" style={PAPER_STYLE}>
            <div
              style={{
                paddingTop: 16,
                paddingBottom: 16,
                paddingLeft: MARGIN_X + 12,
                paddingRight: 20,
                minHeight: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              {messages.length === 0 && !loading && (
                <div style={{ color: "#888", fontSize: 13, fontStyle: "italic" }}>
                  Hey {firstName}! How can I help you today?
                </div>
              )}

              {messages.length === 0 && loading && (
                <div style={{ color: "#bbb", fontSize: 13, fontStyle: "italic" }}>
                  thinking…
                </div>
              )}

              {messages.map((msg, i) => {
                const isUser = msg.role === "user";
                const isLastStreaming = loading && i === messages.length - 1 && !isUser;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isUser ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "78%",
                        padding: "8px 13px",
                        background:   isUser ? "#111" : "#f5f5f5",
                        color:        isUser ? "#fff" : "#111",
                        border:       "2px solid #333",
                        borderRadius: isUser
                          ? "6px 2px 6px 6px / 6px 2px 6px 6px"
                          : "2px 6px 6px 6px / 2px 6px 6px 6px",
                        fontSize: 13,
                        lineHeight: 1.65,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.content || (isLastStreaming ? "▋" : "")}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: "#aaa",
                        marginTop: 3,
                        paddingLeft: 2,
                        paddingRight: 2,
                      }}
                    >
                      {isUser ? "you" : "ai"}
                    </span>
                  </div>
                );
              })}

              {error && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#888",
                    border: "1.5px dashed #ccc",
                    borderRadius: 4,
                    padding: "8px 12px",
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input bar */}
          <div
            style={{
              borderTop: "2.5px solid #333",
              padding: "10px 16px",
              paddingLeft: MARGIN_X + 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              flexShrink: 0,
            }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={loading ? "AI is typing…" : "Ask me anything…"}
              disabled={loading}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 13,
                background: "transparent",
                color: "#111",
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 16,
                background: loading || !input.trim() ? "transparent" : "#111",
                color:      loading || !input.trim() ? "#ccc" : "#fff",
                border: "2px solid #333",
                borderRadius: "2px 4px 2px 4px / 4px 2px 4px 2px",
                cursor: loading || !input.trim() ? "default" : "pointer",
                flexShrink: 0,
                opacity: loading || !input.trim() ? 0.4 : 1,
              }}
            >
              ↑
            </button>
          </div>
        </div>

        {/* Sticky notes column — right side */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingTop: 20,
            paddingLeft: 6,
            paddingRight: 4,
            marginLeft: -3,
            zIndex: 2,
            overflowY: "auto",
            overflowX: "visible",
            flexShrink: 0,
            width: 136,
          }}
        >
          {/* New chat sticky */}
          <button
            onClick={addSession}
            style={{
              background: "#111",
              border: "none",
              padding: "10px 10px 14px 12px",
              width: 120,
              fontSize: 12,
              fontWeight: 800,
              color: "#fff",
              textAlign: "left",
              letterSpacing: "-0.01em",
              boxShadow: "3px 4px 8px rgba(0,0,0,0.18), 0 1px 0 rgba(0,0,0,0.06)",
              transform: "rotate(-1.5deg)",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              lineHeight: 1.3,
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = "rotate(-1.5deg) translateY(-3px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "4px 7px 14px rgba(0,0,0,0.22)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = "rotate(-1.5deg)";
              (e.currentTarget as HTMLElement).style.boxShadow = "3px 4px 8px rgba(0,0,0,0.18), 0 1px 0 rgba(0,0,0,0.06)";
            }}
          >
            + new chat
          </button>

          {/* Session stickies */}
          {sessions.map((s, i) => {
            const isActive  = s.id === activeId;
            const color     = STICKY_COLORS[i % STICKY_COLORS.length];
            const rotate    = isActive ? "0deg" : STICKY_ROTATIONS[i % STICKY_ROTATIONS.length];
            const shadow    = isActive
              ? "4px 6px 14px rgba(0,0,0,0.28)"
              : "3px 4px 8px rgba(0,0,0,0.16)";
            const translateX = isActive ? "-6px" : "0px";

            return (
              <div
                key={s.id}
                onClick={() => { setActiveId(s.id); setError(""); }}
                style={{
                  background: color,
                  padding: "10px 10px 14px 12px",
                  width: 120,
                  fontSize: 11,
                  color: "#fff",
                  lineHeight: 1.4,
                  boxShadow: shadow,
                  transform: `rotate(${rotate}) translateX(${translateX})`,
                  cursor: "pointer",
                  position: "relative",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  userSelect: "none",
                  flexShrink: 0,
                  border: "none",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.transform = `rotate(${rotate}) translateY(-3px)`;
                    (e.currentTarget as HTMLElement).style.boxShadow = "4px 7px 14px rgba(0,0,0,0.22)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.transform = `rotate(${rotate}) translateX(0px)`;
                    (e.currentTarget as HTMLElement).style.boxShadow = "3px 4px 8px rgba(0,0,0,0.16)";
                  }
                }}
              >
                {/* Delete button */}
                <button
                  onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                  title="Delete chat"
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 6,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#888",
                    fontSize: 14,
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>

                <span
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: isActive ? 700 : 400,
                    paddingRight: 12,
                  }}
                >
                  {s.name}
                </span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
