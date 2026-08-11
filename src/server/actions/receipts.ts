import "server-only";

import { getTranslations } from "next-intl/server";

import type { Donation, DonationPage, User } from "@/generated/prisma/client";
import {
  creatorNotificationEmail,
  donationReceiptEmail,
  sendEmail,
} from "@/lib/email";
import { formatMoney } from "@/lib/currency";
import { absoluteUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { resolver } from "@/lib/validations/resolver";

type DonationWithPageAndOwner = Donation & {
  page: DonationPage & { user: User };
};

/**
 * Post-payment notifications. Called only from the return route and the
 * reconcile sweep, and only after a donation is confirmed SUCCEEDED — never
 * speculatively.
 *
 * Both are best-effort: a delivery failure here must never roll back the
 * payment record, which is why every caller wraps these in
 * `Promise.allSettled` rather than awaiting them as part of the critical
 * path.
 */

export async function sendDonationReceipt(
  donation: DonationWithPageAndOwner,
): Promise<void> {
  if (!donation.donorEmail) return;

  const te = await getTranslations("email");
  const amountFormatted = formatMoney(donation.amountMinor, donation.currency);

  const content = donationReceiptEmail({
    donorName: donation.donorName,
    amountFormatted,
    pageTitle: donation.page.title,
    pageUrl: absoluteUrl(`/d/${donation.page.slug}`),
    cardMask: donation.cardMask,
    t: resolver(te),
  });

  const result = await sendEmail(donation.donorEmail, content);
  if (result.sent) {
    await prisma.donation.update({
      where: { id: donation.id },
      data: { receiptSentAt: new Date() },
    });
  }
}

export async function notifyCreatorOfDonation(
  donation: DonationWithPageAndOwner,
): Promise<void> {
  const te = await getTranslations("email");
  const td = await getTranslations("donation");

  const amountFormatted = formatMoney(donation.amountMinor, donation.currency);
  const donorLabel = donation.isAnonymous
    ? td("anonymous")
    : donation.donorName || td("anonymous");

  const content = creatorNotificationEmail({
    creatorName: donation.page.user.name,
    donorLabel,
    amountFormatted,
    pageTitle: donation.page.title,
    dashboardUrl: absoluteUrl(`/pages/${donation.page.id}/settings`),
    message: donation.message,
    t: resolver(te),
  });

  await sendEmail(donation.page.user.email, content);
}
