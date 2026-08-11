"use client";

import { useEffect } from "react";

/**
 * Fire-and-forget pageview beacon. Mounted once per page load on the public
 * donation page and the embed — never on dashboard routes, which are already
 * attributable to a signed-in user and do not need anonymous view counting.
 *
 * Plain `fetch`, not `navigator.sendBeacon`: this is a same-origin JSON POST
 * that does not need to survive page unload (a donor navigating away from a
 * donation page mid-load is not a pageview we need to guarantee delivery
 * for), and `fetch` lets the request carry a JSON body without the
 * Blob/ArrayBuffer ceremony `sendBeacon` would need for one.
 */
export function TrackBeacon({
  pageId,
  source,
}: {
  pageId: string;
  source: "DIRECT" | "EMBED" | "REFERRAL";
}) {
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pageId,
        source,
        referrer: document.referrer || undefined,
      }),
      keepalive: true,
    }).catch(() => {
      // A dropped beacon is not an error worth surfacing to the donor.
    });
    // Intentionally once per mount, not per navigation within the SPA — a
    // donation page is always a fresh document load (no client-side route
    // ever lands here from elsewhere in the app).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
