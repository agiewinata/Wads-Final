"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfFetch } from "@/lib/csrf-client";
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
import { DateTimePicker } from "@/app/dashboard/calendar/_components/DateTimePicker";
import { Plus, ArrowUp, ArrowDown, Trash2, X, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = "CURRENT" | "PAST" | "OVERDUE";
type SortField  = "dueDate" | "createdAt" | "title" | "priority";
type SortDir    = "asc" | "desc";

interface Task {
  id: string; title: string; details: string | null; priority: number | null;
  dueDate: string | null; category: string | null; completed: boolean; createdAt: string;
}

interface UserCategory { id: string; name: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatus(t: Task): TaskStatus {
  if (t.completed) return "PAST";
  if (t.dueDate && new Date(t.dueDate) < new Date()) return "OVERDUE";
  return "CURRENT";
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

const LINE_H   = 48;   // px per ruled line (matches .ruled background)
const MIN_ROWS = 12;

const BUILT_IN: { value: string; label: string }[] = [
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "PROJECT",    label: "Project" },
  { value: "EXAM",       label: "Exam" },
];

function getCategoryLabel(value: string) {
  return BUILT_IN.find(c => c.value === value)?.label ?? value;
}
function pillClass(value: string) {
  if (value === "ASSIGNMENT") return "pill pill-assignment";
  if (value === "PROJECT")    return "pill pill-project";
  if (value === "EXAM")       return "pill pill-exam";
  return "pill";
}

const STATUS_TABS: { value: TaskStatus; label: string }[] = [
  { value: "CURRENT",  label: "Current" },
  { value: "PAST",     label: "Past" },
  { value: "OVERDUE",  label: "Overdue" },
];

function emptyForm() {
  return { title: "", details: "", priority: null as number | null, date: "", category: "" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks,          setTasks]          = useState<Task[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [addingCat,      setAddingCat]      = useState(false);
  const [newCatName,     setNewCatName]     = useState("");
  const [catError,       setCatError]       = useState("");
  const [hiddenCats,     setHiddenCats]     = useState<Set<string>>(new Set());
  const [activeStatus,   setActiveStatus]   = useState<TaskStatus>("CURRENT");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [sortField,      setSortField]      = useState<SortField>("createdAt");
  const [sortDir,        setSortDir]        = useState<SortDir>("desc");
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editing,        setEditing]        = useState<Task | null>(null);
  const [form,           setForm]           = useState(emptyForm());
  const [saving,         setSaving]         = useState(false);
  const [formError,      setFormError]      = useState("");
  const [selected,       setSelected]       = useState<Set<string>>(new Set());
  const [deleteMode,     setDeleteMode]     = useState(false);
  const [burnoutOpen,    setBurnoutOpen]    = useState(false);
  const [burnoutMsg,     setBurnoutMsg]     = useState("");
  const [burnoutLoading, setBurnoutLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (res.ok) setUserCategories(await res.json());
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchTasks(); fetchCategories(); }, [fetchTasks, fetchCategories]);

  const visible = tasks
    .filter(t => getStatus(t) === activeStatus)
    .filter(t => activeCategory === "ALL" || (!!t.category && t.category === activeCategory))
    .sort((a, b) => {
      if (sortField === "dueDate") {
        const ta = a.dueDate ? new Date(a.dueDate).getTime() : null;
        const tb = b.dueDate ? new Date(b.dueDate).getTime() : null;
        if (ta === null && tb === null) return 0;
        if (ta === null) return 1;
        if (tb === null) return -1;
        return sortDir === "asc" ? ta - tb : tb - ta;
      }
      if (sortField === "priority") {
        const pa = a.priority, pb = b.priority;
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;
        if (pb === null) return -1;
        return sortDir === "asc" ? pa - pb : pb - pa;
      }
      let va: string | number, vb: string | number;
      if (sortField === "createdAt") {
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

  // counts for subtitle
  const activeCount  = tasks.filter(t => getStatus(t) === "CURRENT").length;
  const overdueCount = tasks.filter(t => getStatus(t) === "OVERDUE").length;
  const doneCount    = tasks.filter(t => t.completed).length;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function toggleSortDir() {
    setSortDir(d => d === "asc" ? "desc" : "asc");
  }

  function doOpenAdd() {
    setEditing(null);
    setForm({ ...emptyForm(), category: activeCategory === "ALL" ? "" : activeCategory });
    setFormError("");
    setModalOpen(true);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      doOpenAdd();
      window.history.replaceState(null, "", "/dashboard/tasks");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openAdd() {
    setBurnoutLoading(true);
    try {
      const res = await csrfFetch("/api/ai/assess", {
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
    setForm({ title: task.title, details: task.details ?? "", priority: task.priority ?? null, date: task.dueDate ?? "", category: task.category ?? "" });
    setFormError(""); setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    setSaving(true); setFormError("");
    const isoDate = form.date || null;
    const payload = {
      title: form.title.trim(), details: form.details || null,
      priority: form.priority, dueDate: isoDate, category: form.category || null,
    };
    try {
      const res = await csrfFetch(
        editing ? `/api/tasks/${editing.id}` : "/api/tasks",
        { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      if (!res.ok) throw new Error();
      setModalOpen(false); await fetchTasks();
    } catch { setFormError("Something went wrong. Try again."); }
    finally { setSaving(false); }
  }

  async function toggleComplete(task: Task) {
    await csrfFetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    await fetchTasks();
  }

  async function deleteSelected() {
    if (selected.size) {
      await Promise.all([...selected].map(id => csrfFetch(`/api/tasks/${id}`, { method: "DELETE" })));
      await fetchTasks();
    }
    setSelected(new Set());
    setDeleteMode(false);
  }

  function handleDeleteButton() {
    if (!deleteMode) setDeleteMode(true);
    else deleteSelected();
  }

  async function addCategory() {
    const name = newCatName.trim();
    if (!name) return;
    setCatError("");
    const res = await csrfFetch("/api/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      await fetchCategories();
      setNewCatName("");
      setAddingCat(false);
    } else {
      const data = await res.json().catch(() => ({}));
      setCatError(data.error === "Already exists" ? "Already exists" : "Failed to add");
    }
  }

  async function deleteCategory(id: string, name: string) {
    await csrfFetch(`/api/categories/${id}`, { method: "DELETE" });
    if (activeCategory === name) setActiveCategory("ALL");
    await fetchCategories();
    await fetchTasks();
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id) } else { n.add(id) } return n; });
  }

  const rows = Math.max(visible.length, MIN_ROWS);
  const activeCustom = userCategories.find(c => c.name === activeCategory);

  // shared small icon-button on the toolbar
  const iconBtn = (active = false): React.CSSProperties => ({
    width: 36, height: 36, display: "grid", placeItems: "center",
    borderRadius: 10, cursor: "pointer", flexShrink: 0,
    border: "1px solid " + (active ? "var(--accent)" : "var(--line-strong)"),
    background: active ? "var(--accent)" : "var(--paper)",
    color: active ? "#fff" : "var(--ink-soft)",
  });

  const selectStyle: React.CSSProperties = {
    height: 36, fontSize: 13, fontWeight: 600, color: "var(--ink)",
    background: "var(--paper)", border: "1px solid var(--line-strong)", borderRadius: 10,
    padding: "0 30px 0 12px", cursor: "pointer", appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23a69e8f'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 11px center",
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full flex flex-col gap-5">

      {/* header */}
      <div className="flex items-end justify-between flex-wrap" style={{ gap: 16 }}>
        <div>
          <h1 className="swipe" style={{ fontFamily: "var(--font-heading)", fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>
            To-do list
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 10 }}>
            {activeCount} active · {overdueCount} overdue · {doneCount} done
          </p>
        </div>
        <button onClick={openAdd} disabled={burnoutLoading} className="btn-ink" style={{ opacity: burnoutLoading ? 0.6 : 1 }}>
          <Plus size={17} /> {burnoutLoading ? "Checking…" : "New task"}
        </button>
      </div>

      {/* notebook */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line-strong)", borderRadius: 14, boxShadow: "var(--shadow)", overflow: "hidden" }}>

        {/* toolbar */}
        <div className="flex items-center flex-wrap" style={{ gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
          {/* status segmented control */}
          <div style={{ display: "inline-flex", background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 999, padding: 3 }}>
            {STATUS_TABS.map(tab => {
              const active = activeStatus === tab.value;
              return (
                <button key={tab.value}
                  onClick={() => { setActiveStatus(tab.value); setSelected(new Set()); setDeleteMode(false); }}
                  style={{
                    fontSize: 12.5, fontWeight: 600, border: "none", cursor: "pointer",
                    padding: "6px 15px", borderRadius: 999,
                    background: active ? "var(--paper)" : "transparent",
                    color: active ? "var(--ink)" : "var(--ink-soft)",
                    boxShadow: active ? "var(--shadow-sm)" : "none",
                  }}>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* right side: category dropdown + sort + dir + delete */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* category filter dropdown */}
            {addingCat ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input autoFocus value={newCatName}
                  onChange={e => { setNewCatName(e.target.value); setCatError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") { setAddingCat(false); setNewCatName(""); setCatError(""); } }}
                  placeholder="category name…" maxLength={32}
                  style={{ width: 140, height: 36, fontSize: 13, padding: "0 10px", outline: "none",
                    border: `1px solid ${catError ? "var(--bad)" : "var(--line-strong)"}`, borderRadius: 10, background: "var(--paper)", color: "var(--ink)" }} />
                <button onClick={addCategory} className="btn-ink" style={{ height: 36, padding: "0 12px" }}>Add</button>
                <button onClick={() => { setAddingCat(false); setNewCatName(""); setCatError(""); }} style={iconBtn()} title="Cancel"><X size={16} /></button>
                {catError && <span style={{ fontSize: 11, color: "var(--bad)" }}>{catError}</span>}
              </div>
            ) : (
              <>
                <select value={activeCategory}
                  onChange={e => { setActiveCategory(e.target.value); setSelected(new Set()); setDeleteMode(false); }}
                  title="Filter by category" style={selectStyle}>
                  <option value="ALL">All categories</option>
                  {BUILT_IN.filter(c => !hiddenCats.has(c.value)).map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                  {userCategories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                {activeCustom ? (
                  <button onClick={() => deleteCategory(activeCustom.id, activeCustom.name)} style={iconBtn()} title="Delete this category"><Trash2 size={16} /></button>
                ) : (
                  <button onClick={() => setAddingCat(true)} style={iconBtn()} title="Add category"><Plus size={17} /></button>
                )}
                <span style={{ width: 1, height: 22, background: "var(--line)", margin: "0 2px" }} />
              </>
            )}

            {/* sort */}
            <select value={sortField} onChange={e => setSortField(e.target.value as SortField)} title="Sort by" style={selectStyle}>
              <option value="createdAt">Created</option>
              <option value="dueDate">Due date</option>
              <option value="title">Title</option>
              <option value="priority">Priority</option>
            </select>
            <button onClick={toggleSortDir} style={iconBtn()} title={sortDir === "asc" ? "Ascending" : "Descending"}>
              {sortDir === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            </button>
            <button onClick={handleDeleteButton} style={iconBtn(deleteMode)} title={deleteMode ? "Confirm delete" : "Delete tasks"}>
              {deleteMode ? <Check size={16} /> : <Trash2 size={16} />}
            </button>
          </div>
        </div>

        {/* ruled task rows */}
        <div className="ruled overflow-y-auto" style={{ maxHeight: "calc(100vh - 240px)", minHeight: MIN_ROWS * LINE_H }}>
          {loading ? (
            <div className="flex items-center justify-center" style={{ height: MIN_ROWS * LINE_H, color: "var(--ink-faint)", fontSize: 13 }}>
              Loading…
            </div>
          ) : (
            <ul>
              {Array.from({ length: rows }).map((_, i) => {
                const task = visible[i];
                return (
                  <li key={task?.id ?? `blank-${i}`}
                    style={{ height: LINE_H, paddingLeft: 70, paddingRight: 18, position: "relative" }}
                    className="flex items-center gap-3 group">
                    {task ? (
                      <>
                        {/* checkbox: select in deleteMode, else complete toggle */}
                        {deleteMode ? (
                          <button onClick={() => toggleSelect(task.id)} className="grid place-items-center shrink-0"
                            style={{ width: 18, height: 18, borderRadius: 6, cursor: "pointer",
                              border: "1.6px solid " + (selected.has(task.id) ? "var(--bad)" : "var(--line-strong)"),
                              background: selected.has(task.id) ? "var(--bad)" : "transparent",
                              color: "#fff" }}>
                            {selected.has(task.id) && <Check size={12} />}
                          </button>
                        ) : (
                          <button onClick={() => toggleComplete(task)} className="grid place-items-center shrink-0"
                            title={task.completed ? "Mark incomplete" : "Mark complete"}
                            style={{ width: 18, height: 18, borderRadius: 6, cursor: "pointer",
                              border: "1.6px solid " + (task.completed ? "var(--accent)" : "var(--line-strong)"),
                              background: task.completed ? "var(--accent)" : "transparent",
                              color: "#fff" }}>
                            {task.completed && <Check size={12} />}
                          </button>
                        )}

                        {/* title (click to edit) */}
                        <button onClick={() => openEdit(task)} className="flex-1 min-w-0 flex items-center gap-3 text-left h-full">
                          <span style={{ fontSize: 14.5, fontWeight: 500, color: task.completed ? "var(--ink-faint)" : "var(--ink)",
                            textDecoration: task.completed ? "line-through" : "none",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {task.title}
                          </span>

                          {task.priority !== null && (
                            <span className="flex items-center shrink-0" style={{ gap: 3 }}>
                              {[1,2,3,4,5].map(p => (
                                <span key={p} style={{ width: 5, height: 14, borderRadius: 2,
                                  background: p <= (task.priority ?? 0) ? "var(--accent)" : "var(--line-strong)" }} />
                              ))}
                            </span>
                          )}

                          <span className="ml-auto shrink-0 flex items-center gap-2.5">
                            {task.category && (
                              <span className={pillClass(task.category)}
                                style={pillClass(task.category) === "pill" ? { background: "var(--accent-soft)", color: "var(--accent-text)" } : undefined}>
                                {getCategoryLabel(task.category)}
                              </span>
                            )}
                            {task.dueDate && (
                              <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "var(--font-mono)",
                                color: getStatus(task) === "OVERDUE" ? "var(--bad)" : "var(--ink-soft)" }}>
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                          </span>
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

      {/* ── Burnout warning popup ──────────────────────────────────────────── */}
      {burnoutOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="paper" style={{ maxWidth: 400, width: "100%", overflow: "hidden", padding: 0 }}>
            <div style={{ borderBottom: "1px solid var(--line)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Heads up</h2>
              <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>burnout check</span>
            </div>
            <div style={{ padding: "18px 22px" }}>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink-soft)", margin: 0, whiteSpace: "pre-wrap" }}>{burnoutMsg}</p>
            </div>
            <div style={{ borderTop: "1px solid var(--line)", padding: "12px 20px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setBurnoutOpen(false)} className="btn-paper">Maybe later</button>
              <button onClick={() => { setBurnoutOpen(false); doOpenAdd(); }} className="btn-ink">Add anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Task modal ─────────────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={open => setModalOpen(open)}>
        <DialogContent showCloseButton={false} className="max-w-sm p-0 flex flex-col"
          style={{ background: "var(--paper)", border: "1px solid var(--line-strong)", borderRadius: 16, boxShadow: "var(--shadow-lg)", maxHeight: "90vh" }}>
          <DialogHeader className="flex flex-row items-center justify-between gap-2 px-5 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
            <DialogTitle style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>
              {editing ? "Edit task" : "New task"}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <button onClick={() => setModalOpen(false)} className="btn-paper" style={{ padding: "7px 14px", fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-ink" style={{ padding: "7px 14px", fontSize: 13, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {formError && <p className="text-sm font-medium" style={{ color: "var(--bad)" }}>{formError}</p>}

            <div className="space-y-1.5">
              <Label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" }}>
                Title <span style={{ color: "var(--bad)" }}>*</span>
              </Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title…"
                className="bg-transparent rounded-none px-0 text-base focus-visible:ring-0"
                style={{ border: "none", borderBottom: "2px solid var(--line-strong)", color: "var(--ink)" }} />
            </div>

            <div className="space-y-1.5">
              <Label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" }}>Details</Label>
              <Textarea value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} placeholder="type here…" rows={3}
                className="resize-none text-sm focus-visible:ring-1"
                style={{ border: "1px solid var(--line-strong)", borderRadius: 10, background: "var(--paper-2)", color: "var(--ink)" }} />
            </div>

            <div className="space-y-1.5">
              <Label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" }}>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v ?? "" }))}>
                <SelectTrigger className="bg-transparent" style={{ border: "1px solid var(--line-strong)", borderRadius: 10, color: "var(--ink)" }}>
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No category</SelectItem>
                  {BUILT_IN.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  {userCategories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" }}>Priority</Label>
              <div className="flex justify-between px-1">
                {[1,2,3,4,5].map(p => (
                  <button key={p} type="button"
                    onClick={() => setForm(f => ({ ...f, priority: f.priority === p ? null : p }))} title={`Priority ${p}`}
                    style={{ width: 22, height: 22, borderRadius: "50%", cursor: "pointer", transition: "all 0.1s",
                      border: "2px solid " + (form.priority !== null && p <= form.priority ? "var(--accent)" : "var(--line-strong)"),
                      background: form.priority !== null && p <= form.priority ? "var(--accent)" : "transparent" }} />
                ))}
              </div>
              <div className="flex justify-between px-1">
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>low</span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>high</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" }}>Due date</Label>
              <DateTimePicker value={form.date} onChange={iso => setForm(f => ({ ...f, date: iso }))} placeholder="Select due date & time" />
            </div>

            {editing && (
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="completed" checked={editing.completed}
                  onChange={async () => {
                    await csrfFetch(`/api/tasks/${editing.id}`, {
                      method: "PATCH", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ completed: !editing.completed }),
                    });
                    setEditing(e => e ? { ...e, completed: !e.completed } : e);
                    await fetchTasks();
                  }}
                  className="w-4 h-4 cursor-pointer" style={{ accentColor: "var(--accent)" }} />
                <Label htmlFor="completed" style={{ fontSize: 13, color: "var(--ink-soft)", cursor: "pointer" }}>Mark as completed</Label>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}