"use client";

import { useTranslations } from "next-intl";
import { useTransition, useCallback, type MouseEventHandler } from "react";

import { Button, toast } from "@/components/ui";
import { resendVerificationAction } from "@/server/actions/auth";

export function ResendVerification() {
  const t = useTranslations("auth.verifyEmail");
  const [pending, startTransition] = useTransition();

  const onResend: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    startTransition(async () => {
      const result = await resendVerificationAction();
      if (result.ok) {
        toast.success(result.message ?? t("resend"));
      } else {
        toast.error(result.message);
      }
    });
  }, [t]);

  return (
    <Button
      variant="outline"
      size="lg"
      fullWidth
      loading={pending}
      onClick={onResend}
    >
      {t("resend")}
    </Button>
  );
}
