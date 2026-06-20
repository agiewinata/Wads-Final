import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code?.trim()) return NextResponse.json({ error: "Invite code required" }, { status: 400 });

  const workspace = await prisma.workspace.findUnique({
    where: { inviteCode: code.trim() },
  });
  if (!workspace) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });

  if (workspace.ownerId === session.user.id)
    return NextResponse.json({ error: "You own this workspace" }, { status: 400 });

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id } },
  });
  if (existing) return NextResponse.json({ error: "Already a member" }, { status: 400 });

  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: session.user.id },
  });

  return NextResponse.json({ workspaceId: workspace.id });
}
