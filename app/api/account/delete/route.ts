import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveVoteCount, isTaskDone } from "@/lib/workspace-completion";

export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  await prisma.$transaction(async (tx) => {
    const affectedWorkspaceTasks = await tx.workspaceTask.findMany({
      where: {
        workspace: {
          ownerId: {
            not: userId,
          },
        },
        OR: [
          { createdBy: userId },
          { assignees: { some: { userId } } },
          { completions: { some: { userId } } },
        ],
      },
      include: {
        assignees: true,
        completions: true,
        workspace: {
          include: {
            members: true,
          },
        },
      },
    });

    for (const task of affectedWorkspaceTasks) {
      const wasAssignedToUser = task.assignees.some((a) => a.userId === userId);
      const remainingAssignees = task.assignees.filter((a) => a.userId !== userId);
      const remainingCompletions = task.completions.filter((c) => c.userId !== userId);

      const shouldDeleteTask =
        (wasAssignedToUser && remainingAssignees.length === 0) ||
        (task.createdBy === userId && task.assignees.length === 0);

      if (shouldDeleteTask) {
        await tx.workspaceTask.delete({
          where: {
            id: task.id,
          },
        });
        continue;
      }

      await tx.workspaceTaskAssignee.deleteMany({
        where: {
          taskId: task.id,
          userId,
        },
      });

      await tx.workspaceTaskCompletion.deleteMany({
        where: {
          taskId: task.id,
          userId,
        },
      });

      const updateData: {
        completed: boolean;
        createdBy?: string;
      } = {
        completed: isTaskDone(
          effectiveVoteCount(
            remainingCompletions.map((c) => c.userId),
            remainingAssignees.map((a) => a.userId)
          ),
          remainingAssignees.length
        ),
      };

      if (task.createdBy === userId) {
        const nextCreator =
          task.workspace.ownerId !== userId
            ? task.workspace.ownerId
            : remainingAssignees[0]?.userId ??
              task.workspace.members.find((m) => m.userId !== userId)?.userId;

        if (!nextCreator) {
          await tx.workspaceTask.delete({
            where: {
              id: task.id,
            },
          });
          continue;
        }

        updateData.createdBy = nextCreator;
      }

      await tx.workspaceTask.update({
        where: {
          id: task.id,
        },
        data: updateData,
      });
    }

    await tx.user.delete({
      where: {
        id: userId,
      },
    });
  });

  return NextResponse.json({ ok: true });
}