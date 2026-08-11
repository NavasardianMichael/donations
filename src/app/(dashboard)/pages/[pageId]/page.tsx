import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { requireUser } from "@/lib/auth-guards";
import type { CurrencyCode } from "@/lib/currency";
import { getOwnedPage } from "@/server/queries/pages";

import { PageEditorForm } from "./page-editor-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pageSettings");
  return { title: t("editorTitle"), robots: { index: false, follow: false } };
}

export default async function PageEditorPage(props: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await props.params;
  const user = await requireUser();

  const page = await getOwnedPage(user.id, pageId);
  if (!page) notFound();

  return (
    <PageEditorForm
      page={{
        id: page.id,
        title: page.title,
        description: page.description,
        coverImageUrl: page.coverImageUrl,
        currency: page.currency as CurrencyCode,
        suggestedAmounts: page.suggestedAmounts,
        allowCustomAmount: page.allowCustomAmount,
        minAmountMinor: page.minAmountMinor,
        goalAmountMinor: page.goalAmountMinor,
        showProgressBar: page.showProgressBar,
        collectDonorName: page.collectDonorName,
        collectMessage: page.collectMessage,
        thankYouMessage: page.thankYouMessage,
      }}
    />
  );
}
