import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

/**
 * Rate limiting for public endpoints — login, signup, password reset, the
 * contact form, and the analytics beacon.
 *
 * When Upstash credentials are present we use Redis, which is the only correct
 * option once more than one serverless instance is running. Otherwise we fall
 * back to a per-process in-memory counter, which is fine for local development
 * and useless in production (each instance keeps its own tally).
 */

export type RateLimitName =
  | "login"
  | "signup"
  | "passwordReset"
  | "contact"
  | "track"
  | "slugCheck"
  | "checkout";

interface Rule {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

const RULES: Record<RateLimitName, Rule> = {
  // Tight: these are the credential-stuffing surfaces.
  login: { limit: 8, windowSeconds: 60 },
  signup: { limit: 5, windowSeconds: 600 },
  passwordReset: { limit: 4, windowSeconds: 900 },
  contact: { limit: 3, windowSeconds: 600 },
  // Loose: one legitimate visitor can trip a tight limit here.
  track: { limit: 60, windowSeconds: 60 },
  slugCheck: { limit: 40, windowSeconds: 60 },
  // A real donor never needs more than a couple of attempts; this mainly
  // stops a script from mass-registering orders at the gateway.
  checkout: { limit: 6, windowSeconds: 300 },
};

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix ms when the window resets. */
  reset: number;
}

// ---------------------------------------------------------------------------
// Upstash backend
// ---------------------------------------------------------------------------

const upstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const redis = upstashConfigured ? Redis.fromEnv() : null;
const limiters = new Map<RateLimitName, Ratelimit>();

function upstashLimiter(name: RateLimitName): Ratelimit {
  let limiter = limiters.get(name);
  if (!limiter) {
    const rule = RULES[name];
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSeconds} s`),
      prefix: `ratelimit:${name}`,
      analytics: false,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------

interface Bucket {
  count: number;
  resetAt: number;
}

const memory = new Map<string, Bucket>();

function memoryLimit(name: RateLimitName, identifier: string): RateLimitResult {
  const rule = RULES[name];
  const key = `${name}:${identifier}`;
  const now = Date.now();

  // Opportunistic sweep so a long-running dev server does not grow forever.
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
  }

  let bucket = memory.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + rule.windowSeconds * 1000 };
    memory.set(key, bucket);
  }

  bucket.count += 1;

  return {
    success: bucket.count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - bucket.count),
    reset: bucket.resetAt,
  };
}

// ---------------------------------------------------------------------------

/**
 * Consume one token. Call this BEFORE doing any real work in the handler.
 *
 * `identifier` should be the client IP for anonymous endpoints, or the user id
 * for authenticated ones. For login, prefer `ip:email` so one attacker cannot
 * lock every account behind a shared NAT.
 */
export async function rateLimit(
  name: RateLimitName,
  identifier: string,
): Promise<RateLimitResult> {
  if (!redis) return memoryLimit(name, identifier);

  const result = await upstashLimiter(name).limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Best-effort client IP.
 *
 * Trusts `x-forwarded-for` because we are behind a proxy in every deployment
 * target. On a bare origin this header is spoofable — do not use it for
 * anything but rate limiting and coarse analytics.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/** Seconds a caller should wait before retrying. */
export function retryAfterSeconds(result: RateLimitResult): number {
  return Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
}

/** True when rate limits are shared across instances. */
export const rateLimitIsDistributed = upstashConfigured;
