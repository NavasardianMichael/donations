"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button, toast } from "@/components/ui";
import { resendVerificationAction } from "@/server/actions/auth";

export function ResendVerification() {
  const t = useTranslations("auth.verifyEmail");
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="lg"
      fullWidth
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await resendVerificationAction();
          if (result.ok) {
            toast.success(result.message ?? t("resend"));
          } else {
            toast.error(result.message);
          }
        })
      }
    >
      {t("resend")}
    </Button>
  );
}
