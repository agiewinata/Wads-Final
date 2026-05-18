import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/categories/[id]">
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const cat = await prisma.userCategory.findUnique({ where: { id } });
  if (!cat || cat.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Clear category from tasks that used this category name
  await prisma.task.updateMany({
    where: { userId: session.user.id, category: cat.name },
    data: { category: null },
  });

  await prisma.userCategory.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
