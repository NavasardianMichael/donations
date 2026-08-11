/**
 * Currency handling.
 *
 * STORAGE: every amount in the database is an integer number of MINOR units.
 * For AMD that is luma (1/100 dram), for USD it is cents. Never floats.
 *
 * DISPLAY: Armenians quote whole drams — nobody writes "5 000,00 ֏" — so AMD
 * renders with zero fraction digits even though ISO 4217 gives it an exponent
 * of 2. We keep the two-decimal storage anyway, because payment processors
 * expect minor units and switching later would mean migrating every row.
 *
 * The gap between those two facts is the reason this file exists: one place
 * that knows how many minor units a currency has, and how many digits to show.
 */

export const DEFAULT_LOCALE = "hy-AM";
export const DEFAULT_CURRENCY = "amd";

interface CurrencyMeta {
  code: string;
  /** Minor units per major unit. 100 for both AMD and USD. */
  minorPerMajor: number;
  /** Fraction digits to DISPLAY. Zero for AMD by convention. */
  displayDigits: number;
  /** Armenian name, for currency pickers. */
  label: string;
  symbol: string;
}

export const CURRENCIES = {
  amd: {
    code: "AMD",
    minorPerMajor: 100,
    displayDigits: 0,
    label: "Հայկական դրամ",
    symbol: "֏",
  },
  usd: {
    code: "USD",
    minorPerMajor: 100,
    displayDigits: 2,
    label: "ԱՄՆ դոլար",
    symbol: "$",
  },
  eur: {
    code: "EUR",
    minorPerMajor: 100,
    displayDigits: 2,
    label: "Եվրո",
    symbol: "€",
  },
} as const satisfies Record<string, CurrencyMeta>;

export type CurrencyCode = keyof typeof CURRENCIES;

export function currencyMeta(currency: string): CurrencyMeta {
  return CURRENCIES[currency.toLowerCase() as CurrencyCode] ?? CURRENCIES.amd;
}

/**
 * Format integer minor units for display.
 *
 * 500_000 minor units of AMD renders as "5 000 ֏".
 */
export function formatMoney(
  amountMinor: number,
  currency: string = DEFAULT_CURRENCY,
  options: Intl.NumberFormatOptions = {},
): string {
  const meta = currencyMeta(currency);

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: meta.code,
    minimumFractionDigits: meta.displayDigits,
    maximumFractionDigits: meta.displayDigits,
    ...options,
  }).format(amountMinor / meta.minorPerMajor);
}

/** "1,3 մլն ֏" — for dense tiles where the full number will not fit. */
export function formatMoneyCompact(
  amountMinor: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const meta = currencyMeta(currency);

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: meta.code,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amountMinor / meta.minorPerMajor);
}

/** Bare number, no symbol. For inputs that render their own currency affix. */
export function formatMoneyPlain(
  amountMinor: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const meta = currencyMeta(currency);

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: meta.displayDigits,
    maximumFractionDigits: meta.displayDigits,
  }).format(amountMinor / meta.minorPerMajor);
}

/**
 * Parse a user-typed amount into integer minor units.
 *
 * Accepts both separators, because an Armenian keyboard layout produces "," as
 * the decimal mark but people paste "." all the time. Space and non-breaking
 * space are stripped since that is how hy-AM groups thousands.
 * Returns null for anything that is not a clean money value.
 */
export function parseMoneyToMinor(
  input: string,
  currency: string = DEFAULT_CURRENCY,
): number | null {
  const meta = currencyMeta(currency);

  const cleaned = input
    .trim()
    .replace(/[\s  ֏$€]/g, "")
    .replace(",", ".");

  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;

  // Whole drams only — a "5 000,50 ֏" donation is not a thing.
  if (meta.displayDigits === 0 && !Number.isInteger(value)) return null;

  return Math.round(value * meta.minorPerMajor);
}

/** Convert major units (what a human types) to minor units (what we store). */
export function toMinor(
  major: number,
  currency: string = DEFAULT_CURRENCY,
): number {
  return Math.round(major * currencyMeta(currency).minorPerMajor);
}

/** Convert minor units back to major, for prefilling an input. */
export function toMajor(
  amountMinor: number,
  currency: string = DEFAULT_CURRENCY,
): number {
  return amountMinor / currencyMeta(currency).minorPerMajor;
}
