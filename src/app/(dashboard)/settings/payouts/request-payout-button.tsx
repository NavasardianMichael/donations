"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  toast,
} from "@/components/ui";
import { formatMoney } from "@/lib/utils";

/**
 * The one action on this screen that moves money, and therefore the one that is
 * not wired up: the confirm step reports that payouts are not switched on
 * instead of queueing a transfer that nothing would carry out.
 *
 * The button is enabled and the dialog is real. It reads as "not yet", which is
 * true, rather than as "you may not", which is not.
 */
export function RequestPayoutButton({
  availableMinor,
  currency,
}: {
  availableMinor: number;
  currency: string;
}) {
  const t = useTranslations("payouts");
  const tc = useTranslations("common");

  const onConfirm = useCallback(() => {
    toast.info(t("notAvailableTitle"), { description: tc("comingSoon") });
  }, [t, tc]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>
          <ArrowUpRight />
          {t("requestPayout")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("confirmBody", {
              amount: formatMoney(availableMinor, currency),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="primary" onClick={onConfirm}>
            {t("requestPayout")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
