import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const minutes = Number(body?.minutes);
  const endedAt = body?.endedAt ? new Date(body.endedAt) : new Date();

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return NextResponse.json({ error: "Invalid minutes" }, { status: 400 });
  }

  const startedAt = new Date(endedAt.getTime() - minutes * 60 * 1000);

  const studySession = await prisma.studySession.create({
    data: {
      userId: session.user.id,
      minutes: Math.round(minutes),
      mode: "focus",
      startedAt,
      endedAt,
    },
  });

  return NextResponse.json(studySession);
}