import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { Metadata } from "next";

import { PaddleCheckout } from "@/components/donation/paddle-checkout";
import { Button, Card, CardContent, Heading, Text } from "@/components/ui";
import { serverEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("donation.paddleCheckout");
  // Transactional and specific to one donor's visit — never indexed.
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * Where Paddle sends the donor to open the overlay.
 *
 * Paddle Billing will not render a checkout on its own domain for a
 * server-created transaction. Instead it hands back a URL on OUR domain with
 * `?_ptxn=txn_…` appended, and Paddle.js — loaded by the client component
 * below — opens the overlay automatically when it sees that parameter. There is
 * no `.open()` call anywhere.
 *
 * The route is an optional catch-all so it answers at both
 * `/paddle/checkout/<donationId>` (what `createCheckoutAction` asks Paddle to
 * use) and a bare `/paddle/checkout` (the account-level default payment link,
 * which Paddle falls back to). Without a donation id the overlay still opens —
 * `_ptxn` is what drives it — we simply have no page to send the donor back to
 * afterwards.
 *
 * Deliberately dynamic: it reads a query parameter and one specific donation.
 */
export default async function PaddleCheckoutPage(props: {
  params: Promise<{ donationId?: string[] }>;
  searchParams: Promise<{ _ptxn?: string }>;
}) {
  const { donationId: segments } = await props.params;
  const { _ptxn: transactionId } = await props.searchParams;
  const t = await getTranslations("donation.paddleCheckout");

  const donationId = segments?.[0];
  const env = serverEnv();

  // The donation id is a capability token, as on the thank-you page. The lookup
  // is narrow on purpose: this page needs somewhere to navigate to and nothing
  // else, so it reads no donor details.
  const donation = donationId
    ? await prisma.donation.findFirst({
        where: { id: donationId, provider: "PADDLE" },
        select: { id: true, page: { select: { slug: true } } },
      })
    : null;

  // No transaction to open, or Paddle.js has no token to boot with. Either is a
  // configuration problem rather than something the donor did, so say so
  // plainly instead of spinning forever.
  if (!transactionId || !env.PADDLE_CLIENT_TOKEN) {
    if (!env.PADDLE_CLIENT_TOKEN) {
      console.error(
        "Paddle checkout page reached without PADDLE_CLIENT_TOKEN set — the overlay cannot open.",
      );
    }
    return (
      <Fallback
        title={t("errorTitle")}
        body={t("errorBody")}
        href={donation ? `/d/${donation.page.slug}` : "/"}
        label={donation ? t("backToPage") : t("backHome")}
      />
    );
  }

  return (
    <PaddleCheckout
      transactionId={transactionId}
      clientToken={env.PADDLE_CLIENT_TOKEN}
      environment={env.PADDLE_ENV}
      // Where to go once the overlay resolves. Both are computed server-side so
      // the client component never builds a URL out of untrusted input.
      thankYouUrl={
        donation
          ? `/d/${donation.page.slug}/thank-you?donation=${donation.id}`
          : "/"
      }
      cancelUrl={donation ? `/d/${donation.page.slug}` : "/"}
      labels={{
        title: t("title"),
        body: t("body"),
        errorTitle: t("errorTitle"),
        errorBody: t("errorBody"),
        retry: donation ? t("backToPage") : t("backHome"),
      }}
    />
  );
}

function Fallback({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href: string;
  label: string;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <Card tone="warm">
        <CardContent className="space-y-4 py-10">
          <Heading level={1} size="lg">
            {title}
          </Heading>
          <Text variant="muted">{body}</Text>
          <Button asChild size="lg" fullWidth className="mt-2">
            <Link href={href}>{label}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
