import { z } from "zod";

import { parseOrigin } from "@/lib/embed-origins";
import {
  ABSOLUTE_MIN_AMOUNT_MINOR,
  MAX_AMOUNT_MINOR,
  amountBounds,
} from "@/lib/fees";

import type { MessageResolver } from "./resolver";
import { slugSchema } from "./slug";
import { httpUrlSchema } from "./url";

const USD_BOUNDS = amountBounds("usd");

/** Suggested-amount chips on a donation page. Shared with the editor. */
export const SUGGESTED_AMOUNTS_MAX = 10;

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
    coverImageUrl: httpUrlSchema(t),

    currency: currencySchema,
    suggestedAmounts: z
      .array(minorSchema(t).min(ABSOLUTE_MIN_AMOUNT_MINOR, t("amount.whole")))
      .min(1, t("page.amountsMin"))
      .max(SUGGESTED_AMOUNTS_MAX, t("page.amountsMax"))
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
      .max(SUGGESTED_AMOUNTS_MAX, t("page.amountsMax"))
      .refine(
        (amounts) => new Set(amounts).size === amounts.length,
        t("page.amountsUnique"),
      ),
    allowCustomAmount: z.boolean(),
    minAmountMinor: minorSchema(t)
      .min(ABSOLUTE_MIN_AMOUNT_MINOR, t("amount.whole"))
      .nullable(),
    maxAmountMinor: minorSchema(t)
      .min(ABSOLUTE_MIN_AMOUNT_MINOR, t("amount.whole"))
      .nullable(),
    minAmountMinorUsd: z
      .number()
      .int(t("amount.whole"))
      .min(USD_BOUNDS.minMinor, t("amount.tooSmall", { min: "$1" }))
      .max(USD_BOUNDS.maxMinor, t("amount.tooLarge"))
      .nullable(),
    maxAmountMinorUsd: z
      .number()
      .int(t("amount.whole"))
      .min(USD_BOUNDS.minMinor, t("amount.tooSmall", { min: "$1" }))
      .max(USD_BOUNDS.maxMinor, t("amount.tooLarge"))
      .nullable(),
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
    )
    .refine(
      (page) =>
        page.minAmountMinor === null ||
        page.maxAmountMinor === null ||
        page.minAmountMinor < page.maxAmountMinor,
      {
        message: t("page.minMaxOrder"),
        path: ["maxAmountMinor"],
      },
    )
    .refine(
      (page) =>
        page.minAmountMinorUsd === null ||
        page.maxAmountMinorUsd === null ||
        page.minAmountMinorUsd < page.maxAmountMinorUsd,
      {
        message: t("page.minMaxOrder"),
        path: ["maxAmountMinorUsd"],
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
    seoKeywords: z
      .string()
      .trim()
      .max(300, t("page.keywordsTooLong"))
      .optional()
      .or(z.literal("")),
    ogImageUrl: httpUrlSchema(t),
    noIndex: z.boolean(),
  });

export const updatePageEmbedSchema = (t: MessageResolver) =>
  z.object({
    id: z.string().min(1),
    embedEnabled: z.boolean(),
    embedAllowAnyOrigin: z.boolean(),
    embedAllowedOrigins: z
      .array(z.string())
      .max(25, t("page.originsMax"))
      .superRefine((origins, ctx) => {
        for (let i = 0; i < origins.length; i++) {
          if (!parseOrigin(origins[i] ?? "")) {
            ctx.addIssue({
              code: "custom",
              message: t("url.invalid"),
              path: [i],
            });
          }
        }
      }),
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
export type UpdatePageEmbedInput = z.infer<
  ReturnType<typeof updatePageEmbedSchema>
>;
