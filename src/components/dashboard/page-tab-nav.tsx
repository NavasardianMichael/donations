"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Heading } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Editor / Settings / Embed / Donations / Analytics.
 *
 * Plain links styled as tabs, not the Radix `Tabs` primitive — that
 * component owns its own selection state for a single-page tab PANEL, but
 * these are distinct ROUTES. Radix's `Tabs.Trigger` also does not
 * support `asChild`, so it cannot render a `<Link>` in the first place.
 */
export function PageTabNav({
  pageId,
  title,
}: {
  pageId: string;
  title: string;
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
      <Heading level={1} size="lg" className="mb-3 truncate">
        {title}
      </Heading>
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
