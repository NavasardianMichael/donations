import { Banknote, Clock, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Metadata } from "next";

import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Heading,
  Lead,
  Stat,
  StatRow,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";
import { amountBounds, PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { formatMoney, formatNumber } from "@/lib/utils";
import { getPayoutBalance } from "@/server/queries/payouts";

import { PayoutSettingsForm } from "./payout-settings-form";
import { RequestPayoutButton } from "./request-payout-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payouts");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * What a creator is owed, where they want it sent, and how often.
 *
 * The screen is complete and the numbers are real — they come from the
 * creator's own donations. What does not exist yet is the transfer: no provider
 * splits per creator, so `paidOutMinor` is structurally zero, the history has
 * nothing to list, and the two actions (save, request) report that rather than
 * pretending. See `getPayoutBalance` and the two client components beside this
 * file; the alert at the top says the same thing to the creator.
 */
export default async function PayoutsPage() {
  const user = await requireUser();
  const t = await getTranslations("payouts");

  const balance = await getPayoutBalance(user.id);
  const { currency } = balance;
  const minimum = amountBounds(currency).minMinor;

  return (
    <div className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <header>
        <Heading level={1} size="display">
          {t("title")}
        </Heading>
        <Lead className="mt-1">{t("subtitle")}</Lead>
      </header>

      <Alert variant="info" title={t("notAvailableTitle")}>
        {t("previewNotice")}
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat
          label={t("availableLabel")}
          value={formatMoney(balance.availableMinor, currency)}
          hint={t("availableHint", { percent: PLATFORM_FEE_PERCENT })}
          icon={Wallet}
        />
        <Stat
          label={t("pendingLabel")}
          value={formatMoney(balance.pendingMinor, currency)}
          hint={t("pendingHint", { count: formatNumber(balance.pendingCount) })}
          icon={Clock}
        />
        <Stat
          label={t("paidOutLabel")}
          value={formatMoney(balance.paidOutMinor, currency)}
          hint={t("paidOutHint")}
          icon={Banknote}
          className="sm:col-span-2 xl:col-span-1"
        />
      </div>

      <Card>
        <CardHeader bordered>
          <div>
            <CardTitle>{t("breakdownTitle")}</CardTitle>
            <Text size="sm" variant="muted" className="mt-1">
              {t("breakdownDescription")}
            </Text>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 py-5">
          <div>
            <StatRow
              label={t("grossLabel")}
              value={formatMoney(balance.grossMinor, currency)}
            />
            <StatRow
              label={t("feeLabel", { percent: PLATFORM_FEE_PERCENT })}
              value={`− ${formatMoney(balance.platformFeeMinor, currency)}`}
            />
            <StatRow
              label={t("netLabel")}
              value={formatMoney(balance.netMinor, currency)}
              emphasis
            />
          </div>

          <Text size="xs" variant="faint">
            {t("grossHint", { count: formatNumber(balance.donationCount) })}
          </Text>

          <div className="flex flex-col gap-2 border-t border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Text size="sm" variant="muted">
              {balance.availableMinor < minimum
                ? t("belowMinimum", { amount: formatMoney(minimum, currency) })
                : t("requestPayoutHint")}
            </Text>
            <RequestPayoutButton
              availableMinor={balance.availableMinor}
              currency={currency}
            />
          </div>
        </CardContent>
      </Card>

      <PayoutSettingsForm currency={currency} />

      <Card>
        <CardHeader bordered>
          <CardTitle>{t("historyTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {/* Columns first, then the empty state inside them: the shape of the
              history is part of the answer to "how will I be paid". */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnDate")}</TableHead>
                <TableHead>{t("columnDestination")}</TableHead>
                <TableHead numeric>{t("columnAmount")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="p-0">
                  <EmptyState
                    icon={Banknote}
                    title={t("historyEmpty")}
                    description={t("historyEmptyBody")}
                    className="py-10"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
