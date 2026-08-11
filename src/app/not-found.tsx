import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { Metadata } from "next";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button, Heading, Lead } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("errors");
  return { title: t("notFoundTitle"), robots: { index: false, follow: false } };
}

/**
 * Root 404.
 *
 * Next's built-in one is English, which would be jarring in an Armenian-only
 * app. It carries the public chrome so a visitor who mistypes a donation-page
 * address still has somewhere to go.
 */
export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold tracking-wider text-accent uppercase">
            404
          </p>
          <Heading level={1} size="display" className="mt-3">
            {t("notFoundTitle")}
          </Heading>
          <Lead className="mt-3">{t("notFoundBody")}</Lead>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/">{t("goHome")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/faq">{t("goFaq")}</Link>
            </Button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
