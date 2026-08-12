import { getTranslations } from "next-intl/server";

import type { Metadata } from "next";

import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { requireUser } from "@/lib/auth-guards";
import { parseAnalyticsRange } from "@/server/queries/analytics";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("analytics");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AnalyticsPage(props: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const t = await getTranslations("analytics");
  const range = parseAnalyticsRange(searchParams.range);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-10">
      <AnalyticsView
        userId={user.id}
        range={range}
        basePath="/analytics"
        showPageBreakdown
        heading={t("title")}
        subtitle={t("subtitle")}
      />
    </div>
  );
}
