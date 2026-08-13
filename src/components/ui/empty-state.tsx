import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps extends Omit<
  React.ComponentPropsWithRef<"div">,
  "title"
> {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Dashed outline — matches the "Create New Page" tile in the designs. */
  variant?: "plain" | "dashed";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "plain",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        variant === "dashed" &&
          "rounded-sm border-2 border-dashed border-subtle",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <span className="flex size-11 items-center justify-center rounded-sm bg-surface-sunken text-muted">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-base font-semibold text-fg">{title}</p>
        {description ? (
          <p className="mx-auto text-sm text-balance text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
