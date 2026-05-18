import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }; // set the golabal this is a prismaclient

export const prisma = globalForPrisma.prisma || createPrismaClient(); //will call createPrismaClient() is globalforprisma is empty

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma; // the line above would only be executed durig production
