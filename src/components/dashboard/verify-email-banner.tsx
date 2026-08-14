"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useTransition, useCallback, type MouseEventHandler } from "react";

import { Alert, Button, toast } from "@/components/ui";
import { resendVerificationAction } from "@/server/actions/auth";

/**
 * Shown until the address is confirmed.
 *
 * On success it calls `session.update()`, which re-runs the `jwt` callback
 * with `trigger: "update"` and refreshes `emailVerified` on the token — so the
 * banner disappears without forcing a sign-out and back in.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const t = useTranslations("dashboard");
  const [pending, startTransition] = useTransition();
  const { update } = useSession();

  const onResend: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    startTransition(async () => {
      const result = await resendVerificationAction();
      if (result.ok) {
        toast.success(result.message ?? "");
        await update();
      } else {
        toast.error(result.message);
      }
    });
  }, [update]);

  return (
    <div className="px-4 pt-4 sm:px-6 lg:px-10">
      <Alert
        variant="warning"
        title={t("verifyBannerTitle")}
        action={
          <Button
            size="sm"
            variant="outline"
            loading={pending}
            onClick={onResend}
          >
            {t("resendVerification")}
          </Button>
        }
      >
        {t("verifyBannerBody", { email })}
      </Alert>
    </div>
  );
}
