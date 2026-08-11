/**
 * THE single source of truth for money math.
 *
 * Every amount in this file — and in the database — is an integer number of
 * minor units (cents). Never floats. Format only at the render boundary with
 * `formatCurrency()`.
 *
 * NO PAYMENT PROVIDER IS WIRED UP. Nothing here moves money; these functions
 * exist so the fee shown on the donation-terms page, the creator dashboard and
 * the seeded donation records are all computed the same way.
 *
 * When a processor is added it introduces a SECOND, separate fee (typically a
 * percentage plus a flat amount per transaction) and a decision about who
 * absorbs it. That belongs here, next to `platformFeeCents`, and nowhere else.
 */

/** Our cut of every donation, in percent. Overridable via env. */
export const PLATFORM_FEE_PERCENT = clampPercent(
  Number(process.env.PLATFORM_FEE_PERCENT ?? 5),
);

/**
 * Smallest donation we accept. Card networks make sub-dollar charges
 * uneconomic, so this stays at $1.00 even without a processor attached.
 */
export const ABSOLUTE_MIN_AMOUNT_CENTS = 100;

/** Guardrail so a fat-fingered custom amount cannot create a $9,999,999 charge. */
export const MAX_AMOUNT_CENTS = 1_000_000; // $10,000.00

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 5;
  return Math.min(value, 100);
}

/**
 * Our platform fee for a donation.
 *
 * `Math.round` — truncating loses us a cent on most transactions, and rounding
 * half-up matches the invoice a creator would compute by hand.
 */
export function platformFeeCents(amountCents: number): number {
  assertWholeCents(amountCents);
  return Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100);
}

export interface FeeBreakdown {
  /** What the donor gives. */
  grossCents: number;
  /** Our cut. */
  platformFeeCents: number;
  /** What the creator is owed. */
  netToCreatorCents: number;
}

/**
 * Full split for a donation. Use this everywhere a breakdown is displayed so
 * the donation-terms page, the dashboard and the donation history can never
 * drift apart.
 */
export function feeBreakdown(amountCents: number): FeeBreakdown {
  const fee = platformFeeCents(amountCents);
  return {
    grossCents: amountCents,
    platformFeeCents: fee,
    netToCreatorCents: amountCents - fee,
  };
}

function assertWholeCents(amountCents: number): void {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error(
      `Amounts must be non-negative integer cents, received: ${amountCents}`,
    );
  }
}
