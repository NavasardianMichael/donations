import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-sm bg-surface-active motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

/** N stacked text lines, the last one short — reads as a paragraph. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 && "w-2/3")} />
      ))}
    </div>
  );
}
