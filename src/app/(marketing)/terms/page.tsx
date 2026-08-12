import { getTranslations } from "next-intl/server";

import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";
import { BRAND } from "@/lib/brand";

const SECTION_KEYS = [
  "acceptance",
  "accounts",
  "pages",
  "prohibited",
  "availability",
  "liability",
  "changes",
  "contact",
] as const;

/** `subtitle` interpolates {brand}, so metadata has to supply it too. */
const VALUES = { brand: BRAND.name, domain: BRAND.domain };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms");
  const subtitle = t("subtitle", VALUES);
  return {
    title: t("title"),
    description: subtitle,
    alternates: { canonical: "/terms" },
    openGraph: {
      title: `${t("title")} · ${BRAND.name}`,
      description: subtitle,
      type: "website",
    },
  };
}

export default async function TermsPage() {
  const t = await getTranslations("terms");
  const values = VALUES;

  return (
    <LegalPage
      title={t("title")}
      subtitle={t("subtitle", values)}
      updated={t("updated")}
      sections={SECTION_KEYS.map((key) => ({
        title: t(`sections.${key}.title`),
        body: t(`sections.${key}.body`, values),
      }))}
    />
  );
}
