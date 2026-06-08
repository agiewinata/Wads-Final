import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const OLLAMA_BASE  = process.env.OLLAMA_BASE  ?? "https://ollama.csbihub.id";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.1:8b";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now   = new Date();
  const tasks = await prisma.task.findMany({
    where:  { userId: session.user.id },
    select: { title: true, category: true, completed: true, dueDate: true, priority: true },
  });

  const name      = session.user.name ?? "there";
  const completed = tasks.filter(t => t.completed);
  const overdue   = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now);
  const dueSoon   = tasks.filter(t => {
    if (t.completed || !t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due > now && due < new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  });
  const active           = tasks.filter(t => !t.completed);
  const highPriIncomplete = tasks.filter(t => !t.completed && (t.priority ?? 0) >= 4);

  const summary = `Student: ${name}
Total tasks: ${tasks.length}
Completed: ${completed.length}
Overdue (${overdue.length}): ${overdue.map(t => `"${t.title}"`).slice(0, 5).join(", ") || "none"}
Due in 3 days (${dueSoon.length}): ${dueSoon.map(t => `"${t.title}"`).slice(0, 4).join(", ") || "none"}
Active tasks: ${active.length}
High-priority incomplete: ${highPriIncomplete.length}
Completion rate: ${tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0}%`;

  const prompt = `You are a productivity coach for a student task management app. Based on the student's task data, provide 3-4 short, actionable, and personalised self-improvement recommendations.

${summary}

Rules:
- Each recommendation should be a single sentence, direct and practical.
- Reference specific data (e.g. overdue task names, counts) where helpful.
- Vary the focus: time management, prioritisation, wellbeing, habits.
- Address the student as ${name}.
- If completion rate is high, praise them and suggest maintaining it.
- If overdue tasks exist, suggest a specific action to tackle them first.
- Keep each recommendation under 25 words.

Respond ONLY with valid JSON, no markdown:
{"recommendations": ["string", "string", "string"]}`;

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:    OLLAMA_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream:   false,
        format:   "json",
      }),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text().catch(() => "unknown");
      return NextResponse.json({ error: `Ollama error: ${errText}` }, { status: 502 });
    }

    const raw    = await ollamaRes.json() as { message?: { content?: string } };
    const text   = raw.message?.content ?? "{}";
    const parsed = JSON.parse(text) as { recommendations?: string[] };

    return NextResponse.json({ recommendations: parsed.recommendations ?? [] });
  } catch {
    return NextResponse.json({ error: "Could not reach Ollama." }, { status: 502 });
  }
}
