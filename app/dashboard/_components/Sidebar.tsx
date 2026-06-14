"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const NAV: ({ label: string; href: string } | { label: string; href: null })[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Tasks",     href: "/dashboard/tasks" },
  { label: "AI",        href: "/dashboard/ai" },
  { label: "Calendar",  href: "/dashboard/calendar" },
  { label: "Timer",     href: "/dashboard/timer" },
  { label: "Analytics", href: "/dashboard/analytics" },
];

export default function Sidebar({ userName }: { userName: string | null }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile]     = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function handleLogout() {
    await signOut({ fetchOptions: { onSuccess: () => router.push("/login") } });
  }

  return (
    <>
      {/* Hamburger — fixed top-left on mobile */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(o => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          style={{
            position: "fixed",
            top: 12,
            left: 12,
            zIndex: 10001,
            width: 36,
            height: 36,
            background: "#fff",
            border: "2px solid #111",
            borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <span style={{ width: 16, height: 2, background: "#111", display: "block" }} />
          <span style={{ width: 16, height: 2, background: "#111", display: "block" }} />
          <span style={{ width: 16, height: 2, background: "#111", display: "block" }} />
        </button>
      )}

      {/* Backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 9999,
          }}
        />
      )}

      <aside
        className="shrink-0 bg-white flex flex-col"
        style={{
          width: 208,
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          height: "100vh",
          borderRight: "3px solid #111",
          boxShadow: "3px 0 0 rgba(0,0,0,0.06)",
          zIndex: isMobile ? 10000 : "auto",
          transform: isMobile && !mobileOpen ? "translateX(-100%)" : "translateX(0)",
          transition: "transform 0.25s ease",
        }}
      >
        {/* ── User badge ── */}
        <div
          style={{
            padding: "22px 20px 18px",
            borderBottom: "2px solid #e4e4e7",
            flexShrink: 0,
          }}
        >
          <span
            className="inline-block text-sm font-bold text-zinc-800"
            style={{
              padding: "5px 14px",
              border: "2px solid #111",
              borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
            }}
          >
            {userName ?? "User"}
          </span>
        </div>

        {/* ── Nav ── */}
        <nav
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "10px 12px",
            overflow: "hidden",
          }}
        >
          {NAV.map((item) => {
            if (!item.href) {
              return (
                <span
                  key={item.label}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 12,
                    paddingRight: 12,
                    fontSize: 14,
                    color: "#d4d4d8",
                    cursor: "not-allowed",
                    userSelect: "none",
                  }}
                >
                  {item.label}
                </span>
              );
            }

            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 12,
                  paddingRight: 12,
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  color: active ? "#fff" : "#3f3f46",
                  position: "relative",
                }}
              >
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      inset: "12px 8px",
                      background: "#111",
                      borderRadius: "3px 5px 3px 5px / 5px 3px 5px 3px",
                      zIndex: 0,
                    }}
                  />
                )}
                <span style={{ position: "relative", zIndex: 1 }}>{item.label}</span>
              </Link>
            );
          })}

          <div style={{ height: 1, background: "#e4e4e7", margin: "2px 4px", flexShrink: 0 }} />

          <button
            onClick={handleLogout}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
              paddingRight: 12,
              fontSize: 14,
              color: "#71717a",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#111")}
            onMouseLeave={e => (e.currentTarget.style.color = "#71717a")}
          >
            Log out
          </button>
        </nav>
      </aside>
    </>
  );
}
