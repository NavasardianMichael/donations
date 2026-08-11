import { MessageCircleQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  Heading,
  Lead,
  Text,
} from "@/components/ui";
import { FAQ_CATEGORIES, faqItemsByCategory } from "@/content/faq";
import { BRAND } from "@/lib/brand";
import { CURRENCIES } from "@/lib/currency";
import { feeBreakdown, PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { formatMoney } from "@/lib/utils";

/**
 * The worked example in the fees answer is COMPUTED, not written.
 *
 * If the platform fee ever changes, the prose changes with it — a hard-coded
 * "5%" in a translation string would quietly become a lie.
 */
const EXAMPLE_GROSS_MINOR = 10_000_00; // 10 000 ֏

function feeValues() {
  const breakdown = feeBreakdown(EXAMPLE_GROSS_MINOR);
  return {
    feePercent: PLATFORM_FEE_PERCENT,
    exampleGross: formatMoney(breakdown.grossMinor),
    exampleFee: formatMoney(breakdown.platformFeeMinor),
    exampleNet: formatMoney(breakdown.netToCreatorMinor),
    currencySymbol: CURRENCIES.amd.symbol,
    brand: BRAND.name,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("faq");

  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: "/faq" },
    openGraph: {
      title: `${t("title")} · ${BRAND.name}`,
      description: t("subtitle"),
      type: "website",
    },
  };
}

export default async function FaqPage() {
  const t = await getTranslations("faq");
  const values = feeValues();
  const contactAddress =
    process.env.CONTACT_EMAIL_TO || `support@${BRAND.domain}`;

  /**
   * FAQPage structured data.
   *
   * Google requires the markup to match what a visitor actually sees, so this
   * is generated from the same `FAQ_ITEMS` and the same translations that
   * render below — the two cannot drift.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_CATEGORIES.flatMap((category) =>
      faqItemsByCategory(category).map((item) => ({
        "@type": "Question",
        name: t(`items.${item.id}.question`, values),
        acceptedAnswer: {
          "@type": "Answer",
          text: t(`items.${item.id}.answer`, values),
        },
      })),
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // `<` is escaped so a translation can never break out of the script
        // element and inject markup.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="mx-auto max-w-form px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        <header className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-subtle">
            <MessageCircleQuestion
              className="size-6 text-accent"
              aria-hidden="true"
            />
          </span>
          <Heading level={1} size="display" className="mt-4">
            {t("title")}
          </Heading>
          <Lead className="mx-auto mt-3 max-w-xl">{t("subtitle")}</Lead>
        </header>

        <div className="mt-12 space-y-10">
          {FAQ_CATEGORIES.map((category) => {
            const items = faqItemsByCategory(category);
            if (items.length === 0) return null;

            return (
              <section key={category}>
                <Heading level={2} size="md" className="section-rule">
                  {t(`categories.${category}`)}
                </Heading>

                <Accordion type="single" collapsible>
                  {items.map((item) => (
                    <AccordionItem key={item.id} value={item.id} id={item.id}>
                      <AccordionTrigger>
                        <span className="flex flex-wrap items-center gap-2">
                          {t(`items.${item.id}.question`, values)}
                          {"notYetAvailable" in item && item.notYetAvailable ? (
                            <Badge variant="warning" size="sm">
                              {t("notYetAvailableBadge")}
                            </Badge>
                          ) : null}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        {t(`items.${item.id}.answer`, values)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            );
          })}
        </div>

        <Card tone="warm" className="mt-12">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Heading level={2} size="sm">
              {t("stillHaveQuestions")}
            </Heading>
            <Text size="sm" variant="muted">
              {t("stillHaveQuestionsBody")}
            </Text>
            {/* mailto until /contact is built — better a link that works
                than one that 404s. */}
            <Button asChild variant="outline" className="mt-1">
              <a href={`mailto:${contactAddress}`}>{t("contactUs")}</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
