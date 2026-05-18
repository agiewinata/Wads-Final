import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({ name: z.string().min(1).max(32) });

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.userCategory.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  const existing = await prisma.userCategory.findUnique({
    where: { name_userId: { name: parsed.data.name, userId: session.user.id } },
  });
  if (existing) return NextResponse.json({ error: "Already exists" }, { status: 409 });

  const category = await prisma.userCategory.create({
    data: { name: parsed.data.name, userId: session.user.id },
  });
  return NextResponse.json(category, { status: 201 });
}
