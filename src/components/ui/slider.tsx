"use client";

import { Slider as SliderPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export function Slider({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof SliderPrimitive.Root>) {
  const thumbCount = Array.isArray(props.value ?? props.defaultValue)
    ? (props.value ?? props.defaultValue)!.length
    : 1;

  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        "data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-active">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className={cn(
            "block size-4 rounded-full border-2 border-accent bg-surface transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
            "disabled:pointer-events-none",
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}
