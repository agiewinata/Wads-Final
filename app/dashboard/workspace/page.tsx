"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { csrfFetch } from "@/lib/csrf-client";
import { useSession } from "@/lib/auth-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import { DateTimePicker } from "@/app/dashboard/calendar/_components/DateTimePicker";

type Member = { id: string; name: string | null; email: string };

type WTask = {
  id: string;
  title: string;
  details: string | null;
  priority: number | null;
  dueDate: string | null;
  completed: boolean;
  createdBy: string;
  creator: { id: string; name: string | null };
  assignees: { user: { id: string; name: string | null } }[];
};

type WorkspaceDetail = {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  owner: Member;
  members: { id: string; user: Member; joinedAt: string; role: string }[];
  tasks: WTask[];
};

type WorkspaceCard = {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  owner: Member;
  members: { id: string; user: Member }[];
  _count: { tasks: number };
};

type SelectOption = { id: string; name: string };

function MemberSelect({ value, onChange, options }: {
  value: string[];
  onChange: (ids: string[]) => void;
  options: SelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleOpen() {
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen(o => !o);
  }

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  }

  const allSelected = options.length > 0 && options.every(o => value.includes(o.id));

  const label = value.length === 0
    ? "Unassigned"
    : allSelected
      ? "All members"
      : value.length === 1
        ? (options.find(o => o.id === value[0])?.name ?? "1 member")
        : `${value.length} members`;

  function toggleAll() {
    onChange(allSelected ? [] : options.map(o => o.id));
  }

  const rows = [
    { id: "__all__", name: "All members", isAll: true },
    ...options.map(o => ({ ...o, isAll: false })),
  ];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", fontSize: 14, fontWeight: 500,
          border: "2px solid #d4d4d8", borderRadius: "4px 6px 4px 6px",
          background: "#fafafa", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ color: value.length > 0 ? "#111" : "#a1a1aa" }}>{label}</span>
        <span style={{ fontSize: 10, color: "#71717a", marginLeft: 8 }}>▼</span>
      </button>

      {open && rect && typeof document !== "undefined" && createPortal(
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.right + 8,
            minWidth: 200,
            maxHeight: 260,
            overflowY: "auto",
            zIndex: 9999,
            background: "#fff",
            border: "2px solid #111",
            borderRadius: "4px 6px 4px 6px",
            boxShadow: "4px 5px 0 rgba(0,0,0,0.12)",
          }}
        >
          {rows.map((opt, i) => {
            const checked = opt.isAll ? allSelected : value.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => opt.isAll ? toggleAll() : toggle(opt.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", fontSize: 14,
                  fontWeight: opt.isAll ? 600 : 400,
                  background: "#fff",
                  color: "#111",
                  border: "none",
                  borderBottom: i < rows.length - 1 ? "1.5px solid #e4e4e7" : "none",
                  cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f4f4f5")}
                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
              >
                <span style={{
                  width: 16, height: 16, flexShrink: 0,
                  border: "2px solid #555",
                  borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: "#111",
                }}>
                  {checked && "✓"}
                </span>
                {opt.name}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "2px solid #111",
  borderRadius: "5px 7px 5px 7px / 7px 5px 7px 5px",
  boxShadow: "4px 5px 0 rgba(0,0,0,0.10)",
  padding: "16px 18px",
};

const BTN = (active = false): React.CSSProperties => ({
  padding: "7px 16px",
  fontSize: 13,
  fontWeight: 600,
  border: "2px solid #111",
  borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
  background: active ? "#111" : "#fff",
  color: active ? "#fff" : "#111",
  cursor: "pointer",
});

export default function WorkspacePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [workspaces, setWorkspaces]       = useState<WorkspaceCard[]>([]);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [detail, setDetail]               = useState<WorkspaceDetail | null>(null);
  const [detailError, setDetailError]     = useState("");
  const [loading, setLoading]             = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modals
  const [showCreate, setShowCreate]   = useState(false);
  const [showJoin, setShowJoin]       = useState(() => !!searchParams.get("join"));
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<WTask | null>(null);

  // Form state
  const [newName, setNewName]               = useState("");
  const [joinCode, setJoinCode]             = useState(() => searchParams.get("join") ?? "");
  const [taskTitle, setTaskTitle]           = useState("");
  const [taskDetails, setTaskDetails]       = useState("");
  const [taskPriority, setTaskPriority]     = useState<number | null>(null);
  const [taskDueDate, setTaskDueDate]       = useState("");
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);

  const [copied, setCopied]   = useState(false);
  const [error, setError]     = useState("");
  const [saving, setSaving]   = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/workspaces");
    if (res.ok) setWorkspaces(await res.json());
    setLoading(false);
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);
    try {
      const res = await fetch(`/api/workspaces/${id}`);
      if (res.ok) {
        setDetail(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        setDetailError(body.error ?? `Failed to load workspace (${res.status})`);
      }
    } catch {
      setDetailError("Network error — could not load workspace.");
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    // loading starts true; set workspaces then clear loading — all inside callbacks
    fetch("/api/workspaces")
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data) setWorkspaces(data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      Promise.resolve().then(() => { setDetail(null); setDetailError(""); });
      return;
    }
    Promise.resolve()
      .then(() => { setDetailLoading(true); setDetailError(""); setDetail(null); })
      .then(() => fetch(`/api/workspaces/${selectedId}`))
      .then(res => res.ok ? res.json() : res.json().then((b: { error?: string }) => Promise.reject(b)))
      .then((data: WorkspaceDetail) => setDetail(data))
      .catch((err: { error?: string }) => setDetailError(err?.error ?? "Failed to load workspace"))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  // Auto-join from invite link (?join=<code>) — only redirect, state already initialised above
  useEffect(() => {
    if (searchParams.get("join")) router.replace("/dashboard/workspace");
  }, [searchParams, router]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true); setError("");
    const res = await csrfFetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const ws: WorkspaceCard = await res.json();
      setWorkspaces(p => [ws, ...p]);
      setSelectedId(ws.id);
      setShowCreate(false);
      setNewName("");
    } else {
      setError((await res.json()).error ?? "Failed to create");
    }
    setSaving(false);
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setSaving(true); setError("");
    const res = await csrfFetch("/api/workspaces/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode.trim() }),
    });
    if (res.ok) {
      const { workspaceId } = await res.json();
      await fetchWorkspaces();
      setSelectedId(workspaceId);
      setShowJoin(false);
      setJoinCode("");
    } else {
      setError((await res.json()).error ?? "Failed to join");
    }
    setSaving(false);
  }

  function clearTaskForm() {
    setTaskTitle(""); setTaskDetails(""); setTaskPriority(null); setTaskDueDate(""); setTaskAssignees([]);
  }

  function openEditTask(task: WTask) {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDetails(task.details ?? "");
    setTaskPriority(task.priority);
    setTaskDueDate(task.dueDate ?? "");
    setTaskAssignees(task.assignees.map(a => a.user.id));
    setError("");
    setShowAddTask(true);
  }

  function closeTaskModal() {
    setShowAddTask(false);
    setEditingTask(null);
    clearTaskForm();
  }

  async function handleSaveTask() {
    if (!taskTitle.trim() || !selectedId) return;
    setSaving(true); setError("");

    const body = {
      title: taskTitle.trim(),
      details: taskDetails.trim() || null,
      priority: taskPriority,
      dueDate: taskDueDate || null,
      assignees: taskAssignees,
    };

    const url = editingTask
      ? `/api/workspaces/${selectedId}/tasks/${editingTask.id}`
      : `/api/workspaces/${selectedId}/tasks`;

    try {
      const res = await csrfFetch(url, {
        method: editingTask ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchDetail(selectedId);
        closeTaskModal();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Failed to save task (${res.status})`);
      }
    } catch {
      setError("Network error — could not save task.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(taskId: string, completed: boolean) {
    if (!selectedId) return;
    await csrfFetch(`/api/workspaces/${selectedId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    setDetail(d => d ? {
      ...d,
      tasks: d.tasks.map(t => t.id === taskId ? { ...t, completed } : t),
    } : d);
  }

  async function deleteTask(taskId: string) {
    if (!selectedId) return;
    await csrfFetch(`/api/workspaces/${selectedId}/tasks/${taskId}`, { method: "DELETE" });
    setDetail(d => d ? { ...d, tasks: d.tasks.filter(t => t.id !== taskId) } : d);
  }

  async function handleDelete() {
    if (!selectedId || !detail) return;
    if (!confirm(`Delete workspace "${detail.name}"? This cannot be undone.`)) return;
    await csrfFetch(`/api/workspaces/${selectedId}`, { method: "DELETE" });
    setWorkspaces(p => p.filter(w => w.id !== selectedId));
    setSelectedId(null);
  }

  async function handlePromote(memberId: string) {
    if (!selectedId) return;
    const res = await csrfFetch(`/api/workspaces/${selectedId}/members/${memberId}/promote`, { method: "POST" });
    if (res.ok) await fetchDetail(selectedId);
    else setError((await res.json().catch(() => ({}))).error ?? "Failed to promote member");
  }

  async function handleDemote(memberId: string) {
    if (!selectedId) return;
    const res = await csrfFetch(`/api/workspaces/${selectedId}/members/${memberId}/demote`, { method: "POST" });
    if (res.ok) await fetchDetail(selectedId);
    else setError((await res.json().catch(() => ({}))).error ?? "Failed to demote member");
  }

  async function handleLeave() {
    if (!selectedId || !detail) return;
    if (!confirm(`Leave workspace "${detail.name}"?`)) return;
    await csrfFetch(`/api/workspaces/${selectedId}/leave`, { method: "POST" });
    setWorkspaces(p => p.filter(w => w.id !== selectedId));
    setSelectedId(null);
  }

  function copyInviteLink() {
    if (!detail) return;
    const url = `${window.location.origin}/dashboard/workspace?join=${detail.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
  };
  const modal: React.CSSProperties = {
    background: "#fff", border: "3px solid #111", padding: "28px 32px", width: "100%", maxWidth: 420,
    borderRadius: "6px 8px 6px 8px / 8px 6px 8px 6px",
    boxShadow: "8px 10px 0 rgba(0,0,0,0.15)",
  };
  const input: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "2px solid #d4d4d8",
    borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#3f3f46", display: "block", marginBottom: 6 };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: 0 }}>Workspace</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#71717a" }}>
          Collaborate on shared tasks with others
        </p>
      </div>

      <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
        {/* ── Left panel: workspace list ── */}
        <div style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...BTN(), flex: 1 }} onClick={() => { setShowCreate(true); setError(""); }}>
              + New
            </button>
            <button style={{ ...BTN(), flex: 1 }} onClick={() => { setShowJoin(true); setError(""); }}>
              Join
            </button>
          </div>

          {loading ? (
            <p style={{ fontSize: 13, color: "#a1a1aa", textAlign: "center", marginTop: 24 }}>Loading…</p>
          ) : workspaces.length === 0 ? (
            <p style={{ fontSize: 13, color: "#a1a1aa", textAlign: "center", marginTop: 24 }}>
              No workspaces yet
            </p>
          ) : (
            workspaces.map(ws => {
              const active = ws.id === selectedId;
              return (
                <button
                  key={ws.id}
                  onClick={() => setSelectedId(ws.id)}
                  style={{
                    ...CARD,
                    textAlign: "left",
                    cursor: "pointer",
                    background: active ? "#111" : "#fff",
                    color: active ? "#fff" : "#111",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{ws.name}</div>
                  <div style={{ fontSize: 12, color: active ? "#d4d4d8" : "#71717a" }}>
                    {ws.members.length + 1} member{ws.members.length !== 0 ? "s" : ""} · {ws._count.tasks} task{ws._count.tasks !== 1 ? "s" : ""}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Right panel: workspace detail ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedId ? (
            <div style={{ ...CARD, display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#a1a1aa", fontSize: 14 }}>
              Select or create a workspace to get started
            </div>
          ) : detailLoading ? (
            <div style={{ ...CARD, display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#a1a1aa", fontSize: 14 }}>
              Loading…
            </div>
          ) : detailError ? (
            <div style={{ ...CARD, height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <p style={{ color: "#ef4444", fontSize: 14, margin: 0 }}>{detailError}</p>
              <button style={BTN()} onClick={() => selectedId && fetchDetail(selectedId)}>Retry</button>
            </div>
          ) : detail ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Workspace header */}
              <div style={{ ...CARD, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{detail.name}</h2>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={copyInviteLink} style={BTN(copied)}>
                    {copied ? "Copied!" : "Copy invite link"}
                  </button>
                  {detail.ownerId === currentUserId ? (
                    <button
                      onClick={handleDelete}
                      style={{ ...BTN(), color: "#ef4444", borderColor: "#ef4444" }}
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={handleLeave}
                      style={{ ...BTN(), color: "#ef4444", borderColor: "#ef4444" }}
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>

              {/* Members */}
              <div style={CARD}>
                <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Team
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Leader */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", background: "#111",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                      {(detail.owner.name ?? detail.owner.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{detail.owner.name ?? detail.owner.email}</div>
                      <div style={{ fontSize: 12, color: "#71717a" }}>Leader</div>
                    </div>
                  </div>
                  {/* Members */}
                  {detail.members.map(m => {
                    const isLeader = m.role === "leader";
                    const currentUserIsLeader =
                      detail.ownerId === currentUserId ||
                      detail.members.some(x => x.user.id === currentUserId && x.role === "leader");
                    return (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: isLeader ? "#111" : "#e4e4e7",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: isLeader ? "#fff" : "#3f3f46", fontSize: 12, fontWeight: 700, flexShrink: 0,
                        }}>
                          {(m.user.name ?? m.user.email)[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{m.user.name ?? m.user.email}</div>
                          <div style={{ fontSize: 12, color: "#71717a" }}>{isLeader ? "Leader" : "Member"}</div>
                        </div>
                        {currentUserIsLeader && !isLeader && (
                          <button
                            onClick={() => handlePromote(m.user.id)}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: "3px 8px",
                              border: "1.5px solid #111", borderRadius: "3px 4px 3px 4px",
                              background: "#fff", cursor: "pointer", whiteSpace: "nowrap",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f4f4f5")}
                            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                          >
                            Make leader
                          </button>
                        )}
                        {detail.ownerId === currentUserId && isLeader && (
                          <button
                            onClick={() => handleDemote(m.user.id)}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: "3px 8px",
                              border: "1.5px solid #d4d4d8", borderRadius: "3px 4px 3px 4px",
                              background: "#fff", color: "#71717a", cursor: "pointer", whiteSpace: "nowrap",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f4f4f5")}
                            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                          >
                            Make Member
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tasks */}
              <div style={CARD}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Shared Tasks
                  </h3>
                  <button style={BTN()} onClick={() => { clearTaskForm(); setEditingTask(null); setError(""); setShowAddTask(true); }}>
                    + Add task
                  </button>
                </div>

                {detail.tasks.length === 0 ? (
                  <p style={{ fontSize: 14, color: "#a1a1aa", margin: 0 }}>No tasks yet — add one above.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {detail.tasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => openEditTask(task)}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 12,
                          padding: "10px 12px", border: "1.5px solid #e4e4e7",
                          borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
                          background: task.completed ? "#f9fafb" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={e => { e.stopPropagation(); toggleTask(task.id, !task.completed); }}
                          style={{
                            width: 18, height: 18, border: "2px solid #111", flexShrink: 0, marginTop: 2,
                            borderRadius: 3, background: task.completed ? "#111" : "transparent",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          {task.completed && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                        </button>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 500,
                            textDecoration: task.completed ? "line-through" : "none",
                            color: task.completed ? "#a1a1aa" : "#111",
                          }}>
                            {task.title}
                          </div>
                          {task.details && (
                            <div style={{ fontSize: 13, color: "#71717a", marginTop: 2 }}>
                              {task.details}
                            </div>
                          )}
                          <div style={{ fontSize: 12, color: "#71717a", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <span>by {task.creator.name ?? "unknown"}</span>
                            {task.assignees.length > 0 && (
                              <span style={{ color: "#4f46e5", fontWeight: 500 }}>
                                → {task.assignees.map(a => a.user.name ?? "unknown").join(", ")}
                              </span>
                            )}
                            {task.dueDate && (
                              <span>due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            )}
                            {task.priority && <span>P{task.priority}</span>}
                          </div>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#a1a1aa", fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#a1a1aa")}
                          title="Delete task"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Create workspace modal ── */}
      {showCreate && (
        <div style={overlay} onClick={() => setShowCreate(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700 }}>New Workspace</h2>
            <label style={label}>Workspace name</label>
            <input
              style={input} value={newName} autoFocus
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              placeholder="e.g. Study Group A"
            />
            {error && <p style={{ color: "#ef4444", fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <button style={BTN()} onClick={() => setShowCreate(false)}>Cancel</button>
              <button style={BTN(true)} onClick={handleCreate} disabled={saving}>
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Join workspace modal ── */}
      {showJoin && (
        <div style={overlay} onClick={() => setShowJoin(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700 }}>Join Workspace</h2>
            <label style={label}>Invite code or link</label>
            <input
              style={input} value={joinCode} autoFocus
              onChange={e => {
                const val = e.target.value;
                // extract just the code if a full URL is pasted
                try {
                  const url = new URL(val);
                  const code = url.searchParams.get("join");
                  if (code) { setJoinCode(code); return; }
                } catch { /* not a URL */ }
                setJoinCode(val);
              }}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              placeholder="Paste invite link or code"
            />
            {error && <p style={{ color: "#ef4444", fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <button style={BTN()} onClick={() => setShowJoin(false)}>Cancel</button>
              <button style={BTN(true)} onClick={handleJoin} disabled={saving}>
                {saving ? "Joining…" : "Join"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add task modal ── */}
      <Dialog open={showAddTask} onOpenChange={open => { if (!open) closeTaskModal(); }}>
        <DialogContent
          showCloseButton={false}
          className="max-w-sm bg-white p-0 flex flex-col"
          style={{
            border: "3px solid #111",
            borderRadius: "6px 8px 5px 7px / 7px 5px 8px 6px",
            boxShadow: "6px 8px 0 rgba(0,0,0,0.18)",
            maxHeight: "90vh",
          }}
        >
          <DialogHeader
            className="flex flex-row items-center justify-between gap-2 px-5 py-3"
            style={{ borderBottom: "2px solid #e4e4e7" }}
          >
            <DialogTitle className="text-sm font-bold text-zinc-500 uppercase tracking-wide">
              {editingTask ? "Edit Task" : "New Task"}
            </DialogTitle>
            <div className="flex gap-2">
              <button
                onClick={closeTaskModal}
                className="px-4 py-1 text-sm font-bold hover:bg-zinc-100 transition-colors"
                style={{ border: "2px solid #111", borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px" }}
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveTask}
                disabled={saving}
                className="px-4 py-1 text-sm font-bold disabled:opacity-50"
                style={{ background: "#111", color: "#fff", border: "2px solid #111", borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px" }}
              >
                {saving ? "Saving…" : "SAVE"}
              </button>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {error && <p className="text-sm font-medium" style={{ color: "#555" }}>{error}</p>}

            <div className="space-y-1">
              <Label className="text-sm font-semibold text-zinc-700">Title <span style={{ color: "#e00" }}>*</span></Label>
              <Input
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                placeholder="Task title…"
                className="bg-transparent border-0 border-b-2 border-zinc-800 rounded-none px-0 text-base focus-visible:ring-0"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-semibold text-zinc-700">Details:</Label>
              <Textarea
                value={taskDetails}
                onChange={e => setTaskDetails(e.target.value)}
                placeholder="type here…"
                rows={3}
                className="resize-none bg-zinc-50 text-sm focus-visible:ring-1 focus-visible:ring-zinc-400"
                style={{ border: "2px solid #d4d4d8", borderRadius: "4px 6px 4px 6px" }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-700">Priority:</Label>
              <div className="flex justify-between px-1">
                {[1,2,3,4,5].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTaskPriority(taskPriority === p ? null : p)}
                    title={`Priority ${p}`}
                    style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: "2px solid #555",
                      background: taskPriority === p ? "#111" : "transparent",
                      cursor: "pointer",
                      transition: "all 0.1s",
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between px-2">
                <span className="text-xs text-zinc-400">low</span>
                <span className="text-xs text-zinc-400">high</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-semibold text-zinc-700">Assign to:</Label>
              <MemberSelect
                value={taskAssignees}
                onChange={setTaskAssignees}
                options={detail ? [
                  { id: detail.owner.id, name: detail.owner.name ?? detail.owner.email },
                  ...detail.members.map(m => ({ id: m.user.id, name: m.user.name ?? m.user.email })),
                ] : []}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-semibold text-zinc-700">Due Date:</Label>
              <DateTimePicker
                value={taskDueDate}
                onChange={iso => setTaskDueDate(iso)}
                placeholder="Select due date & time"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
