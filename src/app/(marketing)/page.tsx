import { ArrowRight, LayoutTemplate, Link2, Share2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { Metadata } from "next";

import { Wordmark } from "@/components/brand/wordmark";
import { Button, Heading, Lead, Text } from "@/components/ui";
import { BRAND } from "@/lib/brand";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return {
    title: { absolute: `${BRAND.name} — ${t("metaTitle")}` },
    description: t("metaDescription", { brand: BRAND.name }),
    alternates: { canonical: "/" },
    openGraph: {
      title: `${BRAND.name} — ${t("metaTitle")}`,
      description: t("metaDescription", { brand: BRAND.name }),
      type: "website",
    },
  };
}

const FEATURES = [
  { key: "page", icon: LayoutTemplate },
  { key: "link", icon: Link2 },
  { key: "embed", icon: Share2 },
] as const;

const STEPS = ["create", "share", "receive"] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tm = await getTranslations("marketing");

  return (
    <>
      {/* Hero — brand first, one headline, one sentence, CTAs. */}
      <section className="relative overflow-hidden border-b border-subtle">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_-10%,color-mix(in_srgb,var(--accent)_28%,transparent),transparent),linear-gradient(180deg,var(--accent-subtle),var(--canvas)_70%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-32 size-[28rem] rounded-full bg-accent/10 blur-3xl motion-safe:animate-[pulse_8s_ease-in-out_infinite]"
        />

        <div className="relative flex flex-col items-start px-4 py-20 sm:px-6 sm:py-28 lg:px-10 lg:py-32">
          <Wordmark size="lg" className="motion-safe:animate-[fade-up_0.6s_ease-out_both]" />
          <Heading
            level={1}
            size="display"
            className="mt-8 max-w-2xl motion-safe:animate-[fade-up_0.7s_ease-out_0.05s_both]"
          >
            {t("headline", { brand: BRAND.name })}
          </Heading>
          <Lead className="mt-4 max-w-xl motion-safe:animate-[fade-up_0.7s_ease-out_0.1s_both]">
            {t("subheadline")}
          </Lead>
          <div className="mt-8 flex flex-wrap items-center gap-3 motion-safe:animate-[fade-up_0.7s_ease-out_0.15s_both]">
            <Button asChild size="lg">
              <Link href="/signup">
                {t("ctaPrimary")}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/faq">{t("ctaSecondary")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <Heading level={2} size="lg">
          {t("featuresTitle")}
        </Heading>
        <Lead className="mt-2 max-w-2xl">{t("featuresSubtitle")}</Lead>

        <ul className="mt-10 grid gap-8 sm:grid-cols-3">
          {FEATURES.map(({ key, icon: Icon }) => (
            <li key={key} className="space-y-3">
              <span className="flex size-11 items-center justify-center rounded-sm bg-accent-subtle text-accent">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <Heading level={3} size="sm">
                {t(`features.${key}.title`)}
              </Heading>
              <Text size="sm" variant="muted">
                {t(`features.${key}.body`)}
              </Text>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-subtle bg-surface-sunken/60">
        <div className="px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
          <Heading level={2} size="lg">
            {t("howTitle")}
          </Heading>
          <Lead className="mt-2 max-w-2xl">{t("howSubtitle")}</Lead>

          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((key, index) => (
              <li key={key} className="space-y-3">
                <span className="tabular text-sm font-semibold tracking-wider text-accent uppercase">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Heading level={3} size="sm">
                  {t(`steps.${key}.title`)}
                </Heading>
                <Text size="sm" variant="muted">
                  {t(`steps.${key}.body`)}
                </Text>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <div className="rounded-sm bg-accent px-6 py-12 text-accent-fg sm:px-10 sm:py-14">
          <Heading level={2} size="lg" className="text-accent-fg">
            {t("ctaTitle")}
          </Heading>
          <p className="mt-3 max-w-xl text-base text-accent-fg/90">
            {t("ctaBody")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-surface text-fg hover:bg-surface-raised"
            >
              <Link href="/signup">{t("ctaButton")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-accent-fg/40 bg-transparent text-accent-fg shadow-none hover:bg-accent-fg/10 hover:text-accent-fg hover:shadow-none"
            >
              <Link href="/login">{tm("logIn")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
