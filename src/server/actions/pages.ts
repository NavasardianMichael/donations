"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { requireUserOrThrow } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { slugify } from "@/lib/utils";
import {
  createPageSchema,
  pageIdSchema,
  updatePageEmbedSchema,
  updatePageSchema,
  updatePageSeoSchema,
} from "@/lib/validations/page";
import { resolver } from "@/lib/validations/resolver";
import { slugSchema } from "@/lib/validations/slug";
import { isSlugAvailable } from "@/server/queries/pages";

import {
  fail,
  ok,
  rateLimited,
  zodFieldErrors,
  type ActionResult,
} from "./types";

/**
 * Mutations for donation pages.
 *
 * EVERY action here does two things before touching data:
 *   1. `requireUserOrThrow()` — a Server Action is a public HTTP endpoint;
 *      being reachable only from a protected layout grants nothing.
 *   2. An ownership check written INTO the query (`where: { id, userId }`),
 *      never as an `if` after the fetch. `updateMany`/`deleteMany` with both
 *      keys means a mismatched owner updates zero rows instead of the wrong
 *      row, and there is no window where someone else's record is in memory.
 *
 * And every mutation revalidates `/d/<slug>`, or the cached public page keeps
 * serving content the database no longer agrees with.
 */

/** Both the dashboard list and the public page must reflect a change. */
function revalidatePage(slug: string) {
  revalidatePath("/pages");
  revalidatePath("/dashboard");
  revalidatePath(`/d/${slug}`);
  revalidatePath(`/embed/${slug}`);
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createPageAction(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const user = await requireUserOrThrow();
  const tv = await getTranslations("validation");

  const parsed = createPageSchema(resolver(tv)).safeParse(input);
  if (!parsed.success) {
    return fail(tv("checkFields"), zodFieldErrors(parsed.error.issues));
  }

  const { title, slug } = parsed.data;

  if (!(await isSlugAvailable(slug))) {
    return fail(tv("slug.taken"), { slug: tv("slug.taken") });
  }

  const page = await prisma.donationPage.create({
    data: { userId: user.id, title, slug },
    select: { id: true, slug: true },
  });

  revalidatePage(page.slug);
  return ok(page);
}

/** Suggest a free slug for a title, appending -2, -3 … if taken. */
export async function suggestSlugAction(
  title: string,
): Promise<ActionResult<{ slug: string }>> {
  await requireUserOrThrow();

  const base = slugify(title) || "page";
  let candidate = base;

  for (let n = 2; n < 50; n++) {
    if (await isSlugAvailable(candidate)) break;
    candidate = `${base}-${n}`;
  }

  return ok({ slug: candidate });
}

export async function checkSlugAction(
  slug: string,
  excludePageId?: string,
): Promise<ActionResult<{ available: boolean }>> {
  await requireUserOrThrow();
  const tv = await getTranslations("validation");

  const ip = await clientIp();
  const limit = await rateLimit("slugCheck", ip);
  if (!limit.success) {
    const retryAfter = retryAfterSeconds(limit);
    return rateLimited(tv("rateLimited", { seconds: retryAfter }), retryAfter);
  }

  const parsed = slugSchema(resolver(tv)).safeParse(slug);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? tv("checkFields"));
  }

  return ok({ available: await isSlugAvailable(parsed.data, excludePageId) });
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updatePageAction(
  input: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const user = await requireUserOrThrow();
  const tv = await getTranslations("validation");

  const parsed = updatePageSchema(resolver(tv)).safeParse(input);
  if (!parsed.success) {
    return fail(tv("checkFields"), zodFieldErrors(parsed.error.issues));
  }

  const { id, ...data } = parsed.data;

  // Ownership is in the WHERE clause, so a foreign id updates nothing.
  const result = await prisma.donationPage.updateMany({
    where: { id, userId: user.id, deletedAt: null },
    data: {
      ...data,
      description: data.description || null,
      coverImageUrl: data.coverImageUrl || null,
      thankYouMessage: data.thankYouMessage || null,
    },
  });

  if (result.count === 0) return fail(tv("notFound"));

  const page = await prisma.donationPage.findUnique({
    where: { id },
    select: { slug: true },
  });

  if (page) revalidatePage(page.slug);
  return ok({ slug: page?.slug ?? "" });
}

export async function updatePageSeoAction(
  input: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const user = await requireUserOrThrow();
  const tv = await getTranslations("validation");

  const parsed = updatePageSeoSchema(resolver(tv)).safeParse(input);
  if (!parsed.success) {
    return fail(tv("checkFields"), zodFieldErrors(parsed.error.issues));
  }

  const { id, slug, ...seo } = parsed.data;

  const current = await prisma.donationPage.findFirst({
    where: { id, userId: user.id, deletedAt: null },
    select: { slug: true },
  });
  if (!current) return fail(tv("notFound"));

  if (slug !== current.slug && !(await isSlugAvailable(slug, id))) {
    return fail(tv("slug.taken"), { slug: tv("slug.taken") });
  }

  await prisma.donationPage.updateMany({
    where: { id, userId: user.id, deletedAt: null },
    data: {
      slug,
      seoTitle: seo.seoTitle || null,
      seoDescription: seo.seoDescription || null,
      seoKeywords: seo.seoKeywords || null,
      ogImageUrl: seo.ogImageUrl || null,
      noIndex: seo.noIndex,
    },
  });

  // The old address must be purged too, or it keeps serving from cache.
  revalidatePage(current.slug);
  revalidatePage(slug);

  return ok({ slug });
}

