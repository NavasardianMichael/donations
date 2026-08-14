"use server";

import { getTranslations } from "next-intl/server";

import type { DonationPage, PaymentProvider } from "@/generated/prisma/client";
import { BRAND } from "@/lib/brand";
import { formatMoney } from "@/lib/currency";
import { absoluteUrl } from "@/lib/env";
import { amountBounds, feeBreakdown } from "@/lib/fees";
import {
  isArcaConfigured,
  registerOrder,
  toArcaCurrencyCode,
  ArcaError,
} from "@/lib/payments/arca";
import {
  createTransaction,
  isPaddleConfigured,
  PADDLE_CURRENCY,
  PaddleError,
} from "@/lib/payments/paddle";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { checkoutSchema, type PaymentMethod } from "@/lib/validations/donation";
import { resolver } from "@/lib/validations/resolver";

import { fail, ok, rateLimited, zodFieldErrors, type ActionResult } from "./types";

/**
 * Start a checkout: create a PENDING Donation, register it with the chosen
 * gateway, and hand back the URL to send the donor's browser to.
 *
 * This is the ONLY place a Donation row is created from the public side, and it
 * never marks one SUCCEEDED — that happens exclusively in the ArCa return
 * route, the Paddle webhook, and the reconcile sweep, all of which confirm
 * server-to-server. A donor completing checkout proves nothing by itself; the
 * gateway's own answer is the only fact this system trusts.
 *
 * Two providers, one entry point:
 *
 * - **ARCA** charges the page's own currency and returns ArCa's hosted `formUrl`.
 * - **PADDLE** charges USD from the page's international ladder, and returns a
 *   URL on OUR domain that opens Paddle's overlay.
 *
 * Both come back as `{ redirectUrl }`, so the form navigates the same way for
 * either — the difference stays server-side.
 */
export async function createCheckoutAction(
  input: unknown,
): Promise<ActionResult<{ redirectUrl: string; newTab: boolean }>> {
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

  // Which method was asked for decides which currency, ladder and bounds
  // apply, so it has to be read before the schema is built. Never trusted —
  // `paymentMethodSchema` re-validates it below, and an unrecognised value
  // falls back to ARCA rather than skipping the provider check.
  const rawMethod =
    typeof input === "object" && input !== null && "method" in input
      ? String((input as { method?: unknown }).method ?? "")
      : "";
  const method: PaymentMethod = rawMethod === "PADDLE" ? "PADDLE" : "ARCA";

  // Credentials are optional so the app can boot without a gateway. The form
  // stays interactive; this is the point a missing provider becomes an error
  // the donor can read, rather than a disabled button.
  if (
    (method === "ARCA" && !isArcaConfigured()) ||
    (method === "PADDLE" && !isPaddleConfigured())
  ) {
    return fail(td("errors.providerUnavailable"));
  }

  const ip = await clientIp();
  const limit = await rateLimit("checkout", `${ip}:${page.id}`);
  if (!limit.success) {
    const retryAfter = retryAfterSeconds(limit);
    return rateLimited(tv("rateLimited", { seconds: retryAfter }), retryAfter);
  }

  // The charged currency is NOT the page's display currency for Paddle.
  const chargeCurrency = method === "PADDLE" ? PADDLE_CURRENCY : page.currency;
  const platformBounds = amountBounds(chargeCurrency);
  const chargeMinimum =
    (method === "PADDLE" ? page.minAmountMinorUsd : page.minAmountMinor) ??
    platformBounds.minMinor;
  const chargeMaximum =
    (method === "PADDLE" ? page.maxAmountMinorUsd : page.maxAmountMinor) ??
    platformBounds.maxMinor;
  const chargeLadder =
    method === "PADDLE" ? page.suggestedAmountsUsd : page.suggestedAmounts;

  const schema = checkoutSchema(
    resolver(tv),
    formatMoney(chargeMinimum, chargeCurrency),
    { minMinor: chargeMinimum, maxMinor: chargeMaximum },
  );
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return fail(tv("checkFields"), zodFieldErrors(parsed.error.issues));
  }

  const { amountMinor, donorName, donorEmail, message, isAnonymous, source, website } =
    parsed.data;

  // Honeypot: behave as if the request succeeded but do nothing real.
  if (website) {
    return ok({
      redirectUrl: absoluteUrl(`/d/${page.slug}`),
      newTab: false,
    });
  }

  // The client-side selector already enforces this; re-checking here is what
  // makes it a real rule instead of a suggestion; POSTing straight to this
  // action with an arbitrary amount is one curl call away. Note both checks run
  // against the ladder for the CHOSEN method — a USD amount validated against
  // the AMD ladder would pass nothing, and an AMD amount validated against the
  // USD one would let a 100 ֏ donation through as $1.
  if (amountMinor < chargeMinimum) {
    return fail(
      tv("amount.tooSmall", { min: formatMoney(chargeMinimum, chargeCurrency) }),
    );
  }
  if (amountMinor > chargeMaximum) {
    return fail(
      tv("amount.abovePageMaximum", {
        max: formatMoney(chargeMaximum, chargeCurrency),
      }),
    );
  }
  if (!page.allowCustomAmount && !chargeLadder.includes(amountMinor)) {
    return fail(td("errors.amountMismatch"));
  }

  const breakdown = feeBreakdown(amountMinor);

  const donation = await prisma.donation.create({
    data: {
      pageId: page.id,
      amountMinor,
      currency: chargeCurrency,
      // Every aggregate sums this, so it must be in the PAGE's currency
      // regardless of what was charged. Frozen now: editing the ladders later
      // must not rewrite what a past donation was worth.
      pageAmountMinor: toPageCurrencyMinor(page, method, amountMinor),
      platformFeeMinor: breakdown.platformFeeMinor,
      netToCreatorMinor: breakdown.netToCreatorMinor,
      status: "PENDING",
      // Written explicitly rather than left to the schema default, which would
      // label a Paddle donation ARCA and send the reconcile sweep to the wrong
      // gateway with an id it cannot resolve.
      provider: method satisfies PaymentProvider,
      donorName: page.collectDonorName && !isAnonymous ? donorName || null : null,
      donorEmail: donorEmail || null,
      message: page.collectMessage ? message || null : null,
      isAnonymous,
      source,
    },
    select: { id: true },
  });

  try {
    const redirectUrl =
      method === "PADDLE"
        ? await startPaddleCheckout({
            donationId: donation.id,
            amountMinor,
            pageTitle: page.title,
            donorEmail: donorEmail || null,
          })
        : await startArcaCheckout({
            donationId: donation.id,
            amountMinor,
            currency: page.currency,
            pageTitle: page.title,
          });

    return ok({
      redirectUrl,
      // A Paddle overlay nested inside a third-party iframe is unreliable, so
      // an embedded widget hands the checkout to a new top-level tab instead.
      newTab: method === "PADDLE" && source === "EMBED",
    });
  } catch (error) {
    const { code, message: detail } = describeProviderError(error);

    await prisma.donation.update({
      where: { id: donation.id },
      data: {
        status: "FAILED",
        failureCode: code,
        failureMessage: detail.slice(0, 500),
      },
    });

    // Logged, not shown raw — a gateway error message is not written for a
    // donor to read, and could leak configuration detail.
    console.error(`${method} checkout registration failed:`, detail);
    return fail(td("errors.registrationFailed"));
  }
}

