import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sanitizeText, sanitizeOptional } from "@/lib/sanitize";

const createSchema = z.object({
  title:    z.string().min(1),
  details:  z.string().optional().nullable(),
  priority: z.number().int().min(1).max(5).optional().nullable(),
  dueDate:  z.string().datetime().optional().nullable(),
  category: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");

  const tasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { title, details, priority, dueDate, category } = parsed.data;

  const task = await prisma.task.create({
    data: {
      title:   sanitizeText(title),
      details: sanitizeOptional(details),
      priority,
      dueDate:  dueDate ? new Date(dueDate) : null,
      category: category || null,
      userId:   session.user.id,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
