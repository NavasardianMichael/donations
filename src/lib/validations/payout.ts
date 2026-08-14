import { z } from "zod";

import { amountBounds } from "@/lib/fees";

import type { MessageResolver } from "./resolver";

/**
 * Where a creator wants their money sent.
 *
 * Armenian banks pay out to either a 16-digit account number or an ArCa card,
 * and creators think of those as two different things, so the method drives
 * which destination field applies. `superRefine` below enforces that — a plain
 * `z.object` cannot, because whichever field is irrelevant must stay optional.
 */
export const PAYOUT_METHODS = ["BANK", "CARD"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const PAYOUT_SCHEDULES = ["MONTHLY", "WEEKLY", "MANUAL"] as const;
export type PayoutSchedule = (typeof PAYOUT_SCHEDULES)[number];

/**
 * Bank identifiers, not bank names — the names are copy and live in
 * `payouts.banks.<id>` like everything else a user reads. `other` covers the
 * long tail without this list pretending to be a registry.
 */
export const PAYOUT_BANKS = [
  "ameriabank",
  "ardshinbank",
  "acba",
  "inecobank",
  "converse",
  "evocabank",
  "unibank",
  "armeconombank",
  "armswissbank",
  "idbank",
  "fast",
] as const;
export type PayoutBank = (typeof PAYOUT_BANKS)[number] | "other";

/** Armenian bank accounts and ArCa cards are both 16 digits. */
const SIXTEEN_DIGITS = /^\d{16}$/;
/** ՀՎՀՀ — the Armenian tax id. */
const TAX_ID = /^\d{8}$/;

/**
 * `thresholdMinor` is minor units like every other amount in this codebase, so
 * `bounds` must be the bounds for the CURRENCY BEING PAID OUT: 100_00 is 100 ֏
 * but $100. Pass `amountBounds(balance.currency)`.
 */
export const payoutSettingsSchema = (
  t: MessageResolver,
  formattedMinimum: string,
  bounds = amountBounds("amd"),
) =>
  z
    .object({
      method: z.enum(PAYOUT_METHODS),
      accountHolder: z
        .string()
        .trim()
        .min(2, t("payout.accountHolderRequired"))
        .max(80, t("name.tooLong")),
      bank: z.string().min(1, t("payout.bankRequired")),
      accountNumber: z.string().trim().optional().or(z.literal("")),
      cardNumber: z.string().trim().optional().or(z.literal("")),
      taxId: z
        .string()
        .trim()
        .regex(TAX_ID, t("payout.taxIdFormat"))
        .optional()
        .or(z.literal("")),
      schedule: z.enum(PAYOUT_SCHEDULES),
      thresholdMinor: z
        .number()
        .int(t("amount.whole"))
        .min(bounds.minMinor, t("payout.thresholdTooSmall", {
          min: formattedMinimum,
        }))
        .max(bounds.maxMinor, t("payout.thresholdTooLarge")),
    })
    .superRefine((values, ctx) => {
      // Only the field the chosen method actually uses is required. Digits are
      // checked here too rather than on the field, so an untouched leftover
      // value from the other method never blocks the form.
      const destination =
        values.method === "BANK"
          ? {
              path: "accountNumber" as const,
              value: values.accountNumber ?? "",
              required: t("payout.accountNumberRequired"),
              format: t("payout.accountNumberFormat"),
            }
          : {
              path: "cardNumber" as const,
              value: values.cardNumber ?? "",
              required: t("payout.cardNumberRequired"),
              format: t("payout.cardNumberFormat"),
            };

      if (destination.value === "") {
        ctx.addIssue({
          code: "custom",
          path: [destination.path],
          message: destination.required,
        });
        return;
      }

      if (!SIXTEEN_DIGITS.test(destination.value.replace(/\s/g, ""))) {
        ctx.addIssue({
          code: "custom",
          path: [destination.path],
          message: destination.format,
        });
      }
    });

export type PayoutSettingsInput = z.infer<
  ReturnType<typeof payoutSettingsSchema>
>;
