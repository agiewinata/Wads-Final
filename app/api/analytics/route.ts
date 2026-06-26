import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RANGES: Record<string, { days: number; bucket: "day" | "week" }> = {
  "7d":   { days:   7, bucket: "day"  },
  "14d":  { days:  14, bucket: "day"  },
  "30d":  { days:  30, bucket: "day"  },
  "90d":  { days:  90, bucket: "week" },
  "180d": { days: 180, bucket: "week" },
};

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rangeKey = req.nextUrl.searchParams.get("range") ?? "7d";
  const { days, bucket } = RANGES[rangeKey] ?? RANGES["7d"];

  const userId = session.user.id;

  const oldestDate = new Date();
  oldestDate.setDate(oldestDate.getDate() - days);

  const [personalTasks, wsTasks, studySessions] = await Promise.all([
    prisma.task.findMany({
      where: { userId },
      select: {
        title: true,
        category: true,
        completed: true,
        dueDate: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

    prisma.workspaceTask.findMany({
      where: {
        workspace: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
      },
      select: {
        completed: true,
        dueDate: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

    prisma.studySession.findMany({
      where: {
        userId,
        startedAt: {
          gte: oldestDate,
        },
      },
      select: {
        minutes: true,
        startedAt: true,
        endedAt: true,
      },
    }),
  ]);

  // Merge into a unified shape for summary stats
  const tasks = [
    ...personalTasks,
    ...wsTasks.map(t => ({ ...t, title: "", category: null })),
  ];

  const now = new Date();

  const completed = tasks.filter((t) => t.completed);
  const overdue = tasks.filter(
    (t) => !t.completed && t.dueDate && new Date(t.dueDate) < now
  );
  const active = tasks.filter(
    (t) => !t.completed && !(t.dueDate && new Date(t.dueDate) < now)
  );
  const dueSoon = tasks.filter((t) => {
    if (t.completed || !t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due > now && due < new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  });

  // By category (personal tasks only — workspace tasks have no category)
  const catMap = new Map<
    string,
    {
      total: number;
      completed: number;
      createdAt: Date;
    }
  >();

  for (const t of personalTasks) {
    const key = t.category ?? "None";

    if (!catMap.has(key)) {
      catMap.set(key, {
        total: 0,
        completed: 0,
        createdAt: t.createdAt,
      });
    }

    const e = catMap.get(key)!;
    e.total++;

    if (t.completed) e.completed++;

    if (t.createdAt < e.createdAt) {
      e.createdAt = t.createdAt;
    }
  }

  const byCategory = [...catMap.entries()]
    .map(([name, v]) => ({
      name,
      total: v.total,
      completed: v.completed,
      incomplete: v.total - v.completed,
      createdAt: v.createdAt.toISOString(),
    }))
    .sort((a, b) => {
      if (a.name === "None") return 1;
      if (b.name === "None") return -1;

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  // By priority
  const priMap = new Map<number, { total: number; completed: number }>();
  for (const t of tasks) {
    if (t.priority === null) continue;
    if (!priMap.has(t.priority)) priMap.set(t.priority, { total: 0, completed: 0 });
    const e = priMap.get(t.priority)!;
    e.total++;
    if (t.completed) e.completed++;
  }
  const byPriority = [1, 2, 3, 4, 5]
    .filter((p) => priMap.has(p))
    .map((p) => ({
      priority: `P${p}`,
      total: priMap.get(p)!.total,
      completed: priMap.get(p)!.completed,
      incomplete: priMap.get(p)!.total - priMap.get(p)!.completed,
    }));

  // Trend — bucketed by day or week depending on range
  const trend = (() => {
    if (bucket === "day") {
      return Array.from({ length: days }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (days - 1 - i));
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const end   = new Date(start);
        end.setDate(end.getDate() + 1);
        const label = days <= 14
          ? start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
          : start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return {
          date: label,
          completed: completed.filter((t) => {
            const u = new Date(t.updatedAt);
            return u >= start && u < end;
          }).length,
          created: tasks.filter((t) => {
            const c = new Date(t.createdAt);
            return c >= start && c < end;
          }).length,
          overdue: tasks.filter((t) => {
            if (t.completed || !t.dueDate) return false;
            const due = new Date(t.dueDate);
            return due >= start && due < end;
          }).length,
          focusMinutes: studySessions
            .filter((s) => {
              const started = new Date(s.startedAt);
              return started >= start && started < end;
            })
            .reduce((sum, s) => sum + s.minutes, 0),
          studied: studySessions.some((s) => {
            const started = new Date(s.startedAt);
            return started >= start && started < end;
          }),
        };
      });
    }

    // Weekly buckets
    const numWeeks = Math.ceil(days / 7);
    return Array.from({ length: numWeeks }, (_, i) => {
      const end   = new Date(now);
      end.setDate(end.getDate() - (numWeeks - 1 - i) * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const label = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      return {
        date: label,
        completed: completed.filter((t) => {
          const u = new Date(t.updatedAt);
          return u >= start && u <= end;
        }).length,
        created: tasks.filter((t) => {
          const c = new Date(t.createdAt);
          return c >= start && c <= end;
        }).length,
        overdue: tasks.filter((t) => {
          if (t.completed || !t.dueDate) return false;
          const due = new Date(t.dueDate);
          return due >= start && due <= end;
        }).length,
        focusMinutes: studySessions
          .filter((s) => {
            const started = new Date(s.startedAt);
            return started >= start && started <= end;
          })
          .reduce((sum, s) => sum + s.minutes, 0),
        studied: studySessions.some((s) => {
          const started = new Date(s.startedAt);
          return started >= start && started <= end;
        }),
      };
    });
  })();

  return NextResponse.json({
    total: tasks.length,
    completed: completed.length,
    overdue: overdue.length,
    active: active.length,
    dueSoon: dueSoon.length,
    completionRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
    byCategory,
    byPriority,
    trend,
  });
}
