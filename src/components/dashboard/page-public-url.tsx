"use client";

import { ArrowUpRight, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useState,
  useCallback,
  type MouseEventHandler,
} from "react";

import { Button, CopyButton, Tooltip, toast } from "@/components/ui";

/**
 * Public address of a donation page: open it, copy it, or (where the OS
 * allows) hand it to the system share sheet so messengers can unfurl the
 * social card.
 *
 * `navigator.share` is what actually exists — mostly phones, also desktop
 * Safari. Feature-detecting it is more accurate than hiding the control
 * at a breakpoint.
 */
export function PagePublicUrl({
  url,
  title,
  layout = "inline",
}: {
  url: string;
  title: string;
  /** "inline" under a list title; "icons" for a compact header toolbar. */
  layout?: "inline" | "icons";
}) {
  const t = useTranslations("pages");
  const ta = useTranslations("page.actions");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  const displayUrl = url.replace(/^https?:\/\//, "");

  const share: MouseEventHandler<HTMLButtonElement> = useCallback(async () => {
    try {
      await navigator.share({ title, url });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(t("shareFailed"));
    }
  }, [t, title, url]);

  const openControl =
    layout === "icons" ? (
      <Tooltip content={t("openPublicPage")}>
        <Button asChild variant="outline" size="icon-sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ArrowUpRight />
            <span className="sr-only">{t("openPublicPage")}</span>
          </a>
        </Button>
      </Tooltip>
    ) : (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-full min-w-0 items-center gap-1 text-sm text-muted transition-colors hover:text-fg hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="truncate">{displayUrl}</span>
        <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="sr-only">{t("openPublicPage")}</span>
      </a>
    );

  const copyControl = (
    <CopyButton
      value={url}
      label={t("copyUrl")}
      iconOnly={layout === "icons"}
      variant={layout === "icons" ? "outline" : "ghost"}
      size={layout === "icons" ? "icon-sm" : "sm"}
      className={
        layout === "icons"
          ? undefined
          : "h-7 px-2 text-xs font-medium text-muted hover:text-fg"
      }
    />
  );

  const shareControl = canShare ? (
    <Tooltip content={ta("share")}>
      <Button
        type="button"
        variant={layout === "icons" ? "outline" : "ghost"}
        size="icon-sm"
        className={
          layout === "icons" ? undefined : "size-7 text-muted hover:text-fg"
        }
        onClick={share}
      >
        <Share2 />
        <span className="sr-only">{ta("share")}</span>
      </Button>
    </Tooltip>
  ) : null;

  return (
    <div
      className={
        layout === "icons"
          ? "flex items-center gap-2"
          : "mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
      }
    >
      {openControl}
      {layout === "icons" ? (
        <Tooltip content={t("copyUrl")}>{copyControl}</Tooltip>
      ) : (
        copyControl
      )}
      {shareControl}
    </div>
  );
}
