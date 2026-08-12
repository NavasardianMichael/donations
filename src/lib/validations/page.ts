import { z } from "zod";

import {
  ABSOLUTE_MIN_AMOUNT_MINOR,
  MAX_AMOUNT_MINOR,
  amountBounds,
} from "@/lib/fees";

import type { MessageResolver } from "./resolver";
import { slugSchema } from "./slug";

const USD_BOUNDS = amountBounds("usd");

/**
 * AMD first — the platform serves the Armenian market. USD and EUR stay
 * available for campaigns aimed at donors abroad.
 */
export const SUPPORTED_CURRENCIES = ["amd", "usd", "eur"] as const;
export const currencySchema = z.enum(SUPPORTED_CURRENCIES);

const minorSchema = (t: MessageResolver) =>
  z
    .number()
    .int(t("amount.whole"))
    .min(0)
    .max(MAX_AMOUNT_MINOR, t("amount.tooLarge"));

export const createPageSchema = (t: MessageResolver) =>
  z.object({
    title: z
      .string()
      .trim()
      .min(3, t("page.titleRequired"))
      .max(120, t("page.titleTooLong")),
    slug: slugSchema(t),
  });

export const updatePageSchema = (t: MessageResolver) =>
  z.object({
    id: z.string().min(1),

    title: z
      .string()
      .trim()
      .min(3, t("page.titleRequired"))
      .max(120, t("page.titleTooLong")),
    description: z
      .string()
      .trim()
      .max(2000, t("page.descriptionTooLong"))
      .optional()
      .or(z.literal("")),
    coverImageUrl: z
      .string()
      .url(t("url.invalid"))
      .optional()
      .or(z.literal("")),

    currency: currencySchema,
    suggestedAmounts: z
      .array(minorSchema(t).min(ABSOLUTE_MIN_AMOUNT_MINOR, t("amount.whole")))
      .min(1, t("page.amountsMin"))
      .max(6, t("page.amountsMax"))
      .refine(
        (amounts) => new Set(amounts).size === amounts.length,
        t("page.amountsUnique"),
      ),
    /**
     * The international ladder, in USD cents, index-matched to
     * `suggestedAmounts`. Paddle cannot charge AMD, so the creator authors
     * these rather than the platform guessing an exchange rate. The lengths are
     * checked together at the object level below — a mismatch would silently
     * leave an AMD chip with no international counterpart.
     */
    suggestedAmountsUsd: z
      .array(
        z
          .number()
          .int(t("amount.whole"))
          .min(USD_BOUNDS.minMinor, t("amount.tooSmall", { min: "$1" }))
          .max(USD_BOUNDS.maxMinor, t("amount.tooLarge")),
      )
      .min(1, t("page.amountsMin"))
      .max(6, t("page.amountsMax"))
      .refine(
        (amounts) => new Set(amounts).size === amounts.length,
        t("page.amountsUnique"),
      ),
    allowCustomAmount: z.boolean(),
    minAmountMinor: minorSchema(t).min(
      ABSOLUTE_MIN_AMOUNT_MINOR,
      t("amount.whole"),
    ),
    minAmountMinorUsd: z
      .number()
      .int(t("amount.whole"))
      .min(USD_BOUNDS.minMinor, t("amount.tooSmall", { min: "$1" }))
      .max(USD_BOUNDS.maxMinor, t("amount.tooLarge")),
    goalAmountMinor: minorSchema(t).nullable(),
    showProgressBar: z.boolean(),
    collectDonorName: z.boolean(),
    collectMessage: z.boolean(),
    thankYouMessage: z
      .string()
      .trim()
      .max(500, t("message.tooLong"))
      .optional()
      .or(z.literal("")),
  })
    .refine(
      (page) => page.suggestedAmounts.length === page.suggestedAmountsUsd.length,
      {
        message: t("page.amountsUsdLengthMismatch"),
        path: ["suggestedAmountsUsd"],
      },
    );

export const updatePageSeoSchema = (t: MessageResolver) =>
  z.object({
    id: z.string().min(1),
    slug: slugSchema(t),
    seoTitle: z
      .string()
      .trim()
      .max(70, t("page.seoTitleTooLong"))
      .optional()
      .or(z.literal("")),
    seoDescription: z
      .string()
      .trim()
      .max(200, t("page.seoDescriptionTooLong"))
      .optional()
      .or(z.literal("")),
    seoKeywords: z.string().trim().max(300).optional().or(z.literal("")),
    ogImageUrl: z.string().url(t("url.invalid")).optional().or(z.literal("")),
    noIndex: z.boolean(),
  });

export const updatePageEmbedSchema = z.object({
  id: z.string().min(1),
  embedEnabled: z.boolean(),
});

export const pageIdSchema = z.object({ id: z.string().min(1) });

export const checkSlugSchema = (t: MessageResolver) =>
  z.object({
    slug: slugSchema(t),
    /** Excluded from the uniqueness check so a page can keep its own slug. */
    excludePageId: z.string().optional(),
  });

export type CreatePageInput = z.infer<ReturnType<typeof createPageSchema>>;
export type UpdatePageInput = z.infer<ReturnType<typeof updatePageSchema>>;
export type UpdatePageSeoInput = z.infer<
  ReturnType<typeof updatePageSeoSchema>
>;
export type UpdatePageEmbedInput = z.infer<typeof updatePageEmbedSchema>;
