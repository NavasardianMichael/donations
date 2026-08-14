import "server-only";

import { cache } from "react";

import { DEFAULT_CURRENCY } from "@/lib/currency";
import { platformFeeMinor } from "@/lib/fees";
import { prisma } from "@/lib/prisma";

/**
 * What a creator is owed, derived from their donations.
 *
 * There is no payout table yet — no money has moved to a creator — so this is
 * not a ledger read. Every figure is computed from `Donation` rows, which makes
 * `paidOutMinor` structurally zero and `availableMinor` the whole net balance.
 * When payouts land, the completed ones come out of a real table and only
 * `availableMinor` stays derived.
 *
 * Everything is summed over `pageAmountMinor`, never `amountMinor`: a Paddle row
 * holds USD cents and an ArCa row AMD luma, so adding the latter across
 * providers produces a number that means nothing. See AGENTS.md.
 */
export interface PayoutBalance {
  /** Page currency these totals are denominated in. */
  currency: string;
  /** Sum of succeeded donations, before our cut. */
  grossMinor: number;
  /** Our 5%, summed per donation — not taken off the total. See below. */
  platformFeeMinor: number;
  /** Gross minus fee: what the creator is owed in total. */
  netMinor: number;
  /** Of that, what is payable now. Identical to `netMinor` until payouts run. */
  availableMinor: number;
  /** Already transferred. Structurally zero — nothing pays creators yet. */
  paidOutMinor: number;
  donationCount: number;
  /** Started but unconfirmed donations: not yet part of the balance. */
  pendingMinor: number;
  pendingCount: number;
}

export const getPayoutBalance = cache(async function getPayoutBalance(
  userId: string,
): Promise<PayoutBalance> {
  const pages = await prisma.donationPage.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, currency: true },
  });

  const pageIds = pages.map((page) => page.id);
  // Same convention as the dashboard overview: the creator's first page decides
  // the display currency, because `pageAmountMinor` is already normalised to it.
  const currency = pages[0]?.currency ?? DEFAULT_CURRENCY;

  if (pageIds.length === 0) {
    return {
      currency,
      grossMinor: 0,
      platformFeeMinor: 0,
      netMinor: 0,
      availableMinor: 0,
      paidOutMinor: 0,
      donationCount: 0,
      pendingMinor: 0,
      pendingCount: 0,
    };
  }

  const [succeeded, pending] = await Promise.all([
    /**
     * Grouped by amount rather than aggregated, for two reasons.
     *
     * The fee is NOT read from `Donation.platformFeeMinor`, tempting as that
     * column is: it was derived from `amountMinor`, so it is USD cents on a
     * Paddle row and AMD luma on an ArCa one. Summing it is the same
     * mixed-currency mistake as summing `amountMinor`. Re-deriving it from
     * `pageAmountMinor` keeps one currency throughout.
     *
     * And grouping keeps the rounding right: `platformFeeMinor` rounds half-up
     * per donation, which is not the same number as rounding once on the total.
     * Donations cluster hard on the suggested ladder, so the distinct amounts
     * stay a handful even at volume — no need to read every row.
     */
    prisma.donation.groupBy({
      by: ["pageAmountMinor"],
      where: { pageId: { in: pageIds }, status: "SUCCEEDED" },
      _count: { _all: true },
    }),
    prisma.donation.aggregate({
      where: {
        pageId: { in: pageIds },
        status: { in: ["PENDING", "AUTHORIZING"] },
      },
      _sum: { pageAmountMinor: true },
      _count: { _all: true },
    }),
  ]);

  let grossMinor = 0;
  let feeMinor = 0;
  let donationCount = 0;

  for (const group of succeeded) {
    const count = group._count._all;
    donationCount += count;
    grossMinor += group.pageAmountMinor * count;
    feeMinor += platformFeeMinor(group.pageAmountMinor) * count;
  }

  const netMinor = grossMinor - feeMinor;

  return {
    currency,
    grossMinor,
    platformFeeMinor: feeMinor,
    netMinor,
    availableMinor: netMinor,
    paidOutMinor: 0,
    donationCount,
    pendingMinor: pending._sum.pageAmountMinor ?? 0,
    pendingCount: pending._count._all,
  };
});
