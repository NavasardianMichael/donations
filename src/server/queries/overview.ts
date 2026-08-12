import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { addDays, startOfUtcDay } from "@/lib/utils";
import {
  getAnalyticsSummary,
  type AnalyticsSummary,
} from "@/server/queries/analytics";

export interface DashboardOverview {
  current: AnalyticsSummary;
  /** Fractional change vs the prior 30 days; null when there is no baseline. */
  raisedDelta: number | null;
  supportersDelta: number | null;
  conversionDelta: number | null;
  recentSupporters: RecentSupporter[];
}

export interface RecentSupporter {
  id: string;
  donorName: string | null;
  isAnonymous: boolean;
  amountMinor: number;
  currency: string;
  status: "SUCCEEDED" | "PENDING" | "AUTHORIZING" | "FAILED" | "REFUNDED";
  createdAt: Date;
  pageTitle: string;
  pageId: string;
}

function periodDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 1 : null;
  return (current - previous) / previous;
}

async function summaryForWindow(
  pageIds: string[],
  from: Date,
  to: Date,
  currency: string,
): Promise<AnalyticsSummary> {
  if (pageIds.length === 0) {
    return {
      raisedMinor: 0,
      donationCount: 0,
      averageMinor: 0,
      viewCount: 0,
      uniqueVisitors: 0,
      conversionRate: 0,
      currency,
    };
  }

  const [donationAgg, viewCount] = await Promise.all([
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
  ]);

  const donationCount = donationAgg._count._all;
  const raisedMinor = donationAgg._sum.amountMinor ?? 0;

  return {
    raisedMinor,
    donationCount,
    averageMinor:
      donationCount > 0 ? Math.round(raisedMinor / donationCount) : 0,
    viewCount,
    uniqueVisitors: 0,
    conversionRate: viewCount > 0 ? donationCount / viewCount : 0,
    currency,
  };
}

export const getDashboardOverview = cache(async function getDashboardOverview(
  userId: string,
): Promise<DashboardOverview> {
  const pages = await prisma.donationPage.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, currency: true },
  });
  const pageIds = pages.map((p) => p.id);
  const currency = pages[0]?.currency ?? "amd";

  const current = await getAnalyticsSummary(userId, "30d");

  const today = startOfUtcDay();
  const currentFrom = addDays(today, -29);
  const previousFrom = addDays(currentFrom, -30);
  const previous = await summaryForWindow(
    pageIds,
    previousFrom,
    currentFrom,
    currency,
  );

  const recentSupporters =
    pageIds.length === 0
      ? []
      : await prisma.donation.findMany({
          where: {
            pageId: { in: pageIds },
            status: "SUCCEEDED",
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            donorName: true,
            isAnonymous: true,
            amountMinor: true,
            currency: true,
            status: true,
            createdAt: true,
            pageId: true,
            page: { select: { title: true } },
          },
        });

  return {
    current,
    raisedDelta: periodDelta(current.raisedMinor, previous.raisedMinor),
    supportersDelta: periodDelta(
      current.donationCount,
      previous.donationCount,
    ),
    conversionDelta: periodDelta(
      current.conversionRate,
      previous.conversionRate,
    ),
    recentSupporters: recentSupporters.map((row) => ({
      id: row.id,
      donorName: row.donorName,
      isAnonymous: row.isAnonymous,
      amountMinor: row.amountMinor,
      currency: row.currency,
      status: row.status,
      createdAt: row.createdAt,
      pageTitle: row.page.title,
      pageId: row.pageId,
    })),
  };
});
