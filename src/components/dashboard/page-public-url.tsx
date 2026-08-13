"use client";

import { ArrowUpRight, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

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
}: {
  url: string;
  title: string;
}) {
  const t = useTranslations("pages");
  const ta = useTranslations("page.actions");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  const displayUrl = url.replace(/^https?:\/\//, "");

  async function share() {
    try {
      await navigator.share({ title, url });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(t("shareFailed"));
    }
  }

  return (
    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-w-0 max-w-full items-center gap-1 text-sm text-muted transition-colors hover:text-fg hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="truncate">{displayUrl}</span>
        <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="sr-only">{t("openPublicPage")}</span>
      </a>

      <CopyButton
        value={url}
        label={t("copyUrl")}
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs font-medium text-muted hover:text-fg"
      />

      {canShare ? (
        <Tooltip content={ta("share")}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 text-muted hover:text-fg"
            onClick={share}
          >
            <Share2 />
            <span className="sr-only">{ta("share")}</span>
          </Button>
        </Tooltip>
      ) : null}
    </div>
  );
}
