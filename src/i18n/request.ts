import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, LOCALE_TAGS } from "./config";
import { formats } from "./formats";

/**
 * Per-request i18n configuration.
 *
 * Single locale for now, so there is nothing to negotiate — but the shape is
 * the same one a multi-locale app uses, so adding a `[locale]` segment later
 * only changes how `locale` is resolved here.
 */
export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;

  return {
    locale,
    // `hy-AM`, not `hy` — the region carries the currency and date patterns.
    messages: (await import(`../../messages/${locale}.json`)).default,
    formats,
    timeZone: "Asia/Yerevan",
    onError(error) {
      // A missing message is a bug we want to see, not silently swallow, but
      // it must never take the page down.
      if (process.env.NODE_ENV === "development") {
        console.error(error);
      }
    },
    getMessageFallback({ namespace, key }) {
      const path = [namespace, key].filter(Boolean).join(".");
      return process.env.NODE_ENV === "development" ? `⚠️ ${path}` : "";
    },
  };
});

export { LOCALE_TAGS };
