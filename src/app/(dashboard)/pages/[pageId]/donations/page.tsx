import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import {
  Badge,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { listDonationsForPage } from "@/server/queries/donations";
import { getOwnedPage } from "@/server/queries/pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pageSettings.donations");
  return { title: t("title"), robots: { index: false, follow: false } };
}

const STATUS_VARIANT = {
  SUCCEEDED: "success",
  PENDING: "warning",
  AUTHORIZING: "warning",
  FAILED: "danger",
  REFUNDED: "info",
} as const;

export default async function PageDonationsPage(props: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await props.params;
  const user = await requireUser();
  const t = await getTranslations("pageSettings.donations");
  const tStatus = await getTranslations("donation.status");
  const tDonation = await getTranslations("donation");

  const page = await getOwnedPage(user.id, pageId);
  if (!page) notFound();

  const donations = await listDonationsForPage(page.id);

  if (donations.length === 0) {
    return <EmptyState title={t("empty")} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("donor")}</TableHead>
          <TableHead numeric>{t("amount")}</TableHead>
          <TableHead>{t("date")}</TableHead>
          <TableHead>{t("status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {donations.map((donation) => (
          <TableRow key={donation.id}>
            <TableCell>
              {donation.isAnonymous
                ? tDonation("anonymous")
                : donation.donorName || tDonation("anonymous")}
            </TableCell>
            <TableCell numeric>
              {formatMoney(donation.amountMinor, donation.currency)}
            </TableCell>
            <TableCell className="text-muted">
              {formatDateTime(donation.createdAt)}
            </TableCell>
            <TableCell>
              <Badge dot variant={STATUS_VARIANT[donation.status]}>
                {tStatus(donation.status)}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
