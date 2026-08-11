"use client";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import { useUiLabels } from "./labels";

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

export function Spinner({ className, size, label, ...props }: SpinnerProps) {
  const labels = useUiLabels();
  // Explicit null means decorative; undefined means "use the default".
  const announced = label === null ? null : (label ?? labels.loading);

  return (
    <span
      role={announced ? "status" : undefined}
      aria-live={announced ? "polite" : undefined}
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    >
      {announced ? <span className="sr-only">{announced}</span> : null}
    </span>
  );
}

export { spinnerVariants };
