import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { Metadata } from "next";

import { Button, Card, CardContent, Heading, Text } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { getDonationForThankYou } from "@/server/queries/public-pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("donation.thankYouPage");
  // Never indexed — this is a transactional page tied to one donor's visit.
  return { title: t("title"), robots: { index: false, follow: false } };
}

const ICON = {
  SUCCEEDED: CheckCircle2,
  FAILED: XCircle,
  PENDING: Clock,
  AUTHORIZING: Clock,
} as const;

const TONE = {
  SUCCEEDED: "bg-success-subtle text-success",
  FAILED: "bg-danger-subtle text-danger",
  PENDING: "bg-warning-subtle text-warning-fg",
  AUTHORIZING: "bg-warning-subtle text-warning-fg",
} as const;

/**
 * Where the donor lands after the gateway — reached via the return route's
 * redirect. The donation id in the URL is a capability token; see
 * `getDonationForThankYou` for why the slug is still checked.
 *
 * Deliberately dynamic (no ISR) — every hit is specific to one donation, and
 * this route never competes with the parent page's static generation.
 */
export default async function ThankYouPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ donation?: string }>;
}) {
  const { slug } = await props.params;
  const { donation: donationId } = await props.searchParams;
  const t = await getTranslations("donation");

  const donation = donationId
    ? await getDonationForThankYou(slug, donationId)
    : null;

  if (!donation) {
    return (
      <StatusCard
        icon={XCircle}
        tone="bg-surface-sunken text-muted"
        title={t("notFoundPage.title")}
        body={t("notFoundPage.body")}
        slug={slug}
      />
    );
  }

  if (donation.status === "SUCCEEDED") {
    const amount = formatMoney(donation.amountMinor, donation.currency);
    return (
      <StatusCard
        icon={ICON.SUCCEEDED}
        tone={TONE.SUCCEEDED}
        title={t("thankYouPage.title")}
        body={t("thankYouPage.bodyWithAmount", {
          amount,
          title: donation.page.title,
        })}
        note={
          donation.donorEmail ? t("thankYouPage.receiptNote") : undefined
        }
        slug={slug}
      />
    );
  }

  if (donation.status === "FAILED") {
    return (
      <StatusCard
        icon={ICON.FAILED}
        tone={TONE.FAILED}
        title={t("failurePage.title")}
        body={t("failurePage.body")}
        slug={slug}
        retry
      />
    );
  }

  return (
    <StatusCard
      icon={ICON.PENDING}
      tone={TONE.PENDING}
      title={t("pendingPage.title")}
      body={t("pendingPage.body")}
      slug={slug}
    />
  );
}

async function StatusCard({
  icon: Icon,
  tone,
  title,
  body,
  note,
  slug,
  retry = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  body: string;
  note?: string;
  slug: string;
  retry?: boolean;
}) {
  const t = await getTranslations("donation");

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <Card tone="warm">
        <CardContent className="space-y-4 py-10">
          <span
            className={`mx-auto flex size-14 items-center justify-center rounded-full ${tone}`}
          >
            <Icon className="size-7" />
          </span>
          <Heading level={1} size="lg">
            {title}
          </Heading>
          <Text variant="muted">{body}</Text>
          {note ? (
            <Text size="sm" variant="faint">
              {note}
            </Text>
          ) : null}
          <Button asChild size="lg" fullWidth className="mt-2">
            <Link href={`/d/${slug}`}>
              {retry
                ? t("failurePage.retryButton")
                : t("thankYouPage.backToPage")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
