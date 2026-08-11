"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Avatar as AvatarPrimitive } from "radix-ui";

import { cn, initials } from "@/lib/utils";

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden bg-surface-sunken",
  {
    variants: {
      size: {
        xs: "size-6 text-[0.625rem]",
        sm: "size-8 text-xs",
        md: "size-10 text-sm",
        lg: "size-12 text-base",
        xl: "size-24 text-2xl",
      },
      shape: {
        circle: "rounded-full",
        rounded: "rounded-lg",
      },
    },
    defaultVariants: { size: "md", shape: "circle" },
  },
);

export interface AvatarProps
  extends
    React.ComponentPropsWithRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string | null;
  name?: string | null;
  alt?: string;
}

export function Avatar({
  className,
  size,
  shape,
  src,
  name,
  alt,
  ...props
}: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(avatarVariants({ size, shape }), className)}
      {...props}
    >
      {src ? (
        <AvatarPrimitive.Image
          src={src}
          alt={alt ?? name ?? ""}
          className="aspect-square size-full object-cover"
        />
      ) : null}
      <AvatarPrimitive.Fallback
        delayMs={src ? 400 : 0}
        className="flex size-full items-center justify-center bg-accent-subtle font-semibold text-brand"
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export { avatarVariants };
