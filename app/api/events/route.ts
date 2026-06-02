import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  details: z.string().optional().nullable(),
  startDate: z.string().datetime(),
  dueDate: z.string().datetime().optional().nullable(),
  category: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const events = await prisma.event.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        startDate: "asc",
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();

  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const event = await prisma.event.create({
      data: {
        title: parsed.data.title,
        details: parsed.data.details ?? null,
        startDate: new Date(parsed.data.startDate),
        dueDate: parsed.data.dueDate
          ? new Date(parsed.data.dueDate)
          : null,
        category: parsed.data.category ?? null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(event, {
      status: 201,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}