export async function updatePageEmbedAction(
  input: unknown,
): Promise<ActionResult<{ embedEnabled: boolean }>> {
  const user = await requireUserOrThrow();
  const tv = await getTranslations("validation");

  const parsed = updatePageEmbedSchema.safeParse(input);
  if (!parsed.success) return fail(tv("checkFields"));

  const { id, embedEnabled } = parsed.data;

  const page = await prisma.donationPage.findFirst({
    where: { id, userId: user.id, deletedAt: null },
    select: { slug: true },
  });
  if (!page) return fail(tv("notFound"));

  await prisma.donationPage.updateMany({
    where: { id, userId: user.id, deletedAt: null },
    data: { embedEnabled },
  });

  revalidatePage(page.slug);
  return ok({ embedEnabled });
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export async function publishPageAction(
  input: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const user = await requireUserOrThrow();
  const tv = await getTranslations("validation");
  const tp = await getTranslations("pages");

  const parsed = pageIdSchema.safeParse(input);
  if (!parsed.success) return fail(tv("checkFields"));

  const page = await prisma.donationPage.findFirst({
    where: { id: parsed.data.id, userId: user.id, deletedAt: null },
    select: { id: true, slug: true, title: true, publishedAt: true },
  });
  if (!page) return fail(tv("notFound"));

  await prisma.donationPage.update({
    where: { id: page.id },
    data: {
      status: "PUBLISHED",
      // Keep the original publication date across unpublish/republish cycles.
      publishedAt: page.publishedAt ?? new Date(),
    },
  });

  revalidatePage(page.slug);
  return ok({ slug: page.slug }, tp("published"));
}

export async function unpublishPageAction(
  input: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const user = await requireUserOrThrow();
  const tv = await getTranslations("validation");
  const tp = await getTranslations("pages");

  const parsed = pageIdSchema.safeParse(input);
  if (!parsed.success) return fail(tv("checkFields"));

  const page = await prisma.donationPage.findFirst({
    where: { id: parsed.data.id, userId: user.id, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!page) return fail(tv("notFound"));

  await prisma.donationPage.update({
    where: { id: page.id },
    data: { status: "DRAFT" },
  });

  revalidatePage(page.slug);
  return ok({ slug: page.slug }, tp("unpublished"));
}

export async function duplicatePageAction(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const user = await requireUserOrThrow();
  const tv = await getTranslations("validation");
  const tp = await getTranslations("pages");

  const parsed = pageIdSchema.safeParse(input);
  if (!parsed.success) return fail(tv("checkFields"));

  const source = await prisma.donationPage.findFirst({
    where: { id: parsed.data.id, userId: user.id, deletedAt: null },
  });
  if (!source) return fail(tv("notFound"));

  let slug = `${source.slug}-2`;
  for (let n = 2; n < 50; n++) {
    slug = `${source.slug}-${n}`;
    if (await isSlugAvailable(slug)) break;
  }

  const copy = await prisma.donationPage.create({
    data: {
      userId: user.id,
      slug,
      title: `${source.title} (${tp("copySuffix")})`,
      description: source.description,
      coverImageUrl: source.coverImageUrl,
      // A duplicate always starts as a draft, never live.
      status: "DRAFT",
      currency: source.currency,
      suggestedAmounts: source.suggestedAmounts,
      suggestedAmountsUsd: source.suggestedAmountsUsd,
      allowCustomAmount: source.allowCustomAmount,
      minAmountMinor: source.minAmountMinor,
      minAmountMinorUsd: source.minAmountMinorUsd,
      goalAmountMinor: source.goalAmountMinor,
      showProgressBar: source.showProgressBar,
      collectDonorName: source.collectDonorName,
      collectMessage: source.collectMessage,
      thankYouMessage: source.thankYouMessage,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      seoKeywords: source.seoKeywords,
      ogImageUrl: source.ogImageUrl,
      noIndex: source.noIndex,
      embedEnabled: source.embedEnabled,
      theme: source.theme ?? undefined,
    },
    select: { id: true, slug: true },
  });

  revalidatePage(copy.slug);
  return ok(copy, tp("duplicated"));
}

/**
 * Soft delete.
 *
 * The row stays so donation history and analytics keep their foreign keys —
 * a creator's reporting should not lose rows because a page was removed. The
 * slug is released by prefixing it, so the address can be reused.
 */
export async function deletePageAction(
  input: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const user = await requireUserOrThrow();
  const tv = await getTranslations("validation");
  const tp = await getTranslations("pages");

  const parsed = pageIdSchema.safeParse(input);
  if (!parsed.success) return fail(tv("checkFields"));

  const page = await prisma.donationPage.findFirst({
    where: { id: parsed.data.id, userId: user.id, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!page) return fail(tv("notFound"));

  const now = new Date();
  await prisma.donationPage.update({
    where: { id: page.id },
    data: {
      status: "ARCHIVED",
      deletedAt: now,
      // Free the address for reuse without breaking the unique index.
      slug: `deleted-${now.getTime()}-${page.slug}`.slice(0, 60),
    },
  });

  revalidatePage(page.slug);
  return ok({ slug: page.slug }, tp("deleted"));
}
