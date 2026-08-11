import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/prisma";

/**
 * Single-use tokens for email verification and password reset.
 *
 * The raw token only ever exists in the email. What we store is its SHA-256
 * digest, so a database leak does not hand an attacker a working reset link.
 * Lookup is by digest, which is also why the column can stay indexed.
 *
 * SHA-256 without a work factor is correct here (unlike for passwords): the
 * token is 256 bits of CSPRNG output, so there is nothing to brute-force.
 */

const TOKEN_BYTES = 32;

export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(TOKEN_BYTES).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Constant-time compare for two hex digests of equal length. */
export function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

// ---------------------------------------------------------------------------
// Email verification — stored in Auth.js's VerificationToken table
// ---------------------------------------------------------------------------

export async function createVerificationToken(email: string): Promise<string> {
  const { raw, hash } = generateToken();

  // One live token per address: issuing a new link invalidates the old one.
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hash,
      expires: new Date(Date.now() + VERIFICATION_TTL_MS),
    },
  });

  return raw;
}

export type VerificationResult =
  { ok: true; email: string } | { ok: false; reason: "invalid" | "expired" };

export async function consumeVerificationToken(
  raw: string,
): Promise<VerificationResult> {
  const hash = hashToken(raw);

  const record = await prisma.verificationToken.findFirst({
    where: { token: hash },
  });

  if (!record) return { ok: false, reason: "invalid" };

  // Burn it regardless of expiry so a stale link cannot be replayed.
  await prisma.verificationToken.deleteMany({
    where: { identifier: record.identifier, token: record.token },
  });

  if (record.expires.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, email: record.identifier };
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function createPasswordResetToken(
  userId: string,
): Promise<string> {
  const { raw, hash } = generateToken();

  // Invalidate any outstanding links for this user.
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hash,
      expires: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  return raw;
}

export type PasswordResetLookup =
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/** Validate without consuming — used to decide whether to render the form. */
export async function lookupPasswordResetToken(
  raw: string,
): Promise<PasswordResetLookup> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });

  if (!record) return { ok: false, reason: "invalid" };
  if (record.usedAt) return { ok: false, reason: "used" };
  if (record.expires.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, userId: record.userId, tokenId: record.id };
}

/**
 * Mark the token used. Conditional on `usedAt: null` so two concurrent
 * submissions cannot both succeed — the second updates zero rows.
 */
export async function consumePasswordResetToken(
  tokenId: string,
): Promise<boolean> {
  const result = await prisma.passwordResetToken.updateMany({
    where: { id: tokenId, usedAt: null },
    data: { usedAt: new Date() },
  });
  return result.count === 1;
}
