import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { requireUser } from "@/lib/auth-guards";
import { parseAnalyticsRange } from "@/server/queries/analytics";
import { getOwnedPage } from "@/server/queries/pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("analytics");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function PageAnalyticsPage(props: {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { pageId } = await props.params;
  const searchParams = await props.searchParams;
  const user = await requireUser();

  const page = await getOwnedPage(user.id, pageId);
  if (!page) notFound();

  const range = parseAnalyticsRange(searchParams.range);

  return (
    <AnalyticsView
      userId={user.id}
      range={range}
      pageId={page.id}
      basePath={`/pages/${page.id}/analytics`}
      showPageBreakdown={false}
    />
  );
}
