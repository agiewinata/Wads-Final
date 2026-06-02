import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  details: z.string().optional().nullable(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  category: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const existing = await prisma.event.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  const body = await req.json();

  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { startDate, dueDate, ...rest } = parsed.data;

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...rest,
      ...(startDate
        ? { startDate: new Date(startDate) }
        : {}),
      ...(dueDate !== undefined
        ? {
            dueDate: dueDate
              ? new Date(dueDate)
              : null,
          }
        : {}),
    },
  });

  return NextResponse.json(event);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const existing = await prisma.event.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  await prisma.event.delete({
    where: { id },
  });

  return new NextResponse(null, {
    status: 204,
  });
}