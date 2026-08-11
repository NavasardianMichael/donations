"use client";

import { createContext, useContext, useMemo } from "react";

/**
 * Text the UI library needs for itself.
 *
 * A component library cannot call `t()` — that would couple it to this app's
 * message catalogue and to next-intl. Instead it DECLARES the strings it needs
 * and the app supplies them, translated, once at the root.
 *
 * The defaults below are English on purpose: they are a developer fallback so
 * the library still renders standalone (in the kitchen sink, in isolation, in
 * a future second app). Every one of them is overridden in production by
 * `<UiLabelsProvider>` in the root layout.
 */
export interface UiLabels {
  loading: string;
  close: string;
  copy: string;
  copied: string;
  copiedToClipboard: string;
  requiredField: string;

  pagination: string;
  previousPage: string;
  nextPage: string;
  /** Receives `from`, `to`, `total`. */
  showing: (values: { from: number; to: number; total: number }) => string;

  selectAmount: string;
  customAmount: string;
  /** Receives the already-formatted amount. */
  minimum: (amount: string) => string;
  minimumAndMaximum: (min: string, max: string) => string;

  raised: string;
  /** Receives already-formatted amounts. */
  progressLabel: (raised: string, goal: string) => string;
  progressLabelNoGoal: (raised: string) => string;
}

const DEFAULT_LABELS: UiLabels = {
  loading: "Loading",
  close: "Close",
  copy: "Copy",
  copied: "Copied",
  copiedToClipboard: "Copied to clipboard",
  requiredField: "Required field",

  pagination: "Pagination",
  previousPage: "Previous page",
  nextPage: "Next page",
  showing: ({ from, to, total }) => `Showing ${from}–${to} of ${total}`,

  selectAmount: "Select amount",
  customAmount: "Custom amount",
  minimum: (amount) => `Minimum ${amount}`,
  minimumAndMaximum: (min, max) => `Minimum ${min} · maximum ${max}`,

  raised: "Raised",
  progressLabel: (raised, goal) => `${raised} raised of ${goal} goal`,
  progressLabelNoGoal: (raised) => `${raised} raised`,
};

const UiLabelsContext = createContext<UiLabels>(DEFAULT_LABELS);

export function UiLabelsProvider({
  labels,
  children,
}: {
  labels: Partial<UiLabels>;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);

  return (
    <UiLabelsContext.Provider value={value}>
      {children}
    </UiLabelsContext.Provider>
  );
}

export function useUiLabels(): UiLabels {
  return useContext(UiLabelsContext);
}

export { DEFAULT_LABELS };