/**
 * The donation's worth in the page's own currency.
 *
 * For ArCa this is the amount itself. For Paddle it has to be derived, and the
 * creator's two ladders are the only rate anywhere in the system: an amount
 * picked off the international ladder maps to the AMD amount at the same index.
 * A custom amount has no counterpart, so it is scaled by the ratio the ladders
 * imply — the creator's own declared pricing, not an invented FX rate.
 */
function toPageCurrencyMinor(
  page: DonationPage,
  method: PaymentMethod,
  amountMinor: number,
): number {
  if (method !== "PADDLE") return amountMinor;

  const index = page.suggestedAmountsUsd.indexOf(amountMinor);
  const paired = page.suggestedAmounts[index];
  if (index !== -1 && paired !== undefined) return paired;

  const usdTotal = page.suggestedAmountsUsd.reduce((sum, a) => sum + a, 0);
  const pageTotal = page.suggestedAmounts.reduce((sum, a) => sum + a, 0);
  // No usable ladder to scale by — record the charged amount rather than a
  // divide-by-zero. Rare enough to accept; a page always ships with defaults.
  if (usdTotal <= 0 || pageTotal <= 0) return amountMinor;

  return Math.round((amountMinor * pageTotal) / usdTotal);
}

async function startArcaCheckout(input: {
  donationId: string;
  amountMinor: number;
  currency: string;
  pageTitle: string;
}): Promise<string> {
  const returnUrl = absoluteUrl(
    `/api/payments/arca/return?donationId=${input.donationId}`,
  );

  const { orderId, formUrl } = await registerOrder({
    orderNumber: input.donationId,
    amountMinor: input.amountMinor,
    currency: toArcaCurrencyCode(input.currency),
    returnUrl,
    failUrl: returnUrl,
    description: `${BRAND.name}: ${input.pageTitle}`,
    clientId: input.donationId,
    language: "hy",
  });

  await prisma.donation.update({
    where: { id: input.donationId },
    data: {
      providerOrderId: orderId,
      status: "AUTHORIZING",
      registeredAt: new Date(),
    },
  });

  return formUrl;
}

async function startPaddleCheckout(input: {
  donationId: string;
  amountMinor: number;
  pageTitle: string;
  donorEmail: string | null;
}): Promise<string> {
  const { transactionId, checkoutUrl } = await createTransaction({
    donationId: input.donationId,
    amountMinor: input.amountMinor,
    description: `${BRAND.name}: ${input.pageTitle}`,
    // Paddle appends `?_ptxn=txn_…` to this. The donation id rides in the path
    // so appending a query string cannot corrupt it.
    checkoutUrl: absoluteUrl(`/paddle/checkout/${input.donationId}`),
    donorEmail: input.donorEmail,
  });

  await prisma.donation.update({
    where: { id: input.donationId },
    data: {
      providerOrderId: transactionId,
      status: "AUTHORIZING",
      registeredAt: new Date(),
    },
  });

  return checkoutUrl;
}

function describeProviderError(error: unknown): {
  code: string;
  message: string;
} {
  if (error instanceof ArcaError || error instanceof PaddleError) {
    return { code: error.errorCode, message: error.message };
  }
  return {
    code: "unknown",
    message: error instanceof Error ? error.message : String(error),
  };
}
