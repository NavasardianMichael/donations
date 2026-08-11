import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const spinnerVariants = cva(
  "inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]",
  {
    variants: {
      size: {
        xs: "size-3 border",
        sm: "size-4 border-2",
        md: "size-5 border-2",
        lg: "size-8 border-[3px]",
      },
    },
    defaultVariants: { size: "sm" },
  },
);

export interface SpinnerProps
  extends
    React.ComponentPropsWithRef<"span">,
    VariantProps<typeof spinnerVariants> {
  /** Announced to screen readers. Pass null on decorative spinners. */
  label?: string | null;
}

export function Spinner({
  className,
  size,
  label = "Loading",
  ...props
}: SpinnerProps) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-live={label ? "polite" : undefined}
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    >
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

export { spinnerVariants };
