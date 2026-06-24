"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Paperclip, ChevronRight, Bot, UserRound, Plus, X } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { csrfFetch } from "@/lib/csrf-client";

type Message = {
  role: "user" | "assistant";
  content: string;
  imgThumb?: string;
  fileName?: string;
};

type Attachment =
  | { kind: "image"; name: string; base64Full: string; thumb: string }
  | { kind: "doc"; name: string; text: string };

type ChatSession = { id: string; name: string; messages: Message[]; createdAt: number };

const ACCEPTED_FILES = [
  "image/*",
  ".pdf",
  ".txt", ".md", ".csv", ".json",
  ".js", ".ts", ".jsx", ".tsx",
  ".py", ".html", ".css", ".xml", ".yaml", ".yml",
].join(",");

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function freshSession(): ChatSession {
  return { id: genId(), name: "New chat", messages: [], createdAt: Date.now() };
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImageThumb(file: File, maxPx = 220): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, images }),
    });
  } catch {
    return "Could not reach the server.";
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return (body as { error?: string }).error ?? "Something went wrong.";
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    if (text) onChunk(text);
  }

  return null;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ink-faint)]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ink-faint)] [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ink-faint)] [animation-delay:240ms]" />
    </div>
  );
}

export default function AIPage() {
  const { data: sessionData } = useSession();
  const firstName = sessionData?.user?.name?.split(" ")[0] ?? "there";

  const [sessions, setSessions] = useState<ChatSession[]>(() =>
    typeof window === "undefined" ? [freshSession()] : loadSessions(),
  );
  const [activeId, setActiveId] = useState<string>(() => sessions[0]?.id ?? "");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [chatListOpen, setChatListOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = sessions.find((s) => s.id === activeId) ?? sessions[0];
  const messages = useMemo(() => active?.messages ?? [], [active]);

  useEffect(() => {
    try {
      localStorage.setItem("ai-sessions", JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function patchSession(id: string, newMessages: Message[]) {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;

        const firstUserText = newMessages.find((m) => m.role === "user")?.content ?? "";
        const name = firstUserText
          ? firstUserText.slice(0, 28) + (firstUserText.length > 28 ? "…" : "")
          : s.name;

        return { ...s, name, messages: newMessages };
      }),
    );
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
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

        const res = await csrfFetch("/api/ai/upload", {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          setError("Could not parse PDF.");
          return;
        }

        const { text } = (await res.json()) as { text: string };
        setAttachment({ kind: "doc", name: file.name, text });
      } else {
        const text = await file.text();
        setAttachment({
          kind: "doc",
          name: file.name,
          text: text.slice(0, 20_000),
        });
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

    const userMsg: Message = {
      role: "user",
      content: userText,
      ...(attachment?.kind === "image" && {
        imgThumb: attachment.thumb,
        fileName: attachment.name,
      }),
      ...(attachment?.kind === "doc" && {
        fileName: attachment.name,
      }),
    };

    const apiContent =
      attachment?.kind === "doc"
        ? `[Attached document: ${attachment.name}]\n\n${attachment.text}\n\n---\n\n${userText || "(see attached document)"}`
        : userText || "(see attached image)";

    const apiMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
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

    const err = await streamChat(
      apiMessages,
      (chunk) => {
        assembled += chunk;
        patchSession(id, [...outgoing, { role: "assistant", content: assembled }]);
      },
      images,
    );

    if (err) {
      patchSession(id, outgoing);
      setError(err);
    }

    setLoading(false);
  }

  function addSession() {
    const s = freshSession();

    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setError("");
    setInput("");
    setAttachment(null);
    setChatListOpen(false);
  }

  function deleteSession(id: string) {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);

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
    <div className="w-full flex flex-col gap-5" style={{ height: "calc(100vh - 48px)" }}>
      {/* Header */}
      <div className="relative z-20 flex shrink-0 items-end justify-between flex-wrap gap-4">
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
            Study Buddy
          </h1>

          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 10 }}>
            Ask anything — your AI study buddy explains, quizzes, and plans with you
            <span
              style={{
                marginLeft: 8,
                borderRadius: 999,
                background: "#eef0ff",
                color: "#4350ad",
                padding: "2px 8px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              AI
            </span>
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setChatListOpen((prev) => !prev)}
            className="btn-paper"
            style={{
              height: 36,
              padding: "0 14px",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Chats
          </button>

          {chatListOpen && (
            <div
              className="absolute right-0 top-11 z-50 overflow-hidden"
              style={{
                width: 260,
                background: "var(--paper)",
                border: "1px solid var(--line-strong)",
                borderRadius: 14,
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <button
                onClick={addSession}
                className="flex w-full items-center gap-2 text-left"
                style={{
                  padding: "12px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--accent)",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <Plus size={16} />
                New chat
              </button>

              <div className="max-h-72 overflow-y-auto">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setActiveId(s.id);
                      setError("");
                      setChatListOpen(false);
                    }}
                    className="group flex cursor-pointer items-center justify-between gap-2"
                    style={{
                      padding: "11px 16px",
                      fontSize: 13,
                      background: s.id === activeId ? "var(--paper-2)" : "transparent",
                      color: s.id === activeId ? "var(--accent)" : "var(--ink-soft)",
                      fontWeight: s.id === activeId ? 700 : 500,
                    }}
                  >
                    <span className="truncate">{s.name}</span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(s.id);
                      }}
                      className="shrink-0 rounded-full p-1 text-neutral-400 opacity-0 transition hover:bg-black/5 hover:text-neutral-700 group-hover:opacity-100"
                      title="Delete chat"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          <div className="flex min-h-full flex-col gap-8 pb-6">
            {messages.length === 0 && !loading && (
              <div className="flex items-start gap-4">
                <div
                  className="grid shrink-0 place-items-center rounded-full text-white"
                  style={{
                    width: 46,
                    height: 46,
                    background: "var(--accent)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <Bot size={22} />
                </div>

                <div>
                  <div
                    style={{
                      marginBottom: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--ink-faint)",
                    }}
                  >
                    Study Buddy
                  </div>

                  <div
                    style={{
                      maxWidth: 640,
                      borderRadius: 14,
                      background: "var(--paper)",
                      padding: "14px 18px",
                      fontSize: 14.5,
                      lineHeight: 1.6,
                      color: "var(--ink)",
                      boxShadow: "var(--shadow-sm)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    Hey {firstName}! How can I help you today?
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const isLastStreaming = loading && i === messages.length - 1 && !isUser;

              return (
                <div
                  key={i}
                  className={`flex items-start gap-4 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div
                      className="grid shrink-0 place-items-center rounded-full text-white"
                      style={{
                        width: 46,
                        height: 46,
                        background: "var(--accent)",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <Bot size={22} />
                    </div>
                  )}

                  <div
                    className={`flex max-w-[640px] flex-col ${
                      isUser ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      style={{
                        marginBottom: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--ink-faint)",
                      }}
                    >
                      {isUser ? "You" : "Study Buddy"}
                    </div>

                    {msg.imgThumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={msg.imgThumb}
                        alt={msg.fileName}
                        className="mb-2 object-cover"
                        style={{
                          maxWidth: 220,
                          maxHeight: 180,
                          borderRadius: 14,
                          border: "1px solid var(--line)",
                          boxShadow: "var(--shadow-sm)",
                        }}
                      />
                    )}

                    {msg.fileName && !msg.imgThumb && (
                      <div
                        className="mb-2"
                        style={{
                          borderRadius: 999,
                          padding: "5px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          background: isUser ? "var(--accent)" : "var(--paper)",
                          color: isUser ? "#fff" : "var(--ink-soft)",
                          boxShadow: "var(--shadow-sm)",
                          border: isUser ? "none" : "1px solid var(--line)",
                        }}
                      >
                        📄 {msg.fileName}
                      </div>
                    )}

                    {(msg.content || isLastStreaming) && (
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          padding: "12px 18px",
                          fontSize: 14.5,
                          lineHeight: 1.6,
                          borderRadius: isUser ? 14 : 14,
                          background: isUser ? "var(--accent)" : "var(--paper)",
                          color: isUser ? "#fff" : "var(--ink)",
                          boxShadow: "var(--shadow-sm)",
                          border: isUser ? "none" : "1px solid var(--line)",
                        }}
                      >
                        {msg.content || (isLastStreaming ? <TypingDots /> : "")}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div
                      className="grid shrink-0 place-items-center rounded-full text-black"
                      style={{
                        width: 46,
                        height: 46,
                        marginTop: 26,
                        background: "#ffe477",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <UserRound size={22} />
                    </div>
                  )}
                </div>
              );
            })}

            {error && (
              <div
                className="mx-auto"
                style={{
                  borderRadius: 14,
                  background: "var(--paper)",
                  padding: "10px 16px",
                  fontSize: 13,
                  color: "var(--bad)",
                  boxShadow: "var(--shadow-sm)",
                  border: "1px solid var(--line)",
                }}
              >
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {attachment && (
          <div
            className="mb-3 flex items-center gap-3"
            style={{
              borderRadius: 14,
              background: "var(--paper)",
              padding: "10px 14px",
              boxShadow: "var(--shadow-sm)",
              border: "1px solid var(--line)",
            }}
          >
            {attachment.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attachment.thumb}
                alt={attachment.name}
                style={{
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  borderRadius: 999,
                  background: "var(--paper-2)",
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--ink-soft)",
                }}
              >
                📄 {attachment.name}
              </div>
            )}

            <button
              onClick={() => setAttachment(null)}
              className="rounded-full p-1 text-neutral-400 hover:bg-black/5 hover:text-neutral-700"
              title="Remove attachment"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Input bar */}
        <div
          style={{
            flexShrink: 0,
            borderRadius: 14,
            background: "var(--paper)",
            padding: "10px 12px",
            boxShadow: "var(--shadow)",
            border: "1px solid var(--line-strong)",
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_FILES}
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading || fileLoading}
              title="Attach file"
              className="grid shrink-0 place-items-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid var(--line-strong)",
                background: attachment ? "var(--accent)" : "var(--paper)",
                color: attachment ? "#fff" : "var(--ink-soft)",
                cursor: loading || fileLoading ? "default" : "pointer",
                opacity: loading || fileLoading ? 0.4 : 1,
              }}
            >
              {fileLoading ? (
                <span style={{ fontSize: 13, fontWeight: 700 }}>…</span>
              ) : (
                <Paperclip size={17} strokeWidth={2.2} />
              )}
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                loading
                  ? "AI is typing…"
                  : attachment
                    ? "Add a message…"
                    : "Ask your study buddy..."
              }
              disabled={loading}
              className="min-w-0 flex-1 bg-transparent outline-none"
              style={{
                fontSize: 14,
                color: "var(--ink)",
              }}
            />

            <button
              onClick={sendMessage}
              disabled={loading || (!input.trim() && !attachment)}
              title="Send"
              className="grid shrink-0 place-items-center"
              style={{
                width: 44,
                height: 36,
                borderRadius: 10,
                border: "1px solid var(--accent)",
                background: "var(--accent)",
                color: "#fff",
                cursor: loading || (!input.trim() && !attachment) ? "default" : "pointer",
                opacity: loading || (!input.trim() && !attachment) ? 0.35 : 1,
              }}
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}