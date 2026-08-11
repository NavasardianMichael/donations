import { FileText, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { Metadata } from "next";

import { PageCard } from "@/components/dashboard/page-card";
import { Button, Card, EmptyState, Heading, Lead } from "@/components/ui";
import type { PageStatus } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth-guards";
import { countPagesByStatus, listPages } from "@/server/queries/pages";

import { PageFilters } from "./page-filters";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages");
  return { title: t("title"), robots: { index: false, follow: false } };
}

type StatusFilter = PageStatus | "ALL";

function parseStatus(value: string | undefined): StatusFilter {
  return value === "PUBLISHED" || value === "DRAFT" || value === "ARCHIVED"
    ? value
    : "ALL";
}

export default async function ManagePagesPage(props: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const t = await getTranslations("pages");

  const status = parseStatus(searchParams.status);
  const search = searchParams.q?.trim() || undefined;

  const [pages, counts] = await Promise.all([
    listPages(user.id, { status, search }),
    countPagesByStatus(user.id),
  ]);

  const hasAnyPages = counts.ALL > 0;

  return (
    <div className="mx-auto max-w-content space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Heading level={1} size="display">
            {t("title")}
          </Heading>
          <Lead className="mt-1">{t("subtitle")}</Lead>
        </div>

        <Button asChild className="shrink-0">
          <Link href="/pages/new">
            <Plus />
            {t("createTitle")}
          </Link>
        </Button>
      </header>

      {hasAnyPages ? (
        <>
          <PageFilters
            counts={counts}
            activeStatus={status}
            activeSearch={search ?? ""}
          />

          {pages.length === 0 ? (
            <Card tone="dashed">
              <EmptyState
                icon={FileText}
                title={t("noMatchesTitle")}
                description={t("noMatchesDescription")}
              />
            </Card>
          ) : (
            /* One column up to `lg` — that is the tablet "row" look from the
               designs — then a two-up grid on wide screens. */
            <ul className="grid gap-4 lg:grid-cols-2">
              {pages.map((page) => (
                <li key={page.id}>
                  <PageCard page={page} />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <Card tone="dashed">
          <EmptyState
            icon={FileText}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Button asChild>
                <Link href="/pages/new">
                  <Plus />
                  {t("createTitle")}
                </Link>
              </Button>
            }
          />
        </Card>
      )}
    </div>
  );
}
