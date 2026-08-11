/**
 * Brand identity, in ONE place.
 *
 * The name appears in the wordmark, page titles, metadata, emails, the footer
 * and the legal copy. Nothing hard-codes it — change these values and the
 * whole app follows.
 *
 * `latinName` exists because a few contexts cannot carry Armenian script
 * safely: the email `From` display name (some clients mangle non-ASCII in
 * headers), and technical identifiers such as the embed CSS class prefix.
 */
export const BRAND = {
  /** Displayed everywhere in the UI. */
  name: "Նվիրիր",

  /** ASCII fallback for headers, identifiers and URLs. */
  latinName: "Nvirir",

  /** Public origin, shown in copy and the embed snippet. */
  domain: "nvirir.am",

  /** One-line positioning statement, under the wordmark. */
  tagline: "Աջակցությունը՝ ուղիղ ձեր նպատակին",

  /** Prefix for embed markup, so third-party pages get a stable namespace. */
  cssPrefix: "nvirir",
} as const;

/** "© 2026 Նվիրիր" */
export function copyrightLine(year = new Date().getFullYear()): string {
  return `© ${year} ${BRAND.name}`;
}
