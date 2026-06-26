import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveVoteCount, isTaskDone } from "@/lib/workspace-completion";

async function requireMember(userId: string, workspaceId: string) {
  return prisma.workspace.findFirst({
    where: { id: workspaceId, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
  });
}

const taskInclude = {
  creator:     { select: { id: true, name: true } },
  assignees:   { include: { user: { select: { id: true, name: true } } } },
  completions: { select: { userId: true } },
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, taskId } = await params;
    const access = await requireMember(session.user.id, id);
    if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    // Replace assignees atomically if provided
    if (Array.isArray(body.assignees)) {
      await prisma.workspaceTaskAssignee.deleteMany({ where: { taskId } });
      if (body.assignees.length > 0) {
        await prisma.workspaceTaskAssignee.createMany({
          data: (body.assignees as string[]).map((userId) => ({ taskId, userId })),
          skipDuplicates: true,
        });
      }
    }

    // Update scalar fields
    await prisma.workspaceTask.update({
      where: { id: taskId },
      data: {
        ...(body.title    !== undefined && { title: body.title.trim() }),
        ...(body.details  !== undefined && { details: body.details?.trim() || null }),
        ...(body.priority !== undefined && { priority: body.priority ? Number(body.priority) : null }),
        ...(body.dueDate  !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      },
    });

    // Re-derive done status (assignee set may have changed, shifting the majority threshold)
    const fresh = await prisma.workspaceTask.findUnique({
      where: { id: taskId },
      include: { assignees: true, completions: true },
    });
    const assigneeIds = fresh?.assignees.map((a) => a.userId) ?? [];
    const votes = effectiveVoteCount(fresh?.completions.map((c) => c.userId) ?? [], assigneeIds);
    const done = isTaskDone(votes, assigneeIds.length);

    const task = await prisma.workspaceTask.update({
      where: { id: taskId },
      data: { completed: done },
      include: taskInclude,
    });

    return NextResponse.json(task);
  } catch (err) {
    console.error("PATCH workspace task error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, taskId } = await params;
    const workspace = await requireMember(session.user.id, id);
    if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const task = await prisma.workspaceTask.findUnique({ where: { id: taskId } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (task.createdBy !== session.user.id && workspace.ownerId !== session.user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.workspaceTask.delete({ where: { id: taskId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE workspace task error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}