import Link from "next/link";

import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl sm:text-3xl",
} as const;

/**
 * The wordmark. Reads its text from `BRAND` — there is no hard-coded brand
 * name anywhere in the app, so renaming is a one-line change.
 */
export function Wordmark({
  size = "md",
  href = "/",
  asLink = true,
  className,
}: {
  size?: keyof typeof SIZES;
  href?: string;
  asLink?: boolean;
  className?: string;
}) {
  const content = (
    <span className={cn("font-bold text-brand", SIZES[size], className)}>
      {BRAND.name}
    </span>
  );

  if (!asLink) return content;

  return (
    <Link
      href={href}
      className="rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {content}
    </Link>
  );
}
