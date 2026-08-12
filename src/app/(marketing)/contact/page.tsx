import { Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Metadata } from "next";

import { Heading, Lead } from "@/components/ui";
import { BRAND } from "@/lib/brand";

import { ContactForm } from "./contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: "/contact" },
    openGraph: {
      title: `${t("title")} · ${BRAND.name}`,
      description: t("subtitle"),
      type: "website",
    },
  };
}

export default async function ContactPage() {
  const t = await getTranslations("contact");

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
      <header className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-subtle">
          <Mail className="size-6 text-accent" aria-hidden="true" />
        </span>
        <Heading level={1} size="display" className="mt-4">
          {t("title")}
        </Heading>
        <Lead className="mx-auto mt-3 max-w-xl">{t("subtitle")}</Lead>
      </header>

      <div className="relative mt-10">
        <ContactForm />
      </div>
    </div>
  );
}
