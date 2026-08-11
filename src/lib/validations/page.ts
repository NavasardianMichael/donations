import { z } from "zod";

import { ABSOLUTE_MIN_AMOUNT_CENTS, MAX_AMOUNT_CENTS } from "@/lib/fees";

import { slugSchema } from "./slug";

export const SUPPORTED_CURRENCIES = [
  "usd",
  "eur",
  "gbp",
  "cad",
  "aud",
] as const;
export const currencySchema = z.enum(SUPPORTED_CURRENCIES);

const centsSchema = z
  .number()
  .int("Amounts must be whole cents.")
  .min(0)
  .max(MAX_AMOUNT_CENTS);

export const createPageSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Give your page a title.")
    .max(120, "Keep the title under 120 characters."),
  slug: slugSchema,
});

export const updatePageSchema = z.object({
  id: z.string().min(1),

  title: z.string().trim().min(3).max(120),
  description: z
    .string()
    .trim()
    .max(2000, "Keep the description under 2000 characters.")
    .optional()
    .or(z.literal("")),
  coverImageUrl: z
    .string()
    .url("Enter a valid image URL.")
    .optional()
    .or(z.literal("")),

  currency: currencySchema,
  suggestedAmounts: z
    .array(centsSchema.min(ABSOLUTE_MIN_AMOUNT_CENTS))
    .min(1, "Add at least one suggested amount.")
    .max(6, "Six suggested amounts is the maximum.")
    .refine(
      (amounts) => new Set(amounts).size === amounts.length,
      "Suggested amounts must be unique.",
    ),
  allowCustomAmount: z.boolean(),
  minAmountCents: centsSchema.min(
    ABSOLUTE_MIN_AMOUNT_CENTS,
    "Card networks make sub-dollar charges uneconomic.",
  ),
  goalAmountCents: centsSchema.nullable(),
  showProgressBar: z.boolean(),
  collectDonorName: z.boolean(),
  collectMessage: z.boolean(),
  thankYouMessage: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updatePageSeoSchema = z.object({
  id: z.string().min(1),
  slug: slugSchema,
  seoTitle: z
    .string()
    .trim()
    .max(70, "Search engines truncate past ~60 characters.")
    .optional()
    .or(z.literal("")),
  seoDescription: z
    .string()
    .trim()
    .max(200, "Search engines truncate past ~160 characters.")
    .optional()
    .or(z.literal("")),
  seoKeywords: z.string().trim().max(300).optional().or(z.literal("")),
  ogImageUrl: z.string().url().optional().or(z.literal("")),
  noIndex: z.boolean(),
});

export const updatePageEmbedSchema = z.object({
  id: z.string().min(1),
  embedEnabled: z.boolean(),
});

export const pageIdSchema = z.object({ id: z.string().min(1) });

export const checkSlugSchema = z.object({
  slug: slugSchema,
  /** Excluded from the uniqueness check so a page can keep its own slug. */
  excludePageId: z.string().optional(),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type UpdatePageSeoInput = z.infer<typeof updatePageSeoSchema>;
export type UpdatePageEmbedInput = z.infer<typeof updatePageEmbedSchema>;
