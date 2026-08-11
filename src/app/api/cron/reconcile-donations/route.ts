import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

import { ARCA_ORDER_STATUS, getOrderStatus, isArcaConfigured } from "@/lib/payments/arca";
import { prisma } from "@/lib/prisma";
import { notifyCreatorOfDonation, sendDonationReceipt } from "@/server/actions/receipts";

/**
 * Sweeps donations stuck in AUTHORIZING and resolves them from ArCa directly.
 *
 * This exists because the return route is best-effort by nature — a donor can
 * close the tab mid-3DS, lose signal, or the redirect can simply never arrive.
 * Without this sweep, an abandoned-but-actually-successful payment would take
 * the donor's money and never credit the creator, with no record anywhere
 * that anything was wrong. Every AUTHORIZING row gets a real answer within
 * one sweep interval, and a row still unresolved after
 * `EXPIRE_AFTER_HOURS` is marked FAILED — ArCa's own hosted sessions expire
 * well before that, so nothing legitimate is still "in flight" by then.
 *
 * Scheduled via `vercel.json` (see `crons`). Guarded by `CRON_SECRET` so it
 * cannot be triggered by a stranger who finds the URL.
 */

const RECONCILE_AFTER_MINUTES = 3;
const EXPIRE_AFTER_HOURS = 24;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!isArcaConfigured()) {
    return NextResponse.json({ skipped: "arca not configured" });
  }

  const cutoff = new Date(Date.now() - RECONCILE_AFTER_MINUTES * 60_000);
  const expireCutoff = new Date(Date.now() - EXPIRE_AFTER_HOURS * 60 * 60_000);

  const stuck = await prisma.donation.findMany({
    where: {
      status: "AUTHORIZING",
      registeredAt: { lte: cutoff },
      providerOrderId: { not: null },
    },
    include: { page: { include: { user: true } } },
    take: 200, // one sweep does not need to drain an unbounded backlog
  });

  let succeeded = 0;
  let failed = 0;
  let expired = 0;
  let stillPending = 0;
  const errors: string[] = [];

  for (const donation of stuck) {
    try {
      const result = await getOrderStatus(donation.providerOrderId!);

      if (result.orderStatus === ARCA_ORDER_STATUS.DEPOSITED) {
        const updated = await prisma.donation.update({
          where: { id: donation.id },
          data: {
            status: "SUCCEEDED",
            completedAt: new Date(),
            cardMask: result.cardMask,
            approvalCode: result.approvalCode,
          },
          include: { page: { include: { user: true } } },
        });
        revalidatePath(`/d/${donation.page.slug}`);
        revalidatePath("/dashboard");
        await Promise.allSettled([
          sendDonationReceipt(updated),
          notifyCreatorOfDonation(updated),
        ]);
        succeeded++;
      } else if (
        result.orderStatus === ARCA_ORDER_STATUS.AUTH_DECLINED ||
        result.orderStatus === ARCA_ORDER_STATUS.REVERSED
      ) {
        await prisma.donation.update({
          where: { id: donation.id },
          data: {
            status: "FAILED",
            failureCode: result.actionCode ?? "declined",
            failureMessage: result.actionCodeDescription?.slice(0, 500),
          },
        });
        failed++;
      } else if (donation.registeredAt && donation.registeredAt <= expireCutoff) {
        await prisma.donation.update({
          where: { id: donation.id },
          data: { status: "FAILED", failureCode: "expired" },
        });
        expired++;
      } else {
        stillPending++;
      }
    } catch (error) {
      errors.push(
        `${donation.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return NextResponse.json({
    swept: stuck.length,
    succeeded,
    failed,
    expired,
    stillPending,
    errors,
  });
}
