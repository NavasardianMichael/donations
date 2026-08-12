import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

import { countryFromHeaders, referrerDomain, visitorHash } from "@/lib/analytics";
import { absoluteUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { trackViewSchema } from "@/lib/validations/donation";

/**
 * First-party pageview beacon. Fired once per page load from the public
 * donation page and the embed — see `TrackBeacon`.
 *
 * Always answers 204, whether or not anything was actually recorded. A
 * tracking endpoint that returns a different status for "unknown page id"
 * vs "recorded" is a timing/response oracle for enumerating page ids; a
 * script blocker or ad blocker dropping the request is also indistinguishable
 * from a rate limit from the caller's side, and none of those are the
 * caller's problem to know about.
 */
export async function POST(request: NextRequest) {
  const ip = await clientIp();

  const limit = await rateLimit("track", ip);
  if (!limit.success) return new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const parsed = trackViewSchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  const { pageId, source, referrer } = parsed.data;

  // Only ever count a real, currently-published page — a beacon firing
  // against a draft, deleted, or nonexistent id is either a stale tab or a
  // probe, either way not a view worth keeping.
  const page = await prisma.donationPage.findFirst({
    where: { id: pageId, status: "PUBLISHED", deletedAt: null },
    select: { id: true },
  });
  if (!page) return new NextResponse(null, { status: 204 });

  const userAgent = request.headers.get("user-agent") ?? "";

  await prisma.pageView.create({
    data: {
      pageId: page.id,
      visitorHash: visitorHash(ip, userAgent),
      referrer: referrerDomain(referrer, new URL(absoluteUrl("/")).origin),
      country: countryFromHeaders(request.headers),
      source,
    },
  });

  return new NextResponse(null, { status: 204 });
}
