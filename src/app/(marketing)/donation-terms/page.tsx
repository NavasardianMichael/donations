import { getTranslations } from "next-intl/server";

import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";
import { BRAND } from "@/lib/brand";
import { CURRENCIES } from "@/lib/currency";
import { feeBreakdown, PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { formatMoney } from "@/lib/utils";

const EXAMPLE_GROSS_MINOR = 10_000_00;

function feeValues() {
  const breakdown = feeBreakdown(EXAMPLE_GROSS_MINOR);
  return {
    brand: BRAND.name,
    feePercent: PLATFORM_FEE_PERCENT,
    exampleGross: formatMoney(breakdown.grossMinor),
    exampleFee: formatMoney(breakdown.platformFeeMinor),
    exampleNet: formatMoney(breakdown.netToCreatorMinor),
    currencySymbol: CURRENCIES.amd.symbol,
  };
}

const SECTION_KEYS = [
  "scope",
  "fee",
  "example",
  "payouts",
  "refunds",
  "changes",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("donationTerms");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: "/donation-terms" },
    openGraph: {
      title: `${t("title")} · ${BRAND.name}`,
      description: t("subtitle"),
      type: "website",
    },
  };
}

export default async function DonationTermsPage() {
  const t = await getTranslations("donationTerms");
  const values = feeValues();

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
