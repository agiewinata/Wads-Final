"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskCategory = "ASSIGNMENT" | "PROJECT" | "EXAM";
type TaskStatus   = "CURRENT" | "PAST" | "OVERDUE";
type SortField    = "dueDate" | "createdAt" | "title";
type SortDir      = "asc" | "desc";

interface Task {
  id: string; title: string; details: string | null; subject: string | null;
  dueDate: string | null; category: TaskCategory; completed: boolean; createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatus(t: Task): TaskStatus {
  if (t.completed) return "PAST";
  if (t.dueDate && new Date(t.dueDate) < new Date()) return "OVERDUE";
  return "CURRENT";
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getFullYear()).slice(2)}`;
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,
    time: `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`,
  };
}

// ─── Config ───────────────────────────────────────────────────────────────────

const LINE_H   = 40;   // px per ruled line
const MARGIN_X = 72;   // left margin line position
const MIN_ROWS = 20;   // minimum blank rows to fill the paper

// B&W category palette — grey shades for visual distinction
const CATEGORIES: { value: TaskCategory; label: string; bg: string }[] = [
  { value: "ASSIGNMENT", label: "Assignment", bg: "#e8e8e8" },
  { value: "PROJECT",    label: "Project",    bg: "#d0d0d0" },
  { value: "EXAM",       label: "Exam",       bg: "#b8b8b8" },
];

const CAT_TABS = [
  { value: "ALL" as const, label: "All", bg: "#f4f4f4" },
  ...CATEGORIES,
];

const STATUS_TABS: { value: TaskStatus; label: string }[] = [
  { value: "CURRENT",  label: "CURRENT"  },
  { value: "PAST",     label: "PAST"     },
  { value: "OVERDUE",  label: "OVERDUE"  },
];

// ─── B&W ruled paper background ───────────────────────────────────────────────

const PAPER_STYLE: React.CSSProperties = {
  backgroundColor: "#ffffff",
  backgroundImage: [
    // Dark grey margin line
    `linear-gradient(90deg, transparent ${MARGIN_X - 1}px, #aaa ${MARGIN_X - 1}px, #aaa ${MARGIN_X}px, transparent ${MARGIN_X}px)`,
    // Light grey ruled lines
    `repeating-linear-gradient(transparent 0px, transparent ${LINE_H - 1}px, #e2e2e2 ${LINE_H - 1}px, #e2e2e2 ${LINE_H}px)`,
  ].join(", "),
  backgroundAttachment: "local",
};

