"use client";

import { Check, Minus } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

import { useFieldControl } from "./field";

export function Checkbox({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof CheckboxPrimitive.Root>) {
  const field = useFieldControl();
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer size-4.5 shrink-0 rounded-xs border border-strong bg-surface transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-fg",
        "data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-accent-fg",
        "aria-invalid:border-danger",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...field}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {props.checked === "indeterminate" ? (
          <Minus className="size-3.5" strokeWidth={3} />
        ) : (
          <Check className="size-3.5" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
