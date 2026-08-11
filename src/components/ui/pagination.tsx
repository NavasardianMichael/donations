"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./button";
import { useUiLabels } from "./labels";

export interface PaginationProps {
  page: number;
  pageCount: number;
  /** Total row count — renders the "1–20 of 137" summary when provided. */
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Compact window of page numbers with ellipses: 1 … 4 5 6 … 20 */
function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) result.push("gap");
    result.push(p);
    previous = p;
  }
  return result;
}

export function Pagination({
  page,
  pageCount,
  totalItems,
  pageSize = 20,
  onPageChange,
  className,
}: PaginationProps) {
  const labels = useUiLabels();

  if (pageCount <= 1 && !totalItems) return null;

  const from = (page - 1) * pageSize + 1;
  const to = totalItems
    ? Math.min(page * pageSize, totalItems)
    : page * pageSize;

  return (
    <nav
      aria-label={labels.pagination}
      className={cn(
        "flex flex-col-reverse items-center justify-between gap-3 sm:flex-row",
        className,
      )}
    >
      {totalItems !== undefined ? (
        <p className="tabular text-sm text-muted">
          {labels.showing({ from, to, total: totalItems })}
        </p>
      ) : (
        <span />
      )}

      {pageCount > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
            <span className="sr-only">{labels.previousPage}</span>
          </Button>

          {pageWindow(page, pageCount).map((item, i) =>
            item === "gap" ? (
              <span
                key={`gap-${i}`}
                aria-hidden="true"
                className="px-1 text-sm text-faint"
              >
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? "primary" : "ghost"}
                size="icon-sm"
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPageChange(item)}
                className="tabular"
              >
                {item}
              </Button>
            ),
          )}

          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight aria-hidden="true" />
            <span className="sr-only">{labels.nextPage}</span>
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
