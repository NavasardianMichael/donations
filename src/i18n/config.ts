/**
 * Locale configuration.
 *
 * The app ships Armenian only, and deliberately has NO locale segment in the
 * URL — `/d/my-page`, not `/hy/d/my-page`. Keeping URLs clean matters for the
 * public donation pages, which are the SEO surface.
 *
 * To add a second language later:
 *   1. add its code to `LOCALES` and drop a `messages/<code>.json` beside hy;
 *   2. move `src/app/**` under an `app/[locale]/` segment;
 *   3. add next-intl's routing middleware to `proxy.ts`.
 *
 * Everything else — every `t()` call, every format — already works, because
 * no component has a hard-coded string in it.
 */

export const LOCALES = ["hy"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "hy";

/** BCP 47 tag used for Intl formatting. `hy` alone lacks the AM region data. */
export const LOCALE_TAGS: Record<AppLocale, string> = {
  hy: "hy-AM",
};

/** For the `lang` attribute on <html>. */
export const HTML_LANG: Record<AppLocale, string> = {
  hy: "hy",
};

/** For OpenGraph `og:locale`. */
export const OG_LOCALE: Record<AppLocale, string> = {
  hy: "hy_AM",
};

export function isAppLocale(value: string): value is AppLocale {
  return (LOCALES as readonly string[]).includes(value);
}
