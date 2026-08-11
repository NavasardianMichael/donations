"use client";

import { useId, useMemo, useState } from "react";

import { cn, formatCurrency, parseAmountToCents } from "@/lib/utils";

import { inputBase } from "./input";

export interface AmountSelectorProps {
  /** Preset chips, in minor units. */
  suggestedAmounts: number[];
  /** Controlled value in minor units, or null when nothing is chosen. */
  value: number | null;
  onChange: (amountCents: number | null) => void;
  currency?: string;
  allowCustomAmount?: boolean;
  minAmountCents?: number;
  maxAmountCents?: number;
  disabled?: boolean;
  /** Rendered under the custom input. */
  error?: string | null;
  className?: string;
  size?: "md" | "lg";
  /** Accessible name for the chip group. */
  label?: string;
}

/**
 * Preset amount chips plus an optional free-entry field.
 *
 * The chips are a radio group, not buttons — arrow keys move between them and
 * screen readers announce "3 of 4". The custom field takes over the selection
 * as soon as it parses to a valid amount.
 */
export function AmountSelector({
  suggestedAmounts,
  value,
  onChange,
  currency = "usd",
  allowCustomAmount = true,
  minAmountCents = 100,
  maxAmountCents,
  disabled = false,
  error,
  className,
  size = "md",
  label = "Select amount",
}: AmountSelectorProps) {
  const groupName = useId();
  const customId = `${groupName}-custom`;
  const errorId = `${groupName}-error`;

  const presets = useMemo(
    () =>
      [...new Set(suggestedAmounts)].filter((a) => a > 0).sort((a, b) => a - b),
    [suggestedAmounts],
  );

  const [customText, setCustomText] = useState(() =>
    value !== null && !presets.includes(value) ? (value / 100).toString() : "",
  );

  const isCustomActive = value !== null && !presets.includes(value);

  function selectPreset(amount: number) {
    setCustomText("");
    onChange(amount);
  }

  function handleCustomChange(next: string) {
    setCustomText(next);
    const cents = parseAmountToCents(next);
    onChange(cents);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "grid gap-2",
          presets.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3",
        )}
      >
        {presets.map((amount) => {
          const selected = value === amount && !isCustomActive;
          return (
            <button
              key={amount}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => selectPreset(amount)}
              className={cn(
                "rounded-sm border font-semibold transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                "disabled:cursor-not-allowed disabled:opacity-50",
                size === "md" ? "h-11 text-sm" : "h-14 text-base sm:text-lg",
                selected
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-subtle bg-surface text-fg hover:border-accent-border hover:bg-accent-subtle",
              )}
            >
              {formatCurrency(amount, currency)}
            </button>
          );
        })}
      </div>

      {allowCustomAmount ? (
        <div>
          <label htmlFor={customId} className="sr-only">
            Custom amount
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-base font-medium text-muted"
            >
              $
            </span>
            <input
              id={customId}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Custom amount"
              value={customText}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(e) => handleCustomChange(e.target.value)}
              className={cn(
                inputBase({ inputSize: size === "md" ? "md" : "lg" }),
                "pl-8",
                isCustomActive && "border-accent",
              )}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-danger"
        >
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted">
          Minimum {formatCurrency(minAmountCents, currency)}
          {maxAmountCents
            ? ` · maximum ${formatCurrency(maxAmountCents, currency)}`
            : ""}
        </p>
      )}
    </div>
  );
}
