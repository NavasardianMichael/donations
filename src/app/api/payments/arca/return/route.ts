import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

import {
  ARCA_ORDER_STATUS,
  getOrderStatus,
  isArcaConfigured,
} from "@/lib/payments/arca";
import { prisma } from "@/lib/prisma";
import { sendDonationReceipt, notifyCreatorOfDonation } from "@/server/actions/receipts";

/**
 * Where ArCa sends the donor's BROWSER back to — both on success and on
 * failure, since `returnUrl` and `failUrl` point here identically.
 *
 * This request proves NOTHING about payment outcome by itself: it is a plain
 * GET a browser could replay, forge, or never send at all if the tab was
 * closed mid-3DS. The only fact this route trusts is the answer to a
 * server-to-server `getOrderStatus` call. Everything else — which query
 * params are present, whether the browser arrived at all — is treated as a
 * hint to redirect faster, never as a reason to mark a donation paid.
 *
 * If this request never arrives, the reconcile sweep (`/api/cron/
 * reconcile-donations`) still resolves the donation later from the same
 * source of truth.
 */
export async function GET(request: NextRequest) {
  const donationId = request.nextUrl.searchParams.get("donationId");

  const donation = donationId
    ? await prisma.donation.findUnique({
        where: { id: donationId },
        include: { page: { select: { slug: true } } },
      })
    : null;

  // No donation to resolve — nothing we can attribute this hit to.
  if (!donation) return NextResponse.redirect(new URL("/", request.url));

  const thankYouUrl = new URL(
    `/d/${donation.page.slug}/thank-you`,
    request.url,
  );
  thankYouUrl.searchParams.set("donation", donation.id);

  // Already resolved — a replayed or double-fired redirect. Do not call the
  // gateway again for a settled row.
  if (donation.status === "SUCCEEDED" || donation.status === "FAILED") {
    return NextResponse.redirect(thankYouUrl);
  }

  if (!isArcaConfigured() || !donation.providerOrderId) {
    return NextResponse.redirect(thankYouUrl);
  }

  try {
    const result = await getOrderStatus(donation.providerOrderId);

    if (result.orderStatus === ARCA_ORDER_STATUS.DEPOSITED) {
      await prisma.donation.update({
        where: { id: donation.id },
        data: {
          status: "SUCCEEDED",
          completedAt: new Date(),
          cardMask: result.cardMask,
          approvalCode: result.approvalCode,
        },
      });

      revalidatePath(`/d/${donation.page.slug}`);
      revalidatePath(`/embed/${donation.page.slug}`);
      revalidatePath("/dashboard");
      revalidatePath("/pages");

      // Best effort: a failed receipt must never undo a real payment, and
      // must never block the donor from reaching the thank-you page.
      const fullDonation = await prisma.donation.findUnique({
        where: { id: donation.id },
        include: { page: { include: { user: true } } },
      });
      if (fullDonation) {
        await Promise.allSettled([
          sendDonationReceipt(fullDonation),
          notifyCreatorOfDonation(fullDonation),
        ]);
      }
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
    }
    // CREATED / APPROVED / ACS_AUTH_PENDING: still in flight. Leave the row
    // as AUTHORIZING — the reconcile sweep resolves it once it settles.
  } catch (error) {
    // A gateway hiccup on the return leg is not a payment failure. Log it and
    // let the reconcile sweep — which retries on a schedule — sort it out.
    console.error("ArCa getOrderStatus failed on return:", error);
  }

  return NextResponse.redirect(thankYouUrl);
}
