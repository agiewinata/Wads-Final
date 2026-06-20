import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const taskInclude = {
  workspace: { select: { id: true, name: true } },
  assignees:  { include: { user: { select: { id: true, name: true } } } },
  creator:    { select: { id: true, name: true } },
};

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const tasks = await prisma.workspaceTask.findMany({
    where: {
      OR: [
        // Original leader (workspace creator) sees all tasks
        { workspace: { ownerId: userId } },
        // Promoted leaders also see all tasks
        { workspace: { members: { some: { userId, role: "leader" } } } },
        // Regular members see only tasks assigned to them
        {
          workspace: { members: { some: { userId, role: "member" } } },
          assignees: { some: { userId } },
        },
      ],
    },
    include: taskInclude,
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(tasks);
}
