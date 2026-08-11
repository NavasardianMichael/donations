"use client";

import { useTransition } from "react";

import { Button, toast } from "@/components/ui";
import { resendVerificationAction } from "@/server/actions/auth";

export function ResendVerification() {
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
            toast.success(result.message ?? "Confirmation email sent.");
          } else {
            toast.error(result.message);
          }
        })
      }
    >
      Resend confirmation email
    </Button>
  );
}
