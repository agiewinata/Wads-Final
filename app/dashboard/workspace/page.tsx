"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { csrfFetch } from "@/lib/csrf-client";
import { useSession } from "@/lib/auth-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/app/dashboard/calendar/_components/DateTimePicker";
import { Plus, X, User, Copy, Check, ChevronDown } from "lucide-react";

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
  completions: { userId: string }[];
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

const NOTE_COLORS = ["sticky--yellow", "sticky--pink", "sticky--mint", "sticky--blue"];

function PriorityBars({ value }: { value: number | null | undefined }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center" style={{ gap: 3, flexShrink: 0 }}>
      {[1, 2, 3, 4, 5].map((p) => (
        <span key={p} style={{ width: 4, height: 12, borderRadius: 2, background: p <= value ? "var(--accent)" : "var(--line-strong)" }} />
      ))}
    </span>
  );
}

function MemberAvatars({ count }: { count: number }) {
  const circle: React.CSSProperties = {
    width: 24, height: 24, borderRadius: "50%", background: "var(--accent-soft)",
    color: "var(--accent-text)", display: "grid", placeItems: "center",
    border: "2px solid var(--paper)", flexShrink: 0,
  };
  if (count > 5) {
    return (
      <span className="flex items-center" style={{ gap: 6 }}>
        <span style={circle}><User size={13} /></span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--note-text)" }}>{count}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center">
      {Array.from({ length: Math.max(1, count) }).map((_, i) => (
        <span key={i} style={{ ...circle, marginLeft: i === 0 ? 0 : -8 }}><User size={13} /></span>
      ))}
    </span>
  );
}

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
    setOpen((o) => !o);
  }
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  const allSelected = options.length > 0 && options.every((o) => value.includes(o.id));
  const label = value.length === 0 ? "Unassigned"
    : allSelected ? "All members"
    : value.length === 1 ? (options.find((o) => o.id === value[0])?.name ?? "1 member")
    : `${value.length} members`;
  function toggleAll() { onChange(allSelected ? [] : options.map((o) => o.id)); }

  const rows = [{ id: "__all__", name: "All members", isAll: true }, ...options.map((o) => ({ ...o, isAll: false }))];

  return (
    <>
      <button
        ref={btnRef} type="button" onClick={toggleOpen}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", fontSize: 14, fontWeight: 500,
          border: "1px solid var(--line-strong)", borderRadius: 9,
          background: "var(--paper)", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ color: value.length > 0 ? "var(--ink)" : "var(--ink-faint)" }}>{label}</span>
        <ChevronDown size={15} style={{ color: "var(--ink-soft)", marginLeft: 8, flexShrink: 0 }} />
      </button>

      {open && rect && typeof document !== "undefined" && createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="paper"
          style={{
            position: "fixed", top: rect.top, left: rect.right + 8,
            minWidth: 200, maxHeight: 260, overflowY: "auto", zIndex: 9999, padding: 4,
          }}
        >
          {rows.map((opt) => {
            const checked = opt.isAll ? allSelected : value.includes(opt.id);
            return (
              <button
                key={opt.id} type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => (opt.isAll ? toggleAll() : toggle(opt.id))}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 10px", fontSize: 14, fontWeight: opt.isAll ? 600 : 400,
                  background: "transparent", color: "var(--ink)", border: "none",
                  cursor: "pointer", textAlign: "left", borderRadius: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--paper-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{
                  width: 17, height: 17, flexShrink: 0, borderRadius: 5,
                  border: checked ? "1px solid var(--accent)" : "1px solid var(--line-strong)",
                  background: checked ? "var(--accent)" : "transparent",
                  display: "grid", placeItems: "center", color: "#fff",
                }}>
                  {checked && <Check size={11} strokeWidth={3} />}
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

export default function WorkspacePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [workspaces, setWorkspaces] = useState<WorkspaceCard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(() => !!searchParams.get("join"));
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<WTask | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | "delete" | "leave">(null);

  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState(() => searchParams.get("join") ?? "");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [taskPriority, setTaskPriority] = useState<number | null>(null);
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
      if (res.ok) setDetail(await res.json());
      else {
        const body = await res.json().catch(() => ({}));
        setDetailError(body.error ?? `Failed to load workspace (${res.status})`);
      }
    } catch {
      setDetailError("Network error — could not load workspace.");
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setWorkspaces(data); })
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
      .then((res) => (res.ok ? res.json() : res.json().then((b: { error?: string }) => Promise.reject(b))))
      .then((data: WorkspaceDetail) => setDetail(data))
      .catch((err: { error?: string }) => setDetailError(err?.error ?? "Failed to load workspace"))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  useEffect(() => {
    if (searchParams.get("join")) router.replace("/dashboard/workspace");
  }, [searchParams, router]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true); setError("");
    const res = await csrfFetch("/api/workspaces", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const ws: WorkspaceCard = await res.json();
      setWorkspaces((p) => [ws, ...p]);
      setSelectedId(ws.id);
      setShowCreate(false);
      setNewName("");
    } else setError((await res.json()).error ?? "Failed to create");
    setSaving(false);
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setSaving(true); setError("");
    const res = await csrfFetch("/api/workspaces/join", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode.trim() }),
    });
    if (res.ok) {
      const { workspaceId } = await res.json();
      await fetchWorkspaces();
      setSelectedId(workspaceId);
      setShowJoin(false);
      setJoinCode("");
    } else setError((await res.json()).error ?? "Failed to join");
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
    setTaskAssignees(task.assignees.map((a) => a.user.id));
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
      if (res.ok) { await fetchDetail(selectedId); closeTaskModal(); }
      else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Failed to save task (${res.status})`);
      }
    } catch {
      setError("Network error — could not save task.");
    } finally {
      setSaving(false);
    }
  }

  // CHANGED: toggle the current user's "done" vote via the /complete endpoint
  async function toggleCompletion(taskId: string) {
    if (!selectedId) return;
    const res = await csrfFetch(`/api/workspaces/${selectedId}/tasks/${taskId}/complete`, { method: "POST" });
    if (res.ok) {
      const updated: WTask = await res.json();
      setDetail((d) => (d ? { ...d, tasks: d.tasks.map((t) => (t.id === updated.id ? updated : t)) } : d));
    } else if (selectedId) {
      fetchDetail(selectedId);
    }
  }

  async function deleteTask(taskId: string) {
    if (!selectedId) return;
    await csrfFetch(`/api/workspaces/${selectedId}/tasks/${taskId}`, { method: "DELETE" });
    setDetail((d) => (d ? { ...d, tasks: d.tasks.filter((t) => t.id !== taskId) } : d));
  }

  // CHANGED: delete/leave now go through the custom confirm modal
  async function runConfirmedAction() {
    if (!selectedId || !detail) return;
    if (confirmAction === "delete") {
      await csrfFetch(`/api/workspaces/${selectedId}`, { method: "DELETE" });
      setWorkspaces((p) => p.filter((w) => w.id !== selectedId));
      setSelectedId(null);
    } else if (confirmAction === "leave") {
      await csrfFetch(`/api/workspaces/${selectedId}/leave`, { method: "POST" });
      setWorkspaces((p) => p.filter((w) => w.id !== selectedId));
      setSelectedId(null);
    }
    setConfirmAction(null);
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
  function copyInviteLink() {
    if (!detail) return;
    const url = `${window.location.origin}/dashboard/workspace?join=${detail.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // NEW: per-task vote info for the current user
  function voteInfo(task: WTask) {
    const assigneeIds = task.assignees.map((a) => a.user.id);
    const votes = assigneeIds.length === 0
      ? task.completions.length
      : task.completions.filter((c) => assigneeIds.includes(c.userId)).length;
    const threshold = Math.floor(assigneeIds.length / 2) + 1;
    const myVoted = !!currentUserId && task.completions.some((c) => c.userId === currentUserId);
    const canVote = assigneeIds.length === 0 || (!!currentUserId && assigneeIds.includes(currentUserId));
    const multi = assigneeIds.length > 1;
    return { votes, threshold, myVoted, canVote, multi };
  }

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
  };
  const modalInput: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid var(--line-strong)",
    borderRadius: 9, fontSize: 14, outline: "none", boxSizing: "border-box",
    background: "var(--paper)", color: "var(--ink)",
  };
  const modalLabel: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 6 };

  // unified people list (owner first, then members) for the sticky-note team
  const team = detail
    ? [
        { id: detail.owner.id, name: detail.owner.name ?? detail.owner.email, role: "leader", isOwner: true },
        ...detail.members.map((m) => ({ id: m.user.id, name: m.user.name ?? m.user.email, role: m.role, isOwner: false })),
      ]
    : [];
  const currentUserIsLeader = !!detail && (
    detail.ownerId === currentUserId ||
    detail.members.some((x) => x.user.id === currentUserId && x.role === "leader")
  );

  return (
    <div className="w-full flex flex-col">
      {/* header */}
      <div style={{ marginBottom: 22 }}>
        <h1 className="swipe" style={{ fontFamily: "var(--font-heading)", fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>
          Workspace
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 10 }}>Collaborate on shared tasks with others</p>
      </div>

      <div className="flex" style={{ gap: 20, alignItems: "flex-start" }}>
        {/* ── left: workspace list ── */}
        <div className="flex flex-col" style={{ width: 250, flexShrink: 0, gap: 12 }}>
          <div className="flex" style={{ gap: 8 }}>
            <button className="btn-ink" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setShowCreate(true); setError(""); }}>
              <Plus size={15} /> New
            </button>
            <button className="btn-paper" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setShowJoin(true); setError(""); }}>
              Join
            </button>
          </div>

          {loading ? (
            <p style={{ fontSize: 13, color: "var(--ink-faint)", textAlign: "center", marginTop: 20 }}>Loading...</p>
          ) : workspaces.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-faint)", textAlign: "center", marginTop: 20 }}>No workspaces yet</p>
          ) : (
            workspaces.map((ws, index) => {
              const active = ws.id === selectedId;
              const memberCount = ws.members.length + 1;
              return (
                <button
                  key={ws.id}
                  onClick={() => setSelectedId(ws.id)}
                  className={`sticky sticky--flat ${NOTE_COLORS[index % NOTE_COLORS.length]}`}
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    padding: "14px 16px",
                    border: active ? "1.5px solid var(--accent)" : "1px solid transparent",
                    transform: active ? "rotate(-1deg)" : "rotate(0deg)",
                    transition: "all .18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = active
                      ? "rotate(-1deg) translateY(-2px)"
                      : "rotate(1deg) translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = active ? "rotate(-1deg)" : "rotate(0deg)";
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--note-text)", marginBottom: 10 }}>{ws.name}</div>
                  <div className="flex items-center justify-between" style={{ gap: 8 }}>
                    <MemberAvatars count={memberCount} />
                    <span className="pill" style={{ background: "rgba(255,255,255,0.5)", color: "var(--note-text)", }}>
                      {ws._count.tasks} task{ws._count.tasks !== 1 ? "s" : ""}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── right: detail ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedId ? (
            <div className="paper grid place-items-center" style={{ height: 220, color: "var(--ink-faint)", fontSize: 14 }}>
              Select or create a workspace to get started
            </div>
          ) : detailLoading ? (
            <div className="paper grid place-items-center" style={{ height: 220, color: "var(--ink-faint)", fontSize: 14 }}>Loading...</div>
          ) : detailError ? (
            <div className="paper flex flex-col items-center justify-center" style={{ height: 220, gap: 12 }}>
              <p style={{ color: "var(--bad)", fontSize: 14, margin: 0 }}>{detailError}</p>
              <button className="btn-paper" onClick={() => selectedId && fetchDetail(selectedId)}>Retry</button>
            </div>
          ) : detail ? (
            <div className="flex flex-col" style={{ gap: 16 }}>
              {/* workspace header */}
              <div className="paper flex items-center justify-between flex-wrap" style={{ gap: 10, padding: "16px 20px" }}>
                <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>{detail.name}</h2>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <button
                    onClick={copyInviteLink}
                    className="btn-paper"
                    style={{
                      transition: "all .18s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--accent)";
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "";
                      e.currentTarget.style.color = "";
                      e.currentTarget.style.borderColor = "";
                      e.currentTarget.style.transform = "";
                    }}
                  >
                    {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy invite link</>}
                  </button>
                  <button
                    onClick={() => setConfirmAction(detail.ownerId === currentUserId ? "delete" : "leave")}
                    style={{
                      padding: "9px 15px",
                      fontSize: 13.5,
                      fontWeight: 600,
                      borderRadius: 10,
                      cursor: "pointer",
                      background: "transparent",
                      color: "var(--bad)",
                      border: "1px solid var(--bad)",
                      transition: "all .18s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--bad)";
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--bad)";
                    }}
                  >
                    {detail.ownerId === currentUserId ? "Delete" : "Leave"}
                  </button>
                </div>
              </div>

              {/* team */}
              <div className="paper" style={{ padding: "18px 20px" }}>
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>
                    Team
                  </h3>
                  <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>
                    {team.length} {team.length === 1 ? "person" : "people"} collaborating
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                  {team.map((person, i) => {
                    const isLeader = person.role === "leader";
                    const showPromote = currentUserIsLeader && !isLeader;
                    const showDemote = detail.ownerId === currentUserId && isLeader && !person.isOwner;
                    return (
                      <div key={person.id} className={`sticky sticky--flat ${NOTE_COLORS[i % NOTE_COLORS.length]}`} style={{ padding: "14px 16px" }}>
                        <div className="flex items-center" style={{ gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                            background: "rgba(0,0,0,0.12)", color: "var(--note-text)",
                            display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700,
                          }}>
                            {person.name[0].toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--note-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.name}</div>
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--note-text)", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em" }}>{isLeader ? "Leader" : "Member"}</div>
                          </div>
                        </div>
                        {(showPromote || showDemote) && (
                          <button
                            onClick={() => (showPromote ? handlePromote(person.id) : handleDemote(person.id))}
                            style={{
                              marginTop: 12, width: "100%", padding: "6px 0", fontSize: 11.5, fontWeight: 700,
                              borderRadius: 8, cursor: "pointer", background: "rgba(255,255,255,0.55)",
                              color: "var(--note-text)", border: "1px solid rgba(0,0,0,0.15)",
                            }}
                          >
                            {showPromote ? "Make leader" : "Make member"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* shared tasks */}
              <div className="paper" style={{ padding: "18px 20px" }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>Shared tasks</h3>
                  <button className="btn-ink" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => { clearTaskForm(); setEditingTask(null); setError(""); setShowAddTask(true); }}>
                    <Plus size={15} /> Add task
                  </button>
                </div>

                {detail.tasks.length === 0 ? (
                  <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0 }}>No tasks yet — add one above.</p>
                ) : (
                  <div style={{ position: "relative", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: 54, top: 0, bottom: 0, width: 1, background: "var(--margin)", opacity: 0.6 }} />
                    {detail.tasks.map((task, idx) => {
                      const assignees = task.assignees.map((a) => a.user.name ?? "unknown").join(", ");
                      const { votes, threshold, myVoted, canVote, multi } = voteInfo(task);
                      const done = task.completed;
                      const boxChecked = canVote ? myVoted : done;
                      return (
                        <div
                          key={task.id}
                          onClick={() => openEditTask(task)}
                          className="group"
                          style={{
                            position: "relative", display: "flex", alignItems: "center", gap: 12,
                            minHeight: 58, paddingLeft: 70, paddingRight: 14, cursor: "pointer",
                            borderTop: idx === 0 ? "none" : "1px solid var(--line)",
                            background: done ? "var(--paper-2)" : "transparent",
                          }}
                        >
                          {/* per-user done vote */}
                          <button
                            onClick={(e) => { e.stopPropagation(); if (canVote) toggleCompletion(task.id); }}
                            title={canVote ? "Mark done" : "Only assignees can mark this done"}
                            style={{
                              position: "absolute", left: 22, top: "50%", transform: "translateY(-50%)",
                              width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                              cursor: canVote ? "pointer" : "default",
                              display: "grid", placeItems: "center",
                              border: boxChecked ? "1px solid var(--accent)" : "1px solid var(--line-strong)",
                              background: boxChecked ? "var(--accent)" : "transparent", color: "#fff",
                              opacity: canVote ? 1 : 0.55,
                            }}
                          >
                            {boxChecked && <Check size={13} strokeWidth={3} />}
                          </button>

                          <div style={{ flex: 1, minWidth: 0, paddingTop: 8, paddingBottom: 8 }}>
                            <div className="flex items-center" style={{ gap: 10 }}>
                              <span style={{
                                fontSize: 14.5, fontWeight: 600,
                                color: done ? "var(--ink-faint)" : "var(--ink)",
                                textDecoration: done ? "line-through" : "none",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>{task.title}</span>
                              <PriorityBars value={task.priority} />
                              {multi && (
                                done ? (
                                  <span className="pill" style={{ background: "var(--good-soft)", color: "var(--good)", flexShrink: 0 }}>Done</span>
                                ) : (
                                  <span className="flex items-center" style={{ gap: 4, flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)", background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 999, padding: "2px 8px" }}>
                                    <Check size={11} strokeWidth={3} /> {votes}/{threshold}
                                  </span>
                                )
                              )}
                            </div>
                            <div className="flex items-center flex-wrap" style={{ gap: "2px 10px", marginTop: 4, fontSize: 12, color: "var(--ink-faint)" }}>
                              <span>by {task.creator.name ?? "unknown"}</span>
                              {assignees && <span style={{ color: "var(--accent-text)", fontWeight: 600 }}>→ {assignees}</span>}
                              {task.dueDate && <span>due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                            </div>
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                            title="Delete task"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", padding: 4, flexShrink: 0, display: "grid", placeItems: "center" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--bad)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-faint)")}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* delete / leave confirm modal */}
      {confirmAction && detail && (
        <div style={overlay} onClick={() => setConfirmAction(null)}>
          <div className="paper" style={{ width: "100%", maxWidth: 410, padding: "24px 26px" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 10px", fontFamily: "var(--font-heading)", fontSize: 19, fontWeight: 600, color: "var(--ink)" }}>
              {confirmAction === "delete" ? "Delete this workspace?" : "Leave this workspace?"}
            </h2>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55, margin: 0 }}>
              {confirmAction === "delete"
                ? <>“{detail.name}” and all of its shared tasks will be permanently removed. This can’t be undone.</>
                : <>You’ll be removed from “{detail.name}” and lose access to its shared tasks.</>}
            </p>
            <div className="flex justify-end" style={{ gap: 8, marginTop: 22 }}>
              <button className="btn-paper" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                onClick={runConfirmedAction}
                style={{ padding: "9px 18px", fontSize: 13.5, fontWeight: 600, borderRadius: 10, cursor: "pointer", background: "var(--bad)", color: "#fff", border: "none" }}
              >
                {confirmAction === "delete" ? "Delete" : "Leave"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* create modal */}
      {showCreate && (
        <div style={overlay} onClick={() => setShowCreate(false)}>
          <div className="paper" style={{ width: "100%", maxWidth: 420, padding: "26px 28px" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 18px", fontFamily: "var(--font-heading)", fontSize: 19, fontWeight: 600, color: "var(--ink)" }}>New workspace</h2>
            <label style={modalLabel}>Workspace name</label>
            <input style={modalInput} value={newName} autoFocus onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder="e.g. Study Group A" />
            {error && <p style={{ color: "var(--bad)", fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
            <div className="flex justify-end" style={{ gap: 8, marginTop: 20 }}>
              <button className="btn-paper" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-ink" onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* join modal */}
      {showJoin && (
        <div style={overlay} onClick={() => setShowJoin(false)}>
          <div className="paper" style={{ width: "100%", maxWidth: 420, padding: "26px 28px" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 18px", fontFamily: "var(--font-heading)", fontSize: 19, fontWeight: 600, color: "var(--ink)" }}>Join workspace</h2>
            <label style={modalLabel}>Invite code or link</label>
            <input
              style={modalInput} value={joinCode} autoFocus
              onChange={(e) => {
                const val = e.target.value;
                try { const url = new URL(val); const code = url.searchParams.get("join"); if (code) { setJoinCode(code); return; } } catch {}
                setJoinCode(val);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="Paste invite link or code"
            />
            {error && <p style={{ color: "var(--bad)", fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
            <div className="flex justify-end" style={{ gap: 8, marginTop: 20 }}>
              <button className="btn-paper" onClick={() => setShowJoin(false)}>Cancel</button>
              <button className="btn-ink" onClick={handleJoin} disabled={saving}>{saving ? "Joining..." : "Join"}</button>
            </div>
          </div>
        </div>
      )}

      {/* add/edit task modal */}
      <Dialog open={showAddTask} onOpenChange={(open) => { if (!open) closeTaskModal(); }}>
        <DialogContent showCloseButton={false} className="max-w-sm p-0 flex flex-col paper" style={{ maxHeight: "90vh" }}>
          <DialogHeader className="flex flex-row items-center justify-between gap-2 px-5 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
            <DialogTitle style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {editingTask ? "Edit task" : "New task"}
            </DialogTitle>
            <div className="flex gap-2">
              <button onClick={closeTaskModal} className="btn-paper" style={{ padding: "6px 14px", fontSize: 12.5 }}>Cancel</button>
              <button onClick={handleSaveTask} disabled={saving} className="btn-ink" style={{ padding: "6px 14px", fontSize: 12.5 }}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {error && <p style={{ fontSize: 13, color: "var(--bad)" }}>{error}</p>}

            <div className="space-y-1">
              <Label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Title <span style={{ color: "var(--bad)" }}>*</span></Label>
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title..." className="bg-transparent rounded-none px-0 text-base focus-visible:ring-0" style={{ border: "none", borderBottom: "1.5px solid var(--line-strong)", color: "var(--ink)" }} />
            </div>

            <div className="space-y-1">
              <Label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Details</Label>
              <Textarea value={taskDetails} onChange={(e) => setTaskDetails(e.target.value)} placeholder="type here..." rows={3} className="resize-none text-sm focus-visible:ring-1" style={{ border: "1px solid var(--line-strong)", borderRadius: 9, background: "var(--paper-2)", color: "var(--ink)" }} />
            </div>

            <div className="space-y-2">
              <Label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Priority</Label>
              <div className="flex items-center" style={{ gap: 6 }}>
                {[1, 2, 3, 4, 5].map((p) => (
                  <button
                    key={p} type="button" title={`Priority ${p}`}
                    onClick={() => setTaskPriority(taskPriority === p ? null : p)}
                    style={{
                      flex: 1, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                      background: taskPriority && p <= taskPriority ? "var(--accent)" : "var(--line-strong)",
                      transition: "background .1s",
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>low</span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>high</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Assign to</Label>
              <MemberSelect
                value={taskAssignees}
                onChange={setTaskAssignees}
                options={detail ? [
                  { id: detail.owner.id, name: detail.owner.name ?? detail.owner.email },
                  ...detail.members.map((m) => ({ id: m.user.id, name: m.user.name ?? m.user.email })),
                ] : []}
              />
            </div>

            <div className="space-y-1">
              <Label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Due date</Label>
              <DateTimePicker value={taskDueDate} onChange={(iso) => setTaskDueDate(iso)} placeholder="Select due date & time" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}