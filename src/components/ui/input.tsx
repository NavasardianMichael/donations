"use client";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import { useFieldControl } from "./field";

/**
 * Shared input chrome. Focus is a 1px accent border plus a soft 2px glow —
 * the "Input Fields" spec from the design system.
 */
export const inputBase = cva(
  [
    "w-full rounded-sm border bg-surface text-fg transition-shadow outline-none",
    "placeholder:text-faint",
    "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60",
    "focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--accent-subtle)]",
    "aria-invalid:border-danger aria-invalid:focus-visible:shadow-[0_0_0_3px_var(--danger-subtle)]",
  ],
  {
    variants: {
      inputSize: {
        sm: "h-8 px-2.5 text-sm",
        md: "h-10 px-3 text-sm",
        lg: "h-12 px-4 text-base",
      },
      tone: {
        default: "border-subtle",
        strong: "border-strong",
      },
    },
    defaultVariants: { inputSize: "md", tone: "default" },
  },
);

export interface InputProps
  extends
    Omit<React.ComponentPropsWithRef<"input">, "size">,
    VariantProps<typeof inputBase> {
  /** Rendered inside the field on the leading edge — a "$", a search glyph. */
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function Input({
  className,
  inputSize,
  tone,
  leading,
  trailing,
  type = "text",
  ...props
}: InputProps) {
  const field = useFieldControl();
  const merged = { ...field, ...props };

  const control = (
    <input
      type={type}
      className={cn(
        inputBase({ inputSize, tone }),
        leading && "pl-8",
        trailing && "pr-10",
        className,
      )}
      {...merged}
    />
  );

  if (!leading && !trailing) return control;

  return (
    <div className="relative">
      {leading ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted"
        >
          {leading}
        </span>
      ) : null}
      {control}
      {trailing ? (
        <span className="absolute inset-y-0 right-2 flex items-center text-muted">
          {trailing}
        </span>
      ) : null}
    </div>
  );
}

export interface TextareaProps extends React.ComponentPropsWithRef<"textarea"> {
  /** Disable the browser resize grabber — the editor forms use fixed heights. */
  resizable?: boolean;
}

export function Textarea({
  className,
  rows = 4,
  resizable = true,
  ...props
}: TextareaProps) {
  const field = useFieldControl();
  return (
    <textarea
      rows={rows}
      className={cn(
        inputBase({ inputSize: "md" }),
        "h-auto py-2.5 leading-6",
        !resizable && "resize-none",
        className,
      )}
      {...field}
      {...props}
    />
  );
}
