import { z } from "zod";

import { ABSOLUTE_MIN_AMOUNT_MINOR, MAX_AMOUNT_MINOR } from "@/lib/fees";

import type { MessageResolver } from "./resolver";

/**
 * What the donation form submits to start a checkout.
 *
 * The amount arriving here is UNTRUSTED regardless of what this schema
 * allows — `createCheckoutAction` re-validates it against the page's own
 * `minAmountMinor` and, when custom amounts are disabled, against its
 * `suggestedAmounts`. This schema only rejects values that could never be
 * valid for ANY page (negative, absurdly large, non-integer).
 */
export const checkoutSchema = (t: MessageResolver, formattedMinimum: string) =>
  z.object({
    pageId: z.string().min(1),
    amountMinor: z
      .number()
      .int(t("amount.whole"))
      .min(
        ABSOLUTE_MIN_AMOUNT_MINOR,
        t("amount.tooSmall", { min: formattedMinimum }),
      )
      .max(MAX_AMOUNT_MINOR, t("amount.tooLarge")),
    donorName: z.string().trim().max(80).optional().or(z.literal("")),
    donorEmail: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .email(t("email.invalid"))
      .optional()
      .or(z.literal("")),
    message: z.string().trim().max(500, t("message.tooLong")).optional().or(
      z.literal(""),
    ),
    isAnonymous: z.boolean().default(false),
    source: z.enum(["DIRECT", "EMBED", "REFERRAL"]).default("DIRECT"),
    /** Honeypot — permissive, silently discarded by the action. */
    website: z.string().max(200).optional(),
  });

export type CheckoutInput = z.infer<ReturnType<typeof checkoutSchema>>;

/**
 * @deprecated kept only for the amount-selector's client-side probe; prefer
 * `checkoutSchema` for anything that submits.
 */
export const donationAmountSchema = (
  t: MessageResolver,
  formattedMinimum: string,
) =>
  z.object({
    pageId: z.string().min(1),
    amountMinor: z
      .number()
      .int(t("amount.whole"))
      .min(
        ABSOLUTE_MIN_AMOUNT_MINOR,
        t("amount.tooSmall", { min: formattedMinimum }),
      )
      .max(MAX_AMOUNT_MINOR, t("amount.tooLarge")),
  });

export const trackViewSchema = z.object({
  pageId: z.string().min(1).max(64),
  source: z.enum(["DIRECT", "EMBED", "REFERRAL"]).default("DIRECT"),
  referrer: z.string().max(500).optional(),
});

export const contactSchema = (t: MessageResolver) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, t("name.required"))
      .max(80, t("name.tooLong")),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, t("email.required"))
      .email(t("email.invalid"))
      .max(254),
    subject: z.string().trim().max(120).optional().or(z.literal("")),
    message: z
      .string()
      .trim()
      .min(20, t("message.tooShort"))
      .max(4000, t("message.tooLong")),
    /** Honeypot — permissive here, silently discarded by the action. */
    website: z.string().max(200).optional(),
  });

export type DonationAmountInput = z.infer<
  ReturnType<typeof donationAmountSchema>
>;
export type TrackViewInput = z.infer<typeof trackViewSchema>;
export type ContactInput = z.infer<ReturnType<typeof contactSchema>>;
