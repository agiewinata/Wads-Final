import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: workspaceId, memberId } = await params;
    const userId = session.user.id;

    // Only the original owner OR a promoted leader can promote
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const callerIsLeader =
      workspace.ownerId === userId ||
      (await prisma.workspaceMember.findFirst({
        where: { workspaceId, userId, role: "leader" },
      })) !== null;

    if (!callerIsLeader) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Target must be a member of this workspace
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: memberId } },
    });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const updated = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: memberId } },
      data: { role: "leader" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Promote member error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
