import { cn, formatCurrency, progressRatio } from "@/lib/utils";

export interface ProgressBarProps extends React.ComponentPropsWithRef<"div"> {
  /** Raised so far, in minor units. */
  valueCents: number;
  /** Target, in minor units. Null renders the bar empty (no goal set). */
  goalCents?: number | null;
  currency?: string;
  size?: "sm" | "md" | "lg";
  /** Show the "$12,450 / $50,000" caption above the track. */
  showLabels?: boolean;
  label?: React.ReactNode;
  /** Layout used on the manage-pages cards: label left, track right. */
  inline?: boolean;
}

export function ProgressBar({
  valueCents,
  goalCents,
  currency = "usd",
  size = "md",
  showLabels = true,
  label = "Raised",
  inline = false,
  className,
  ...props
}: ProgressBarProps) {
  const ratio = progressRatio(valueCents, goalCents ?? null);
  const percent = Math.round(ratio * 100);

  const track = (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={
        goalCents
          ? `${formatCurrency(valueCents, currency)} raised of ${formatCurrency(goalCents, currency)} goal`
          : `${formatCurrency(valueCents, currency)} raised`
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
          {label ? (
            <p className="text-xs font-semibold tracking-[0.05em] text-muted uppercase">
              {label}
            </p>
          ) : null}
          <p className="tabular text-sm font-semibold text-fg">
            {formatCurrency(valueCents, currency)}
            {goalCents ? (
              <span className="font-normal text-muted">
                {" / "}
                {formatCurrency(goalCents, currency)}
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
            {formatCurrency(valueCents, currency)}
            {label ? (
              <span className="font-normal text-muted">
                {" "}
                {label.toString().toLowerCase()}
              </span>
            ) : null}
          </p>
          {goalCents ? (
            <p className="tabular text-sm text-muted">
              {percent}% of {formatCurrency(goalCents, currency)}
            </p>
          ) : null}
        </div>
      ) : null}
      {track}
    </div>
  );
}
