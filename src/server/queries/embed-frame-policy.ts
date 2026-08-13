import "server-only";

import { frameAncestorsValue } from "@/lib/embed-origins";
import { prisma } from "@/lib/prisma";

/**
 * CSP `frame-ancestors` value for `/embed/[slug]`.
 *
 * Looked up from proxy (Node runtime) on each embed request so a creator
 * tightening the allowlist takes effect without a rebuild. Unknown or
 * unpublished slugs deny framing.
 */
export async function getEmbedFrameAncestors(slug: string): Promise<string> {
  const page = await prisma.donationPage.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: {
      embedEnabled: true,
      embedAllowAnyOrigin: true,
      embedAllowedOrigins: true,
    },
  });

  if (!page) return "'none'";

  return frameAncestorsValue({
    embedEnabled: page.embedEnabled,
    allowAnyOrigin: page.embedAllowAnyOrigin,
    origins: page.embedAllowedOrigins,
  });
}
