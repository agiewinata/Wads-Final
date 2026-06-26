"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfFetch } from "@/lib/csrf-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/app/dashboard/calendar/_components/DateTimePicker";
import { Plus, ArrowUp, ArrowDown, Trash2, X, Check } from "lucide-react";

type TaskStatus = "CURRENT" | "PAST" | "OVERDUE";
type SortField = "dueDate" | "createdAt" | "title" | "priority";
type SortDir = "asc" | "desc";

interface Task {
  id: string;
  title: string;
  details: string | null;
  priority: number | null;
  dueDate: string | null;
  category: string | null;
  completed: boolean;
  createdAt: string;
}

interface UserCategory {
  id: string;
  name: string;
}

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

function isToday(iso: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const today = new Date();

  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}


const LINE_H = 48;
const MIN_ROWS = 12;

const BUILT_IN = [
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "PROJECT", label: "Project" },
  { value: "EXAM", label: "Exam" },
];

const CUSTOM_CATEGORY_COLORS = [
  { bg: "#f6d1d1", color: "#b5453d", activeBg: "#b5453d" },
  { bg: "#f7dfbc", color: "#b86b18", activeBg: "#b86b18" },
  { bg: "#f5e8a8", color: "#8a6f13", activeBg: "#8a6f13" },
  { bg: "#d9edc8", color: "#4b7f35", activeBg: "#4b7f35" },
  { bg: "#ccebea", color: "#25736f", activeBg: "#25736f" },
  { bg: "#d6e4ff", color: "#3858b8", activeBg: "#3858b8" },
  { bg: "#eadcff", color: "#7c3aed", activeBg: "#7c3aed" },
];

function getCategoryLabel(value: string) {
  return BUILT_IN.find((c) => c.value === value)?.label ?? value;
}

const STATUS_TABS: { value: TaskStatus; label: string }[] = [
  { value: "CURRENT", label: "Current" },
  { value: "PAST", label: "Past" },
  { value: "OVERDUE", label: "Overdue" },
];

