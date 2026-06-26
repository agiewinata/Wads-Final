"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { csrfFetch } from "@/lib/csrf-client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  Sparkles,
  CalendarDays,
  Clock,
  BarChart3,
  Columns3,
  LogOut,
  Sun,
  Moon,
  GraduationCap,
  Menu,
  X,
  Trash2,
} from "lucide-react";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
  { label: "AI", href: "/dashboard/ai", icon: Sparkles },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "Timer", href: "/dashboard/timer", icon: Clock },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Workspace", href: "/dashboard/workspace", icon: Columns3 },
];

export default function Sidebar({ userName }: { userName: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dark, setDark] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!deleteOpen) return;

    setDeleteCountdown(5);
    setDeleteError("");

    const interval = setInterval(() => {
      setDeleteCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [deleteOpen]);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);

    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}

    setDark(next);
  }

  async function handleLogout() {
    await signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  }

  async function handleDeleteAccount() {
    if (deleteCountdown > 0 || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const res = await csrfFetch("/api/account/delete", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? "Failed to delete account.");
        setDeleting(false);
        return;
      }

      await signOut({
        fetchOptions: {
          onSuccess: () => router.push("/login"),
        },
      });
    } catch {
      setDeleteError("Network error. Could not delete account.");
      setDeleting(false);
    }
  }

  const initials = (userName ?? "User")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {isMobile && (
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="fixed top-3 left-3 z-[10001] h-9 w-9 grid place-items-center btn-paper"
          style={{ padding: 0, width: 36, height: 36 }}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-[9999]"
          style={{ background: "rgba(0,0,0,0.45)" }}
        />
      )}

      <aside
        className="shrink-0 flex flex-col"
        style={{
          width: 232,
          background: "var(--paper)",
          borderRight: "1px solid var(--line)",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          height: "100vh",
          zIndex: isMobile ? 10000 : "auto",
          transform: isMobile && !mobileOpen ? "translateX(-100%)" : "translateX(0)",
          transition: "transform 0.25s ease",
        }}
      >
        {/* brand */}
        <div className="flex items-center gap-3" style={{ padding: "20px 18px 16px" }}>
          <div
            className="grid place-items-center"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "var(--accent)",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <GraduationCap size={19} />
          </div>

          <div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: 18,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
              }}
            >
              Quest Class
            </div>

            <div
              style={{
                fontSize: 9.5,
                fontWeight: 500,
                color: "var(--ink-faint)",
                letterSpacing: "0.01em",
                lineHeight: 1.2,
              }}
            >
              Study Planner & Productivity Tracker
            </div>
          </div>
        </div>

        {/* user */}
        <div
          className="flex items-center gap-2.5"
          style={{
            margin: "0 14px 8px",
            padding: "10px 12px",
            background: "var(--paper-2)",
            border: "1px solid var(--line)",
            borderRadius: 11,
          }}
        >
          <div
            className="grid place-items-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {userName ?? "User"}
            </div>

            <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>Student</div>
          </div>

          <button
            onClick={() => setDeleteOpen(true)}
            title="Delete account"
            aria-label="Delete account"
            style={{
              width: 28,
              height: 28,
              display: "grid",
              placeItems: "center",
              borderRadius: 8,
              border: "1px solid transparent",
              background: "transparent",
              color: "var(--ink-faint)",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all .15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--bad)";
              e.currentTarget.style.background = "var(--bad-soft)";
              e.currentTarget.style.borderColor = "var(--bad)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--ink-faint)";
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* nav */}
        <nav className="flex-1 flex flex-col gap-0.5 overflow-auto" style={{ padding: "8px 12px" }}>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 relative"
                style={{
                  padding: "9px 12px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  color: active ? "var(--accent-text)" : "var(--ink-soft)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  transition: "background .14s, color .14s",
                }}
              >
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 8,
                      bottom: 8,
                      width: 3,
                      borderRadius: 3,
                      background: "var(--accent)",
                    }}
                  />
                )}

                <Icon size={18} style={{ flexShrink: 0 }} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* footer: theme toggle + logout */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--line)",
          }}
        >
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2"
            style={{
              background: "var(--paper-2)",
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12.5,
              fontWeight: 500,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
            {dark ? "Light" : "Dark"}
          </button>

          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="grid place-items-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              color: "var(--ink-faint)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {deleteOpen && (
        <div className="app-overlay" onClick={() => !deleting && setDeleteOpen(false)}>
          <div
            className="paper"
            style={{
              maxWidth: 430,
              width: "100%",
              overflow: "hidden",
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
                Delete account?
              </h2>
              <span className="app-modal-subtle">permanent action</span>
            </div>

            <div style={{ padding: "18px 22px" }}>
              <div className="app-message app-message-error">
                This will permanently delete your account, personal tasks, calendar events, timer
                sessions, and study settings. Workspace tasks assigned only to you will be removed;
                shared tasks with other assignees will simply unassign you.
              </div>

              {deleteError && (
                <div className="app-message app-message-error" style={{ marginTop: 10 }}>
                  {deleteError}
                </div>
              )}
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
              <button
                className="btn-paper"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                Go back
              </button>

              <button
                onClick={handleDeleteAccount}
                disabled={deleteCountdown > 0 || deleting}
                style={{
                  padding: "9px 16px",
                  borderRadius: 11,
                  fontSize: 14,
                  fontWeight: 600,
                  border:
                    "1px solid " +
                    (deleteCountdown > 0 ? "var(--line-strong)" : "var(--bad)"),
                  background: deleteCountdown > 0 ? "var(--paper-2)" : "var(--bad)",
                  color: deleteCountdown > 0 ? "var(--ink-faint)" : "#fff",
                  cursor: deleteCountdown > 0 || deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.65 : 1,
                  transition: "all .15s ease",
                }}
              >
                {deleting
                  ? "Deleting…"
                  : deleteCountdown > 0
                    ? `Delete in ${deleteCountdown}s`
                    : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}