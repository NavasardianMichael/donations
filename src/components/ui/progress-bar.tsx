"use client";

import { cn, formatMoney, formatPercent, progressRatio } from "@/lib/utils";

import { useUiLabels } from "./labels";

export interface ProgressBarProps extends React.ComponentPropsWithRef<"div"> {
  /** Raised so far, in integer minor units. */
  valueMinor: number;
  /** Target, in minor units. Null renders the bar empty (no goal set). */
  goalMinor?: number | null;
  currency?: string;
  size?: "sm" | "md" | "lg";
  /** Show the "1 245 000 ֏ / 5 000 000 ֏" caption above the track. */
  showLabels?: boolean;
  /** Caption word. Defaults to the provided UI labels. */
  label?: React.ReactNode;
  /** Layout used on the manage-pages cards: label left, track right. */
  inline?: boolean;
}

export function ProgressBar({
  valueMinor,
  goalMinor,
  currency = "amd",
  size = "md",
  showLabels = true,
  label,
  inline = false,
  className,
  ...props
}: ProgressBarProps) {
  const labels = useUiLabels();
  const caption = label ?? labels.raised;

  const ratio = progressRatio(valueMinor, goalMinor ?? null);
  const percent = Math.round(ratio * 100);

  const formattedValue = formatMoney(valueMinor, currency);
  const formattedGoal = goalMinor ? formatMoney(goalMinor, currency) : null;

  const track = (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={
        formattedGoal
          ? labels.progressLabel(formattedValue, formattedGoal)
          : labels.progressLabelNoGoal(formattedValue)
      }
      className={cn(
        "w-full overflow-hidden rounded-full bg-surface-active",
        size === "sm" && "h-1.5",
        size === "md" && "h-2",
        size === "lg" && "h-3",
      )}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );

  if (inline) {
    return (
      <div className={cn("flex items-center gap-4", className)} {...props}>
        <div className="min-w-0">
          {caption ? (
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">
              {caption}
            </p>
          ) : null}
          <p className="tabular text-sm font-semibold text-fg">
            {formattedValue}
            {formattedGoal ? (
              <span className="font-normal text-muted">
                {" / "}
                {formattedGoal}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex-1">{track}</div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {showLabels ? (
        <div className="flex items-baseline justify-between gap-3">
          <p className="tabular text-sm font-semibold text-fg">
            {formattedValue}
            {caption ? (
              <span className="font-normal text-muted"> {caption}</span>
            ) : null}
          </p>
          {formattedGoal ? (
            <p className="tabular text-sm text-muted">
              {formatPercent(ratio, 0)} · {formattedGoal}
            </p>
          ) : null}
        </div>
      ) : null}
      {track}
    </div>
  );
}
