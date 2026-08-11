import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-surface-sunken text-muted",
        accent: "bg-accent-subtle text-brand",
        success: "bg-success-subtle text-success-fg",
        warning: "bg-warning-subtle text-warning-fg",
        danger: "bg-danger-subtle text-danger-fg",
        info: "bg-info-subtle text-info-fg",
        outline: "border border-subtle bg-transparent text-muted",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[0.6875rem]",
        md: "px-2 py-1 text-xs",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends
    React.ComponentPropsWithRef<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  /** Leading dot, matching the PUBLISHED / DRAFT chips in the designs. */
  dot?: boolean;
}

export function Badge({
  className,
  variant,
  size,
  asChild,
  dot,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      ) : null}
      {children}
    </Comp>
  );
}

/**
 * The uppercase status label used on page cards. Semantically a badge, but the
 * designs render it as bare text with a coloured dot, not a filled chip.
 */
export function StatusDot({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "published" | "draft" | "archived" | "neutral";
  children: React.ReactNode;
  className?: string;
}) {
  const dotColor = {
    published: "bg-success",
    draft: "bg-faint",
    archived: "bg-strong",
    neutral: "bg-muted",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase",
        tone === "draft" || tone === "archived" ? "text-muted" : "text-fg",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", dotColor)}
      />
      {children}
    </span>
  );
}

export { badgeVariants };
