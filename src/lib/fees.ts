/**
 * THE single source of truth for money math.
 *
 * Every amount here — and in the database — is an integer number of MINOR
 * units: luma for AMD, cents for USD. Never floats. Display conversion (and
 * the fact that Armenians quote whole drams) lives in `src/lib/currency.ts`.
 *
 * NO PAYMENT PROVIDER IS WIRED UP. Nothing here moves money; these functions
 * exist so the fee shown on the donation-terms page, the creator dashboard and
 * the seeded donation records are all computed the same way.
 *
 * When a processor is added it introduces a SECOND, separate fee (typically a
 * percentage plus a flat amount per transaction) and a decision about who
 * absorbs it. That belongs here, next to `platformFeeMinor`, and nowhere else.
 */

/** Our cut of every donation, in percent. Overridable via env. */
export const PLATFORM_FEE_PERCENT = clampPercent(
  Number(process.env.PLATFORM_FEE_PERCENT ?? 5),
);

/**
 * Smallest donation we accept, in minor units: 100 ֏.
 *
 * Below this the platform fee rounds to a couple of luma and the record costs
 * more to store than it is worth.
 */
export const ABSOLUTE_MIN_AMOUNT_MINOR = 100_00;

/**
 * Guardrail so a fat-fingered custom amount cannot create a 99 999 999 ֏
 * donation: 10 000 000 ֏.
 */
export const MAX_AMOUNT_MINOR = 10_000_000_00;

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 5;
  return Math.min(value, 100);
}

/**
 * Our platform fee for a donation.
 *
 * `Math.round` — truncating loses us value on most transactions, and rounding
 * half-up matches the arithmetic a creator would do by hand.
 */
export function platformFeeMinor(amountMinor: number): number {
  assertWholeMinor(amountMinor);
  return Math.round((amountMinor * PLATFORM_FEE_PERCENT) / 100);
}

export interface FeeBreakdown {
  /** What the donor gives. */
  grossMinor: number;
  /** Our cut. */
  platformFeeMinor: number;
  /** What the creator is owed. */
  netToCreatorMinor: number;
}

/**
 * Full split for a donation. Use this everywhere a breakdown is displayed so
 * the donation-terms page, the dashboard and the donation history can never
 * drift apart.
 */
export function feeBreakdown(amountMinor: number): FeeBreakdown {
  const fee = platformFeeMinor(amountMinor);
  return {
    grossMinor: amountMinor,
    platformFeeMinor: fee,
    netToCreatorMinor: amountMinor - fee,
  };
}

function assertWholeMinor(amountMinor: number): void {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error(
      `Amounts must be non-negative integer minor units, received: ${amountMinor}`,
    );
  }
}
