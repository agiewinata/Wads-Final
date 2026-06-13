"use client";

import { useState, useEffect, useRef } from "react";
import { Paperclip, ChevronRight } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { csrfFetch } from "@/lib/csrf-client";

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = {
  role: "user" | "assistant";
  content: string;
  imgThumb?: string; // small data-URL thumbnail stored for display
  fileName?: string; // document or image filename for display
};

type Attachment =
  | { kind: "image"; name: string; base64Full: string; thumb: string }
  | { kind: "doc";   name: string; text: string };

type ChatSession = { id: string; name: string; messages: Message[]; createdAt: number };

// ── Constants ─────────────────────────────────────────────────────────────────

const LINE_H   = 40;
const MARGIN_X = 72;

const STICKY_COLORS    = ["#111", "#111", "#111", "#111", "#111", "#111"];
const STICKY_ROTATIONS = ["2deg", "-1.5deg", "2.5deg", "-2deg", "1.5deg", "-2.5deg"];

const PAPER_STYLE: React.CSSProperties = {
  backgroundColor: "#ffffff",
  backgroundImage: [
    `linear-gradient(90deg, transparent ${MARGIN_X - 1}px, #aaa ${MARGIN_X - 1}px, #aaa ${MARGIN_X}px, transparent ${MARGIN_X}px)`,
    `repeating-linear-gradient(transparent 0px, transparent ${LINE_H - 1}px, #e2e2e2 ${LINE_H - 1}px, #e2e2e2 ${LINE_H}px)`,
  ].join(", "),
  backgroundAttachment: "local",
};

const ACCEPTED_FILES = [
  "image/*",
  ".pdf",
  ".txt", ".md", ".csv", ".json",
  ".js", ".ts", ".jsx", ".tsx",
  ".py", ".html", ".css", ".xml", ".yaml", ".yml",
].join(",");

