import "server-only";

import { compare, hash } from "bcryptjs";

/**
 * Cost factor. 12 is ~250ms on current hardware — slow enough to make offline
 * cracking expensive, fast enough that a login does not feel stalled.
 */
const BCRYPT_ROUNDS = 12;

export function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, BCRYPT_ROUNDS);
}

export function verifyPassword(
  plaintext: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(plaintext, passwordHash);
}

/**
 * A real bcrypt hash of a throwaway value, computed once on first use.
 *
 * It has to be a genuine hash at the same cost factor — comparing against a
 * malformed string returns immediately and would defeat the whole point.
 */
let decoyHash: Promise<string> | null = null;

/**
 * Burn the same wall-clock time as a real verification.
 *
 * Called when the email does not exist, or exists but is OAuth-only. Without
 * it, a fast rejection tells an attacker which addresses are registered.
 */
export async function fakeVerifyPassword(plaintext: string): Promise<void> {
  decoyHash ??= hash("password-that-is-never-a-real-credential", BCRYPT_ROUNDS);
  await compare(plaintext, await decoyHash);
}
