import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Input } from "@/components/ui";
import type { PageStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type StatusFilter = PageStatus | "ALL";

const STATUSES: StatusFilter[] = ["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"];

/**
 * Search and status filter, both held in the URL.
 *
 * Deliberately a Server Component with zero client state:
 *   - the status filter is a row of links, so it works without JS and each
 *     view is a shareable, back-button-correct URL;
 *   - search is a plain GET form, submitted on Enter.
 *
 * The earlier version debounced keystrokes from client state, which meant an
 * effect syncing state to the URL and another syncing it back — two
 * cascading-render hazards for a control that is used once per visit.
 */
export async function PageFilters({
  counts,
  activeStatus,
  activeSearch,
}: {
  counts: Record<StatusFilter, number>;
  activeStatus: StatusFilter;
  activeSearch: string;
}) {
  const t = await getTranslations("pages");
  const tStatus = await getTranslations("page.status");

  function hrefFor(status: StatusFilter): string {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (activeSearch) params.set("q", activeSearch);
    const query = params.toString();
    return query ? `/pages?${query}` : "/pages";
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <nav aria-label={t("filter")}>
        <ul className="flex scrollbar-thin items-center gap-1 overflow-x-auto rounded-sm bg-surface-sunken p-1">
          {STATUSES.map((status) => {
            const active = status === activeStatus;
            return (
              <li key={status}>
                <Link
                  href={hrefFor(status)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active
                      ? "bg-surface font-semibold text-fg shadow-lift"
                      : "text-muted hover:text-fg",
                  )}
                >
                  {status === "ALL" ? t("filterAll") : tStatus(status)}
                  <span className="tabular text-xs text-muted">
                    {counts[status]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* GET form: no JS, and the resulting URL is shareable. */}
      <form action="/pages" className="sm:w-72">
        {activeStatus !== "ALL" ? (
          <input type="hidden" name="status" value={activeStatus} />
        ) : null}
        <Input
          type="search"
          name="q"
          defaultValue={activeSearch}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          leading={<Search className="size-4" />}
        />
      </form>
    </div>
  );
}
