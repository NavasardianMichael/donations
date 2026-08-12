import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * Reads for the anonymous-facing surfaces: `/d/[slug]`, `/embed/[slug]`, and
 * checkout. No `userId` scoping here — by design, anyone may read a
 * PUBLISHED page. What DOES matter is the status filter: a DRAFT or ARCHIVED
 * page must 404 for everyone except its owner, so this must never be reused
 * for an authenticated, owner-scoped read.
 */

export const getPublicPageBySlug = cache(async function getPublicPageBySlug(
  slug: string,
) {
  const page = await prisma.donationPage.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: {
      user: { select: { name: true, image: true, bio: true } },
    },
  });

  if (!page) return null;

  // `pageAmountMinor`, never `amountMinor`: an international donation is charged
  // in USD, so summing the charged amounts would add cents to luma and produce
  // a progress bar that means nothing.
  const raised = await prisma.donation.aggregate({
    where: { pageId: page.id, status: "SUCCEEDED" },
    _sum: { pageAmountMinor: true },
    _count: { _all: true },
  });

  return {
    ...page,
    raisedMinor: raised._sum.pageAmountMinor ?? 0,
    donationCount: raised._count._all,
  };
});

export type PublicPage = NonNullable<
  Awaited<ReturnType<typeof getPublicPageBySlug>>
>;

/** Every published, non-deleted slug — for generateStaticParams and the sitemap. */
export async function listPublishedSlugs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return prisma.donationPage.findMany({
    where: { status: "PUBLISHED", deletedAt: null, noIndex: false },
    select: { slug: true, updatedAt: true },
  });
}

/** Recent successful donations for a page's public "recent supporters" list. */
export async function listRecentSupporters(pageId: string, take = 8) {
  return prisma.donation.findMany({
    where: { pageId, status: "SUCCEEDED" },
    orderBy: { completedAt: "desc" },
    take,
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      donorName: true,
      isAnonymous: true,
      message: true,
      completedAt: true,
    },
  });
}

/**
 * A single donation for the thank-you page, scoped to the slug it claims to
 * belong to.
 *
 * The donation id in the URL is a capability token — like a Stripe Checkout
 * `session_id` — rather than something guessable, but the slug check still
 * matters: without it, a thank-you link minted for one page could be replayed
 * against a different page's URL and appear to belong there.
 */
export async function getDonationForThankYou(slug: string, donationId: string) {
  return prisma.donation.findFirst({
    where: { id: donationId, page: { slug } },
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      status: true,
      donorEmail: true,
      page: { select: { slug: true, title: true } },
    },
  });
}
