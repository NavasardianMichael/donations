import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

import { ARCA_ORDER_STATUS, getOrderStatus, isArcaConfigured } from "@/lib/payments/arca";
import {
  getTransaction,
  isPaddleConfigured,
  PADDLE_STATUS,
} from "@/lib/payments/paddle";
import { prisma } from "@/lib/prisma";
import { notifyCreatorOfDonation, sendDonationReceipt } from "@/server/actions/receipts";

import type { Donation, DonationPage, PaymentProvider, User } from "@/generated/prisma/client";

/**
 * Sweeps donations stuck in AUTHORIZING and resolves them from the gateway
 * that actually holds them.
 *
 * This exists because neither provider's fast path is reliable on its own. A
 * donor can close the tab mid-3DS so ArCa's redirect never arrives; Paddle can
 * exhaust its webhook retries, or have one dropped by a deploy. Without this
 * sweep an abandoned-but-successful payment would take the donor's money and
 * never credit the creator, with no record anywhere that anything was wrong.
 * Every AUTHORIZING row gets a real answer within one sweep interval, and a row
 * still unresolved after `EXPIRE_AFTER_HOURS` is marked FAILED — both gateways'
 * checkout sessions expire well before that, so nothing legitimate is still in
 * flight by then.
 *
 * Rows are selected PER PROVIDER. That is not a detail: `providerOrderId` holds
 * an ArCa order id on one row and a Paddle `txn_…` on the next, and asking one
 * gateway about the other's id fails every time — which, after 24 hours, would
 * quietly mark real payments as expired.
 *
 * Scheduled via `vercel.json` (see `crons`). Guarded by `CRON_SECRET` so it
 * cannot be triggered by a stranger who finds the URL.
 */

const RECONCILE_AFTER_MINUTES = 3;
const EXPIRE_AFTER_HOURS = 24;
/** One sweep does not need to drain an unbounded backlog. Per provider. */
const BATCH_SIZE = 200;

type DonationWithPageAndOwner = Donation & {
  page: DonationPage & { user: User };
};

interface Tally {
  swept: number;
  succeeded: number;
  failed: number;
  expired: number;
  stillPending: number;
  errors: string[];
}

function emptyTally(): Tally {
  return {
    swept: 0,
    succeeded: 0,
    failed: 0,
    expired: 0,
    stillPending: 0,
    errors: [],
  };
}

/** What a gateway said about one donation, normalised across providers. */
type Resolution =
  | { outcome: "succeeded"; cardMask?: string; approvalCode?: string }
  | { outcome: "failed"; code: string; message?: string }
  | { outcome: "pending" };

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const arcaReady = isArcaConfigured();
  const paddleReady = isPaddleConfigured();

  // Only bail when NEITHER provider can be reached. Skipping the whole sweep
  // because one provider is unconfigured would strand the other's donations.
  if (!arcaReady && !paddleReady) {
    return NextResponse.json({ skipped: "no payment provider configured" });
  }

  const [arca, paddle] = await Promise.all([
    arcaReady ? sweep("ARCA", resolveArca) : emptyTally(),
    paddleReady ? sweep("PADDLE", resolvePaddle) : emptyTally(),
  ]);

  return NextResponse.json({
    arca: arcaReady ? arca : "skipped",
    paddle: paddleReady ? paddle : "skipped",
    swept: arca.swept + paddle.swept,
    succeeded: arca.succeeded + paddle.succeeded,
    failed: arca.failed + paddle.failed,
    expired: arca.expired + paddle.expired,
  });
}

async function sweep(
  provider: PaymentProvider,
  resolve: (donation: DonationWithPageAndOwner) => Promise<Resolution>,
): Promise<Tally> {
  const cutoff = new Date(Date.now() - RECONCILE_AFTER_MINUTES * 60_000);
  const expireCutoff = new Date(Date.now() - EXPIRE_AFTER_HOURS * 60 * 60_000);
  const tally = emptyTally();

  const stuck = await prisma.donation.findMany({
    where: {
      provider,
      status: "AUTHORIZING",
      registeredAt: { lte: cutoff },
      providerOrderId: { not: null },
    },
    include: { page: { include: { user: true } } },
    take: BATCH_SIZE,
  });

  tally.swept = stuck.length;

  for (const donation of stuck) {
    try {
      const resolution = await resolve(donation);

      if (resolution.outcome === "succeeded") {
        const updated = await prisma.donation.update({
          where: { id: donation.id },
          data: {
            status: "SUCCEEDED",
            completedAt: new Date(),
            cardMask: resolution.cardMask,
            approvalCode: resolution.approvalCode,
          },
          include: { page: { include: { user: true } } },
        });
        revalidatePath(`/d/${donation.page.slug}`);
        revalidatePath(`/embed/${donation.page.slug}`);
        revalidatePath("/dashboard");
        await Promise.allSettled([
          sendDonationReceipt(updated),
          notifyCreatorOfDonation(updated),
        ]);
        tally.succeeded++;
      } else if (resolution.outcome === "failed") {
        await prisma.donation.update({
          where: { id: donation.id },
          data: {
            status: "FAILED",
            failureCode: resolution.code,
            failureMessage: resolution.message?.slice(0, 500),
          },
        });
        tally.failed++;
      } else if (donation.registeredAt && donation.registeredAt <= expireCutoff) {
        await prisma.donation.update({
          where: { id: donation.id },
          data: { status: "FAILED", failureCode: "expired" },
        });
        tally.expired++;
      } else {
        tally.stillPending++;
      }
    } catch (error) {
      tally.errors.push(
        `${donation.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return tally;
}

async function resolveArca(
  donation: DonationWithPageAndOwner,
): Promise<Resolution> {
  const result = await getOrderStatus(donation.providerOrderId!);

  if (result.orderStatus === ARCA_ORDER_STATUS.DEPOSITED) {
    return {
      outcome: "succeeded",
      cardMask: result.cardMask,
      approvalCode: result.approvalCode,
    };
  }
  if (
    result.orderStatus === ARCA_ORDER_STATUS.AUTH_DECLINED ||
    result.orderStatus === ARCA_ORDER_STATUS.REVERSED
  ) {
    return {
      outcome: "failed",
      code: result.actionCode ?? "declined",
      message: result.actionCodeDescription,
    };
  }
  // CREATED / APPROVED / ACS_AUTH_PENDING: still in flight.
  return { outcome: "pending" };
}

async function resolvePaddle(
  donation: DonationWithPageAndOwner,
): Promise<Resolution> {
  const result = await getTransaction(donation.providerOrderId!);

  if (result.status === PADDLE_STATUS.COMPLETED) {
    return {
      outcome: "succeeded",
      cardMask: result.cardLast4 ? `•••• ${result.cardLast4}` : undefined,
      approvalCode: donation.providerOrderId ?? undefined,
    };
  }
  if (
    result.status === PADDLE_STATUS.CANCELED ||
    result.status === PADDLE_STATUS.PAST_DUE
  ) {
    return {
      outcome: "failed",
      code: result.status,
      message: `Paddle reported ${result.status}`,
    };
  }
  // draft / ready / billed / paid: Paddle has not finished settling it.
  return { outcome: "pending" };
}
