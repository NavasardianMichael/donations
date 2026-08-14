"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PageActions } from "@/components/dashboard/page-actions";
import { PagePublicUrl } from "@/components/dashboard/page-public-url";
import { Heading } from "@/components/ui";
import type { PageStatus } from "@/generated/prisma/enums";
import { absoluteUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

/**
 * Editor / Settings / Embed / Donations / Analytics.
 *
 * Plain links styled as tabs, not the Radix `Tabs` primitive — that
 * component owns its own selection state for a single-page tab PANEL, but
 * these are distinct ROUTES. Radix's `Tabs.Trigger` also does not
 * support `asChild`, so it cannot render a `<Link>` in the first place.
 *
 * The title row carries the same mutations as a list card — open, copy,
 * share, publish, duplicate, delete — so a creator does not have to go
 * back to the list to act on the page they are already looking at.
 */
export function PageTabNav({
  pageId,
  title,
  status,
  slug,
}: {
  pageId: string;
  title: string;
  status: PageStatus;
  slug: string;
}) {
  const t = useTranslations("pageSettings.tabs");
  const pathname = usePathname();

  const base = `/pages/${pageId}`;
  const tabs = [
    { href: base, key: "editor" as const },
    { href: `${base}/settings`, key: "settings" as const },
    { href: `${base}/embed`, key: "embed" as const },
    { href: `${base}/donations`, key: "donations" as const },
    { href: `${base}/analytics`, key: "analytics" as const },
  ];

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <Heading level={1} size="lg" className="min-w-0 flex-1 truncate">
          {title}
        </Heading>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <PagePublicUrl
            url={absoluteUrl(`/d/${slug}`)}
            title={title}
            layout="icons"
          />
          <PageActions
            pageId={pageId}
            title={title}
            status={status}
            showSettings={false}
          />
        </div>
      </div>
      <nav aria-label={t("editor")}>
        <ul className="flex flex-wrap items-end gap-x-1 border-b border-subtle">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active
                      ? "border-accent font-semibold text-fg"
                      : "border-transparent text-muted hover:text-fg",
                  )}
                >
                  {t(tab.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
