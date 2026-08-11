import type messages from "../../messages/hy.json";
import type { AppLocale } from "@/i18n/config";
import type { formats } from "@/i18n/formats";

/**
 * Type-safe translations.
 *
 * `t("auth.login.submit")` autocompletes and a typo is a compile error, so a
 * renamed key cannot silently fall back to an empty string at runtime.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
    Formats: typeof formats;
  }
}
