import type { Formats } from "next-intl";

/**
 * Named formats, shared by every `t()` call and `useFormatter()`.
 *
 * Declaring them once here means a template can write
 * `{amount, number, money}` instead of repeating Intl options, and the
 * Armenian conventions live in one place.
 */
export const formats = {
  dateTime: {
    short: { day: "numeric", month: "short", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
    dayMonth: { day: "numeric", month: "long" },
    withTime: {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
    timeOnly: { hour: "numeric", minute: "2-digit" },
  },
  number: {
    /** Whole drams — Armenians do not quote luma. */
    money: {
      style: "currency",
      currency: "AMD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
    moneyCompact: {
      style: "currency",
      currency: "AMD",
      notation: "compact",
      maximumFractionDigits: 1,
    },
    percent: {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
    integer: { maximumFractionDigits: 0 },
  },
  list: {
    enumeration: { style: "long", type: "conjunction" },
  },
} satisfies Formats;
