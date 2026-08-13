"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { Badge } from "./badge";
import { useFieldControl } from "./field";
import { inputBase } from "./input";

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Normalise or reject a draft before it becomes a tag. `null` skips it. */
  parseValue?: (raw: string) => string | null;
  onInvalid?: (raw: string) => void;
  /** Accessible name for each chip's remove control. Receives the tag. */
  removeLabel: (tag: string) => string;
}

/**
 * A text field that turns Enter / comma / blur into chips.
 *
 * Used for SEO keywords and embed origin allowlists. Parsing is injected so
 * the same control can accept free text or strict origins.
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  disabled,
  parseValue = defaultParse,
  onInvalid,
  removeLabel,
}: TagInputProps) {
  const field = useFieldControl();
  const [draft, setDraft] = useState("");

  const isDisabled = disabled || field.disabled;

  function commit(raw: string) {
    const parsed = parseValue(raw);
    if (parsed === null) {
      if (raw.trim()) onInvalid?.(raw);
      setDraft("");
      return;
    }
    if (value.includes(parsed)) {
      setDraft("");
      return;
    }
    onChange([...value, parsed]);
    setDraft("");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        inputBase({ inputSize: "md" }),
        "flex h-auto min-h-10 flex-wrap items-center gap-1.5 px-2 py-1.5",
        isDisabled && "pointer-events-none",
      )}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="accent" size="sm" className="max-w-full">
          <span className="truncate">{tag}</span>
          <button
            type="button"
            className="rounded-xs text-current hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={removeLabel(tag)}
            disabled={isDisabled}
            onClick={() => onChange(value.filter((item) => item !== tag))}
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </Badge>
      ))}
      <input
        id={field.id}
        aria-describedby={field["aria-describedby"]}
        aria-invalid={field["aria-invalid"]}
        aria-required={field["aria-required"]}
        disabled={isDisabled}
        value={draft}
        placeholder={value.length === 0 ? placeholder : undefined}
        autoComplete="off"
        className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (draft.trim()) commit(draft);
        }}
      />
    </div>
  );
}

function defaultParse(raw: string): string | null {
  const trimmed = raw.trim().replace(/,$/, "");
  return trimmed ? trimmed : null;
}
