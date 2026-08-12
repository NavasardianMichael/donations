import "server-only";

import { cache } from "react";

import { referrerDomain } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { addDays, startOfUtcDay } from "@/lib/utils";

export type AnalyticsRange = "7d" | "30d" | "90d";

export function parseAnalyticsRange(
  value: string | undefined,
): AnalyticsRange {
  return value === "7d" || value === "90d" ? value : "30d";
}

export function rangeToDays(range: AnalyticsRange): number {
  return range === "7d" ? 7 : range === "90d" ? 90 : 30;
}

/** Inclusive start (UTC midnight) and exclusive end for the selected range. */
export function rangeWindow(range: AnalyticsRange): {
  from: Date;
  to: Date;
  days: number;
} {
  const days = rangeToDays(range);
  const today = startOfUtcDay();
  return {
    from: addDays(today, -(days - 1)),
    to: addDays(today, 1),
    days,
  };
}

async function ownedPageIds(
  userId: string,
  pageId?: string,
): Promise<{ id: string; title: string; currency: string }[]> {
  return prisma.donationPage.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(pageId ? { id: pageId } : {}),
    },
    select: { id: true, title: true, currency: true },
    orderBy: { title: "asc" },
  });
}

export interface AnalyticsSummary {
  raisedMinor: number;
  donationCount: number;
  averageMinor: number;
  viewCount: number;
  uniqueVisitors: number;
  conversionRate: number;
  currency: string;
}

