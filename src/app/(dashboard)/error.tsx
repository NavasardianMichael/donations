"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button, Heading, Lead } from "@/components/ui";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const tCommon = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-content flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-10">
      <Heading level={1} size="lg">
        {t("serverErrorTitle")}
      </Heading>
      <Lead className="mt-3 max-w-md">{t("serverErrorBody")}</Lead>
      <Button className="mt-6" onClick={reset}>
        {tCommon("tryAgain")}
      </Button>
    </div>
  );
}
