import { z } from "zod";

import type { MessageResolver } from "./resolver";

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

export const slugSchema = (t: MessageResolver) =>
  z
    .string()
    .trim()
    .toLowerCase()
    .min(SLUG_MIN, t("slug.tooShort", { min: SLUG_MIN }))
    .max(SLUG_MAX, t("slug.tooLong", { max: SLUG_MAX }))
    // Latin only: the slug lands in a URL, and Armenian would be
    // percent-encoded into an unreadable mess. `slugify()` transliterates.
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, t("slug.format"))
    .refine((value) => !RESERVED_SLUGS.has(value), {
      message: t("slug.reserved"),
    });

export type Slug = string;
