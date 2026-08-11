"use client";

import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

function TabsList({
  className,
  variant = "underline",
  ...props
}: React.ComponentPropsWithRef<typeof TabsPrimitive.List> & {
  variant?: "underline" | "pill";
}) {
  return (
    <TabsPrimitive.List
      data-variant={variant}
      className={cn(
        "flex scrollbar-thin items-center overflow-x-auto",
        variant === "underline" && "gap-1 border-b border-subtle",
        variant === "pill" && "gap-1 rounded-sm bg-surface-sunken p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap text-muted transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        "disabled:pointer-events-none disabled:opacity-50",
        "hover:text-fg",
        // underline variant
        "group-data-[variant=underline]:rounded-none",
        "[[data-variant=underline]_&]:-mb-px [[data-variant=underline]_&]:border-b-2 [[data-variant=underline]_&]:border-transparent",
        "[[data-variant=underline]_&][data-state=active]:border-accent [[data-variant=underline]_&][data-state=active]:font-semibold [[data-variant=underline]_&][data-state=active]:text-fg",
        // pill variant
        "[[data-variant=pill]_&]:rounded-xs",
        "[[data-variant=pill]_&][data-state=active]:bg-surface [[data-variant=pill]_&][data-state=active]:text-fg [[data-variant=pill]_&][data-state=active]:shadow-lift",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "mt-6 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
