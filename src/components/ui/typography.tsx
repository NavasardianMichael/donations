import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * One type scale, defined once.
 *
 * Sizes are decoupled from heading levels so that document outline (h1..h6)
 * and visual weight can be chosen independently — a card title that is
 * semantically an <h3> can still render at display size.
 */
const headingVariants = cva("text-balance text-fg", {
  variants: {
    size: {
      display: "text-3xl font-bold tracking-[-0.02em] sm:text-4xl",
      xl: "text-2xl font-bold tracking-[-0.02em] sm:text-3xl",
      lg: "text-xl font-bold tracking-[-0.01em] sm:text-2xl",
      md: "text-lg font-semibold sm:text-xl",
      sm: "text-base font-semibold",
      xs: "text-sm font-semibold",
    },
  },
  defaultVariants: { size: "lg" },
});

export interface HeadingProps
  extends
    Omit<React.ComponentPropsWithRef<"h2">, "color">,
    VariantProps<typeof headingVariants> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  asChild?: boolean;
}

export function Heading({
  level = 2,
  size,
  className,
  asChild,
  ...props
}: HeadingProps) {
  const Comp = asChild
    ? Slot.Root
    : (`h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6");

  return (
    <Comp className={cn(headingVariants({ size }), className)} {...props} />
  );
}

const textVariants = cva("", {
  variants: {
    size: {
      xs: "text-xs leading-4",
      sm: "text-sm leading-5",
      md: "text-base leading-6",
      lg: "text-lg leading-7",
    },
    variant: {
      default: "text-fg",
      muted: "text-muted",
      faint: "text-faint",
      accent: "text-accent",
      brand: "text-brand",
      danger: "text-danger",
      success: "text-success",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
  },
  defaultVariants: { size: "md", variant: "default", weight: "normal" },
});

export interface TextProps
  extends
    Omit<React.ComponentPropsWithRef<"p">, "color">,
    VariantProps<typeof textVariants> {
  asChild?: boolean;
}

export function Text({
  className,
  size,
  variant,
  weight,
  asChild,
  ...props
}: TextProps) {
  const Comp = asChild ? Slot.Root : "p";
  return (
    <Comp
      className={cn(textVariants({ size, variant, weight }), className)}
      {...props}
    />
  );
}

/** Intro paragraph under a page heading. */
export function Lead({
  className,
  ...props
}: React.ComponentPropsWithRef<"p">) {
  return (
    <p
      className={cn(
        "text-base leading-6 text-pretty text-muted sm:text-lg sm:leading-7",
        className,
      )}
      {...props}
    />
  );
}

/** Secondary/help copy. */
export function Muted({
  className,
  ...props
}: React.ComponentPropsWithRef<"p">) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

/**
 * The small-caps section label that sits above a 1px rule.
 * `label-caps` in the design spec.
 */
export function Eyebrow({
  className,
  ...props
}: React.ComponentPropsWithRef<"p">) {
  return (
    <p
      className={cn(
        "text-xs font-semibold tracking-wider text-muted uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function Code({
  className,
  ...props
}: React.ComponentPropsWithRef<"code">) {
  return (
    <code
      className={cn(
        "rounded-xs bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.85em] text-fg",
        className,
      )}
      {...props}
    />
  );
}

/** Block of code with the dark treatment used by the embed snippet panel. */
export function CodeBlock({
  className,
  ...props
}: React.ComponentPropsWithRef<"pre">) {
  return (
    <pre
      className={cn(
        "scrollbar-thin overflow-x-auto rounded-sm bg-[#1f2223] p-4 font-mono text-xs leading-5 text-[#e8e8e8]",
        className,
      )}
      {...props}
    />
  );
}

export { headingVariants, textVariants };
