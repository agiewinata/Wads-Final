import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workspace = await prisma.workspace.findUnique({ where: { id } });
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (workspace.ownerId === session.user.id)
    return NextResponse.json({ error: "Owner cannot leave — delete the workspace instead" }, { status: 400 });

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId: id, userId: session.user.id } },
  });

  return NextResponse.json({ ok: true });
}
