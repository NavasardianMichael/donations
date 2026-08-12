"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button, Heading, Lead } from "@/components/ui";

export default function GlobalError({
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
    <div className="flex min-h-dvh items-center justify-center px-4 py-20">
      <div className="max-w-md text-center">
        <Heading level={1} size="display">
          {t("serverErrorTitle")}
        </Heading>
        <Lead className="mt-3">{t("serverErrorBody")}</Lead>
        <Button className="mt-6" onClick={reset}>
          {tCommon("tryAgain")}
        </Button>
      </div>
    </div>
  );
}
