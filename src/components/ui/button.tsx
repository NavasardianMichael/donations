"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

import { useUiLabels } from "./labels";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-sm font-semibold transition-all outline-none select-none",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        /* Solid accent. The one high-intent action per screen. */
        primary:
          "bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-active",
        /* Filled neutral, for secondary affirmative actions. */
        secondary:
          "bg-surface-sunken text-fg hover:bg-surface-active active:bg-surface-active",
        /* Ghost with a 1px outline — the spec's "secondary" button. */
        outline:
          "border border-subtle bg-surface text-fg hover:bg-surface-hover hover:shadow-lift active:bg-surface-active",
        ghost: "text-fg hover:bg-surface-hover active:bg-surface-active",
        destructive:
          "bg-danger text-white hover:bg-danger-hover active:bg-danger-hover",
        /* Inline text action. Uses the brand red, not the accent. */
        link: "text-brand underline-offset-4 hover:text-brand-hover hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "size-10 p-0",
        "icon-sm": "size-8 p-0",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends
    React.ComponentPropsWithRef<"button">,
    VariantProps<typeof buttonVariants> {
  /**
   * Render the child element with button styling instead of a <button>.
   * This is how <Link> and <a> get the exact same variants.
   */
  asChild?: boolean;
  /**
   * Disables the button and swaps in a spinner. The label stays mounted but
   * invisible so the button keeps its width — no layout shift on submit.
   */
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  asChild = false,
  loading = false,
  loadingText,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const labels = useUiLabels();
  const Comp = asChild ? Slot.Root : "button";

  // `asChild` hands rendering to the child, so the spinner swap does not apply.
  if (asChild) {
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <button
      type={type ?? "button"}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <span
        className={cn("inline-flex items-center gap-2", loading && "invisible")}
      >
        {children}
      </span>
      {loading ? (
        <span className="absolute inset-0 inline-flex items-center justify-center gap-2">
          <Spinner size={size === "lg" ? "md" : "sm"} label={null} />
          {loadingText ? <span>{loadingText}</span> : null}
          <span className="sr-only">{labels.loading}</span>
        </span>
      ) : null}
    </button>
  );
}

export { buttonVariants };
