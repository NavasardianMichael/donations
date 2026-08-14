import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Horizontal bounds for a page that has no app shell around it.
 *
 * It owns the two things every sidebar-less page was repeating: the gutter
 * scale and the maximum measure. A full-bleed background stays on the
 * `<section>`; this goes *inside* it, so the tint still reaches the viewport
 * edge while the text stops.
 *
 * `size` picks a **surface**, not a page. Every container on one surface —
 * header, footer and body alike — passes the same value, because a header that
 * is wider than the content beneath it reads as a misalignment rather than a
 * choice. Two surfaces, so two sizes.
 *
 * The dashboard does not use this — its sidebar and workspace column already
 * bound the content, and a second limit there would fight them.
 */
const containerVariants = cva("mx-auto w-full px-4 sm:px-6 lg:px-10", {
  variants: {
    size: {
      /** The marketing surface: landing, FAQ, contact, legal, and its chrome. */
      content: "max-w-content",
      /** The donation surface: one column, and its chrome. */
      reading: "max-w-reading",
    },
  },
  defaultVariants: { size: "content" },
});

export interface ContainerProps
  extends
    React.ComponentPropsWithRef<"div">,
    VariantProps<typeof containerVariants> {}

export function Container({ className, size, ...props }: ContainerProps) {
  return (
    <div className={cn(containerVariants({ size }), className)} {...props} />
  );
}
