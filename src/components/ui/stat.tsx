import { TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StatProps extends React.ComponentPropsWithRef<"div"> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Fractional change vs the comparison period, e.g. 0.145 for +14.5%. */
  delta?: number | null;
  deltaLabel?: React.ReactNode;
  /** Shown when there is no delta — "Stable this week". */
  hint?: React.ReactNode;
  icon?: LucideIcon;
  /** Sparkline, mini bar chart, anything visual on the trailing edge. */
  visual?: React.ReactNode;
  /**
   * For metrics where down is good (refund rate). Flips the colour, not the
   * arrow direction.
   */
  invertDelta?: boolean;
}

export function Stat({
  label,
  value,
  delta,
  deltaLabel,
  hint,
  icon: Icon,
  visual,
  invertDelta = false,
  className,
  ...props
}: StatProps) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const isUp = hasDelta && delta > 0;
  const isFlat = hasDelta && delta === 0;
  const isGood = invertDelta ? !isUp : isUp;

  return (
    <div
      className={cn(
        "rounded-sm border border-warm bg-surface p-4 sm:p-5",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">
          {label}
        </p>
        {Icon ? (
          <Icon aria-hidden="true" className="size-4 shrink-0 text-accent" />
        ) : null}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="tabular truncate text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
            {value}
          </p>

          {hasDelta && !isFlat ? (
            <p
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 text-sm font-medium",
                isGood ? "text-success" : "text-danger",
              )}
            >
              {isUp ? (
                <TrendingUp aria-hidden="true" className="size-4" />
              ) : (
                <TrendingDown aria-hidden="true" className="size-4" />
              )}
              <span className="tabular">
                {isUp ? "+" : ""}
                {(delta * 100).toFixed(1)}%
              </span>
              {deltaLabel ? (
                <span className="font-normal text-muted">{deltaLabel}</span>
              ) : null}
            </p>
          ) : hint ? (
            <p className="mt-1.5 text-sm text-muted">{hint}</p>
          ) : null}
        </div>

        {visual ? <div className="shrink-0">{visual}</div> : null}
      </div>
    </div>
  );
}

/** Label/value pair for definition-list style summaries (fees, payouts). */
export function StatRow({
  label,
  value,
  emphasis,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-2",
        className,
      )}
    >
      <dt
        className={cn(
          "text-sm",
          emphasis ? "font-semibold text-fg" : "text-muted",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "tabular text-sm",
          emphasis ? "font-bold text-fg" : "text-fg",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
