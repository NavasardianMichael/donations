import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

/** Donation history for one page, scoped by its owner at the call site. */
export const listDonationsForPage = cache(async function listDonationsForPage(
  pageId: string,
  take = 50,
) {
  return prisma.donation.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      status: true,
      donorName: true,
      donorEmail: true,
      isAnonymous: true,
      message: true,
      source: true,
      cardMask: true,
      createdAt: true,
      completedAt: true,
    },
  });
});
