import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { requireUser } from "@/lib/auth-guards";
import { getOwnedPage } from "@/server/queries/pages";

import { PageSettingsForm } from "./settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pageSettings");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * SEO settings. Title, status badge and per-page tabs are rendered once by
 * the parent layout, which is also what performs the ownership check for
 * every tab — this call is a cache-deduped re-read for the form's own data,
 * not a second gate.
 */
export default async function PageSettingsPage(props: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await props.params;
  const user = await requireUser();

  const page = await getOwnedPage(user.id, pageId);
  if (!page) notFound();

  return (
    <PageSettingsForm
      page={{
        id: page.id,
        slug: page.slug,
        title: page.title,
        description: page.description,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        seoKeywords: page.seoKeywords,
        ogImageUrl: page.ogImageUrl,
        noIndex: page.noIndex,
      }}
    />
  );
}
