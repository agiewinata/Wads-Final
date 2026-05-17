import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL; // establish a connection to the database
  if (!connectionString) throw new Error("DATABASE_URL is not set"); // if no database url is found throws this error

  const adapter = new PrismaPg({ connectionString }); // calls pg.pool (node database driver for postgre) to establish a connection pool with postgre
  return new PrismaClient({ //return a prisma client object with the adapter and log
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }; // set the golabal this is a prismaclient

export const prisma = globalForPrisma.prisma || createPrismaClient(); //will call createPrismaClient() is globalforprisma is empty

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma; // the line above would only be executed durig production