function emptyForm() {
  return { title: "", details: "", priority: null as number | null, date: "", category: "" };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();

    try {
      return new Set(JSON.parse(localStorage.getItem("hiddenDefaultCategories") ?? "[]"));
    } catch {
      return new Set();
    }
  });
  const [activeStatus, setActiveStatus] = useState<TaskStatus>("CURRENT");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteMode, setDeleteMode] = useState(false);
  const [burnoutOpen, setBurnoutOpen] = useState(false);
  const [burnoutMsg, setBurnoutMsg] = useState("");
  const [burnoutLoading, setBurnoutLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    fetchTasks();
    fetchCategories();
  }, [fetchTasks, fetchCategories]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
  localStorage.setItem("hiddenDefaultCategories", JSON.stringify([...hiddenCats]));
}, [hiddenCats]);

  const visible = tasks
    .filter((t) => getStatus(t) === activeStatus)
    .filter((t) => activeCategory === "ALL" || (!!t.category && t.category === activeCategory))
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
        const pa = a.priority;
        const pb = b.priority;
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;
        if (pb === null) return -1;
        return sortDir === "asc" ? pa - pb : pb - pa;
      }

      const va = sortField === "createdAt" ? new Date(a.createdAt).getTime() : a.title.toLowerCase();
      const vb = sortField === "createdAt" ? new Date(b.createdAt).getTime() : b.title.toLowerCase();

      return sortDir === "asc"
        ? va < vb
          ? -1
          : va > vb
            ? 1
            : 0
        : va > vb
          ? -1
          : va < vb
            ? 1
            : 0;
    });

  const activeCount = tasks.filter((t) => getStatus(t) === "CURRENT").length;
  const overdueCount = tasks.filter((t) => getStatus(t) === "OVERDUE").length;
  const doneCount = tasks.filter((t) => t.completed).length;
  const rows = Math.max(visible.length, MIN_ROWS);

  const availableCategories = [
    ...BUILT_IN.filter((c) => !hiddenCats.has(c.value)),
    ...userCategories
      .filter((c) => !hiddenCats.has(c.name.toUpperCase()))
      .filter((c) => !hiddenCats.has(c.name))
      .map((c) => ({ value: c.name, label: c.name, id: c.id })),
  ];

  function getCategoryColor(value: string) {
    const index = availableCategories.findIndex((c) => c.value === value);
    if (index === -1) return null;
    return CUSTOM_CATEGORY_COLORS[index % CUSTOM_CATEGORY_COLORS.length];
  }

  const categoryTabs = [
    { value: "ALL", label: "All", bg: "#f4f4f4", color: "var(--ink-soft)", activeBg: "var(--accent)" },
    ...availableCategories.map((c, i) => ({
      ...c,
      ...CUSTOM_CATEGORY_COLORS[i % CUSTOM_CATEGORY_COLORS.length],
    })),
  ];

  const denseTabs = categoryTabs.length > rows;

  const iconBtn = (active = false): React.CSSProperties => ({
    width: 36,
    height: 36,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    cursor: "pointer",
    flexShrink: 0,
    border: "1px solid " + (active ? "var(--accent)" : "var(--line-strong)"),
    background: active ? "var(--accent)" : "var(--paper)",
    color: active ? "#fff" : "var(--ink-soft)",
  });

  const selectStyle: React.CSSProperties = {
    height: 36,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--ink)",
    background: "var(--paper)",
    border: "1px solid var(--line-strong)",
    borderRadius: 10,
    padding: "0 30px 0 12px",
    cursor: "pointer",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23a69e8f'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 11px center",
  };

  function toggleSortDir() {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "burnout" }),
      });

      if (res.ok) {
        const data = (await res.json()) as { show?: boolean; message?: string };
        if (data.show && data.message) {
          setBurnoutMsg(data.message);
          setBurnoutOpen(true);
          setBurnoutLoading(false);
          return;
        }
      }
    } catch {}

    setBurnoutLoading(false);
    doOpenAdd();
  }

  function openEdit(task: Task) {
    setEditing(task);
    setForm({
      title: task.title,
      details: task.details ?? "",
      priority: task.priority ?? null,
      date: task.dueDate ?? "",
      category: task.category ?? "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      title: form.title.trim(),
      details: form.details || null,
      priority: form.priority,
      dueDate: form.date || null,
      category: form.category || null,
    };

    try {
      const res = await csrfFetch(editing ? `/api/tasks/${editing.id}` : "/api/tasks", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      setModalOpen(false);
      await fetchCategories();
      await fetchTasks();
    } catch {
      setFormError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete(task: Task) {
    await csrfFetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    await fetchTasks();
  }

  async function deleteSelected() {
    if (selected.size) {
      await Promise.all([...selected].map((id) => csrfFetch(`/api/tasks/${id}`, { method: "DELETE" })));
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  async function deleteBuiltInCategory(value: string) {
    await Promise.all(
      tasks
        .filter((t) => t.category === value)
        .map((t) =>
          csrfFetch(`/api/tasks/${t.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: null }),
          })
        )
    );

    if (activeCategory === value) setActiveCategory("ALL");
    setHiddenCats((prev) => new Set([...prev, value]));
    await fetchTasks();
  }

  async function deleteCategory(id: string, name: string) {
    await csrfFetch(`/api/categories/${id}`, { method: "DELETE" });
    if (activeCategory === name) setActiveCategory("ALL");
    await fetchCategories();
    await fetchTasks();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="w-full flex flex-col gap-5">
      <div
        className="flex items-end justify-between flex-wrap"
        style={{
          gap: 16,
          marginBottom: 8,
          paddingRight: isMobile ? 0 : 116,
        }}
      >
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
            Tasks
          </h1>

          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 10 }}>
            {activeCount} active · {overdueCount} overdue · {doneCount} done
          </p>
        </div>

        <button onClick={openAdd} disabled={burnoutLoading} className="btn-ink" style={{ opacity: burnoutLoading ? 0.6 : 1 }}>
          <Plus size={17} /> {burnoutLoading ? "Checking…" : "New task"}
        </button>
      </div>

      <div className={isMobile ? "flex flex-col gap-3" : "flex items-start gap-0 w-full"}>
        <div
          className="task-paper flex-1 min-w-0"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line-strong)",
            borderRadius: 14,
            boxShadow: "var(--shadow)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            className="flex items-center flex-wrap"
            style={{
              gap: 10,
              padding: "12px 16px",
              borderBottom: "1px solid var(--line)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                background: "var(--paper-2)",
                border: "1px solid var(--line)",
                borderRadius: 999,
                padding: 3,
              }}
            >
              {STATUS_TABS.map((tab) => {
                const active = activeStatus === tab.value;

                return (
                  <button
                    key={tab.value}
                    onClick={() => {
                      setActiveStatus(tab.value);
                      setSelected(new Set());
                      setDeleteMode(false);
                    }}
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      padding: "6px 15px",
                      borderRadius: 999,
                      background: active ? "var(--paper)" : "transparent",
                      color: active ? "var(--ink)" : "var(--ink-soft)",
                      boxShadow: active ? "var(--shadow-sm)" : "none",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <select value={sortField} onChange={(e) => setSortField(e.target.value as SortField)} title="Sort by" style={selectStyle}>
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

          <div
            className="ruled"
            style={{
              minHeight: rows * LINE_H,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center" style={{ height: MIN_ROWS * LINE_H, color: "var(--ink-faint)", fontSize: 13 }}>
                Loading…
              </div>
            ) : (
              <ul style={{ position: "relative" }}>
                {Array.from({ length: rows }).map((_, i) => {
                  const task = visible[i];

                  return (
                    <li
                      key={task?.id ?? `blank-${i}`}
                      style={{
                        height: LINE_H,
                        paddingLeft: 70,
                        paddingRight: 18,
                        position: "relative",
                      }}
                      className="flex items-center gap-3 group"
                    >
                      {task ? (
                        <>
                          {deleteMode ? (
                            <button
                              onClick={() => toggleSelect(task.id)}
                              className="grid place-items-center shrink-0"
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 6,
                                cursor: "pointer",
                                border: "1.6px solid " + (selected.has(task.id) ? "var(--bad)" : "var(--line-strong)"),
                                background: selected.has(task.id) ? "var(--bad)" : "transparent",
                                color: "#fff",
                              }}
                            >
                              {selected.has(task.id) && <Check size={12} />}
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleComplete(task)}
                              className="grid place-items-center shrink-0"
                              title={task.completed ? "Mark incomplete" : "Mark complete"}
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 6,
                                cursor: "pointer",
                                border: "1.6px solid " + (task.completed ? "var(--accent)" : "var(--line-strong)"),
                                background: task.completed ? "var(--accent)" : "transparent",
                                color: "#fff",
                              }}
                            >
                              {task.completed && <Check size={12} />}
                            </button>
                          )}

                          <button onClick={() => openEdit(task)} className="flex-1 min-w-0 flex items-center gap-3 text-left h-full">
                            <span
                              style={{
                                fontSize: 14.5,
                                fontWeight: 500,
                                color: task.completed ? "var(--ink-faint)" : "var(--ink)",
                                textDecoration: task.completed ? "line-through" : "none",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {task.title}
                            </span>

                            {task.priority !== null && (
                              <span className="flex items-center shrink-0" style={{ gap: 3 }}>
                                {[1, 2, 3, 4, 5].map((p) => (
                                  <span
                                    key={p}
                                    style={{
                                      width: 5,
                                      height: 14,
                                      borderRadius: 2,
                                      background: p <= (task.priority ?? 0) ? "var(--accent)" : "var(--line-strong)",
                                    }}
                                  />
                                ))}
                              </span>
                            )}

                            <span className="ml-auto shrink-0 flex items-center gap-3">
                              {task.category && getCategoryColor(task.category) && (
                                <span
                                  style={{
                                    background: getCategoryColor(task.category)?.bg,
                                    color: getCategoryColor(task.category)?.color,
                                    borderRadius: 999,
                                    padding: "3px 10px",
                                    fontSize: 11,
                                    fontWeight: 800,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {getCategoryLabel(task.category)}
                                </span>
                              )}

                              {task.dueDate && (
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    fontFamily: "var(--font-mono)",
                                    color: isToday(task.dueDate)
                                      ? "var(--bad)"
                                      : getStatus(task) === "OVERDUE"
                                        ? "var(--bad)"
                                        : "var(--ink-soft)",
                                  }}
                                >
                                  {isToday(task.dueDate) ? "Due today" : formatDate(task.dueDate)}
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

        <div
          style={
            isMobile
              ? {
                  display: "flex",
                  flexDirection: "row",
                  gap: denseTabs ? 3 : 6,
                  overflowX: "auto",
                  paddingTop: 4,
                  paddingBottom: 4,
                  alignItems: "center",
                }
              : {
                  display: "flex",
                  flexDirection: "column",
                  gap: denseTabs ? 3 : 6,
                  marginLeft: 0,
                  paddingTop: 58,
                  position: "relative",
                  zIndex: 10,
                  flexShrink: 0,
                  width: 116,
                }
          }
        >
          {addingCat ? (
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "row" : "column",
                gap: 4,
                flexShrink: 0,
              }}
            >
              <input
                autoFocus
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  setCatError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCategory();
                  if (e.key === "Escape") {
                    setAddingCat(false);
                    setNewCatName("");
                    setCatError("");
                  }
                }}
                placeholder="name…"
                maxLength={32}
                style={{
                  width: 110,
                  height: 32,
                  fontSize: 12,
                  padding: "0 9px",
                  outline: "none",
                  border: `1px solid ${catError ? "var(--bad)" : "var(--line-strong)"}`,
                  borderLeft: isMobile ? undefined : "none",
                  borderRadius: isMobile ? 8 : "0 8px 8px 0",
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
              />
              <button
                onClick={addCategory}
                className="btn-ink"
                style={{
                  height: 32,
                  padding: "0 10px",
                  fontSize: 11,
                  borderRadius: isMobile ? 8 : "0 8px 8px 0",
                }}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setAddingCat(false);
                  setNewCatName("");
                  setCatError("");
                }}
                style={iconBtn()}
                title="Cancel"
              >
                <X size={16} />
              </button>
              {catError && <span style={{ fontSize: 11, color: "var(--bad)" }}>{catError}</span>}
            </div>
          ) : (
            <button
              onClick={() => setAddingCat(true)}
              title="Add category"
              style={{
                background: "var(--paper-2)",
                color: "var(--ink-soft)",
                border: "1px dashed var(--line-strong)",
                borderLeft: isMobile ? undefined : "none",
                borderRadius: isMobile ? 8 : "0 8px 8px 0",
                padding: "7px 14px 7px 11px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                opacity: 0.75,
                flexShrink: 0,
              }}
            >
              + category
            </button>
          )}

          {categoryTabs
            .filter((cat) => !hiddenCats.has(cat.value))
            .map((cat) => {
              const active = activeCategory === cat.value;
              const isCustom = !["ALL", ...BUILT_IN.map((b) => b.value)].includes(cat.value);        

              return (
                <div key={cat.value} className="group" style={{ position: "relative", display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      setActiveCategory(cat.value);
                      setSelected(new Set());
                      setDeleteMode(false);
                    }}
                    style={{
                      background: active ? cat.activeBg : cat.bg,
                      color: active ? "#fff" : cat.color,
                      border: "1px solid var(--line-strong)",
                      borderLeft: "1px solid var(--line-strong)",
                      borderRadius: isMobile ? "8px" : "0 8px 8px 0",
                      padding: denseTabs ? "5px 24px 5px 10px" : "8px 28px 8px 13px",
                      fontSize: denseTabs ? 10 : 11,
                      fontWeight: 800,
                      cursor: "pointer",
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      lineHeight: 1.2,
                      textAlign: "left",
                      minHeight: denseTabs ? 30 : 40,
                      opacity: active ? 1 : 0.78,
                      transform: "none",
                      boxShadow: active ? "var(--shadow-sm)" : "none",
                      transition: "all 0.12s ease",
                      width: isMobile ? "auto" : 112,
                    }}
                  >
                    {cat.label}
                  </button>

                  <button
                    onClick={() => {
                      if (isCustom && "id" in cat) {
                        deleteCategory(cat.id, cat.value);
                      } else if (cat.value !== "ALL") {
                        deleteBuiltInCategory(cat.value);
                      }
                    }}
                    title="Remove"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      position: "absolute",
                      right: 7,
                      background: "none",
                      border: "none",
                      cursor: cat.value === "ALL" ? "default" : "pointer",
                      fontSize: 12,
                      color: active ? "#fff" : "var(--ink-faint)",
                      lineHeight: 1,
                      padding: 0,
                      fontWeight: 900,
                      display: cat.value === "ALL" ? "none" : "block",
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      {burnoutOpen && (
        <div className="app-overlay">
          <div className="paper" style={{ maxWidth: 420, width: "100%", overflow: "hidden", padding: 0 }}>
            <div
              style={{
                borderBottom: "1px solid var(--line)",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 className="app-modal-title" style={{ fontSize: 17 }}>
                Heads up
              </h2>
              <span className="app-modal-subtle">burnout check</span>
            </div>

            <div style={{ padding: "18px 22px" }}>
              <div className="app-message app-message-warning">
                {burnoutMsg}
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--line)",
                padding: "12px 20px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button onClick={() => setBurnoutOpen(false)} className="btn-paper">
                Maybe later
              </button>
              <button
                onClick={() => {
                  setBurnoutOpen(false);
                  doOpenAdd();
                }}
                className="btn-ink"
              >
                Add anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(open) => setModalOpen(open)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-sm p-0 flex flex-col"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line-strong)",
            borderRadius: 16,
            boxShadow: "var(--shadow-lg)",
            maxHeight: "90vh",
          }}
        >
          <DialogHeader className="flex flex-row items-center justify-between gap-2 px-5 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
            <DialogTitle style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>
              {editing ? "Edit task" : "New task"}
            </DialogTitle>

            <div className="flex items-center gap-2">
              <button onClick={() => setModalOpen(false)} className="btn-paper" style={{ padding: "7px 14px", fontSize: 13 }}>
                Cancel
              </button>
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
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Task title…"
                className="bg-transparent rounded-none px-0 text-base focus-visible:ring-0"
                style={{ border: "none", borderBottom: "2px solid var(--line-strong)", color: "var(--ink)" }}
              />
            </div>

            <div className="space-y-1.5">
              <Label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" }}>Details</Label>
              <Textarea
                value={form.details}
                onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                placeholder="type here…"
                rows={3}
                className="resize-none text-sm focus-visible:ring-1"
                style={{ border: "1px solid var(--line-strong)", borderRadius: 10, background: "var(--paper-2)", color: "var(--ink)" }}
              />
            </div>

            <div className="space-y-1.5">
              <Label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" }}>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v ?? "" }))}>
                <SelectTrigger className="bg-transparent" style={{ border: "1px solid var(--line-strong)", borderRadius: 10, color: "var(--ink)" }}>
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No category</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" }}>Priority</Label>
              <div className="flex justify-between px-1">
                {[1, 2, 3, 4, 5].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, priority: f.priority === p ? null : p }))}
                    title={`Priority ${p}`}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      cursor: "pointer",
                      transition: "all 0.1s",
                      border: "2px solid " + (form.priority !== null && p <= form.priority ? "var(--accent)" : "var(--line-strong)"),
                      background: form.priority !== null && p <= form.priority ? "var(--accent)" : "transparent",
                    }}
                  />
                ))}
              </div>

              <div className="flex justify-between px-1">
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>low</span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>high</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" }}>Due date</Label>
              <DateTimePicker value={form.date} onChange={(iso) => setForm((f) => ({ ...f, date: iso }))} placeholder="Select due date & time" />
            </div>

            {editing && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="completed"
                  checked={editing.completed}
                  onChange={async () => {
                    await csrfFetch(`/api/tasks/${editing.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ completed: !editing.completed }),
                    });
                    setEditing((e) => (e ? { ...e, completed: !e.completed } : e));
                    await fetchTasks();
                  }}
                  className="w-4 h-4 cursor-pointer"
                  style={{ accentColor: "var(--accent)" }}
                />
                <Label htmlFor="completed" style={{ fontSize: 13, color: "var(--ink-soft)", cursor: "pointer" }}>
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