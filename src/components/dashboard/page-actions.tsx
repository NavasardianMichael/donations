"use client";

import { Copy, EyeOff, Settings, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useState,
  useTransition,
  useCallback,
  useMemo,
  type ComponentProps,
  type MouseEventHandler,
} from "react";

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

/** Every action here mutates the page, so every one asks first. */
type Confirmable = "publish" | "unpublish" | "duplicate" | "delete";

/**
 * Publish / unpublish / duplicate / delete for one page.
 *
 * These sit in a dense icon row, one mis-tap apart, and each one is visible to
 * donors the moment it lands — publishing exposes a page, unpublishing takes a
 * live one down, duplicating adds a draft to the list. So all four route
 * through the same AlertDialog; only the copy and the confirm button differ.
 * Settings is a link, not a mutation, and goes straight through.
 */
export function PageActions({
  pageId,
  title,
  status,
  layout = "icons",
  showSettings = true,
}: {
  pageId: string;
  title: string;
  status: PageStatus;
  /** "icons" for the dense card/row footers, "labels" for the mobile stack. */
  layout?: "icons" | "labels";
  /** Hide on the page chrome — Settings is already a tab there. */
  showSettings?: boolean;
}) {
  const t = useTranslations("page.actions");
  const tp = useTranslations("pages");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // `kind` outlives `open` so the dialog keeps its copy while it animates out.
  const [confirm, setConfirm] = useState<{ open: boolean; kind: Confirmable }>({
    open: false,
    kind: "delete",
  });

  const published = status === "PUBLISHED";

  const run = useCallback(
    (action: () => Promise<{ ok: boolean; message?: string }>) => {
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          toast.success(result.message ?? "");
          if (confirm.kind === "delete") {
            router.push("/pages");
            return;
          }
          router.refresh();
        } else {
          toast.error(result.message ?? "");
        }
      });
    },
    [confirm.kind, router],
  );

  const publishAction = useCallback(
    () => publishPageAction({ id: pageId }),
    [pageId],
  );
  const unpublishAction = useCallback(
    () => unpublishPageAction({ id: pageId }),
    [pageId],
  );
  const duplicateAction = useCallback(
    () => duplicatePageAction({ id: pageId }),
    [pageId],
  );
  const deleteAction = useCallback(
    () => deletePageAction({ id: pageId }),
    [pageId],
  );

  const CONFIRM = useMemo(
    () =>
      ({
        publish: {
          title: tp("publishConfirmTitle"),
          body: tp("publishConfirmBody", { title }),
          confirmLabel: t("publish"),
          variant: "primary" as const,
          action: publishAction,
        },
        unpublish: {
          title: tp("unpublishConfirmTitle"),
          body: tp("unpublishConfirmBody", { title }),
          confirmLabel: t("unpublish"),
          variant: "primary" as const,
          action: unpublishAction,
        },
        duplicate: {
          title: tp("duplicateConfirmTitle"),
          body: tp("duplicateConfirmBody", { title }),
          confirmLabel: t("duplicate"),
          variant: "primary" as const,
          action: duplicateAction,
        },
        delete: {
          title: tp("deleteConfirmTitle"),
          body: tp("deleteConfirmBody", { title }),
          confirmLabel: t("delete"),
          variant: "destructive" as const,
          action: deleteAction,
        },
      }) satisfies Record<
        Confirmable,
        {
          title: string;
          body: string;
          confirmLabel: string;
          variant: "primary" | "destructive";
          action: () => Promise<{ ok: boolean; message?: string }>;
        }
      >,
    [
      deleteAction,
      duplicateAction,
      publishAction,
      t,
      title,
      tp,
      unpublishAction,
    ],
  );

  const active = CONFIRM[confirm.kind];

  const onAskPublishToggle: MouseEventHandler<HTMLButtonElement> =
    useCallback(() => {
      setConfirm({
        open: true,
        kind: published ? "unpublish" : "publish",
      });
    }, [published]);

  const onAskDuplicate: MouseEventHandler<HTMLButtonElement> =
    useCallback(() => {
      setConfirm({ open: true, kind: "duplicate" });
    }, []);

  const onAskDelete: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    setConfirm({ open: true, kind: "delete" });
  }, []);

  const onConfirmOpenChange: NonNullable<
    ComponentProps<typeof AlertDialog>["onOpenChange"]
  > = useCallback((open) => {
    setConfirm((c) => ({ ...c, open }));
  }, []);

  const onConfirmAction: MouseEventHandler<HTMLButtonElement> =
    useCallback(() => {
      run(active.action);
    }, [active.action, run]);

  const withLabels = layout === "labels";

  return (
    <>
      <div className="flex items-center gap-2">
        {showSettings ? (
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
        ) : null}

        <PageActionButton
          label={published ? t("unpublish") : t("publish")}
          icon={published ? EyeOff : Upload}
          withLabel={withLabels}
          disabled={pending}
          onClick={onAskPublishToggle}
        />

        <PageActionButton
          label={t("duplicate")}
          icon={Copy}
          withLabel={withLabels}
          disabled={pending}
          onClick={onAskDuplicate}
        />

        <PageActionButton
          label={t("delete")}
          icon={Trash2}
          withLabel={withLabels}
          destructive
          disabled={pending}
          onClick={onAskDelete}
        />
      </div>

      <AlertDialog open={confirm.open} onOpenChange={onConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{active.title}</AlertDialogTitle>
            <AlertDialogDescription>{active.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tp("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant={active.variant}
              onClick={onConfirmAction}
            >
              {active.confirmLabel}
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
  onClick: MouseEventHandler<HTMLButtonElement>;
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
