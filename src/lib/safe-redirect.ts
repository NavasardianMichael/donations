/**
 * Only ever return a path on this origin.
 *
 * Resolves against a dummy origin so `//evil.example`, `/\evil.example` and
 * other prefix tricks cannot become an open redirect. Query and hash are
 * kept; credentials are not.
 */
export function safeRedirect(
  callbackUrl?: string,
  fallback = "/dashboard",
): string {
  if (!callbackUrl) return fallback;
  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return fallback;
  }

  try {
    const origin = "https://nvirir.invalid";
    const resolved = new URL(callbackUrl, origin);
    if (resolved.origin !== origin) return fallback;
    if (resolved.username || resolved.password) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
