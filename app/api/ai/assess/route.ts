import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { limits } from "@/lib/rate-limit";

const OLLAMA_BASE  = process.env.OLLAMA_BASE  ?? "https://ollama.csbihub.id";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.1:8b";

type AssessType = "burnout" | "affirmation";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!limits.ai(session.user.id)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { type } = await req.json() as { type: AssessType };

  const now   = new Date();
  const tasks = await prisma.task.findMany({
    where:  { userId: session.user.id },
    select: { title: true, category: true, completed: true, dueDate: true },
  });

  const name      = session.user.name ?? "there";
  const overdue   = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now);
  const dueSoon   = tasks.filter(t => {
    if (t.completed || !t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due > now && due < new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  });
  const completed = tasks.filter(t => t.completed);
  const active    = tasks.filter(t => !t.completed);

  const taskSummary = `Student: ${name}
Overdue (${overdue.length}): ${overdue.map(t => `"${t.title}"`).slice(0, 5).join(", ") || "none"}
Due in 3 days (${dueSoon.length}): ${dueSoon.map(t => `"${t.title}"`).slice(0, 5).join(", ") || "none"}
Active tasks: ${active.length}
Completed: ${completed.length}`;

  let prompt: string;

  if (type === "burnout") {
    prompt = `You are a burnout risk assessor for a student's study app. Decide whether to warn the student before they add another task.

${taskSummary}

Show a warning (show=true) if ANY of these apply:
- overdue tasks >= 3
- active tasks >= 8
- overdue >= 1 AND dueSoon >= 3

If workload is manageable, show=false.

If show=true: write a warm, personal 2-sentence warning for ${name} that names their specific overdue tasks if relevant.
If show=false: set message to empty string.

Respond ONLY with valid JSON, no markdown fences:
{"show": true or false, "message": "string"}`;
  } else {
    prompt = `You are generating a personalised daily greeting and affirmation for a student.

${taskSummary}

Write a warm, specific 2-sentence greeting for ${name}. Rules:
- Always mention how many tasks are due in the next 3 days (${dueSoon.length}) — phrase it naturally, e.g. "You have ${dueSoon.length} task${dueSoon.length === 1 ? "" : "s"} coming up soon."
- Reference their actual situation: acknowledge completions, encourage about active load.
- If there are overdue tasks, acknowledge gently and encourage starting small.
- Address them by name (${name}).
- Do NOT be generic.

Respond ONLY with valid JSON, no markdown fences:
{"message": "string"}`;
  }

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
    const parsed = JSON.parse(text) as { show?: boolean; message?: string };

    return NextResponse.json({
      show:    parsed.show ?? false,
      message: parsed.message ?? "",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach Ollama." },
      { status: 502 },
    );
  }
}
