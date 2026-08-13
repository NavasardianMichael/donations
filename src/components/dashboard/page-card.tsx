import { Eye, Globe, HandCoins } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageActions } from "@/components/dashboard/page-actions";
import { PagePublicUrl } from "@/components/dashboard/page-public-url";
import {
  Card,
  CardContent,
  CardFooter,
  ProgressBar,
  StatusDot,
} from "@/components/ui";
import { absoluteUrl } from "@/lib/env";
import { formatMoney, formatNumber } from "@/lib/utils";
import type { PageListItem } from "@/server/queries/pages";

const TONE = {
  PUBLISHED: "published",
  DRAFT: "draft",
  ARCHIVED: "archived",
} as const;

/**
 * One page in the list.
 *
 * The Stitch designs use three shapes for this: a card in a grid on desktop,
 * a full-width row on tablet, and a stacked card with labelled actions on
 * mobile. Rather than three components, this is one card whose internals
 * reflow — the row look on tablet comes from the grid dropping to one column
 * and the body switching to a horizontal layout at `sm`.
 */
export async function PageCard({ page }: { page: PageListItem }) {
  const t = await getTranslations("page");
  const tp = await getTranslations("pages");

  const publicUrl = absoluteUrl(`/d/${page.slug}`);

  return (
    <Card tone="warm" interactive className="flex flex-col">
      <CardContent className="flex-1">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="hidden size-12 shrink-0 items-center justify-center rounded-sm border border-subtle bg-surface-sunken text-muted sm:flex"
          >
            <Globe className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h3 className="text-base font-bold text-balance text-fg sm:text-lg">
                {page.title}
              </h3>
              <StatusDot tone={TONE[page.status]}>
                {t(`status.${page.status}`)}
              </StatusDot>
            </div>

            <PagePublicUrl url={publicUrl} title={page.title} />

            <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
              <div className="flex items-center gap-1.5">
                <Eye className="size-4 text-muted" aria-hidden="true" />
                <dt className="sr-only">{tp("views")}</dt>
                <dd className="tabular text-muted">
                  {formatNumber(page.viewCount)}
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <HandCoins className="size-4 text-muted" aria-hidden="true" />
                <dt className="sr-only">{tp("raised")}</dt>
                <dd className="tabular font-medium text-fg">
                  {formatMoney(page.raisedMinor, page.currency)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {page.goalAmountMinor ? (
          <ProgressBar
            className="mt-4"
            size="sm"
            showLabels={false}
            valueMinor={page.raisedMinor}
            goalMinor={page.goalAmountMinor}
            currency={page.currency}
          />
        ) : null}
      </CardContent>

      <CardFooter className="justify-between gap-2">
        <PageActions
          pageId={page.id}
          title={page.title}
          status={page.status}
          layout="icons"
        />
      </CardFooter>
    </Card>
  );
}
