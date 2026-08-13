import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { Avatar, Heading, Lead, ProgressBar, Text } from "@/components/ui";
import { DonationForm } from "@/components/donation/donation-form";
import { TrackBeacon } from "@/components/donation/track-beacon";
import { isArcaConfigured } from "@/lib/payments/arca";
import { isPaddleConfigured } from "@/lib/payments/paddle";
import { formatRelativeTime } from "@/lib/utils";
import {
  getPublicPageBySlug,
  listPublishedSlugs,
  listRecentSupporters,
} from "@/server/queries/public-pages";

/** ISR fallback. Real freshness comes from `revalidatePath` after mutations. */
export const revalidate = 3600;

/** Slugs published after the last build must still render, not 404. */
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await listPublishedSlugs();
  return slugs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const page = await getPublicPageBySlug(slug);
  if (!page) return {};

  const title = page.seoTitle || page.title;
  const description =
    page.seoDescription || page.description || undefined;
  const image = page.ogImageUrl || page.coverImageUrl || undefined;

  return {
    title,
    description,
    alternates: { canonical: `/d/${page.slug}` },
    robots: page.noIndex ? { index: false, follow: false } : undefined,
    keywords: page.seoKeywords
      ? page.seoKeywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/**
 * The public donation page. Server Component, statically generated for every
 * published slug and revalidated on demand — nothing here reads cookies, so
 * the ISR path stays intact (see the note in `(public)/layout.tsx`).
 */
export default async function DonationPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const page = await getPublicPageBySlug(slug);
  if (!page) {
    // A static 404 here would stick for `revalidate` seconds after the
    // creator publishes. Opt this miss into a dynamic render instead.
    await connection();
    notFound();
  }

  const t = await getTranslations("donation");
  const supporters = page.collectDonorName
    ? await listRecentSupporters(page.id, 5)
    : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <TrackBeacon pageId={page.id} source="DIRECT" />

      <div className="text-center">
        <Avatar
          size="xl"
          shape="rounded"
          name={page.user.name}
          src={page.coverImageUrl || page.user.image}
          className="mx-auto"
        />
        <Heading level={1} size="display" className="mt-5">
          {t("supportTitle", { name: page.user.name ?? page.title })}
        </Heading>
        {page.description ? (
          <Lead className="mx-auto mt-3 max-w-xl">{page.description}</Lead>
        ) : null}
      </div>

      {page.showProgressBar && page.goalAmountMinor ? (
        <div className="mt-8">
          <ProgressBar
            valueMinor={page.raisedMinor}
            goalMinor={page.goalAmountMinor}
            currency={page.currency}
            size="lg"
          />
        </div>
      ) : null}

      <div className="mt-8">
        <DonationForm
          pageId={page.id}
          currency={page.currency}
          suggestedAmounts={page.suggestedAmounts}
          minAmountMinor={page.minAmountMinor}
          suggestedAmountsUsd={page.suggestedAmountsUsd}
          minAmountMinorUsd={page.minAmountMinorUsd}
          allowCustomAmount={page.allowCustomAmount}
          collectDonorName={page.collectDonorName}
          collectMessage={page.collectMessage}
          providers={{
            arca: isArcaConfigured(),
            paddle: isPaddleConfigured(),
          }}
          source="DIRECT"
        />
      </div>

      {supporters.length > 0 ? (
        <div className="mt-10">
          <Heading level={2} size="sm" className="mb-3">
            {t("recentSupporters")}
          </Heading>
          <ul className="space-y-3">
            {supporters.map((donation) => (
              <li
                key={donation.id}
                className="flex items-center gap-3 rounded-sm border border-subtle bg-surface p-3"
              >
                <Avatar
                  size="sm"
                  name={donation.isAnonymous ? null : donation.donorName}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">
                    {donation.isAnonymous
                      ? t("anonymous")
                      : donation.donorName || t("anonymous")}
                  </p>
                  {donation.message ? (
                    <p className="truncate text-sm text-muted">
                      {donation.message}
                    </p>
                  ) : null}
                </div>
                {donation.completedAt ? (
                  <Text size="xs" variant="faint" className="shrink-0">
                    {formatRelativeTime(donation.completedAt)}
                  </Text>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