// ── Helpers ───────────────────────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 10); }
function freshSession(): ChatSession { return { id: genId(), name: "New chat", messages: [], createdAt: Date.now() }; }

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]); // strip data-URL prefix
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImageThumb(file: File, maxPx = 220): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale  = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function streamChat(
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  images?: string[],
): Promise<string | null> {
  let res: Response;
  try {
    res = await csrfFetch("/api/ai/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ messages, images }),
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function AIPage() {
  const { data: sessionData } = useSession();
  const firstName = sessionData?.user?.name?.split(" ")[0] ?? "there";

  const [sessions,   setSessions]   = useState<ChatSession[]>(() =>
    typeof window === "undefined" ? [freshSession()] : loadSessions(),
  );
  const [activeId,   setActiveId]   = useState<string>(() => sessions[0]?.id ?? "");
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file
    if (!file) return;

    setFileLoading(true);
    try {
      if (file.type.startsWith("image/")) {
        const [base64Full, thumb] = await Promise.all([
          fileToBase64(file),
          resizeImageThumb(file),
        ]);
        setAttachment({ kind: "image", name: file.name, base64Full, thumb });
      } else if (file.name.endsWith(".pdf")) {
        const form = new FormData();
        form.append("file", file);
        const res = await csrfFetch("/api/ai/upload", { method: "POST", body: form });
        if (!res.ok) { setError("Could not parse PDF."); return; }
        const { text } = await res.json() as { text: string };
        setAttachment({ kind: "doc", name: file.name, text });
      } else {
        // Plain text-based file — read client-side
        const text = await file.text();
        setAttachment({ kind: "doc", name: file.name, text: text.slice(0, 20_000) });
      }
    } catch {
      setError("Failed to load file.");
    } finally {
      setFileLoading(false);
    }
  }

  async function sendMessage() {
    const userText = input.trim();
    if ((!userText && !attachment) || loading) return;

    const id = active.id;

    // Build display message
    const userMsg: Message = {
      role: "user",
      content: userText,
      ...(attachment?.kind === "image" && { imgThumb: attachment.thumb, fileName: attachment.name }),
      ...(attachment?.kind === "doc"   && { fileName: attachment.name }),
    };

    // Build API messages — expand attachment into the last message's content
    const apiContent = attachment?.kind === "doc"
      ? `[Attached document: ${attachment.name}]\n\n${attachment.text}\n\n---\n\n${userText || "(see attached document)"}`
      : (userText || "(see attached image)");

    const apiMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: apiContent },
    ];

    const images = attachment?.kind === "image" ? [attachment.base64Full] : undefined;

    const outgoing = [...messages, userMsg];
    patchSession(id, [...outgoing, { role: "assistant", content: "" }]);
    setInput("");
    setAttachment(null);
    setLoading(true);
    setError("");

    let assembled = "";
    const err = await streamChat(apiMessages, chunk => {
      assembled += chunk;
      patchSession(id, [...outgoing, { role: "assistant", content: assembled }]);
    }, images);

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
    setAttachment(null);
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full flex flex-col gap-4" style={{ height: "calc(100vh - 48px)" }}>

      {/* Title */}
      <h1 style={{
        fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em",
        color: "#111", fontStyle: "italic", lineHeight: 1, paddingLeft: 2, flexShrink: 0,
      }}>
        AI Assistant
      </h1>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* ── Chat panel ── */}
        <div style={{
          flex: 1,
          border: "3px solid #111",
          borderRadius: "6px 2px 2px 6px",
          boxShadow: "5px 7px 0 rgba(0,0,0,0.13)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>

          {/* Message area */}
          <div className="flex-1 overflow-y-auto" style={PAPER_STYLE}>
            <div style={{
              paddingTop: 16, paddingBottom: 16,
              paddingLeft: MARGIN_X + 12, paddingRight: 20,
              minHeight: "100%", display: "flex", flexDirection: "column", gap: 18,
            }}>
              {messages.length === 0 && !loading && (
                <div style={{ color: "#888", fontSize: 13, fontStyle: "italic" }}>
                  Hey {firstName}! How can I help you today?
                </div>
              )}
              {messages.length === 0 && loading && (
                <div style={{ color: "#bbb", fontSize: 13, fontStyle: "italic" }}>thinking…</div>
              )}

              {messages.map((msg, i) => {
                const isUser          = msg.role === "user";
                const isLastStreaming = loading && i === messages.length - 1 && !isUser;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", gap: 6 }}>

                    {/* ── Attachment — above the bubble ── */}
                    {msg.imgThumb && (
                      <img
                        src={msg.imgThumb}
                        alt={msg.fileName}
                        style={{
                          display: "block", maxWidth: 220, maxHeight: 180,
                          borderRadius: 6,
                          border: "2px solid #333",
                          boxShadow: "3px 4px 0 rgba(0,0,0,0.13)",
                          objectFit: "cover",
                        }}
                      />
                    )}
                    {msg.fileName && !msg.imgThumb && (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: isUser ? "#222" : "#efefef",
                        color: isUser ? "#fff" : "#333",
                        border: "1.5px solid #555",
                        borderRadius: "4px 6px 4px 6px / 6px 4px 6px 4px",
                        padding: "4px 10px",
                        fontSize: 11, fontWeight: 700,
                      }}>
                        📄 {msg.fileName}
                      </div>
                    )}

                    {/* ── Message bubble ── */}
                    {(msg.content || isLastStreaming) && (
                      <div style={{
                        maxWidth: "78%",
                        padding: "8px 13px",
                        background:   isUser ? "#111" : "#f5f5f5",
                        color:        isUser ? "#fff" : "#111",
                        border:       "2px solid #333",
                        borderRadius: isUser ? "6px 2px 6px 6px / 6px 2px 6px 6px" : "2px 6px 6px 6px / 2px 6px 6px 6px",
                        fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap",
                      }}>
                        {msg.content || (isLastStreaming ? "▋" : "")}
                      </div>
                    )}

                    <span style={{ fontSize: 10, color: "#aaa", paddingLeft: 2, paddingRight: 2 }}>
                      {isUser ? "you" : "ai"}
                    </span>
                  </div>
                );
              })}

              {error && (
                <div style={{
                  fontSize: 12, color: "#888",
                  border: "1.5px dashed #ccc", borderRadius: 4,
                  padding: "8px 12px", lineHeight: 1.5,
                }}>
                  {error}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Attachment preview strip */}
          {attachment && (
            <div style={{
              borderTop: "1.5px solid #e4e4e7",
              paddingTop: 8, paddingBottom: 8,
              paddingLeft: MARGIN_X + 8, paddingRight: 14,
              background: "#fafafa",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}>
              {attachment.kind === "image" ? (
                <img
                  src={attachment.thumb}
                  alt={attachment.name}
                  style={{ height: 48, borderRadius: 4, border: "1.5px solid #ddd", objectFit: "cover" }}
                />
              ) : (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#eee", borderRadius: 4, padding: "6px 10px",
                  fontSize: 11, fontWeight: 600, color: "#333",
                }}>
                  📄 {attachment.name}
                </div>
              )}
              <button
                onClick={() => setAttachment(null)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 16, color: "#888", lineHeight: 1, padding: 0,
                }}
                title="Remove attachment"
              >
                ×
              </button>
            </div>
          )}

          {/* Input bar */}
          <div style={{
            borderTop: "2.5px solid #333",
            paddingTop: 4, paddingBottom: 4,
            paddingLeft: 0, paddingRight: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fff",
            flexShrink: 0,
          }}>
            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_FILES}
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

            {/* Attach button — lives in the left margin area */}
            <div style={{
              width: MARGIN_X,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={loading || fileLoading}
                title="Attach file"
                style={{
                  width: 44, height: 44,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: attachment ? "#111" : "transparent",
                  color:      attachment ? "#fff" : "#aaa",
                  border: "2px solid",
                  borderColor: attachment ? "#111" : "#d4d4d8",
                  borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
                  cursor: loading || fileLoading ? "default" : "pointer",
                  opacity: loading || fileLoading ? 0.35 : 1,
                  transition: "background 0.12s, color 0.12s, border-color 0.12s",
                }}
                onMouseEnter={e => {
                  if (!loading && !fileLoading && !attachment) {
                    (e.currentTarget as HTMLElement).style.borderColor = "#111";
                    (e.currentTarget as HTMLElement).style.color = "#111";
                  }
                }}
                onMouseLeave={e => {
                  if (!attachment) {
                    (e.currentTarget as HTMLElement).style.borderColor = "#d4d4d8";
                    (e.currentTarget as HTMLElement).style.color = "#aaa";
                  }
                }}
              >
                {fileLoading
                  ? <span style={{ fontSize: 11, fontWeight: 700 }}>…</span>
                  : <Paperclip size={18} strokeWidth={2.2} />}
              </button>
            </div>

            {/* Text input — starts right at the margin line */}
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={loading ? "AI is typing…" : attachment ? "Add a message… (or press ↑)" : "Ask me anything…"}
              disabled={loading}
              style={{
                flex: 1, border: "none", outline: "none",
                fontSize: 13, background: "transparent", color: "#111",
                minWidth: 0,
              }}
            />

            {/* Send button */}
            <button
              onClick={sendMessage}
              disabled={loading || (!input.trim() && !attachment)}
              title="Send"
              style={{
                width: 44, height: 44, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: (loading || (!input.trim() && !attachment)) ? "transparent" : "#111",
                color:      (loading || (!input.trim() && !attachment)) ? "#bbb"       : "#fff",
                border: "2px solid",
                borderColor: (loading || (!input.trim() && !attachment)) ? "#d4d4d8" : "#111",
                borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
                cursor: (loading || (!input.trim() && !attachment)) ? "default" : "pointer",
                transition: "background 0.12s, color 0.12s, border-color 0.12s",
              }}
            >
              <ChevronRight size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Session stickies ── */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 10,
          paddingTop: 20, paddingLeft: 6, paddingRight: 4,
          marginLeft: -3, zIndex: 2,
          overflowY: "auto", overflowX: "visible",
          flexShrink: 0, width: 136,
        }}>
          <button
            onClick={addSession}
            style={{
              background: "#111", border: "none",
              padding: "10px 10px 14px 12px", width: 120,
              fontSize: 12, fontWeight: 800, color: "#fff",
              textAlign: "left", letterSpacing: "-0.01em",
              boxShadow: "3px 4px 8px rgba(0,0,0,0.18), 0 1px 0 rgba(0,0,0,0.06)",
              transform: "rotate(-1.5deg)", cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              lineHeight: 1.3, flexShrink: 0,
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

          {sessions.map((s, i) => {
            const isActive   = s.id === activeId;
            const color      = STICKY_COLORS[i % STICKY_COLORS.length];
            const rotate     = isActive ? "0deg" : STICKY_ROTATIONS[i % STICKY_ROTATIONS.length];
            const shadow     = isActive ? "4px 6px 14px rgba(0,0,0,0.28)" : "3px 4px 8px rgba(0,0,0,0.16)";
            const translateX = isActive ? "-6px" : "0px";

            return (
              <div
                key={s.id}
                onClick={() => { setActiveId(s.id); setError(""); }}
                style={{
                  background: color, padding: "10px 10px 14px 12px", width: 120,
                  fontSize: 11, color: "#fff", lineHeight: 1.4,
                  boxShadow: shadow,
                  transform: `rotate(${rotate}) translateX(${translateX})`,
                  cursor: "pointer", position: "relative",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  userSelect: "none", flexShrink: 0, border: "none",
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
                <button
                  onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                  title="Delete chat"
                  style={{
                    position: "absolute", top: 5, right: 6,
                    background: "none", border: "none",
                    cursor: "pointer", color: "#888", fontSize: 14, lineHeight: 1, padding: 0,
                  }}
                >×</button>
                <span style={{
                  display: "block", overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                  fontWeight: isActive ? 700 : 400, paddingRight: 12,
                }}>
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
