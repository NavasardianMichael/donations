/**
 * THE single source of truth for money math.
 *
 * Every amount here — and in the database — is an integer number of MINOR
 * units: luma for AMD, cents for USD. Never floats. Display conversion (and
 * the fact that Armenians quote whole drams) lives in `src/lib/currency.ts`.
 *
 * Two providers move money: ArCa in AMD and Paddle in USD. The platform fee
 * below is a percentage, so it is currency-agnostic and correct for both. The
 * PROCESSOR's own fee is a second, separate concept — Paddle deducts its cut
 * before payout and reports it per transaction, so it is not knowable at
 * checkout time. When it is recorded, it belongs here next to
 * `platformFeeMinor`, and nowhere else.
 *
 * The bounds are NOT currency-agnostic, which is the subtle part: 100_00 minor
 * units means 100 ֏, but the same integer read as USD cents means $100. Use
 * `amountBounds()` rather than the AMD constants whenever the currency is not
 * statically known.
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

export interface AmountBounds {
  minMinor: number;
  maxMinor: number;
}

/**
 * The same guardrails as above, expressed for whichever currency is actually
 * being charged.
 *
 * AMD keeps the constants it always had. USD and EUR get their own floor and
 * ceiling: $1 is a reasonable smallest international donation, and reusing the
 * AMD floor would reject everything under $100. Anything unrecognised falls
 * back to AMD, matching `currencyMeta()`.
 */
const BOUNDS_BY_CURRENCY: Record<string, AmountBounds> = {
  amd: { minMinor: ABSOLUTE_MIN_AMOUNT_MINOR, maxMinor: MAX_AMOUNT_MINOR },
  // $1 … $25 000
  usd: { minMinor: 1_00, maxMinor: 25_000_00 },
  // €1 … €25 000
  eur: { minMinor: 1_00, maxMinor: 25_000_00 },
};

export function amountBounds(currency: string): AmountBounds {
  return BOUNDS_BY_CURRENCY[currency.toLowerCase()] ?? BOUNDS_BY_CURRENCY.amd!;
}

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
