import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 constructs the client with a driver adapter. `@prisma/adapter-pg`
 * wraps `node-postgres`, which lets us point at a pooled connection string
 * (PgBouncer / Neon / Supabase pooler). Direct connections exhaust the
 * Postgres pool the moment serverless functions scale out.
 */
function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Serverless instances are short-lived; keep the per-instance pool small.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  // Hot reload in dev otherwise creates a new pool on every file change.
  globalForPrisma.prisma = prisma;
}
