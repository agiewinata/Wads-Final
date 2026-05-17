import { defineConfig } from "@prisma/config";
import { config } from "dotenv";

config(); // explicitly load .env before Prisma reads DATABASE_URL

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