export const getAnalyticsSummary = cache(async function getAnalyticsSummary(
  userId: string,
  range: AnalyticsRange,
  pageId?: string,
): Promise<AnalyticsSummary> {
  const { from, to } = rangeWindow(range);
  const pages = await ownedPageIds(userId, pageId);
  const empty: AnalyticsSummary = {
    raisedMinor: 0,
    donationCount: 0,
    averageMinor: 0,
    viewCount: 0,
    uniqueVisitors: 0,
    conversionRate: 0,
    currency: pages[0]?.currency ?? "amd",
  };
  if (pages.length === 0) return empty;

  const pageIds = pages.map((p) => p.id);

  // Uniques come from the daily rollup: visitor hashes rotate every UTC day,
  // so a live DISTINCT over the range is the same number as summing daily
  // uniques — and the rollup is cheap to read.
  const [donationAgg, viewCount, uniqueAgg] = await Promise.all([
    prisma.donation.aggregate({
      where: {
        pageId: { in: pageIds },
        status: "SUCCEEDED",
        createdAt: { gte: from, lt: to },
      },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    prisma.pageView.count({
      where: { pageId: { in: pageIds }, createdAt: { gte: from, lt: to } },
    }),
    prisma.pageDailyStat.aggregate({
      where: { pageId: { in: pageIds }, date: { gte: from, lt: to } },
      _sum: { uniqueVisitors: true },
    }),
  ]);

  const donationCount = donationAgg._count._all;
  const raisedMinor = donationAgg._sum.amountMinor ?? 0;

  return {
    raisedMinor,
    donationCount,
    averageMinor:
      donationCount > 0 ? Math.round(raisedMinor / donationCount) : 0,
    viewCount,
    uniqueVisitors: uniqueAgg._sum.uniqueVisitors ?? 0,
    conversionRate: viewCount > 0 ? donationCount / viewCount : 0,
    currency: pages[0]!.currency,
  };
});

export interface AnalyticsTrendPoint {
  date: string; // YYYY-MM-DD
  views: number;
  donationCount: number;
  amountMinor: number;
}

export const getAnalyticsTrend = cache(async function getAnalyticsTrend(
  userId: string,
  range: AnalyticsRange,
  pageId?: string,
): Promise<AnalyticsTrendPoint[]> {
  const { from, to, days } = rangeWindow(range);
  const pages = await ownedPageIds(userId, pageId);
  if (pages.length === 0) return fillTrend(from, days, new Map());

  const rows = await prisma.pageDailyStat.findMany({
    where: {
      pageId: { in: pages.map((p) => p.id) },
      date: { gte: from, lt: to },
    },
    select: {
      date: true,
      views: true,
      donationCount: true,
      amountMinor: true,
    },
  });

  const byDay = new Map<
    string,
    { views: number; donationCount: number; amountMinor: number }
  >();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    const bucket = byDay.get(key) ?? {
      views: 0,
      donationCount: 0,
      amountMinor: 0,
    };
    bucket.views += row.views;
    bucket.donationCount += row.donationCount;
    bucket.amountMinor += row.amountMinor;
    byDay.set(key, bucket);
  }

  return fillTrend(from, days, byDay);
});

function fillTrend(
  from: Date,
  days: number,
  byDay: Map<
    string,
    { views: number; donationCount: number; amountMinor: number }
  >,
): AnalyticsTrendPoint[] {
  const points: AnalyticsTrendPoint[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const key = date.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    points.push({
      date: key,
      views: bucket?.views ?? 0,
      donationCount: bucket?.donationCount ?? 0,
      amountMinor: bucket?.amountMinor ?? 0,
    });
  }
  return points;
}

export interface AnalyticsPageRow {
  pageId: string;
  title: string;
  currency: string;
  views: number;
  donationCount: number;
  raisedMinor: number;
  conversionRate: number;
}

export const getAnalyticsByPage = cache(async function getAnalyticsByPage(
  userId: string,
  range: AnalyticsRange,
): Promise<AnalyticsPageRow[]> {
  const { from, to } = rangeWindow(range);
  const pages = await ownedPageIds(userId);
  if (pages.length === 0) return [];

  const pageIds = pages.map((p) => p.id);

  const [viewGroups, donationGroups] = await Promise.all([
    prisma.pageView.groupBy({
      by: ["pageId"],
      where: { pageId: { in: pageIds }, createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    }),
    prisma.donation.groupBy({
      by: ["pageId"],
      where: {
        pageId: { in: pageIds },
        status: "SUCCEEDED",
        createdAt: { gte: from, lt: to },
      },
      _count: { _all: true },
      _sum: { amountMinor: true },
    }),
  ]);

  const viewsByPage = new Map(
    viewGroups.map((g) => [g.pageId, g._count._all]),
  );
  const donationsByPage = new Map(
    donationGroups.map((g) => [
      g.pageId,
      {
        count: g._count._all,
        raised: g._sum.amountMinor ?? 0,
      },
    ]),
  );

  return pages
    .map((page) => {
      const views = viewsByPage.get(page.id) ?? 0;
      const donations = donationsByPage.get(page.id);
      const donationCount = donations?.count ?? 0;
      return {
        pageId: page.id,
        title: page.title,
        currency: page.currency,
        views,
        donationCount,
        raisedMinor: donations?.raised ?? 0,
        conversionRate: views > 0 ? donationCount / views : 0,
      };
    })
    .filter((row) => row.views > 0 || row.donationCount > 0)
    .sort((a, b) => b.raisedMinor - a.raisedMinor || b.views - a.views);
});

export interface AnalyticsReferrerRow {
  referrer: string;
  views: number;
}

/**
 * Top referrer domains for the range. Seed data may still store full URLs;
 * live beacons store domains — both are normalised here.
 */
export const getAnalyticsReferrers = cache(async function getAnalyticsReferrers(
  userId: string,
  range: AnalyticsRange,
  pageId?: string,
  take = 10,
): Promise<AnalyticsReferrerRow[]> {
  const { from, to } = rangeWindow(range);
  const pages = await ownedPageIds(userId, pageId);
  if (pages.length === 0) return [];

  const rows = await prisma.pageView.findMany({
    where: {
      pageId: { in: pages.map((p) => p.id) },
      createdAt: { gte: from, lt: to },
      referrer: { not: null },
    },
    select: { referrer: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    const domain = normaliseReferrer(row.referrer);
    if (!domain) continue;
    counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([referrer, views]) => ({ referrer, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, take);
});

function normaliseReferrer(value: string | null): string | null {
  if (!value) return null;
  if (!value.includes("://")) {
    return value.replace(/^www\./, "") || null;
  }
  // Seed rows store full URLs; strip to hostname the same way the beacon does.
  return referrerDomain(value, "https://invalid.invalid");
}

/**
 * Aggregate PageView + SUCCEEDED Donation into PageDailyStat for one UTC day.
 * Upserts so re-running the nightly cron (or a late reconcile) is idempotent.
 */
export async function rollupDailyStatsForDay(day: Date): Promise<number> {
  const from = startOfUtcDay(day);
  const to = addDays(from, 1);

  const [views, donations] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: from, lt: to } },
      select: { pageId: true, visitorHash: true },
    }),
    prisma.donation.findMany({
      where: {
        status: "SUCCEEDED",
        createdAt: { gte: from, lt: to },
      },
      select: { pageId: true, amountMinor: true },
    }),
  ]);

  type Bucket = {
    views: number;
    visitors: Set<string>;
    donationCount: number;
    amountMinor: number;
  };
  const buckets = new Map<string, Bucket>();

  for (const view of views) {
    let bucket = buckets.get(view.pageId);
    if (!bucket) {
      bucket = {
        views: 0,
        visitors: new Set(),
        donationCount: 0,
        amountMinor: 0,
      };
      buckets.set(view.pageId, bucket);
    }
    bucket.views += 1;
    bucket.visitors.add(view.visitorHash);
  }

  for (const donation of donations) {
    let bucket = buckets.get(donation.pageId);
    if (!bucket) {
      bucket = {
        views: 0,
        visitors: new Set(),
        donationCount: 0,
        amountMinor: 0,
      };
      buckets.set(donation.pageId, bucket);
    }
    bucket.donationCount += 1;
    bucket.amountMinor += donation.amountMinor;
  }

  // Also zero-out days that previously had rows but now have no activity
  // (e.g. a donation was refunded out of SUCCEEDED). Only touch pages that
  // already have a row for this day and are absent from the fresh buckets.
  const existing = await prisma.pageDailyStat.findMany({
    where: { date: from },
    select: { pageId: true },
  });
  for (const row of existing) {
    if (!buckets.has(row.pageId)) {
      buckets.set(row.pageId, {
        views: 0,
        visitors: new Set(),
        donationCount: 0,
        amountMinor: 0,
      });
    }
  }

  let upserted = 0;
  for (const [pageId, bucket] of buckets) {
    await prisma.pageDailyStat.upsert({
      where: { pageId_date: { pageId, date: from } },
      create: {
        pageId,
        date: from,
        views: bucket.views,
        uniqueVisitors: bucket.visitors.size,
        donationCount: bucket.donationCount,
        amountMinor: bucket.amountMinor,
      },
      update: {
        views: bucket.views,
        uniqueVisitors: bucket.visitors.size,
        donationCount: bucket.donationCount,
        amountMinor: bucket.amountMinor,
      },
    });
    upserted += 1;
  }

  return upserted;
}
