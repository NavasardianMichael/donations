import {
  BarChart3,
  HandCoins,
  Eye,
  Percent,
  TrendingUp,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { AnalyticsRangeFilter } from "@/components/dashboard/analytics-range-filter";
import { AnalyticsTrendChart } from "@/components/dashboard/analytics-trend-chart";
import {
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
} from "@/components/ui";
import {
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/lib/utils";
import type { AnalyticsRange } from "@/server/queries/analytics";
import {
  getAnalyticsByPage,
  getAnalyticsReferrers,
  getAnalyticsSummary,
  getAnalyticsTrend,
} from "@/server/queries/analytics";

export async function AnalyticsView({
  userId,
  range,
  pageId,
  basePath,
  showPageBreakdown,
  heading,
  subtitle,
}: {
  userId: string;
  range: AnalyticsRange;
  pageId?: string;
  basePath: string;
  showPageBreakdown: boolean;
  heading?: string;
  subtitle?: string;
}) {
  const t = await getTranslations("analytics");
  const tStats = await getTranslations("dashboard.stats");
  const tPages = await getTranslations("pages");

  const [summary, trend, byPage, referrers] = await Promise.all([
    getAnalyticsSummary(userId, range, pageId),
    getAnalyticsTrend(userId, range, pageId),
    showPageBreakdown
      ? getAnalyticsByPage(userId, range)
      : Promise.resolve([]),
    getAnalyticsReferrers(userId, range, pageId),
  ]);

  const hasActivity =
    summary.viewCount > 0 ||
    summary.donationCount > 0 ||
    trend.some((p) => p.views > 0 || p.donationCount > 0);

  return (
    <div className="space-y-6">
      <header
        className={
          heading
            ? "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
            : "flex justify-end"
        }
      >
        {heading ? (
          <div>
            <Heading level={1} size="display">
              {heading}
            </Heading>
            {subtitle ? <Lead className="mt-1">{subtitle}</Lead> : null}
          </div>
        ) : null}
        <AnalyticsRangeFilter active={range} basePath={basePath} />
      </header>

      {!hasActivity ? (
        <Card tone="dashed">
          <EmptyState icon={BarChart3} title={t("noData")} />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label={tStats("totalRaisedPeriod", { days: rangeToLabelDays(range) })}
              value={formatMoney(summary.raisedMinor, summary.currency)}
              icon={TrendingUp}
            />
            <Stat
              label={t("donations")}
              value={formatNumber(summary.donationCount)}
              icon={HandCoins}
            />
            <Stat
              label={tStats("averageDonation")}
              value={formatMoney(summary.averageMinor, summary.currency)}
              icon={HandCoins}
            />
            <Stat
              label={tStats("conversionRate")}
              value={formatPercent(summary.conversionRate)}
              hint={`${formatNumber(summary.viewCount)} ${t("views").toLowerCase()}`}
              icon={Percent}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Stat
              label={t("views")}
              value={formatNumber(summary.viewCount)}
              icon={Eye}
            />
            <Stat
              label={t("uniqueVisitors")}
              value={formatNumber(summary.uniqueVisitors)}
              icon={Eye}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("trend")}</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsTrendChart
                data={trend}
                viewsLabel={t("views")}
                donationsLabel={t("donations")}
              />
            </CardContent>
          </Card>

          <div
            className={
              showPageBreakdown
                ? "grid gap-4 lg:grid-cols-2"
                : "grid gap-4"
            }
          >
            {showPageBreakdown ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("byPage")}</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  {byPage.length === 0 ? (
                    <p className="px-5 pb-5 text-sm text-muted">{t("noData")}</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("pageColumn")}</TableHead>
                          <TableHead numeric>{t("views")}</TableHead>
                          <TableHead numeric>{t("donations")}</TableHead>
                          <TableHead numeric>{tPages("raised")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byPage.map((row) => (
                          <TableRow key={row.pageId}>
                            <TableCell>
                              <Link
                                href={`/pages/${row.pageId}/analytics`}
                                className="font-medium text-fg hover:text-accent"
                              >
                                {row.title}
                              </Link>
                            </TableCell>
                            <TableCell numeric>
                              {formatNumber(row.views)}
                            </TableCell>
                            <TableCell numeric>
                              {formatNumber(row.donationCount)}
                            </TableCell>
                            <TableCell numeric>
                              {formatMoney(row.raisedMinor, row.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>{t("referrers")}</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {referrers.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-muted">{t("noData")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("referrerColumn")}</TableHead>
                        <TableHead numeric>{t("countColumn")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrers.map((row) => (
                        <TableRow key={row.referrer}>
                          <TableCell>{row.referrer}</TableCell>
                          <TableCell numeric>
                            {formatNumber(row.views)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function rangeToLabelDays(range: AnalyticsRange): number {
  return range === "7d" ? 7 : range === "90d" ? 90 : 30;
}
