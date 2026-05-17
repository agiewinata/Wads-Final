"use server";

import { prisma } from "@/lib/prisma";

export async function devGetResetToken(email: string): Promise<string | null> {
  if (process.env.NODE_ENV !== "development") return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const verification = await prisma.verification.findFirst({
    where: {
      value: user.id,
      identifier: { startsWith: "reset-password:" },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verification) return null;
  return verification.identifier.replace("reset-password:", "");
}