import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveVoteCount, isTaskDone } from "@/lib/workspace-completion";

async function getTaskAccess(userId: string, workspaceId: string, taskId: string) {
  const task = await prisma.workspaceTask.findFirst({
    where: {
      id: taskId,
      workspaceId,
      workspace: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    },
    include: {
      workspace: {
        include: {
          members: true,
        },
      },
      assignees: true,
    },
  });

  if (!task) return null;

  const isLeader =
    task.workspace.ownerId === userId ||
    task.workspace.members.some((m) => m.userId === userId && m.role === "leader");

  const isAssigned = task.assignees.some((a) => a.userId === userId);

  return {
    task,
    isLeader,
    isAssigned,
    canEdit: isLeader || isAssigned,
    canDelete: isLeader,
  };
}

const taskInclude = {
  creator: { select: { id: true, name: true } },
  assignees: { include: { user: { select: { id: true, name: true } } } },
  completions: { select: { userId: true } },
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, taskId } = await params;

    const access = await getTaskAccess(session.user.id, id, taskId);
    if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!access.canEdit) {
      return NextResponse.json({ error: "Only leaders or assignees can edit this task" }, { status: 403 });
    }

    const body = await req.json();

    if (Array.isArray(body.assignees)) {
      await prisma.workspaceTaskAssignee.deleteMany({ where: { taskId } });

      if (body.assignees.length > 0) {
        await prisma.workspaceTaskAssignee.createMany({
          data: (body.assignees as string[]).map((userId) => ({ taskId, userId })),
          skipDuplicates: true,
        });
      }
    }

    await prisma.workspaceTask.update({
      where: { id: taskId },
      data: {
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.details !== undefined && { details: body.details?.trim() || null }),
        ...(body.priority !== undefined && { priority: body.priority ? Number(body.priority) : null }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      },
    });

    const fresh = await prisma.workspaceTask.findUnique({
      where: { id: taskId },
      include: { assignees: true, completions: true },
    });

    const assigneeIds = fresh?.assignees.map((a) => a.userId) ?? [];
    const votes = effectiveVoteCount(
      fresh?.completions.map((c) => c.userId) ?? [],
      assigneeIds
    );
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, taskId } = await params;

    const access = await getTaskAccess(session.user.id, id, taskId);
    if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!access.canDelete) {
      return NextResponse.json({ error: "Only leaders can delete workspace tasks" }, { status: 403 });
    }

    await prisma.workspaceTask.delete({ where: { id: taskId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE workspace task error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}