import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { limits } from "@/lib/rate-limit";

const OLLAMA_BASE = process.env.OLLAMA_BASE ?? "https://ollama.csbihub.id";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:26b";

function fallbackRecommendations({
  name,
  overdueCount,
  dueSoonCount,
  highPriIncompleteCount,
}: {
  name: string;
  overdueCount: number;
  dueSoonCount: number;
  highPriIncompleteCount: number;
}) {
  return [
    overdueCount > 0
      ? `${name}, start with your ${overdueCount} overdue task${overdueCount === 1 ? "" : "s"} before adding new work.`
      : `${name}, keep your task list updated so your study plan stays realistic.`,
    dueSoonCount > 0
      ? `Prioritise the ${dueSoonCount} task${dueSoonCount === 1 ? "" : "s"} due in the next 3 days.`
      : `Use one focused timer session today to keep your study streak going.`,
    highPriIncompleteCount > 0
      ? `Handle your high-priority incomplete tasks first, even if you only make small progress.`
      : `Review your active tasks and pick one clear next action.`,
  ];
}

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!limits.ai(session.user.id)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const now = new Date();

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    select: {
      title: true,
      category: true,
      completed: true,
      dueDate: true,
      priority: true,
    },
  });

  const name = session.user.name ?? "there";
  const completed = tasks.filter((t) => t.completed);
  const overdue = tasks.filter(
    (t) => !t.completed && t.dueDate && new Date(t.dueDate) < now
  );
  const dueSoon = tasks.filter((t) => {
    if (t.completed || !t.dueDate) return false;

    const due = new Date(t.dueDate);
    return due > now && due < new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  });
  const active = tasks.filter((t) => !t.completed);
  const highPriIncomplete = tasks.filter(
    (t) => !t.completed && (t.priority ?? 0) >= 4
  );

  const fallback = fallbackRecommendations({
    name,
    overdueCount: overdue.length,
    dueSoonCount: dueSoon.length,
    highPriIncompleteCount: highPriIncomplete.length,
  });

  const summary = `Student: ${name}
Total tasks: ${tasks.length}
Completed: ${completed.length}
Overdue (${overdue.length}): ${
    overdue.map((t) => `"${t.title}"`).slice(0, 5).join(", ") || "none"
  }
Due in 3 days (${dueSoon.length}): ${
    dueSoon.map((t) => `"${t.title}"`).slice(0, 4).join(", ") || "none"
  }
Active tasks: ${active.length}
High-priority incomplete: ${highPriIncomplete.length}
Completion rate: ${
    tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0
  }%`;

  const prompt = `You are a productivity coach for a student task management app. Based on the student's task data, provide 3 short, actionable, and personalised self-improvement recommendations.

${summary}

Rules:
- Each recommendation should be a single sentence, direct and practical.
- Reference specific data where helpful.
- Vary the focus: time management, prioritisation, wellbeing, habits.
- Address the student as ${name}.
- Keep each recommendation under 25 words.

Respond ONLY with valid JSON, no markdown:
{"recommendations": ["string", "string", "string"]}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        format: "json",
      }),
    });

    clearTimeout(timeout);

    if (!ollamaRes.ok) {
      return NextResponse.json({ recommendations: fallback });
    }

    const raw = (await ollamaRes.json()) as {
      message?: { content?: string };
    };

    const text = raw.message?.content ?? "{}";
    const parsed = JSON.parse(text) as { recommendations?: string[] };

    const recommendations =
      parsed.recommendations?.filter((r) => typeof r === "string" && r.trim())
        .slice(0, 4) ?? [];

    return NextResponse.json({
      recommendations: recommendations.length > 0 ? recommendations : fallback,
    });
  } catch {
    clearTimeout(timeout);

    return NextResponse.json({
      recommendations: fallback,
    });
  }
}