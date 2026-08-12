import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { AnalyticsRange } from "@/server/queries/analytics";

const RANGES: AnalyticsRange[] = ["7d", "30d", "90d"];

const RANGE_LABEL: Record<AnalyticsRange, "last7Days" | "last30Days" | "last90Days"> =
  {
    "7d": "last7Days",
    "30d": "last30Days",
    "90d": "last90Days",
  };

/**
 * Date-range control held in the URL — same pattern as `PageFilters`.
 * Links, not client state, so each view is shareable and SSR-driven.
 */
export async function AnalyticsRangeFilter({
  active,
  basePath,
}: {
  active: AnalyticsRange;
  /** `/analytics` or `/pages/{id}/analytics` */
  basePath: string;
}) {
  const t = await getTranslations("analytics");

  function hrefFor(range: AnalyticsRange): string {
    if (range === "30d") return basePath;
    return `${basePath}?range=${range}`;
  }

  return (
    <nav aria-label={t("dateRange")}>
      <ul className="flex items-center gap-1 rounded-sm bg-surface-sunken p-1">
        {RANGES.map((range) => {
          const selected = range === active;
          return (
            <li key={range}>
              <Link
                href={hrefFor(range)}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "inline-flex items-center rounded-xs px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  selected
                    ? "bg-surface font-semibold text-fg shadow-lift"
                    : "text-muted hover:text-fg",
                )}
              >
                {t(RANGE_LABEL[range])}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
