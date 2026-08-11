import { Separator as SeparatorPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentPropsWithRef<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      decorative={decorative}
      className={cn(
        "shrink-0 bg-subtle",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A rule with a centred label — the "OR" divider on the auth screens.
 */
export function SeparatorWithLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="h-px flex-1 bg-subtle" />
      <span className="text-xs font-medium tracking-wider text-muted uppercase">
        {children}
      </span>
      <span className="h-px flex-1 bg-subtle" />
    </div>
  );
}
