"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export function RadioGroup({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentPropsWithRef<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      orientation={orientation}
      className={cn(
        orientation === "horizontal"
          ? "flex flex-wrap items-center gap-6"
          : "grid gap-3",
        className,
      )}
      {...props}
    />
  );
}

export function RadioGroupItem({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "size-4.5 shrink-0 rounded-full border border-strong bg-surface transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "data-[state=checked]:border-[5px] data-[state=checked]:border-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/** Radio + label as one clickable row — the common case. */
export function RadioOption({
  value,
  children,
  description,
  disabled,
  className,
  id,
}: {
  value: string;
  children: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const generatedId = id ?? `radio-${value}`;
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <RadioGroupItem value={value} id={generatedId} disabled={disabled} />
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor={generatedId}
          className={cn(
            "cursor-pointer text-sm text-fg",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          {children}
        </label>
        {description ? (
          <p className="text-xs text-muted">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
