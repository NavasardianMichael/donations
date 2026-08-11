import { z } from "zod";

/**
 * Server-side environment. Parsed lazily so that importing this module from a
 * client bundle (which would only ever touch `clientEnv`) never throws.
 */
const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),

  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // No payment provider is configured. When one is added, its keys are
  // declared here and validated at boot like everything else.

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("GiveDirect <noreply@example.com>"),
  CONTACT_EMAIL_TO: z.string().optional(),

  PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100).default(5),

  CRON_SECRET: z.string().optional(),
  ANALYTICS_SALT: z.string().default("dev-analytics-salt"),

  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables:\n${issues}\n\nCopy .env.example to .env and fill it in.`,
    );
  }

  cached = parsed.data;
  return cached;
}

/**
 * Public values. `process.env.NEXT_PUBLIC_*` must be referenced statically so
 * the bundler can inline it — never build the key by concatenation.
 */
export const clientEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  gaId: process.env.NEXT_PUBLIC_GA_ID ?? "",
} as const;

/** Absolute URL helper. Always use this instead of hand-built strings. */
export function absoluteUrl(path = "/"): string {
  const base = clientEnv.appUrl.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
