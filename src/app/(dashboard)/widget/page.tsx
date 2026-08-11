import { Blocks, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { Metadata } from "next";

import { Avatar, Card, EmptyState, Heading, Lead } from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";
import { listPages } from "@/server/queries/pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("widget");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * The embed snippet and its live preview live per-page — see
 * `pages/[pageId]/embed` — because the snippet is meaningless without a
 * specific page's slug. This screen is the chooser the top-level nav item
 * points at, rather than a second implementation of the same feature.
 */
export default async function WidgetPage() {
  const user = await requireUser();
  const t = await getTranslations("widget");

  const pages = await listPages(user.id, { status: "PUBLISHED" });

  return (
    <div className="mx-auto max-w-content space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <header>
        <Heading level={1} size="display">
          {t("title")}
        </Heading>
        <Lead className="mt-1">{t("subtitle")}</Lead>
      </header>

      {pages.length === 0 ? (
        <Card tone="dashed">
          <EmptyState
            icon={Blocks}
            title={t("noPagesTitle")}
            description={t("noPagesBody")}
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {pages.map((page) => (
            <li key={page.id}>
              <Link
                href={`/pages/${page.id}/embed`}
                className="flex items-center gap-3 rounded-sm border border-subtle bg-surface p-4 transition-colors hover:border-accent-border hover:bg-accent-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Avatar size="sm" name={page.title} src={page.coverImageUrl} />
                <span className="flex-1 truncate font-medium text-fg">
                  {page.title}
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
