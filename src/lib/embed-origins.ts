/**
 * Origins that may frame `/embed/[slug]`.
 *
 * This is CSP `frame-ancestors`, not CORS — the browser consults the embedded
 * document's response headers before painting the iframe. A miss shows up in
 * the host page's console as a frame-ancestors violation, which is the
 * intended signal.
 */

const ORIGIN_RE = /^https?:\/\/[^\s/]+$/i;

/** Turn a typed host or URL into a canonical origin, or `null` if unusable. */
export function parseOrigin(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.hostname === "") return null;
    // `new URL` accepts `https://example.com/path`; framing is origin-scoped.
    if (!ORIGIN_RE.test(url.origin)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function frameAncestorsValue(options: {
  embedEnabled: boolean;
  allowAnyOrigin: boolean;
  origins: string[];
}): string {
  if (!options.embedEnabled) return "'none'";
  if (options.allowAnyOrigin) return "*";

  const unique = [
    ...new Set(options.origins.map(parseOrigin).filter((o): o is string => o !== null)),
  ];
  // `'self'` keeps the dashboard preview working when the allowlist is empty
  // or the creator only listed third-party hosts.
  return ["'self'", ...unique].join(" ");
}
