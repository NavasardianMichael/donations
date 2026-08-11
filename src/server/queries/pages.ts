import "server-only";

import { cache } from "react";

import type { PageStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * Read helpers for donation pages. Server Components only.
 *
 * Every query is scoped by `userId` in its WHERE clause rather than filtering
 * after the fetch — a page belonging to someone else must never be loaded into
 * memory in the first place. `deletedAt: null` is likewise part of the query,
 * not a post-filter, so a soft-deleted page cannot leak through a code path
 * that forgets to check.
 *
 * `cache()` dedupes within a single render pass: a layout and its page can both
 * ask for the same record and only one query runs.
 */

export interface PageListItem {
  id: string;
  slug: string;
  title: string;
  status: PageStatus;
  currency: string;
  coverImageUrl: string | null;
  goalAmountMinor: number | null;
  publishedAt: Date | null;
  updatedAt: Date;
  /** Sum of SUCCEEDED donations, in minor units. */
  raisedMinor: number;
  donationCount: number;
  viewCount: number;
}

export const listPages = cache(async function listPages(
  userId: string,
  options: { status?: PageStatus | "ALL"; search?: string } = {},
): Promise<PageListItem[]> {
  const { status = "ALL", search } = options;

  const pages = await prisma.donationPage.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(status !== "ALL" ? { status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      currency: true,
      coverImageUrl: true,
      goalAmountMinor: true,
      publishedAt: true,
      updatedAt: true,
      _count: { select: { pageViews: true } },
    },
  });

  if (pages.length === 0) return [];

  // One grouped aggregate for every page, rather than a query per row.
  const totals = await prisma.donation.groupBy({
    by: ["pageId"],
    where: { pageId: { in: pages.map((p) => p.id) }, status: "SUCCEEDED" },
    _sum: { amountMinor: true },
    _count: { _all: true },
  });

  const byPage = new Map(
    totals.map((t) => [
      t.pageId,
      { raised: t._sum.amountMinor ?? 0, count: t._count._all },
    ]),
  );

  return pages.map(({ _count, ...page }) => ({
    ...page,
    raisedMinor: byPage.get(page.id)?.raised ?? 0,
    donationCount: byPage.get(page.id)?.count ?? 0,
    viewCount: _count.pageViews,
  }));
});

export const countPagesByStatus = cache(async function countPagesByStatus(
  userId: string,
): Promise<Record<PageStatus | "ALL", number>> {
  const grouped = await prisma.donationPage.groupBy({
    by: ["status"],
    where: { userId, deletedAt: null },
    _count: { _all: true },
  });

  const counts = { ALL: 0, DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 };
  for (const row of grouped) {
    counts[row.status] = row._count._all;
    counts.ALL += row._count._all;
  }
  return counts;
});

/**
 * A single page, scoped to its owner.
 *
 * Returns null rather than throwing when the page belongs to someone else, so
 * callers render a 404 — telling a stranger "that exists but is not yours"
 * confirms the page's existence.
 */
export const getOwnedPage = cache(async function getOwnedPage(
  userId: string,
  pageId: string,
) {
  return prisma.donationPage.findFirst({
    where: { id: pageId, userId, deletedAt: null },
  });
});

/** Is this slug free? Excludes one page so it can keep its own slug. */
export async function isSlugAvailable(
  slug: string,
  excludePageId?: string,
): Promise<boolean> {
  const existing = await prisma.donationPage.findFirst({
    where: { slug, ...(excludePageId ? { id: { not: excludePageId } } : {}) },
    select: { id: true },
  });
  return existing === null;
}
