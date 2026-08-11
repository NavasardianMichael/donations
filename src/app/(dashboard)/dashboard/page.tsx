import { getTranslations } from "next-intl/server";

import type { Metadata } from "next";

import { Card, CardContent, Heading, Lead, Text } from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard"), robots: { index: false, follow: false } };
}

/**
 * Placeholder. The real overview — stat tiles, recent supporters, per-page
 * breakdown — is built in the next phase against the Stitch designs.
 *
 * `requireUser()` is the real guard. proxy.ts only decided the URL should
 * render; this is what actually refuses to serve data to a stranger.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");

  const firstName = user.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-10">
      <Heading level={1} size="display">
        {firstName ? t("welcome", { name: firstName }) : t("welcomeNoName")}
      </Heading>
      <Lead className="mt-2">{t("overviewSubtitle")}</Lead>

      <Card className="mt-8">
        <CardContent>
          <Text size="sm" variant="muted">
            {t("signedInAs", { email: user.email })} ·{" "}
            {user.emailVerified ? t("emailConfirmed") : t("emailNotConfirmed")}
          </Text>
        </CardContent>
      </Card>
    </div>
  );
}
