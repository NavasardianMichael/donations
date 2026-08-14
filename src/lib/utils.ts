import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { DEFAULT_LOCALE } from "./currency";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Money formatting lives in `./currency` — re-exported here so the UI library,
 * which may only reach for `@/lib/utils` and `@/lib/currency`, keeps a single
 * import for the common case.
 */
export {
  CURRENCIES,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  currencyMeta,
  formatMoney,
  formatMoneyCompact,
  formatMoneyPlain,
  parseMoneyToMinor,
  toMajor,
  toMinor,
  type CurrencyCode,
} from "./currency";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE).format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Eastern Armenian → Latin, following the BGN/PCGN romanisation that Armenian
 * readers recognise in URLs.
 */
const ARMENIAN_TO_LATIN: Record<string, string> = {
  ա: "a",
  բ: "b",
  գ: "g",
  դ: "d",
  ե: "e",
  զ: "z",
  է: "e",
  ը: "y",
  թ: "t",
  ժ: "zh",
  ի: "i",
  լ: "l",
  խ: "kh",
  ծ: "ts",
  կ: "k",
  հ: "h",
  ձ: "dz",
  ղ: "gh",
  ճ: "ch",
  մ: "m",
  յ: "y",
  ն: "n",
  շ: "sh",
  ո: "o",
  չ: "ch",
  պ: "p",
  ջ: "j",
  ռ: "r",
  ս: "s",
  վ: "v",
  տ: "t",
  ր: "r",
  ց: "ts",
  ւ: "v",
  փ: "p",
  ք: "q",
  օ: "o",
  ֆ: "f",
  և: "ev",
  ու: "u",
};

function transliterateArmenian(input: string): string {
  const lower = input.toLowerCase();
  let result = "";

  for (let i = 0; i < lower.length; i++) {
    // "ու" is a digraph for /u/ and must be matched before the bare "ո".
    const pair = lower.slice(i, i + 2);
    if (ARMENIAN_TO_LATIN[pair]) {
      result += ARMENIAN_TO_LATIN[pair];
      i++;
      continue;
    }
    result += ARMENIAN_TO_LATIN[lower[i]!] ?? lower[i];
  }

  return result;
}

/**
 * URL-safe slug.
 *
 * Armenian is transliterated rather than stripped, so a page titled
 * "Մաքուր ջուր" becomes `maqur-jur` instead of an empty string. Mirrored by
 * the Zod slug schema in lib/validations.
 */
export function slugify(input: string): string {
  return transliterateArmenian(input)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** "ԱՀ" from "Անի Հակոբյան". Falls back to "?" so avatars never render empty. */
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
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, options).format(
    new Date(date),
  );
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

/** "2 ժամ առաջ". Used in the dashboard activity feeds. */
export function formatRelativeTime(date: Date | string): string {
  const target = new Date(date).getTime();
  const diffSeconds = Math.round((target - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);

  const rtf = new Intl.RelativeTimeFormat(DEFAULT_LOCALE, { numeric: "auto" });

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

/**
 * True only for http(s) URLs. Blocks `javascript:`, `data:`, credentials,
 * whitespace tricks, and anything `z.string().url()` would otherwise accept
 * into an `<img src>`.
 */
export function isSafeHttpUrl(value: string): boolean {
  if (!value || value !== value.trim() || /[\s\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.username || url.password) return false;
    if (!url.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

/** Attribute-safe HTML escape for generated snippets (not React children). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
