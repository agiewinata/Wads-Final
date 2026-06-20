import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const taskInclude = {
  creator:  { select: { id: true, name: true } },
  assignees: { include: { user: { select: { id: true, name: true } } } },
} as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await prisma.workspace.findFirst({
    where: {
      id,
      OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }],
    },
  });
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title, details, priority, dueDate, assignees } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const task = await prisma.workspaceTask.create({
    data: {
      title: title.trim(),
      details: details?.trim() || null,
      priority: priority ? Number(priority) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      workspaceId: id,
      createdBy: session.user.id,
      assignees: Array.isArray(assignees) && assignees.length > 0
        ? { create: assignees.map((userId: string) => ({ userId })) }
        : undefined,
    },
    include: taskInclude,
  });

  return NextResponse.json(task, { status: 201 });
}
