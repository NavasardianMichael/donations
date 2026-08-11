import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Render integer minor units as currency. The ONLY place cents become a
 * human-readable string.
 */
export function formatCurrency(
  amountCents: number,
  currency = "usd",
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amountCents / 100);
}

/** Always shows cents. For receipts, tables, and anywhere precision matters. */
export function formatCurrencyExact(
  amountCents: number,
  currency = "usd",
): string {
  return formatCurrency(amountCents, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "$89.2K" — for dense dashboard tiles where the full number does not fit. */
export function formatCurrencyCompact(
  amountCents: number,
  currency = "usd",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amountCents / 100);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Parse a user-typed dollar amount into integer cents.
 * Returns null for anything that isn't a clean money value.
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (cleaned === "" || !/^\d*(\.\d{0,2})?$/.test(cleaned)) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;

  return Math.round(value * 100);
}

/** URL-safe slug. Mirrored by the Zod slug schema in lib/validations. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** "JS" from "Jane Smith". Falls back to "?" so avatars never render empty. */
export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
): string {
  return new Intl.DateTimeFormat("en-US", options).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "2 hours ago". Used in the dashboard activity feeds. */
export function formatRelativeTime(date: Date | string): string {
  const target = new Date(date).getTime();
  const diffSeconds = Math.round((target - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);

  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  if (abs < 60) return rtf.format(Math.round(diffSeconds), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 2592000) return rtf.format(Math.round(diffSeconds / 86400), "day");
  if (abs < 31536000)
    return rtf.format(Math.round(diffSeconds / 2592000), "month");
  return rtf.format(Math.round(diffSeconds / 31536000), "year");
}

/** Clamp to [0, 1]. Progress bars must never overflow their track. */
export function progressRatio(current: number, goal: number | null): number {
  if (!goal || goal <= 0) return 0;
  return Math.min(Math.max(current / goal, 0), 1);
}

/** Midnight UTC for the given date — the key used by PageDailyStat. */
export function startOfUtcDay(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
