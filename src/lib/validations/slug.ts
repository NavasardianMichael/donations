import { z } from "zod";

/**
 * Slugs live in the root path namespace via /d/[slug], and a few words would
 * collide with real routes (or read as official). Rejected at validation time,
 * not just in the UI.
 */
export const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "administrator",
  "dashboard",
  "embed",
  "login",
  "signin",
  "sign-in",
  "signup",
  "sign-up",
  "logout",
  "contact",
  "faq",
  "help",
  "support",
  "terms",
  "donation-terms",
  "privacy",
  "legal",
  "d",
  "_next",
  "static",
  "assets",
  "public",
  "about",
  "pricing",
  "settings",
  "account",
  "profile",
  "billing",
  "payouts",
  "analytics",
  "pages",
  "new",
  "edit",
  "dev",
  "sitemap",
  "robots",
  "givedirect",
  "www",
  "mail",
]);

export const SLUG_MIN = 3;
export const SLUG_MAX = 60;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(SLUG_MIN, `Must be at least ${SLUG_MIN} characters.`)
  .max(SLUG_MAX, `Must be ${SLUG_MAX} characters or fewer.`)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and single hyphens only.",
  )
  .refine((value) => !RESERVED_SLUGS.has(value), {
    message: "That address is reserved. Pick another.",
  });

export type Slug = z.infer<typeof slugSchema>;
