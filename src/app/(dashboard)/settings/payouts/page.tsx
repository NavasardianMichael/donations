import { Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Metadata } from "next";

import { Alert, Card, CardContent, Heading, Lead, Text } from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payouts");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * Deliberate placeholder.
 *
 * No payment provider is integrated, so there is nothing to pay out and
 * nothing to configure. The route exists so the concept is not forgotten and
 * so the nav entry has somewhere to go — see the "No payments" section of
 * AGENTS.md before adding anything real here.
 */
export default async function PayoutsPage() {
  await requireUser();
  const t = await getTranslations("payouts");

  return (
    <div className="mx-auto max-w-form space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <header>
        <Heading level={1} size="display">
          {t("title")}
        </Heading>
        <Lead className="mt-1">{t("subtitle")}</Lead>
      </header>

      <Alert variant="info" title={t("notAvailableTitle")}>
        {t("notAvailableBody")}
      </Alert>

      <Card tone="dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-sm bg-surface-sunken text-muted">
            <Wallet className="size-5" aria-hidden="true" />
          </span>
          <Text size="sm" variant="faint">
            {t("placeholderNote")}
          </Text>
        </CardContent>
      </Card>
    </div>
  );
}
