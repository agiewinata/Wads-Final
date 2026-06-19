import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const users = await prisma.user.findMany({
    where: {
      tasks: {
        some: {
          completed: false,
          dueDate: { lt: now },
        },
      },
    },
    select: {
      email: true,
      name: true,
      tasks: {
        where: {
          completed: false,
          dueDate: { lt: now },
        },
        select: {
          title: true,
          dueDate: true,
          priority: true,
          category: true,
        },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  const results = await Promise.allSettled(
    users.map((user) =>
      transporter.sendMail({
        from: `"Quest Planner" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: `You have ${user.tasks.length} overdue task${user.tasks.length === 1 ? "" : "s"} — Quest Planner`,
        html: buildEmailHtml(user.name ?? "there", user.tasks),
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(`[overdue-notify] sent=${sent} failed=${failed} total=${users.length}`);
  return NextResponse.json({ sent, failed, total: users.length });
}

type OverdueTask = {
  title: string;
  dueDate: Date | null;
  priority: number | null;
  category: string | null;
};

function buildEmailHtml(name: string, tasks: OverdueTask[]) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const taskRows = tasks
    .map((t) => {
      const due = t.dueDate
        ? new Date(t.dueDate).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";
      const priority = t.priority ? `P${t.priority}` : "—";
      const category = t.category ?? "—";
      return `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#111827;">${t.title}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#ef4444;white-space:nowrap;">${due}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${category}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${priority}</td>
        </tr>`;
    })
    .join("");

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
          <p style="margin:0 0 20px;color:#4b5563;font-size:15px;">
            You have <strong style="color:#ef4444;">${tasks.length} overdue task${tasks.length === 1 ? "" : "s"}</strong> waiting for you.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Task</th>
                <th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Was Due</th>
                <th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Category</th>
                <th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;color:#374151;font-weight:600;">Priority</th>
              </tr>
            </thead>
            <tbody>${taskRows}</tbody>
          </table>
          <div style="margin-top:28px;">
            <a href="${appUrl}/dashboard/tasks?status=OVERDUE"
               style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
              View Overdue Tasks
            </a>
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
