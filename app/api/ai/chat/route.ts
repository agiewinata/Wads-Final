import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { limits } from "@/lib/rate-limit";

const OLLAMA_BASE  = process.env.OLLAMA_BASE  ?? "https://ollama.csbihub.id";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:26b";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!limits.ai(session.user.id)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { messages, images } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    images?: string[]; // raw base64 strings (no data-URL prefix), attached to last user message
  };

  const now   = new Date();
  const tasks = await prisma.task.findMany({
    where:  { userId: session.user.id },
    select: { title: true, category: true, completed: true, dueDate: true },
  });

  const overdue   = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now);
  const dueSoon   = tasks.filter(t => {
    if (t.completed || !t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due > now && due < new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  });
  const completed = tasks.filter(t => t.completed);
  const active    = tasks.filter(t => !t.completed);

  const systemPrompt = `You are a warm, supportive study assistant for ${session.user.name ?? "a student"}.

Current task snapshot:
- Total tasks: ${tasks.length}
- Overdue: ${overdue.length}${overdue.length ? ` (${overdue.map(t => t.title).slice(0, 3).join(", ")}${overdue.length > 3 ? "…" : ""})` : ""}
- Due in the next 3 days: ${dueSoon.length}
- Active: ${active.length}
- Completed: ${completed.length}

How to respond:
- Keep responses to 2-3 sentences unless the user asks for more detail.
- If overdue tasks > 3 or active tasks > 10, mention burnout risk and suggest prioritising or taking a break.
- For academic topic questions, explain clearly like a knowledgeable tutor.
- Give specific, genuine affirmations — not generic praise.
- Be like a kind, smart friend. Never preachy.`;

  // Use a vision-capable model when images are attached
  const model = OLLAMA_MODEL;

  // Attach images to the last user message
  const ollamaMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m, i) =>
      i === messages.length - 1 && images?.length
        ? { ...m, images }
        : m
    ),
  ];

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: ollamaMessages,
        stream:   true,
      }),
    });

    if (!ollamaRes.ok || !ollamaRes.body) {
      const errText = await ollamaRes.text().catch(() => "unknown");
      return NextResponse.json({ error: `Ollama error: ${errText}` }, { status: 502 });
    }

    // Ollama streams NDJSON — each line is {"message":{"content":"..."},"done":false}
    const upstream = ollamaRes.body.getReader();
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
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const chunk = JSON.parse(trimmed) as {
                message?: { content?: string };
                done?: boolean;
              };
              const text = chunk.message?.content;
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
      { error: "Could not reach Ollama. Check that the server is running." },
      { status: 502 },
    );
  }
}
