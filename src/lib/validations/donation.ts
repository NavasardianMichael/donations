import { z } from "zod";

import { ABSOLUTE_MIN_AMOUNT_CENTS, MAX_AMOUNT_CENTS } from "@/lib/fees";

/**
 * The amount a donor has selected on a public page.
 *
 * There is no payment provider yet, so nothing submits this — the Donate
 * button is disabled and no Donation row is ever created by the app. The
 * schema exists because the amount selector still validates its input
 * client-side, and because this is the exact shape a checkout action will
 * take when a processor is added.
 *
 * When that happens: the amount arriving here is UNTRUSTED. Re-validate it
 * server-side against the page's own `minAmountCents` and, when custom
 * amounts are disabled, against its `suggestedAmounts`.
 */
export const donationAmountSchema = z.object({
  pageId: z.string().min(1),
  amountCents: z
    .number()
    .int("Enter a whole amount.")
    .min(ABSOLUTE_MIN_AMOUNT_CENTS, "The minimum donation is $1.00.")
    .max(MAX_AMOUNT_CENTS, "That amount is too large for a single donation."),
});

export const trackViewSchema = z.object({
  pageId: z.string().min(1).max(64),
  source: z.enum(["DIRECT", "EMBED", "REFERRAL"]).default("DIRECT"),
  referrer: z.string().max(500).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required.")
    .email("Enter a valid email address.")
    .max(254),
  subject: z.string().trim().max(120).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(20, "Tell us a little more — at least 20 characters.")
    .max(4000),
  // Honeypot.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type DonationAmountInput = z.infer<typeof donationAmountSchema>;
export type TrackViewInput = z.infer<typeof trackViewSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
