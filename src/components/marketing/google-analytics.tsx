"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { usePathname } from "next/navigation";

/**
 * GA4 for the whole app except embeds — third-party sites should not inherit
 * our measurement ID when they iframe a donation widget.
 */
export function AppGoogleAnalytics({ gaId }: { gaId: string }) {
  const pathname = usePathname();

  if (!gaId || pathname?.startsWith("/embed")) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
