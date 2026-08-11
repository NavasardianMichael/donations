import { Hammer } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Metadata } from "next";

import { Card, CardContent, Heading, Lead, Text } from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("analytics");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Placeholder — this screen is built in a later phase. */
export default async function AnalyticsPage() {
  await requireUser();
  const t = await getTranslations("analytics");
  const tc = await getTranslations("common");

  return (
    <div className="mx-auto max-w-content space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <header>
        <Heading level={1} size="display">
          {t("title")}
        </Heading>
        <Lead className="mt-1">{t("subtitle")}</Lead>
      </header>

      <Card tone="dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-sm bg-surface-sunken text-muted">
            <Hammer className="size-5" aria-hidden="true" />
          </span>
          <Text size="sm" variant="faint">
            {tc("comingSoon")}
          </Text>
        </CardContent>
      </Card>
    </div>
  );
}
