"use server";

import { getTranslations } from "next-intl/server";

import { BRAND } from "@/lib/brand";
import { formatMoney } from "@/lib/currency";
import { absoluteUrl } from "@/lib/env";
import { feeBreakdown } from "@/lib/fees";
import {
  isArcaConfigured,
  registerOrder,
  toArcaCurrencyCode,
  ArcaError,
} from "@/lib/payments/arca";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { checkoutSchema } from "@/lib/validations/donation";
import { resolver } from "@/lib/validations/resolver";

import { fail, ok, rateLimited, zodFieldErrors, type ActionResult } from "./types";

/**
 * Start a checkout: create a PENDING Donation, register it with ArCa, and
 * hand back the URL to redirect the donor's browser to.
 *
 * This is the ONLY place a Donation row is created from the public side, and
 * it never marks one SUCCEEDED — that happens exclusively in the return route
 * and the reconcile sweep, both of which confirm with ArCa server-to-server.
 * A donor completing checkout proves nothing by itself; the gateway's answer
 * is the only fact this system trusts.
 */
export async function createCheckoutAction(
  input: unknown,
): Promise<ActionResult<{ redirectUrl: string }>> {
  const tv = await getTranslations("validation");
  const td = await getTranslations("donation");

  // The page's own minimum decides the formatted number in the error message,
  // so the page must be loaded before the schema can be built. A page id that
  // does not resolve to a real page fails here with a generic message rather
  // than leaking which ids exist.
  const rawPageId =
    typeof input === "object" && input !== null && "pageId" in input
      ? String((input as { pageId?: unknown }).pageId ?? "")
      : "";

  const page = rawPageId
    ? await prisma.donationPage.findFirst({
        where: { id: rawPageId, status: "PUBLISHED", deletedAt: null },
      })
    : null;

  if (!page) return fail(td("errors.pageNotAvailable"));

  if (!isArcaConfigured()) {
    return fail(td("errors.providerUnavailable"));
  }

  const ip = await clientIp();
  const limit = await rateLimit("checkout", `${ip}:${page.id}`);
  if (!limit.success) {
    const retryAfter = retryAfterSeconds(limit);
    return rateLimited(tv("rateLimited", { seconds: retryAfter }), retryAfter);
  }

  const schema = checkoutSchema(
    resolver(tv),
    formatMoney(page.minAmountMinor, page.currency),
  );
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return fail(tv("checkFields"), zodFieldErrors(parsed.error.issues));
  }

  const { amountMinor, donorName, donorEmail, message, isAnonymous, source, website } =
    parsed.data;

  // Honeypot: behave as if the request succeeded but do nothing real.
  if (website) {
    return ok({ redirectUrl: absoluteUrl(`/d/${page.slug}`) });
  }

  // The client-side selector already enforces this; re-checking here is what
  // makes it a real rule instead of a suggestion; POSTing straight to this
  // action with an arbitrary amount is one curl call away.
  if (amountMinor < page.minAmountMinor) {
    return fail(
      tv("amount.tooSmall", { min: formatMoney(page.minAmountMinor, page.currency) }),
    );
  }
  if (!page.allowCustomAmount && !page.suggestedAmounts.includes(amountMinor)) {
    return fail(td("errors.amountMismatch"));
  }

  const breakdown = feeBreakdown(amountMinor);

  const donation = await prisma.donation.create({
    data: {
      pageId: page.id,
      amountMinor,
      currency: page.currency,
      platformFeeMinor: breakdown.platformFeeMinor,
      netToCreatorMinor: breakdown.netToCreatorMinor,
      status: "PENDING",
      donorName: page.collectDonorName && !isAnonymous ? donorName || null : null,
      donorEmail: donorEmail || null,
      message: page.collectMessage ? message || null : null,
      isAnonymous,
      source,
    },
    select: { id: true },
  });

  const returnUrl = absoluteUrl(
    `/api/payments/arca/return?donationId=${donation.id}`,
  );

  try {
    const { orderId, formUrl } = await registerOrder({
      orderNumber: donation.id,
      amountMinor,
      currency: toArcaCurrencyCode(page.currency),
      returnUrl,
      failUrl: returnUrl,
      description: `${BRAND.name}: ${page.title}`,
      clientId: donation.id,
      language: "hy",
    });

    await prisma.donation.update({
      where: { id: donation.id },
      data: {
        providerOrderId: orderId,
        status: "AUTHORIZING",
        registeredAt: new Date(),
      },
    });

    return ok({ redirectUrl: formUrl });
  } catch (error) {
    const message = error instanceof ArcaError ? error.message : String(error);

    await prisma.donation.update({
      where: { id: donation.id },
      data: {
        status: "FAILED",
        failureCode: error instanceof ArcaError ? error.errorCode : "unknown",
        failureMessage: message.slice(0, 500),
      },
    });

    // Logged, not shown raw — a gateway error message is not written for a
    // donor to read, and could leak configuration detail.
    console.error("ArCa registerOrder failed:", message);
    return fail(td("errors.registrationFailed"));
  }
}
