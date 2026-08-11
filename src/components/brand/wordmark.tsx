import Link from "next/link";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl sm:text-3xl",
} as const;

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
    <span
      className={cn(
        "font-bold tracking-[-0.02em] text-brand",
        SIZES[size],
        className,
      )}
    >
      GiveDirect
    </span>
  );

  if (!asLink) return content;

  return (
    <Link
      href={href}
      className="rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {content}
      <span className="sr-only"> — home</span>
    </Link>
  );
}
