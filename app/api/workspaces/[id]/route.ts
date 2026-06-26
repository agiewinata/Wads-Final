import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireMember(userId: string, workspaceId: string) {
  return prisma.workspace.findFirst({
    where: { id: workspaceId, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await requireMember(session.user.id, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        select: { id: true, role: true, joinedAt: true, user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      tasks: {
        include: {
          creator:     { select: { id: true, name: true } },
          assignees:   { include: { user: { select: { id: true, name: true } } } },
          completions: { select: { userId: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json(workspace);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workspace = await prisma.workspace.findUnique({ where: { id } });
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (workspace.ownerId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.workspace.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}