import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mailer } from "@/lib/mailer";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { tasks: { some: { completed: false, dueDate: { lt: now } } } },
        { workspacesOwned: { some: { tasks: { some: { completed: false, dueDate: { lt: now } } } } } },
        { workspaceMemberships: { some: { workspace: { tasks: { some: { completed: false, dueDate: { lt: now } } } } } } },
      ],
    },
    select: {
      email: true,
      name: true,
      tasks: {
        where: { completed: false, dueDate: { lt: now } },
        select: { title: true, dueDate: true, priority: true, category: true },
        orderBy: { dueDate: "asc" },
      },
      workspacesOwned: {
        select: {
          name: true,
          tasks: {
            where: { completed: false, dueDate: { lt: now } },
            select: { title: true, dueDate: true, priority: true },
            orderBy: { dueDate: "asc" },
          },
        },
      },
      workspaceMemberships: {
        select: {
          workspace: {
            select: {
              name: true,
              tasks: {
                where: { completed: false, dueDate: { lt: now } },
                select: { title: true, dueDate: true, priority: true },
                orderBy: { dueDate: "asc" },
              },
            },
          },
        },
      },
    },
  });

  const results = await Promise.allSettled(
    users.map((user) => {
      const sharedWorkspaces = [
        ...user.workspacesOwned,
        ...user.workspaceMemberships.map((m) => m.workspace),
      ].filter((ws) => ws.tasks.length > 0);

      const sharedTotal = sharedWorkspaces.reduce((sum, ws) => sum + ws.tasks.length, 0);
      const personalTotal = user.tasks.length;
      const grandTotal = personalTotal + sharedTotal;

      const subject =
        `You have ${grandTotal} overdue task${grandTotal === 1 ? "" : "s"}` +
        (sharedTotal > 0 ? ` (${sharedTotal} shared)` : "") +
        " — Quest Planner";

      return mailer.sendMail({
        from: `"Quest Planner" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject,
        html: buildEmailHtml(user.name ?? "there", user.tasks, sharedWorkspaces),
      });
    })
  );

  const sent   = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`[overdue-notify] sent=${sent} failed=${failed} total=${users.length}`);
  return NextResponse.json({ sent, failed, total: users.length });
}

type OverdueTask = {
  title: string;
  dueDate: Date | null;
  priority: number | null;
  category?: string | null;
};

type WorkspaceOverdue = {
  name: string;
  tasks: OverdueTask[];
};

function formatDue(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function taskRows(tasks: OverdueTask[], showCategory = false) {
  return tasks.map((t) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#111827;">${t.title}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#ef4444;white-space:nowrap;">${formatDue(t.dueDate)}</td>
      ${showCategory ? `<td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${t.category ?? "—"}</td>` : ""}
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${t.priority ? `P${t.priority}` : "—"}</td>
    </tr>`).join("");
}

function buildEmailHtml(name: string, personalTasks: OverdueTask[], sharedWorkspaces: WorkspaceOverdue[]) {
  const appUrl       = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const sharedTotal  = sharedWorkspaces.reduce((sum, ws) => sum + ws.tasks.length, 0);
  const grandTotal   = personalTasks.length + sharedTotal;

  const personalSection = personalTasks.length > 0 ? `
    <h3 style="margin:0 0 10px;font-size:15px;font-weight:600;color:#374151;">
      My Tasks <span style="color:#ef4444;">(${personalTasks.length})</span>
    </h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Task</th>
          <th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Was Due</th>
          <th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Category</th>
          <th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Priority</th>
        </tr>
      </thead>
      <tbody>${taskRows(personalTasks, true)}</tbody>
    </table>` : "";

  const sharedSection = sharedWorkspaces.length > 0 ? `
    <h3 style="margin:0 0 10px;font-size:15px;font-weight:600;color:#374151;">
      Shared Workspace Tasks <span style="color:#ef4444;">(${sharedTotal})</span>
    </h3>
    ${sharedWorkspaces.map((ws) => `
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">
        ${ws.name}
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Task</th>
            <th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Was Due</th>
            <th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Priority</th>
          </tr>
        </thead>
        <tbody>${taskRows(ws.tasks, false)}</tbody>
      </table>`).join("")}` : "";

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <div style="background:#4f46e5;padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600;">Quest Study Planner</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="margin:0 0 8px;color:#111827;font-size:18px;">Hi ${name},</h2>
          <p style="margin:0 0 24px;color:#4b5563;font-size:15px;">
            You have <strong style="color:#ef4444;">${grandTotal} overdue task${grandTotal === 1 ? "" : "s"}</strong> waiting for you${sharedTotal > 0 ? `, including <strong style="color:#ef4444;">${sharedTotal} shared</strong>` : ""}.
          </p>
          ${personalSection}
          ${sharedSection}
          <div style="margin-top:8px;display:flex;gap:12px;">
            <a href="${appUrl}/dashboard/tasks?status=OVERDUE"
               style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
              My Tasks
            </a>
            ${sharedTotal > 0 ? `
            <a href="${appUrl}/dashboard/workspace"
               style="display:inline-block;padding:12px 24px;background:#fff;color:#4f46e5;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;border:2px solid #4f46e5;">
              Workspaces
            </a>` : ""}
          </div>
          <p style="margin-top:28px;color:#9ca3af;font-size:13px;">
            You're receiving this because you have an account on Quest Study Planner.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
