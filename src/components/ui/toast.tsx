"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster, toast } from "sonner";

/**
 * Toast surface. Sonner handles stacking, focus management and swipe-to-dismiss;
 * we only supply the tokens so it matches the rest of the library.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-sm !border !border-subtle !bg-surface !text-fg !shadow-overlay !font-sans",
          description: "!text-muted",
          actionButton: "!rounded-xs !bg-accent !text-accent-fg !font-semibold",
          cancelButton: "!rounded-xs !bg-surface-sunken !text-fg",
          error: "!border-danger-subtle",
          success: "!border-success-subtle",
          warning: "!border-warning-subtle",
        },
      }}
    />
  );
}

export { toast };
