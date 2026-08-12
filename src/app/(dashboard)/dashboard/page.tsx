import { BarChart3, HandCoins, TrendingUp, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { Metadata } from "next";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Heading,
  Lead,
  Stat,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/lib/utils";
import { getDashboardOverview } from "@/server/queries/overview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard"), robots: { index: false, follow: false } };
}

const STATUS_VARIANT = {
  SUCCEEDED: "success",
  PENDING: "warning",
  AUTHORIZING: "warning",
  FAILED: "danger",
  REFUNDED: "info",
} as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const tStats = await getTranslations("dashboard.stats");
  const tDonations = await getTranslations("pageSettings.donations");
  const tDonation = await getTranslations("donation");
  const tStatus = await getTranslations("donation.status");
  const tPayouts = await getTranslations("payouts");
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("nav");

  const firstName = user.name?.split(" ")[0];
  const overview = await getDashboardOverview(user.id);
  const { current, recentSupporters } = overview;

  const conversionHint =
    overview.conversionDelta === null ||
    Math.abs(overview.conversionDelta) < 0.05
      ? tStats("stableThisWeek")
      : undefined;

  return (
    <div className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Heading level={1} size="display">
            {firstName
              ? t("welcome", { name: firstName })
              : t("welcomeNoName")}
          </Heading>
          <Lead className="mt-1">{t("overviewSubtitle")}</Lead>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/pages/new">{tNav("createPage")}</Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat
          label={tStats("totalRaisedPeriod", { days: 30 })}
          value={formatMoney(current.raisedMinor, current.currency)}
          delta={overview.raisedDelta}
          deltaLabel={tStats("vsLastMonth")}
          icon={TrendingUp}
        />
        <Stat
          label={tStats("newSupporters")}
          value={formatNumber(current.donationCount)}
          delta={overview.supportersDelta}
          deltaLabel={tStats("vsLastMonth")}
          icon={HandCoins}
        />
        <Stat
          label={tStats("conversionRate")}
          value={formatPercent(current.conversionRate)}
          delta={conversionHint ? null : overview.conversionDelta}
          deltaLabel={tStats("vsLastMonth")}
          hint={conversionHint}
          icon={BarChart3}
          className="sm:col-span-2 xl:col-span-1"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("recentSupporters")}</CardTitle>
            {recentSupporters.length > 0 ? (
              <Button asChild variant="link" size="sm">
                <Link href="/analytics">{tCommon("viewAll")}</Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {recentSupporters.length === 0 ? (
              <EmptyState
                icon={HandCoins}
                title={t("noSupportersYet")}
                className="py-10"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tDonations("donor")}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t("pageColumn")}
                    </TableHead>
                    <TableHead numeric>{tDonations("amount")}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {tDonations("date")}
                    </TableHead>
                    <TableHead>{tDonations("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSupporters.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.isAnonymous
                          ? tDonation("anonymous")
                          : row.donorName || tDonation("anonymous")}
                      </TableCell>
                      <TableCell className="hidden max-w-[10rem] truncate sm:table-cell">
                        <Link
                          href={`/pages/${row.pageId}/donations`}
                          className="text-muted hover:text-accent"
                        >
                          {row.pageTitle}
                        </Link>
                      </TableCell>
                      <TableCell numeric>
                        {formatMoney(row.amountMinor, row.currency)}
                      </TableCell>
                      <TableCell className="hidden text-muted md:table-cell">
                        {formatDateTime(row.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge dot variant={STATUS_VARIANT[row.status]}>
                          {tStatus(row.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tPayouts("title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex size-11 items-center justify-center rounded-sm bg-accent-subtle text-accent">
              <Wallet className="size-5" aria-hidden="true" />
            </div>
            <div>
              <Text size="sm" weight="semibold">
                {tPayouts("notAvailableTitle")}
              </Text>
              <Text size="sm" variant="muted" className="mt-1">
                {tPayouts("notAvailableBody")}
              </Text>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/payouts">{t("managePayouts")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
