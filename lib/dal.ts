import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const verifySession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");
  return session;
});

export const getUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  try {
    return await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  } catch {
    return null;
  }
});