"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { UiLabelsProvider, type UiLabels } from "@/components/ui";

/**
 * Feeds the UI library its own strings, translated.
 *
 * The library ships English developer fallbacks so it renders standalone; this
 * is the only place that connects it to the message catalogue. Mounted once in
 * the root layout.
 */
export function AppUiLabels({ children }: { children: React.ReactNode }) {
  const a11y = useTranslations("a11y");
  const common = useTranslations("common");
  const money = useTranslations("money");

  const labels = useMemo<Partial<UiLabels>>(
    () => ({
      loading: common("loading"),
      close: common("close"),
      copy: common("copy"),
      copied: common("copied"),
      copiedToClipboard: a11y("copiedToClipboard"),
      requiredField: a11y("requiredField"),
      addTag: a11y("addTag"),

      pagination: a11y("pagination"),
      previousPage: a11y("previousPage"),
      nextPage: a11y("nextPage"),
      showing: ({ from, to, total }) => a11y("showing", { from, to, total }),

      selectAmount: money("selectAmount"),
      customAmount: money("customAmount"),
      minimum: (amount) => money("minimum", { amount }),
      maximum: (amount) => money("maximum", { amount }),
      minimumAndMaximum: (min, max) => money("minimumAndMaximum", { min, max }),

      raised: money("raised"),
      progressLabel: (raised, goal) => a11y("progressLabel", { raised, goal }),
      progressLabelNoGoal: (raised) => a11y("progressLabelNoGoal", { raised }),
    }),
    [a11y, common, money],
  );

  return <UiLabelsProvider labels={labels}>{children}</UiLabelsProvider>;
}
