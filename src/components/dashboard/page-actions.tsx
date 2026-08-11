"use client";

import { Copy, EyeOff, Settings, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Tooltip,
  toast,
} from "@/components/ui";
import type { PageStatus } from "@/generated/prisma/enums";
import {
  deletePageAction,
  duplicatePageAction,
  publishPageAction,
  unpublishPageAction,
} from "@/server/actions/pages";

/**
 * Publish / unpublish / duplicate / delete for one page.
 *
 * Delete goes through an AlertDialog because it is destructive and not
 * one-click undoable. The others are reversible, so they fire directly.
 */
export function PageActions({
  pageId,
  title,
  status,
  layout = "icons",
}: {
  pageId: string;
  title: string;
  status: PageStatus;
  /** "icons" for the dense card/row footers, "labels" for the mobile stack. */
  layout?: "icons" | "labels";
}) {
  const t = useTranslations("page.actions");
  const tp = useTranslations("pages");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const published = status === "PUBLISHED";

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message ?? "");
        router.refresh();
      } else {
        toast.error(result.message ?? "");
      }
    });
  }

  const withLabels = layout === "labels";

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className={withLabels ? "flex-1" : undefined}
        >
          <a href={`/pages/${pageId}/settings`}>
            <Settings />
            {t("settings")}
          </a>
        </Button>

        <PageActionButton
          label={published ? t("unpublish") : t("publish")}
          icon={published ? EyeOff : Upload}
          withLabel={withLabels}
          disabled={pending}
          onClick={() =>
            run(() =>
              published
                ? unpublishPageAction({ id: pageId })
                : publishPageAction({ id: pageId }),
            )
          }
        />

        <PageActionButton
          label={t("duplicate")}
          icon={Copy}
          withLabel={withLabels}
          disabled={pending}
          onClick={() => run(() => duplicatePageAction({ id: pageId }))}
        />

        <PageActionButton
          label={t("delete")}
          icon={Trash2}
          withLabel={withLabels}
          destructive
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        />
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tp("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tp("deleteConfirmBody", { title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tp("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => run(() => deletePageAction({ id: pageId }))}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PageActionButton({
  label,
  icon: Icon,
  withLabel,
  destructive,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  withLabel: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const button = (
    <Button
      variant="outline"
      size={withLabel ? "sm" : "icon-sm"}
      disabled={disabled}
      onClick={onClick}
      className={
        withLabel
          ? destructive
            ? "flex-1 text-danger"
            : "flex-1"
          : destructive
            ? "text-danger"
            : undefined
      }
    >
      <Icon />
      {withLabel ? label : <span className="sr-only">{label}</span>}
    </Button>
  );

  // An icon-only control needs its name exposed on hover as well as to AT.
  return withLabel ? button : <Tooltip content={label}>{button}</Tooltip>;
}
