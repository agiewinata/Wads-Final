import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveVoteCount, isTaskDone } from "@/lib/workspace-completion";

const taskInclude = {
  creator:     { select: { id: true, name: true } },
  assignees:   { include: { user: { select: { id: true, name: true } } } },
  completions: { select: { userId: true } },
};

async function requireMember(userId: string, workspaceId: string) {
  return prisma.workspace.findFirst({
    where: { id: workspaceId, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
  });
}

// Toggle the current user's "done" vote on a shared task.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, taskId } = await params;
    const access = await requireMember(session.user.id, id);
    if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const task = await prisma.workspaceTask.findUnique({
      where: { id: taskId },
      include: { assignees: true, completions: true },
    });
    if (!task || task.workspaceId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const assigneeIds = task.assignees.map((a) => a.userId);
    const canVote = assigneeIds.length === 0 || assigneeIds.includes(session.user.id);
    if (!canVote) return NextResponse.json({ error: "Only assignees can mark this task done" }, { status: 403 });

    const alreadyVoted = task.completions.some((c) => c.userId === session.user.id);
    if (alreadyVoted) {
      await prisma.workspaceTaskCompletion.delete({
        where: { taskId_userId: { taskId, userId: session.user.id } },
      });
    } else {
      await prisma.workspaceTaskCompletion.create({ data: { taskId, userId: session.user.id } });
    }

    const completions = await prisma.workspaceTaskCompletion.findMany({ where: { taskId }, select: { userId: true } });
    const votes = effectiveVoteCount(completions.map((c) => c.userId), assigneeIds);
    const done = isTaskDone(votes, assigneeIds.length);

    const updated = await prisma.workspaceTask.update({
      where: { id: taskId },
      data: { completed: done },
      include: taskInclude,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("POST workspace task completion error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}