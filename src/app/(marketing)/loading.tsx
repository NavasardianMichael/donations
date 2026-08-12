import { getTranslations } from "next-intl/server";

import { Spinner } from "@/components/ui";

export default async function MarketingLoading() {
  const t = await getTranslations("a11y");

  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <Spinner label={t("loading")} />
    </div>
  );
}
