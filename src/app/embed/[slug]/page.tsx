import { connection } from "next/server";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { DonationForm } from "@/components/donation/donation-form";
import { EmbedHeightReporter } from "@/components/donation/embed-height-reporter";
import { TrackBeacon } from "@/components/donation/track-beacon";
import { Avatar, Heading, ProgressBar, Text } from "@/components/ui";
import { getPublicPageBySlug, listPublishedSlugs } from "@/server/queries/public-pages";

export const revalidate = 3600;

export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await listPublishedSlugs();
  return slugs.map((p) => ({ slug: p.slug }));
}

/** Embeds must never be indexed themselves — the canonical page is `/d/[slug]`. */
export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const page = await getPublicPageBySlug(slug);
  return {
    title: page?.title,
    robots: { index: false, follow: false },
  };
}

export default async function EmbedDonationPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const page = await getPublicPageBySlug(slug);

  // Distinct from a plain 404: the creator can turn embedding off for a page
  // that is otherwise live at /d/[slug]. Either way there is nothing to
  // render inside the iframe.
  if (!page || !page.embedEnabled) {
    await connection();
    notFound();
  }

  return (
    <div className="mx-auto max-w-sm">
      <EmbedHeightReporter />
      <TrackBeacon pageId={page.id} source="EMBED" />

      <div className="flex items-center gap-3">
        <Avatar
          size="md"
          shape="rounded"
          name={page.user.name}
          src={page.coverImageUrl || page.user.image}
        />
        <div className="min-w-0">
          <Heading level={2} size="sm" className="truncate">
            {page.title}
          </Heading>
        </div>
      </div>

      {page.description ? (
        <Text size="sm" variant="muted" className="mt-3">
          {page.description}
        </Text>
      ) : null}

      {page.showProgressBar && page.goalAmountMinor ? (
        <ProgressBar
          className="mt-3"
          size="sm"
          showLabels={false}
          valueMinor={page.raisedMinor}
          goalMinor={page.goalAmountMinor}
          currency={page.currency}
        />
      ) : null}

      <div className="mt-4">
        <DonationForm
          pageId={page.id}
          currency={page.currency}
          suggestedAmounts={page.suggestedAmounts}
          minAmountMinor={page.minAmountMinor}
          maxAmountMinor={page.maxAmountMinor}
          suggestedAmountsUsd={page.suggestedAmountsUsd}
          minAmountMinorUsd={page.minAmountMinorUsd}
          maxAmountMinorUsd={page.maxAmountMinorUsd}
          allowCustomAmount={page.allowCustomAmount}
          collectDonorName={page.collectDonorName}
          collectMessage={page.collectMessage}
          source="EMBED"
        />
      </div>
    </div>
  );
}
