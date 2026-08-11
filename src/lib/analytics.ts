import "server-only";

import { createHash } from "node:crypto";

/**
 * First-party visitor identifier — hash(ip + user agent + a salt that
 * rotates daily). No raw IP, no cookie, no cross-day linkability.
 *
 * Rotating the salt daily is what keeps a visitor hash from becoming a
 * de-anonymizing tracker over time: the same person visiting on two different
 * days gets two unrelated hashes, but visits on the SAME day still collapse
 * to one hash, which is what lets us count unique visitors per day at all.
 *
 * `ANALYTICS_SALT` is the base secret; mixing in the UTC date is what makes
 * the rotation automatic — no cron job has to remember to change anything.
 */
export function visitorHash(ip: string, userAgent: string, date = new Date()): string {
  const salt = process.env.ANALYTICS_SALT ?? "dev-analytics-salt";
  const day = date.toISOString().slice(0, 10); // YYYY-MM-DD, UTC

  return createHash("sha256")
    .update(`${salt}:${day}:${ip}:${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Best-effort two-letter country code from the edge network's own geo header
 * — never a third-party GeoIP lookup, which would add latency and cost to
 * every single pageview for a feature that is display-only. Absent on
 * self-hosted deployments, which is fine: the field is nullable and the
 * dashboard treats "no data" as its own bucket.
 */
export function countryFromHeaders(headers: Headers): string | null {
  return (
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    null
  );
}

/**
 * Buckets a referrer URL down to its registrable domain, for the "Referrers"
 * table. Traffic from our own origin is DIRECT, not a referrer worth listing.
 */
export function referrerDomain(
  referrer: string | null | undefined,
  ownOrigin: string,
): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (url.origin === ownOrigin) return null;
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
