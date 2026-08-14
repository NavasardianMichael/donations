"use client";

import { Plus, X } from "lucide-react";
import {
  useCallback,
  useState,
  type ChangeEventHandler,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type MouseEventHandler,
} from "react";

import { cn } from "@/lib/utils";

import { Badge } from "./badge";
import { useFieldControl } from "./field";
import { inputBase } from "./input";
import { useUiLabels } from "./labels";

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
 * A text field that turns Enter / comma / blur / the plus control into chips.
 *
 * Used for SEO keywords, suggested amounts, and embed origin allowlists.
 * Parsing is injected so the same control can accept free text or strict
 * origins.
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
  const labels = useUiLabels();
  const [draft, setDraft] = useState("");

  const isDisabled = disabled || field.disabled;
  const hasDraft = draft.trim().length > 0;

  const commit = useCallback(
    (raw: string) => {
      const parsed = parseValue(raw);
      if (parsed === null) {
        if (raw.trim()) onInvalid?.(raw);
        setDraft("");
        return;
      }
      if (value.includes(parsed)) {
        onInvalid?.(raw);
        setDraft("");
        return;
      }
      onChange([...value, parsed]);
      setDraft("");
    },
    [onChange, onInvalid, parseValue, value],
  );

  const onDraftChange: ChangeEventHandler<HTMLInputElement, HTMLInputElement> =
    useCallback((event) => {
      setDraft(event.target.value);
    }, []);

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        commit(draft);
        return;
      }
      if (event.key === "Backspace" && draft === "" && value.length > 0) {
        onChange(value.slice(0, -1));
      }
    },
    [commit, draft, onChange, value],
  );

  const onBlur: FocusEventHandler<HTMLInputElement> = useCallback(() => {
    if (draft.trim()) commit(draft);
  }, [commit, draft]);

  const onRemoveTag: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      const tag = event.currentTarget.dataset.tag;
      if (tag === undefined) return;
      onChange(value.filter((item) => item !== tag));
    },
    [onChange, value],
  );

  const onAddMouseDown: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      // Keep focus on the input so blur does not commit first.
      event.preventDefault();
    },
    [],
  );

  const onAddClick: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    commit(draft);
  }, [commit, draft]);

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
            data-tag={tag}
            onClick={onRemoveTag}
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </Badge>
      ))}
      <div className="flex min-w-24 flex-1 items-center gap-1">
        <input
          id={field.id}
          aria-describedby={field["aria-describedby"]}
          aria-invalid={field["aria-invalid"]}
          aria-required={field["aria-required"]}
          disabled={isDisabled}
          value={draft}
          placeholder={value.length === 0 ? placeholder : undefined}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
          onChange={onDraftChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
        {hasDraft ? (
          <button
            type="button"
            aria-label={labels.addTag}
            disabled={isDisabled}
            className="flex size-6 shrink-0 items-center justify-center rounded-xs text-accent hover:bg-accent-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onMouseDown={onAddMouseDown}
            onClick={onAddClick}
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function defaultParse(raw: string): string | null {
  const trimmed = raw.trim().replace(/,$/, "");
  return trimmed ? trimmed : null;
}
