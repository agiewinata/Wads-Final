import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const MODEL   = process.env.GOOGLE_AI_MODEL   ?? "gemini-2.0-flash";
const API_KEY = process.env.GOOGLE_AI_API_KEY ?? "";
const BASE    = "https://generativelanguage.googleapis.com/v1beta/models";

type AssessType = "burnout" | "affirmation";

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_AI_API_KEY is not set in .env.local" },
      { status: 500 },
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type } = await req.json() as { type: AssessType };

  const now   = new Date();
  const tasks = await prisma.task.findMany({
    where:  { userId: session.user.id },
    select: { title: true, subject: true, category: true, completed: true, dueDate: true },
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
  const subjects  = [...new Set(tasks.map(t => t.subject).filter(Boolean))];

  const taskSummary = `Student: ${name}
Overdue (${overdue.length}): ${overdue.map(t => `"${t.title}"`).slice(0, 5).join(", ") || "none"}
Due in 3 days (${dueSoon.length}): ${dueSoon.map(t => `"${t.title}"`).slice(0, 5).join(", ") || "none"}
Active tasks: ${active.length}
Completed: ${completed.length}
Subjects: ${subjects.join(", ") || "none"}`;

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
{"show": true|false, "message": "string"}`;
  } else {
    prompt = `You are generating a personalised daily affirmation for a student.

${taskSummary}

Write a warm, specific 2-sentence affirmation for ${name}. Rules:
- Reference their actual situation: name subjects, acknowledge completions, encourage about active load.
- If many overdue tasks, acknowledge gently and encourage starting small.
- Address them by name (${name}).
- Do NOT be generic.

Respond ONLY with valid JSON, no markdown fences:
{"message": "string"}`;
  }

  try {
    const googleRes = await fetch(
      `${BASE}/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 256,
          },
        }),
      },
    );

    if (!googleRes.ok) {
      const errText = await googleRes.text().catch(() => "unknown");
      return NextResponse.json({ error: `Google AI error: ${errText}` }, { status: 502 });
    }

    const raw    = await googleRes.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text   = raw.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(text) as { show?: boolean; message?: string };

    return NextResponse.json({
      show:    parsed.show ?? false,
      message: parsed.message ?? "",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach Google AI. Check your GOOGLE_AI_API_KEY." },
      { status: 502 },
    );
  }
}
