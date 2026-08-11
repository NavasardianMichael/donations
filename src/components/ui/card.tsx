import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Level 1 surface: flat white on the neutral canvas with a 1px outline.
 * No drop shadow — depth comes from the tonal step, per the design spec.
 */
const cardVariants = cva("rounded-sm bg-surface", {
  variants: {
    tone: {
      default: "border border-subtle",
      warm: "border border-warm",
      accent: "border border-accent-border bg-accent-subtle",
      ghost: "border border-transparent",
      dashed: "border-2 border-dashed border-subtle bg-transparent",
    },
    interactive: {
      true: "transition-shadow hover:shadow-lift",
    },
  },
  defaultVariants: { tone: "default" },
});

export interface CardProps
  extends
    React.ComponentPropsWithRef<"div">,
    VariantProps<typeof cardVariants> {}

export function Card({ className, tone, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(cardVariants({ tone, interactive }), className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  bordered = true,
  ...props
}: React.ComponentPropsWithRef<"div"> & { bordered?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-6",
        bordered && "border-b border-subtle",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.ComponentPropsWithRef<"h3">) {
  return (
    <h3
      className={cn("text-base font-semibold text-fg sm:text-lg", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentPropsWithRef<"p">) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

export function CardContent({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return <div className={cn("px-4 py-4 sm:px-6", className)} {...props} />;
}

export function CardFooter({
  className,
  bordered = true,
  ...props
}: React.ComponentPropsWithRef<"div"> & { bordered?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6",
        bordered && "border-t border-subtle",
        className,
      )}
      {...props}
    />
  );
}

export { cardVariants };
