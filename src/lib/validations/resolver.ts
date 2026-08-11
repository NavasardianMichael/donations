/**
 * Bridging next-intl's translator to the schema factories.
 *
 * `useTranslations("validation")` and `getTranslations("validation")` both
 * return a `Translator` whose `key` parameter is a union of the literal keys
 * in that namespace. The schema factories declare `(key: string) => string`.
 *
 * Under `strictFunctionTypes` those two are contravariantly incompatible —
 * even though every key the schemas actually use exists in the catalogue. The
 * widening is real and has to happen somewhere; doing it once here, named and
 * commented, beats scattering casts across a dozen call sites.
 *
 * A key that does NOT exist is not silent: `src/i18n/request.ts` logs it in
 * development and renders "⚠️ namespace.key", so a typo shows up immediately
 * rather than rendering an empty string.
 */

export type MessageResolver = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/** Minimal shape of a next-intl translator, for the widening below. */
type NextIntlTranslator = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (key: any, values?: any): string;
};

export function resolver(t: NextIntlTranslator): MessageResolver {
  return t as MessageResolver;
}

/**
 * Discards messages entirely.
 *
 * For validation whose failures are never shown — Auth.js's `authorize()`
 * only cares whether the shape parses, and returns `null` either way, so
 * building a translator there would be pure overhead.
 */
export const silentResolver: MessageResolver = () => "";