function emptyForm() {
  return { title: "", details: "", subject: "", date: "", time: "", category: "ASSIGNMENT" as TaskCategory };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks,          setTasks]          = useState<Task[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [activeStatus,   setActiveStatus]   = useState<TaskStatus>("CURRENT");
  const [activeCategory, setActiveCategory] = useState<"ALL" | TaskCategory>("ALL");
  const [sortField,      setSortField]      = useState<SortField>("createdAt");
  const [sortDir,        setSortDir]        = useState<SortDir>("desc");
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editing,        setEditing]        = useState<Task | null>(null);
  const [form,           setForm]           = useState(emptyForm());
  const [saving,         setSaving]         = useState(false);
  const [formError,      setFormError]      = useState("");
  const [selected,       setSelected]       = useState<Set<string>>(new Set());
  const [burnoutOpen,    setBurnoutOpen]    = useState(false);
  const [burnoutMsg,     setBurnoutMsg]     = useState("");
  const [burnoutLoading, setBurnoutLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const visible = tasks
    .filter(t => getStatus(t) === activeStatus)
    .filter(t => activeCategory === "ALL" || t.category === activeCategory)
    .sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sortField === "dueDate") {
        va = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        vb = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      } else if (sortField === "createdAt") {
        va = new Date(a.createdAt).getTime();
        vb = new Date(b.createdAt).getTime();
      } else {
        va = a.title.toLowerCase();
        vb = b.title.toLowerCase();
      }
      return sortDir === "asc"
        ? (va < vb ? -1 : va > vb ? 1 : 0)
        : (va > vb ? -1 : va < vb ? 1 : 0);
    });

  // ── Handlers ──────────────────────────────────────────────────────────────

  function cycleSort() {
    const fields: SortField[] = ["createdAt", "dueDate", "title"];
    const idx = fields.indexOf(sortField);
    if (idx === fields.length - 1) {
      setSortField(fields[0]);
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(fields[idx + 1]);
    }
  }

  function doOpenAdd() {
    setEditing(null);
    setForm({ ...emptyForm(), category: activeCategory === "ALL" ? "ASSIGNMENT" : activeCategory });
    setFormError("");
    setModalOpen(true);
  }

  async function openAdd() {
    setBurnoutLoading(true);
    try {
      const res = await fetch("/api/ai/assess", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "burnout" }),
      });
      if (res.ok) {
        const data = await res.json() as { show?: boolean; message?: string };
        if (data.show && data.message) {
          setBurnoutMsg(data.message);
          setBurnoutOpen(true);
          setBurnoutLoading(false);
          return;
        }
      }
    } catch { /* Ollama not running — skip check */ }
    setBurnoutLoading(false);
    doOpenAdd();
  }

  function openEdit(task: Task) {
    setEditing(task);
    const { date, time } = toDatetimeLocal(task.dueDate);
    setForm({ title: task.title, details: task.details ?? "", subject: task.subject ?? "", date, time, category: task.category });
    setFormError(""); setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    setSaving(true); setFormError("");
    const isoDate = form.date
      ? new Date(form.time ? `${form.date}T${form.time}:00` : `${form.date}T00:00:00`).toISOString()
      : null;
    const payload = {
      title: form.title.trim(), details: form.details || null,
      subject: form.subject || null, dueDate: isoDate, category: form.category,
    };
    try {
      const res = await fetch(
        editing ? `/api/tasks/${editing.id}` : "/api/tasks",
        { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      if (!res.ok) throw new Error();
      setModalOpen(false); await fetchTasks();
    } catch { setFormError("Something went wrong. Try again."); }
    finally { setSaving(false); }
  }

  async function toggleComplete(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    await fetchTasks();
  }

  async function deleteSelected() {
    if (!selected.size) return;
    await Promise.all([...selected].map(id => fetch(`/api/tasks/${id}`, { method: "DELETE" })));
    setSelected(new Set()); await fetchTasks();
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const rows = Math.max(visible.length, MIN_ROWS);

  // ── Shared button style ────────────────────────────────────────────────────

  const actionBtn = (disabled = false): React.CSSProperties => ({
    width: 36, height: 36,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 18,
    background: "transparent",
    color: "#111",
    border: "2px solid #333",
    borderRadius: "2px 4px 2px 4px / 4px 2px 4px 2px",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.25 : 1,
    flexShrink: 0,
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full flex flex-col gap-4">

      {/* ── Title — outside the paper ─────────────────────────────────── */}
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#111",
          fontStyle: "italic",
          lineHeight: 1,
          paddingLeft: 2,
        }}
      >
        to-do list
      </h1>

      {/* ── Paper + stickers row ──────────────────────────────────────── */}
      <div className="flex items-start gap-0">

      {/* ── Ruled paper ─────────────────────────────────────────────────── */}
      <div
        className="flex-1 min-w-0 flex flex-col"
        style={{
          border: "3px solid #111",
          borderRadius: "6px 2px 2px 6px",
          boxShadow: "5px 7px 0 rgba(0,0,0,0.13)",
          overflow: "hidden",
        }}
      >
        {/* ── Controls row (1.5 lines tall) ── */}
        <div
          style={{
            ...PAPER_STYLE,
            height: LINE_H * 1.5,
            flexShrink: 0,
            borderBottom: "2.5px solid #333",
            display: "flex",
            alignItems: "center",
            paddingLeft: MARGIN_X + 12,
            paddingRight: 16,
            gap: 14,
          }}
        >
          {/* Status tabs */}
          <div style={{ display: "flex" }}>
            {STATUS_TABS.map((tab, i) => {
              const active = activeStatus === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => { setActiveStatus(tab.value); setSelected(new Set()); }}
                  style={{
                    padding: "5px 16px",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    background: active ? "#111" : "transparent",
                    color: active ? "#fff" : "#999",
                    border: "2px solid #555",
                    borderRight: i < STATUS_TABS.length - 1 ? "none" : "2px solid #555",
                    borderRadius: i === 0 ? "3px 0 0 3px" : i === STATUS_TABS.length - 1 ? "0 3px 3px 0" : "0",
                    cursor: "pointer",
                    transition: "all 0.1s",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Action buttons — pushed to the right */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button
              onClick={cycleSort}
              title={`Sort by ${sortField} (${sortDir})`}
              style={actionBtn()}
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
            <button
              onClick={openAdd}
              disabled={burnoutLoading}
              title="Add task"
              style={{ ...actionBtn(burnoutLoading), fontSize: burnoutLoading ? 12 : 18 }}
            >
              {burnoutLoading ? "…" : "+"}
            </button>
            <button
              onClick={deleteSelected}
              disabled={!selected.size}
              title="Delete selected"
              style={{ ...actionBtn(!selected.size), fontSize: 22 }}
            >
              −
            </button>
          </div>
        </div>

        {/* ── Scrollable task rows ── */}
        <div
          className="overflow-y-auto"
          style={{
            ...PAPER_STYLE,
            maxHeight: "calc(100vh - 160px)",
            minHeight: MIN_ROWS * LINE_H,
          }}
        >
          {loading ? (
            <div
              className="flex items-center justify-center text-sm"
              style={{ height: MIN_ROWS * LINE_H, color: "#aaa" }}
            >
              Loading…
            </div>
          ) : (
            <ul>
              {Array.from({ length: rows }).map((_, i) => {
                const task     = visible[i];
                const cat      = task ? CATEGORIES.find(c => c.value === task.category)! : null;
                const showHole = i % 5 === 1;

                return (
                  <li
                    key={task?.id ?? `blank-${i}`}
                    style={{
                      height: LINE_H,
                      paddingLeft:  MARGIN_X + 12,
                      paddingRight: 16,
                      position: "relative",
                    }}
                    className="flex items-center gap-2 group"
                  >
                    {/* Hole punch */}
                    {showHole && (
                      <div
                        style={{
                          position: "absolute",
                          left: 18, top: "50%", transform: "translateY(-50%)",
                          width: 22, height: 22, borderRadius: "50%",
                          background: "#ebebeb", border: "1.5px solid #c4c4c4",
                          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.7)",
                          pointerEvents: "none",
                        }}
                      />
                    )}

                    {task ? (
                      <>
                        {/* Select checkbox */}
                        <input
                          type="checkbox"
                          checked={selected.has(task.id)}
                          onChange={() => toggleSelect(task.id)}
                          className="shrink-0 cursor-pointer accent-zinc-800"
                          style={{ width: 13, height: 13 }}
                        />

                        {/* Task content */}
                        <button
                          onClick={() => openEdit(task)}
                          className="flex-1 min-w-0 flex items-center gap-3 text-left h-full"
                        >
                          <span
                            className="text-sm font-medium text-zinc-800 truncate"
                            style={task.completed
                              ? { textDecoration: "line-through", opacity: 0.35 }
                              : {}}
                          >
                            {task.title}
                          </span>

                          {task.subject && (
                            <span className="text-xs italic shrink-0" style={{ color: "#999" }}>
                              {task.subject}
                            </span>
                          )}

                          <span className="ml-auto shrink-0 flex items-center gap-2">
                            {task.dueDate && (
                              <span className="text-xs font-mono tabular-nums" style={{ color: "#777" }}>
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                            {cat && (
                              <span
                                style={{
                                  background: cat.bg,
                                  border: "1.5px solid #555",
                                  borderRadius: "2px 4px 2px 4px",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "0 6px",
                                  lineHeight: "17px",
                                  display: "inline-block",
                                  color: "#222",
                                }}
                              >
                                {cat.label}
                              </span>
                            )}
                          </span>
                        </button>

                        {/* Complete toggle on hover */}
                        <button
                          onClick={() => toggleComplete(task)}
                          title={task.completed ? "Mark incomplete" : "Mark complete"}
                          className="shrink-0 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            width: 20, height: 20,
                            border: "1.5px solid #333",
                            borderRadius: "2px",
                            background: task.completed ? "#111" : "transparent",
                            color:      task.completed ? "#fff" : "#111",
                          }}
                        >
                          ✓
                        </button>
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Category stickers – horizontal text, poke out right ─────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginLeft: -3,
          paddingTop: LINE_H * 1.5 + 48, // align below controls row
          position: "relative",
          zIndex: 10,
        }}
      >
        {CAT_TABS.map((cat) => {
          const active = activeCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value as "ALL" | TaskCategory)}
              style={{
                background: active ? "#111" : cat.bg,
                color: active ? "#fff" : "#333",
                border: "1.5px solid #333",
                borderLeft: "none",
                borderRadius: "0 5px 5px 0",
                padding: "6px 14px 6px 11px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                textAlign: "left",
                opacity: active ? 1 : 0.6,
                transform: active ? "translateX(4px)" : "none",
                boxShadow: active ? "3px 3px 0 rgba(0,0,0,0.18)" : "1px 1px 0 rgba(0,0,0,0.08)",
                transition: "all 0.12s ease",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      </div>{/* end paper+stickers row */}

      {/* ── Burnout warning popup ───────────────────────────────────────── */}
      {burnoutOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "3px solid #111",
              borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
              boxShadow: "8px 10px 0 rgba(0,0,0,0.18)",
              maxWidth: 400,
              width: "100%",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                borderBottom: "2px solid #e4e4e7",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 800, fontStyle: "italic", letterSpacing: "-0.02em", color: "#111", margin: 0 }}>
                heads up
              </h2>
              <span style={{ fontSize: 11, color: "#aaa", fontStyle: "italic" }}>burnout check</span>
            </div>

            <div style={{ padding: "20px 22px" }}>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: "#333", margin: 0, whiteSpace: "pre-wrap" }}>
                {burnoutMsg}
              </p>
            </div>

            <div
              style={{
                borderTop: "2px solid #e4e4e7",
                padding: "12px 20px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                onClick={() => setBurnoutOpen(false)}
                style={{
                  padding: "6px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  background: "transparent",
                  color: "#555",
                  border: "2px solid #ccc",
                  borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
                  cursor: "pointer",
                }}
              >
                maybe later
              </button>
              <button
                onClick={() => { setBurnoutOpen(false); doOpenAdd(); }}
                style={{
                  padding: "6px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  background: "#111",
                  color: "#fff",
                  border: "2px solid #111",
                  borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
                  cursor: "pointer",
                }}
              >
                add anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Task modal ───────────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={open => setModalOpen(open)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-sm bg-white p-0 overflow-hidden"
          style={{
            border: "3px solid #111",
            borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
            boxShadow: "6px 8px 0 rgba(0,0,0,0.18)",
          }}
        >
          {/* CANCEL / SAVE */}
          <DialogHeader
            className="flex flex-row items-center justify-end gap-2 px-5 py-3"
            style={{ borderBottom: "2px solid #e4e4e7" }}
          >
            <DialogTitle className="sr-only">
              {editing ? "Edit Task" : "Add Task"}
            </DialogTitle>
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-1 text-sm font-bold hover:bg-zinc-100 transition-colors"
              style={{ border: "2px solid #111", borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px" }}
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1 text-sm font-bold disabled:opacity-50"
              style={{
                background: "#111", color: "#fff",
                border: "2px solid #111",
                borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
              }}
            >
              {saving ? "Saving…" : "SAVE"}
            </button>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            {formError && (
              <p className="text-sm font-medium" style={{ color: "#555" }}>{formError}</p>
            )}

            <div className="space-y-1">
              <Label className="text-sm font-semibold text-zinc-700">Title:</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title…"
                className="bg-transparent border-0 border-b-2 border-zinc-800 rounded-none px-0 text-base focus-visible:ring-0"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-semibold text-zinc-700">Details:</Label>
              <Textarea
                value={form.details}
                onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
                placeholder="type here…"
                rows={3}
                className="resize-none bg-zinc-50 text-sm focus-visible:ring-1 focus-visible:ring-zinc-400"
                style={{ border: "2px solid #d4d4d8", borderRadius: "4px 6px 4px 6px" }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-semibold text-zinc-700">Category:</Label>
              <Select
                value={form.category}
                onValueChange={v => setForm(f => ({ ...f, category: v as TaskCategory }))}
              >
                <SelectTrigger
                  className="bg-transparent"
                  style={{ border: "2px solid #d4d4d8", borderRadius: "3px 5px 3px 5px" }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span
                        className="inline-block w-3 h-3 rounded-sm mr-2"
                        style={{ background: cat.bg, border: "1px solid #555" }}
                      />
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-semibold text-zinc-700">Subject:</Label>
              <Input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Subject…"
                className="bg-transparent border-0 border-b-2 border-zinc-300 rounded-none px-0 text-sm focus-visible:ring-0 focus-visible:border-zinc-800"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-sm font-semibold text-zinc-700">Due Date:</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="bg-transparent border-0 border-b-2 border-zinc-300 rounded-none px-0 text-sm focus-visible:ring-0"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-sm font-semibold text-zinc-700">Time:</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="bg-transparent border-0 border-b-2 border-zinc-300 rounded-none px-0 text-sm focus-visible:ring-0"
                />
              </div>
            </div>

            {editing && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="completed"
                  checked={editing.completed}
                  onChange={async () => {
                    await fetch(`/api/tasks/${editing.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ completed: !editing.completed }),
                    });
                    setEditing(e => e ? { ...e, completed: !e.completed } : e);
                    await fetchTasks();
                  }}
                  className="w-4 h-4 accent-zinc-800 cursor-pointer"
                />
                <Label htmlFor="completed" className="text-sm text-zinc-600 cursor-pointer">
                  Mark as completed
                </Label>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
