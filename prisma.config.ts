import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 keeps connection URLs out of `schema.prisma`.
 *
 * `DATABASE_URL` is the pooled connection used at runtime (PgBouncer / Neon /
 * Supabase pooler). Migrations need a direct, non-pooled connection, so they
 * prefer `DIRECT_URL` when it is set.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
