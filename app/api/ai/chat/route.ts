import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const MODEL   = process.env.GOOGLE_AI_MODEL   ?? "gemini-2.0-flash";
const API_KEY = process.env.GOOGLE_AI_API_KEY ?? "";
const BASE    = "https://generativelanguage.googleapis.com/v1beta/models";

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_AI_API_KEY is not set in .env.local" },
      { status: 500 },
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const now     = new Date();
  const tasks   = await prisma.task.findMany({
    where:  { userId: session.user.id },
    select: { title: true, subject: true, category: true, completed: true, dueDate: true },
  });

  const overdue   = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now);
  const dueSoon   = tasks.filter(t => {
    if (t.completed || !t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due > now && due < new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  });
  const completed = tasks.filter(t => t.completed);
  const active    = tasks.filter(t => !t.completed);
  const subjects  = [...new Set(tasks.map(t => t.subject).filter(Boolean))];

  const systemInstruction = `You are a warm, supportive study assistant for ${session.user.name ?? "a student"}.

Current task snapshot:
- Total tasks: ${tasks.length}
- Overdue: ${overdue.length}${overdue.length ? ` (${overdue.map(t => t.title).slice(0, 3).join(", ")}${overdue.length > 3 ? "…" : ""})` : ""}
- Due in the next 3 days: ${dueSoon.length}
- Active: ${active.length}
- Completed: ${completed.length}
- Subjects: ${subjects.length ? subjects.join(", ") : "not specified"}

How to respond:
- Keep responses to 2-3 sentences unless the user asks for more detail.
- If overdue tasks > 3 or active tasks > 10, mention burnout risk and suggest prioritising or taking a break.
- For academic topic questions, explain clearly like a knowledgeable tutor.
- Give specific, genuine affirmations — not generic praise.
- Be like a kind, smart friend. Never preachy.`;

  const contents = messages.map(m => ({
    role:  m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const googleRes = await fetch(
      `${BASE}/${MODEL}:streamGenerateContent?alt=sse&key=${API_KEY}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { maxOutputTokens: 512 },
        }),
      },
    );

    if (!googleRes.ok || !googleRes.body) {
      const errText = await googleRes.text().catch(() => "unknown");
      return NextResponse.json({ error: `Google AI error: ${errText}` }, { status: 502 });
    }

    // Transform Google's SSE → plain text stream so the client just appends chunks
    const upstream = googleRes.body.getReader();
    const enc      = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const dec    = new TextDecoder();
        let   buffer = "";

        while (true) {
          const { done, value } = await upstream.read();
          if (done) break;

          buffer += dec.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;
            try {
              const chunk = JSON.parse(jsonStr) as {
                candidates?: { content?: { parts?: { text?: string }[] } }[];
              };
              const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) controller.enqueue(enc.encode(text));
            } catch { /* skip malformed chunk */ }
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach Google AI. Check your GOOGLE_AI_API_KEY." },
      { status: 502 },
    );
  }
}
