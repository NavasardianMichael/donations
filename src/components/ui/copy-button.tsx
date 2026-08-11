"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { Button, type ButtonProps } from "./button";
import { useUiLabels } from "./labels";

export interface CopyButtonProps extends Omit<
  ButtonProps,
  "onClick" | "children"
> {
  value: string;
  /** Defaults to the provided UI labels. */
  label?: string;
  copiedLabel?: string;
  /** Icon only — used inside code panels where the label would crowd. */
  iconOnly?: boolean;
}

export function CopyButton({
  value,
  label,
  copiedLabel,
  iconOnly = false,
  variant = "ghost",
  size = "sm",
  className,
  ...props
}: CopyButtonProps) {
  const labels = useUiLabels();
  const copyText = label ?? labels.copy;
  const copiedText = copiedLabel ?? labels.copied;

  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API needs a secure context; fall back to a temp selection.
      const el = document.createElement("textarea");
      el.value = value;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }

    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <Button
      variant={variant}
      size={iconOnly ? "icon-sm" : size}
      onClick={handleCopy}
      className={cn(className)}
      {...props}
    >
      {copied ? (
        <Check className="text-success" aria-hidden="true" />
      ) : (
        <Copy aria-hidden="true" />
      )}
      {iconOnly ? (
        <span className="sr-only">{copied ? copiedText : copyText}</span>
      ) : (
        <span>{copied ? copiedText : copyText}</span>
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? labels.copiedToClipboard : ""}
      </span>
    </Button>
  );
}
